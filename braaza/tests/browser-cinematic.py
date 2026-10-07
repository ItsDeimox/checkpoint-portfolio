"""Real WebGL2 rendering, optics and browser input regressions. No assertions mocked."""
import json,os,sys,time
from playwright.sync_api import sync_playwright
from support import load,ROOT
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'pass':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)

def inspect(page):return page.evaluate('__BRAAZA__.inspect()')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('BRAAZA_CHROMIUM','/usr/bin/chromium'),headless=False,args=['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1100,'height':740});errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.evaluate('requestAnimationFrame=()=>0');load(page)
 st=inspect(page);check('WebGL2 initialized',st['api']=='WebGL2' and st['ready']);check('actual HDR context enabled',st['hdr']);check('thick glass uses isolated transmission target',st['glassTransmission']);check('world geometry shadows probes planar reflection present',st['geometryObjects']>800 and st['shadowMaps']==2 and st['probeReady'])
 check('all required rendering passes executed',all(x in st['passes'] for x in ['shadow','reflection','ambient-occlusion','glass','sparks','optical-resolve','flare-visibility']))
 data=page.evaluate('''()=>{const f=__BRAAZA__.get(),g=f.gl;f.paused=true;f.time=3;f.motion.reset();f.update(0);f.render();return [...f.targets,...f.cards.map(c=>c.demoTarget)].filter(t=>t.t!==t.depth).map(t=>{f.setTarget(t);const hdr=t.hdr!==false;const a=hdr?new Float32Array(t.w*t.h*4):new Uint8Array(t.w*t.h*4);g.readPixels(0,0,t.w,t.h,g.RGBA,hdr?g.FLOAT:g.UNSIGNED_BYTE,a);let bad=0,negative=0,max=0,min=Infinity;for(let i=0;i<a.length;i++){if(i%4===3)continue;if(!Number.isFinite(a[i]))bad++;if(a[i]<0)negative++;max=Math.max(max,a[i]);min=Math.min(min,a[i]);}return{id:t.id,bad,negative,max,min,error:g.getError()};});}''')
 check('all attachments are finite and readable',all(x['bad']==0 and x['error']==0 for x in data),data)
 check('radiance nonnegative and emissive highlights retain HDR',all(x['negative']==0 for x in data if x['id']!='velocity') and all(x['max']>1 for x in data if x['id'].startswith('demo-')))
 check('desktop attachment budget',st['attachmentBytes']<192*1024**2,st['attachmentBytes'])
 for effect in ['shadows','reflection','bloom','volume']:
  d=page.evaluate('''name=>{const f=__BRAAZA__.get(),g=f.gl;const shot=()=>{f.render();const a=new Uint8Array(f.canvas.width*f.canvas.height*4);g.readPixels(0,0,f.canvas.width,f.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);return a};f.effects[name]=true;const a=shot();f.effects[name]=false;const c=shot();f.effects[name]=true;let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-c[i])+Math.abs(a[i+1]-c[i+1])+Math.abs(a[i+2]-c[i+2])>3)changed++;return{changed,error:g.getError()};}''',effect)
  check(effect+' contributes actual pixels',d['changed']>50 and d['error']==0,d)
 fixture=(ROOT/'tests/optical-fixtures.js').read_text().replace('export function opticalFixtures','function opticalFixtures')
 r=page.evaluate('()=>{'+fixture+';return opticalFixtures(__BRAAZA__.get());}')
 check('label does not extinguish lower rim hover',r['rim']['retained']>.85,r['rim']);check('spark contrast independent of background depth',r['sparks']['retained']>.85,r['sparks']);check('flare responds to actual visibility',r['flare']['open'][0]>.95 and r['flare']['closed'][0]<.01,r['flare']);check('rear source does not generate flare',r['flare']['open'][4]<.01);check('lava cascades fade at borders and evolve',r['lava']['bottomAlpha']<.12 and r['lava']['change']>.015,r['lava']);check('GPU fixtures produce no GL errors',r['error']==0)
 check('no GPU-fixture JavaScript errors',not errs,errs);page.close()
 page=b.new_page(viewport={'width':1440,'height':900});errs=[];page.on('pageerror',lambda e:errs.append(str(e)));load(page);page.set_default_timeout(60000);page.evaluate('''()=>{const f=__BRAAZA__.get();f.frozenQuality=true;f.paused=false;}''')
 page.locator('#scene').focus();page.mouse.move(720,530);page.mouse.wheel(0,440);page.wait_for_function('__BRAAZA__.inspect().position>.4',timeout=60000);st=inspect(page);check('wheel raises gallery',st['position']>.4);check('chains move in opposite directions',st['chains'][0]*st['chains'][1]<0)
 page.mouse.move(700,550);page.mouse.down();page.mouse.move(700,240,steps=9);page.mouse.up();page.wait_for_function('__BRAAZA__.inspect().position>1',timeout=60000);check('drag advances without opening media',page.evaluate('!document.querySelector("#viewer").open'));check('drag does not select text',page.evaluate('getSelection().toString()')=='')
 page.keyboard.press('Home');page.wait_for_function('__BRAAZA__.inspect().position===0&&Math.abs(__BRAAZA__.get().cards[1].y-4.1)<.0001',timeout=60000);check('Home resets gallery and chain travel',page.evaluate('__BRAAZA__.get().motion.travel')==0)
 page.keyboard.press('ArrowDown');page.wait_for_function('__BRAAZA__.inspect().position>.5',timeout=60000);check('keyboard navigation works',inspect(page)['position']>.5)
 page.keyboard.press('Enter');check('keyboard opens media dialog',page.locator('#viewer').evaluate('(d)=>d.open'));page.wait_for_function('document.querySelector("#viewer img")?.naturalWidth>0',timeout=60000);check('HDR preview image decodes',page.locator('#viewer img').evaluate('(im)=>im.naturalWidth')>0);check('demo label preserved','demonstra' in page.locator('#viewer-content').inner_text().lower())
 page.keyboard.press('Escape');check('Escape restores focus',page.evaluate('document.activeElement.id')=='scene')
 page.keyboard.press('Home');page.wait_for_function('__BRAAZA__.get().cards[1].y===4.1',timeout=60000);pt=inspect(page)['cards'][1]['screen'];page.mouse.move(*pt);page.wait_for_function('__BRAAZA__.inspect().hover===1',timeout=60000);check('lens corrected raycast selects card',inspect(page)['hover']==1);check('cursor heat trail is injected',page.evaluate('__BRAAZA__.get().cards[1].trailSlot')>0)
 page.mouse.click(*pt);check('pointer opens selected card',page.locator('#viewer-title').inner_text()=='ESTUDO 02');page.keyboard.press('Escape')
 for name in ['low','high','auto']:
  page.locator('#quality').click();page.wait_for_function('expected=>__BRAAZA__.inspect().quality===expected',arg=name,timeout=60000);check(name+' quality retains valid framebuffers',page.evaluate('__BRAAZA__.get().gl.getError()')==0)
 page.locator('#pause').click();t=page.evaluate('__BRAAZA__.get().time');page.wait_for_timeout(500);check('pause freezes time',page.evaluate('__BRAAZA__.get().time')==t)
 continuity=page.evaluate('''()=>{const f=__BRAAZA__.get();let bad=0;for(let j=0;j<365;j++)for(const side of[-1,1])for(const secondary of[false,true]){const ys=f.chains.filter(l=>l.side===side&&l.secondary===secondary).map(l=>f.linkPose(l,(j-182)*.137).pos[1]).sort((a,b)=>a-b);if(ys[0]>=-9||ys.at(-1)<=29)bad++;for(let i=1;i<ys.length;i++)if(Math.abs(ys[i]-ys[i-1]-.88)>1e-6)bad++;}return bad;}''');check('chain continuity across 365 phases both directions',continuity==0,continuity)
 page.emulate_media(reduced_motion='reduce');page.wait_for_function('__BRAAZA__.get().reduced',timeout=60000);page.evaluate('__BRAAZA__.get().paused=false');t=page.evaluate('__BRAAZA__.get().time');page.wait_for_timeout(500);check('reduced motion freezes environmental animation',page.evaluate('__BRAAZA__.get().time')==t)
 check('no desktop JS or GL errors',not errs and page.evaluate('__BRAAZA__.get().gl.getError()')==0,errs);page.close()
 context=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=context.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)));load(page);page.evaluate('__BRAAZA__.get().frozenQuality=true')
 check('mobile initializes WebGL2',inspect(page)['api']=='WebGL2');check('mobile has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 cd=context.new_cdp_session(page);cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':195,'y':570}]})
 for y in [540,500,460,420,380,340]:cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':195,'y':y}]})
 cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_function('__BRAAZA__.get().motion.value>.4',timeout=60000)
 check('mobile swipe advances without click',page.evaluate('!document.querySelector("#viewer").open'))
 page.locator('#gallery').tap();check('touch gallery opens',page.locator('#viewer').evaluate('(d)=>d.open'));page.locator('#close').tap()
 check('mobile cards remain centered',all(0<c['screen'][0]<390 for c in inspect(page)['cards']));check('mobile attachment budget',inspect(page)['attachmentBytes']<72*1024**2)
 check('no mobile JS or WebGL errors',not errs and page.evaluate('__BRAAZA__.get().gl.getError()')==0,errs)
 context.close();b.close()
(ROOT/'docs/verification/browser.json').write_text(json.dumps(checks,indent=2));print('TOTAL',len(checks),'FAILED',sum(not c['pass'] for c in checks),flush=True);sys.exit(0 if all(c['pass'] for c in checks) else 1)
