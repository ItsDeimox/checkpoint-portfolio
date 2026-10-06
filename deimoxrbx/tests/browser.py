"""Behavioral/visual tests of the actual portable build. No network bypasses.
Run under a working X display: DISPLAY=:99 python tests/browser.py.
QA_VIDEO may point to any short playable MP4 fixture (never shipped as project media).
"""
import asyncio,json,os,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
FIXTURE=Path(os.environ.get('QA_VIDEO','/mnt/data/roblox-reference/playback-test.mp4'))
async def main():
 report={'checks':[],'errors':[],'warnings':[]}
 (ROOT/'preview').mkdir(exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=.65)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('console',lambda m:report['errors' if m.type=='error' else 'warnings'].append(m.text) if m.type in ['error','warning'] else None)
  async def waitphase(phase):await page.wait_for_function('(p)=>portfolio.motion.phase===p',arg=phase,timeout=90000)
  async def check(name,condition):
   assert condition,name
   report['checks'].append(name);print('PASS',name,flush=True)
  try:
   await page.evaluate('window.__PORTFOLIO_DEBUG__=true')
   await page.set_content((ROOT/'dist/Deimox-Portfolio.html').read_text(),wait_until='load',timeout=90000)
   await page.wait_for_function('window.portfolio && document.documentElement.dataset.ready==="true"',timeout=90000)
   await page.wait_for_timeout(700)
   await check('WebGL 2 + HDR initialized',await page.evaluate('portfolio.optics.hdr'))
   await check('Exactly two 3D project surfaces',await page.evaluate('portfolio.cards.panels.length===2 && portfolio.cards.panels.every(p=>p.mesh.geometry.attributes.position.count>2000)'))
   finite=await page.evaluate('''()=>{const e=portfolio,a=new Uint16Array(20*20*4);e.renderer.readRenderTargetPixels(e.optics.main,100,100,20,20,a);return [...a].every(x=>(x&0x7c00)!==0x7c00)}''')
   await check('HDR samples contain no NaN/Infinity',finite)
   await page.screenshot(path=str(ROOT/'preview/desktop-test.png'))
   box=await page.locator('#project-left').bounding_box();cx=box['x']+box['width']*.52;cy=box['y']+box['height']*.44
   await page.mouse.move(cx-80,cy);await page.mouse.move(cx+80,cy+15,steps=10)
   await page.wait_for_function('portfolio.cards.panels[0].energy.inspect().peakDisplacement>0',timeout=15000)
   energy=await page.evaluate('portfolio.cards.panels[0].energy.inspect()')
   await check('Pointer movement injects actual vertex energy',energy['impulses']>0)
   await check('Hover displaces the subdivided glass mesh',energy['peakDisplacement']>0)
   await page.screenshot(path=str(ROOT/'preview/hover.png'))
   await page.mouse.move(830,190)
   old=await page.evaluate('portfolio.motion.index')
   await page.mouse.move(830,440);await page.mouse.wheel(0,350)
   await page.wait_for_function('(old)=>portfolio.motion.index!==old',arg=old,timeout=90000);await waitphase('idle')
   await check('Wheel swaps one pair, settles at 90 degrees',await page.evaluate('Math.abs(portfolio.motion.rotation-Math.PI/2)<.00001 && portfolio.motion.index===1'))
   await page.keyboard.press('ArrowLeft');await page.wait_for_function('portfolio.motion.index===0',timeout=90000);await waitphase('idle')
   await check('Keyboard navigation restores the previous pair',True)
   await page.locator('#project-left').click(force=True);await waitphase('focused')
   info=await page.evaluate('portfolio.inspect()')
   await check('Click physically moves the camera to the left pane',info['selected']==0 and info['focus']==1 and await page.evaluate('portfolio.camera.position.distanceTo(portfolio.home)>3'))
   centered=await page.evaluate('''()=>{const e=portfolio;const point=e.cards.panels[e.motion.selected].group.getWorldPosition(e.home.clone()).project(e.camera);return Math.abs(point.x)<.01&&Math.abs((1-point.y)*.5*e.renderHeight-e.height*.5)<2;}''')
   await check('The selected glass is actually centered by the camera',centered)
   await check('The core fades out instead of obstructing the focused video',await page.evaluate('!portfolio.hub.group.visible'))
   await check('Missing original video is disclosed, not fabricated',await page.locator('#play-video').is_disabled())
   await page.screenshot(path=str(ROOT/'preview/focused.png'))
   if FIXTURE.exists():
    await page.locator('#local-video').set_input_files(str(FIXTURE));await page.wait_for_function('!document.querySelector("#play-video").disabled')
    await page.locator('#play-video').click();await page.wait_for_function('portfolio.cards.panels[0].video?.currentTime>.1',timeout=90000)
    await check('A real local MP4 plays as a VideoTexture on the mesh',await page.evaluate('portfolio.cards.panels[0].videoTexture?.isVideoTexture && !portfolio.cards.panels[0].video.paused'))
    await page.locator('#play-video').click();await check('Player pause works',await page.evaluate('portfolio.cards.panels[0].video.paused'))
    await page.locator('#seek-video').evaluate('(el)=>{el.value=500;el.dispatchEvent(new Event("input",{bubbles:true}));}')
    await check('Seeking changes the actual video time',await page.evaluate('portfolio.cards.panels[0].video.currentTime>1'))
   await page.keyboard.press('Escape');await waitphase('idle')
   await check('Escape returns and stops video/audio',await page.evaluate('portfolio.cards.panels.every(p=>!p.video) && portfolio.motion.focusAmount===0 && portfolio.hub.group.visible'))
   await page.locator('#project-right').click(force=True);await waitphase('focused')
   await check('The right pane also focuses correctly',await page.evaluate('portfolio.motion.selected===1'))
   await page.keyboard.press('Escape');await waitphase('idle')
   await page.set_viewport_size({'width':390,'height':844});await page.wait_for_function('portfolio.mobile && Math.abs(portfolio.width-390)<1',timeout=30000);await page.wait_for_timeout(600)
   await check('Mobile has no horizontal overflow',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   boxes=await page.locator('.project-hit').evaluate_all('(els)=>els.map(e=>({x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right}))')
   await check('Both mobile panes stay on-screen',all(b['x']>=0 and b['right']<=391 for b in boxes))
   await page.screenshot(path=str(ROOT/'preview/mobile.png'),full_page=True)
   await page.emulate_media(reduced_motion='reduce');await page.wait_for_timeout(300)
   await page.keyboard.press('ArrowRight');await waitphase('idle')
   await check('Reduced motion is respected',await page.evaluate('portfolio.reduced && portfolio.motion.reduced'))
   await page.set_viewport_size({'width':1280,'height':800});await page.wait_for_timeout(500)
   await page.locator('#quality').click();await check('Low quality is active and respects the DPR cap',await page.evaluate('portfolio.quality==="low" && portfolio.renderer.getPixelRatio()<=.8'))
   await check('The live floor covers the complete footer',await page.evaluate('portfolio.renderHeight>=portfolio.height+document.querySelector("#about").getBoundingClientRect().height-.1'))
   await check('Footer has no opaque block or straight top border',await page.evaluate('(()=>{const s=getComputedStyle(document.querySelector("#about"));return s.backgroundColor==="rgba(0, 0, 0, 0)"&&s.borderTopWidth==="0px"})()'))
   await check('Hover GLSL gain and limit are constrained',await page.evaluate('portfolio.cards.panels.every(p=>p.uniforms.uHoverGlowGain.value<=.25&&p.uniforms.uHoverGlowLimit.value<=1.2)'))
   await check('No runtime or GLSL errors',not report['errors'])
   report['state']=await page.evaluate('portfolio.inspect()')
  finally:
   (ROOT/'preview/test-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2),flush=True);await browser.close()
asyncio.run(main())
