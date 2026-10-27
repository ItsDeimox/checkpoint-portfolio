const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const out=path.resolve(process.env.DXT_QA_OUT||'docs/r35-mobile-qa');fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],screenshots:[],environment:'Chromium mobile/touch emulation and software WebGL; not physical iPhone/Android or hardware FPS validation'};
const server=spawn(process.execPath,['tools/server.mjs','--port','5186'],{stdio:'inherit'});
let browser,page;
const names=['Berserk Drift X','Groups & Games','Future Projects','I’m DXT','Socials & Contact'];
const paths=['/berserk','/groups','/projects','/about','/contact'];
const viewports=[[320,568],[360,740],[390,844],[430,932],[768,1024],[844,390],[568,320]];
function check(name,pass,detail){report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)throw Error(name+' '+JSON.stringify(detail));}
async function shot(name){await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:82});report.screenshots.push(name+'.jpg');}
async function fits(label){const d=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));check(label+' has no horizontal page overflow',d.scroll<=d.w+1,d);}
async function target(locator,label,minimum=44){await locator.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));await locator.evaluate(async e=>{const dialog=e.closest('dialog[open]');if(dialog)await Promise.all(dialog.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{})));});const d=await locator.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,vw:innerWidth,vh:innerHeight,hit:hit===e||e.contains(hit),visible:s.visibility!=='hidden',disabled:!!e.disabled};});check(label+' is visible, finger-sized and unobstructed',d.w>=minimum-.5&&d.h>=minimum-.5&&d.x>=-1&&d.right<=d.vw+1&&d.y>=-1&&d.bottom<=d.vh+1&&d.hit&&!d.disabled,d);}
async function routeReady(index){await page.waitForFunction(i=>window.__DXT__?.inspect().selectedPanel===i&&window.__DXT__.inspect().section.active&&!window.__DXT__.inspect().section.travelling,index,{timeout:60000});await page.waitForTimeout(300);}
async function roomReady(){await page.waitForFunction(()=>window.__DXT__?.inspect().phase==='ready'&&!window.__DXT__.inspect().section.active&&!window.__DXT__.inspect().section.travelling&&!document.body.classList.contains('intro-pending'),null,{timeout:90000});await page.waitForTimeout(200);}
async function imageReady(selector='[data-project-stage] img'){
 // Decode can be aborted when SectionMedia commits even the same selected URL.
 // Validate identity, decode and presentation atomically; a genuinely broken
 // image still fails the bounded wait rather than being treated as a pass.
 await page.waitForFunction(async selector=>{
  const image=document.querySelector(selector);
  if(!image||!image.complete||!image.naturalWidth)return false;
  const source=image.src;
  const selected=selector==='[data-gallery-main]'?document.querySelector('[data-gallery-select][aria-pressed="true"] img'):null;
  if(selected&&source!==selected.src)return false;
  try{await image.decode();}catch{return false;}
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return image.isConnected&&image.src===source&&image.complete&&image.naturalWidth>0&&(!selected||image.src===selected.src);
 },selector,{timeout:15000});
}
async function swipe(x,y,dx,dy){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12}]});await page.waitForTimeout(16);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(650);}
(async()=>{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5186/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(p=>fs.existsSync(p));
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 await ctx.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'})));
 page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5186/?debug',{waitUntil:'load'});await page.locator('#intro-enter').tap({timeout:120000});await roomReady();
 for(const [w,h] of viewports){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(350);await fits('showroom '+w+'x'+h);
  check(w+'px shows all five labelled destinations at once',await page.locator('.room-mobile-context [data-mobile-panel]:visible').count()===5);
  for(let i=0;i<5;i++)await target(page.locator('[data-mobile-panel="'+i+'"]'),w+'px destination '+i);
  for(const selector of ['#brand-spin','#sound-toggle','#music-settings-toggle','#quality','.room-header-nav .room-enter'])await target(page.locator(selector),w+'px '+selector);
  await page.locator('#music-settings-toggle').tap();await target(page.locator('#music-volume'),w+'px volume slider');await target(page.locator('#music-reactivity'),w+'px light response slider');await page.locator('#music-settings-toggle').tap();
  if([320,390,844].includes(w))await shot('showroom-'+w);
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 const sound=await page.locator('#sound-toggle').getAttribute('aria-pressed');await page.locator('#sound-toggle').tap();await page.waitForFunction(before=>document.querySelector('#sound-toggle').getAttribute('aria-pressed')!==before,sound);check('sound control responds to touch',true);
 for(let index=0;index<5;index++){
  await page.locator('[data-mobile-panel="'+index+'"]').tap();await routeReady(index);
  check('native showroom card '+index+' opens its correct page',new URL(page.url()).pathname===paths[index]&&await page.locator('#section-title').innerText()===names[index]);
  for(const [w,h] of [[320,568],[390,844],[844,390]]){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(200);await fits(paths[index]+' '+w);
   for(let i=0;i<5;i++)await target(page.locator('.section-navigation [data-section-route="'+i+'"]'),paths[index]+' '+w+' bottom link '+i);
   await page.evaluate(()=>scrollTo(0,0));
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);await shot(paths[index].slice(1)+'-390');
  if(index===0){
   for(let i=0;i<5;i++){const l=page.locator('[data-gallery-select="'+i+'"]');await target(l,'Berserk thumbnail '+i);await l.tap();await imageReady('[data-gallery-main]');check('Berserk photo '+i+' selected',await l.getAttribute('aria-pressed')==='true');}
   for(const delta of ['-1','1']){const l=page.locator('[data-gallery-step="'+delta+'"]');await target(l,'Berserk image arrow '+delta);await l.tap();await imageReady('[data-gallery-main]');}
   await target(page.locator('[data-gallery-original]'),'view original photo');await target(page.locator('.berserk-play-button'),'Play Now');
  }
  if(index===1){
   for(const i of [1,0]){const l=page.locator('[data-group-select="'+i+'"]');await target(l,'group tab '+i);await l.tap();await page.waitForTimeout(600);check('group tab '+i+' responds',await l.getAttribute('aria-pressed')==='true');}
   const track=page.locator('[data-group-track]');await track.scrollIntoViewIfNeeded();const box=await track.boundingBox();const y=Math.min(650,Math.max(160,box.y+Math.min(box.height*.3,250)));
   const before=await page.evaluate(()=>({x:document.querySelector('[data-group-track]').scrollLeft,y:scrollY}));await swipe(300,y,-240,0);
   const x=await track.evaluate(e=>e.scrollLeft);check('native horizontal touch swipe changes group',x>before.x+120,{before,x});
   const vertical=await page.evaluate(()=>({x:document.querySelector('[data-group-track]').scrollLeft,y:scrollY}));await swipe(190,600,0,-180);const after=await page.evaluate(()=>({x:document.querySelector('[data-group-track]').scrollLeft,y:scrollY}));check('vertical swipe over the gallery still scrolls the page',after.y>vertical.y+30&&Math.abs(after.x-vertical.x)<4,{vertical,after});
   await target(page.locator('.group-community>a'),'Join on Discord');
  }
  if(index===2){
   const count=await page.locator('[data-project-open]').count();check('all six project buttons remain',count===6);
   for(let i=0;i<count;i++){
    const l=page.locator('[data-project-open]').nth(i);await target(l,'project '+i);const y=await page.evaluate(()=>scrollY),rect=await l.boundingBox();
    // A real finger taps the already-validated visible target. Locator.tap's
    // automatic scrollIntoView can itself reposition the document before the
    // click handler, which would incorrectly blame the modal's scroll lock.
    await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
    await page.waitForTimeout(300);
    const modalState=await page.locator('#future-project-dialog').evaluate(e=>({open:e.open,y:scrollY}));
    check('project '+i+' opens without page jump',modalState.open&&Math.abs(modalState.y-y)<2,{before:y,after:modalState.y,open:modalState.open});
    await target(page.locator('[data-project-close]'),'project '+i+' close');
    if(i<2){for(const delta of ['1','-1']){const arrow=page.locator('[data-project-step="'+delta+'"]');await target(arrow,'project '+i+' image arrow '+delta);await arrow.tap();await imageReady();}}
    await page.locator('[data-project-close]').tap();await page.waitForFunction(()=>!document.querySelector('#future-project-dialog').open);check('project '+i+' restores scroll',Math.abs(await page.evaluate(()=>scrollY)-y)<2);
   }
   for(const [w,h] of [[320,568],[390,844],[844,390]]){
    await page.setViewportSize({width:w,height:h});await page.locator('[data-project-open]').first().tap();await imageReady();await page.waitForTimeout(250);await fits('project dialog '+w);await target(page.locator('[data-project-close]'),w+'px dialog close');
    const bounds=await page.locator('#future-project-dialog').evaluate(e=>({w:e.clientWidth,sw:e.scrollWidth}));check(w+'px dialog has no internal horizontal overflow',bounds.sw<=bounds.w+1,bounds);if(w===390)await shot('project-dialog-390');
    await page.locator('[data-project-close]').tap();await page.waitForFunction(()=>!document.querySelector('#future-project-dialog').open);
   }
  }
  await page.setViewportSize({width:390,height:844});await target(page.locator('#brand-spin'),'return from '+paths[index]);await page.locator('#brand-spin').tap();await roomReady();check('return '+index+' restores all mobile cards',await page.locator('[data-mobile-panel]:visible').count()===5);
 }
 await page.locator('[data-mobile-panel="0"]').tap();await routeReady(0);
 for(let i=1;i<=5;i++){let at=i%5;await page.locator('.section-navigation [data-section-route="'+at+'"]').tap();await routeReady(at);check('bottom navigation opens '+paths[at],new URL(page.url()).pathname===paths[at]);}
 await page.locator('#brand-spin').tap();await roomReady();
 for(let i=0;i<3;i++){const label=await page.locator('#quality strong').innerText();await page.locator('#quality').tap();await page.waitForFunction(before=>!document.querySelector('#quality').disabled&&document.querySelector('#quality strong').innerText!==before,label,{timeout:90000});check('quality switch '+i+' completes without losing navigation',await page.locator('[data-mobile-panel]:visible').count()===5);}
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-mobile-panel="2"]').tap();await routeReady(2);check('reduced-motion touch navigation remains functional',true);await page.locator('#brand-spin').tap();await roomReady();
 const desktop=await browser.newContext({viewport:{width:1440,height:900},hasTouch:false,isMobile:false});const dp=await desktop.newPage();await dp.goto('http://127.0.0.1:5186/projects?debug');await dp.locator('#intro-enter').click();await dp.waitForTimeout(500);check('desktop native mobile dock stays hidden',await dp.locator('.room-mobile-context:visible').count()===0);check('desktop page width is preserved',await dp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await desktop.close();
 check('no uncaught JavaScript errors',report.errors.length===0,report.errors);
})().catch(async e=>{report.failure=e.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:80}).catch(()=>{});}).finally(async()=>{fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.pass).length,errors:report.errors,failure:report.failure},null,2));if(browser)await browser.close();server.kill();});
