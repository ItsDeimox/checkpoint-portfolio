const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const out=path.resolve(process.env.DXT_QA_OUT||'docs/r39-qa');fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],environment:'System Chrome with mobile/touch emulation and SwiftShader; not physical-device FPS'};
const server=spawn(process.execPath,['tools/server.mjs','--port','5193'],{stdio:'inherit'});
let browser,page;
function check(name,pass,detail){report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)throw Error(name+' '+JSON.stringify(detail));}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function context(width=390,height=844){
 const c=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<900,deviceScaleFactor:1});
 await c.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'})));
 return c;
}
async function open(c,route='/'){
 page=await c.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5193'+route+'?debug',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__DXT__);return page;
}
async function closed(){await page.waitForFunction(()=>!document.body.classList.contains('intro-pending'));}
(async()=>{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5193/')).ok)break;}catch{}await delay(100);}
 const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 for(const [width,height] of [[390,844],[320,568],[568,320],[1366,768]]){
  const c=await context(width,height);await open(c);await page.waitForTimeout(200);
  check(width+' landing has no expensive showroom instance or automatic route',await page.evaluate(()=>{const s=window.__DXT__.inspect();return s.phase==='dormant'&&!s.scene&&s.selectedPanel===null&&!s.intro.entered;}));
  // textContent tests the authored label; innerText includes CSS text-transform.
  check(width+' primary label is Enter BDX',await page.locator('#intro-enter').textContent()==='Enter BDX');
  for(const selector of ['#intro-enter','#intro-showroom']){
   const r=await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{w:r.width,h:r.height,x:r.x,y:r.y,right:r.right,bottom:r.bottom,vw:innerWidth,vh:innerHeight,hit:hit===e||e.contains(hit)};});
   check(width+' '+selector+' is finger-sized and inside the screen',r.w>=44&&r.h>=44&&r.x>=0&&r.y>=0&&r.right<=r.vw+1&&r.bottom<=r.vh+1&&r.hit,r);
  }
  await page.locator('#intro-title').tap();await page.waitForTimeout(150);
  check(width+' background/title tap does not enter or start music',await page.evaluate(()=>!window.__DXT__.inspect().intro.entered&&!window.__DXT__.inspect().music.enabled));
  await page.screenshot({path:path.join(out,'intro-'+width+'.jpg'),type:'jpeg',quality:84});
  if(width>900){await page.locator('#intro-enter').focus();await page.keyboard.press('Enter');}
  else await page.locator('#intro-enter').tap();
  await closed();const s=await page.evaluate(()=>window.__DXT__.inspect());
  check(width+' primary enters Berserk without waiting for WebGL',s.selectedPanel===0&&s.section.active&&!s.scene&&new URL(page.url()).pathname==='/berserk',s.phase);
  check(width+' entry never opens About DXT',await page.locator('#section-title').innerText()==='Berserk Drift X');
  await c.close();
 }
 for(const [route,index] of [['/projects',2],['/about',3]]){
  const c=await context();await open(c,route);
  check(route+' keeps contextual Continue entry',await page.locator('#intro-enter').textContent().then(s=>s.startsWith('Continue to '))&&await page.locator('#intro-showroom').isHidden());
  await page.locator('#intro-enter').tap();await closed();
  check(route+' keeps its original destination',new URL(page.url()).pathname===route&&await page.evaluate(i=>window.__DXT__.inspect().selectedPanel===i,index));
  await c.close();
 }
 {
  const c=await context();await c.route('**/src/render/showroom.bundle.js',r=>r.abort());await open(c);
  await page.locator('#intro-enter').tap();await closed();
  check('BDX still works when the 3D bundle cannot load',new URL(page.url()).pathname==='/berserk'&&await page.locator('#section-title').innerText()==='Berserk Drift X');
  await c.close();
 }
 {
  const c=await context();await open(c);
  await page.locator('#intro-showroom').tap();
  check('only explicit showroom activation shows loading state',await page.locator('#room-intro').getAttribute('aria-busy')==='true');
  await page.waitForFunction(()=>window.__DXT__.inspect().phase==='ready'&&!document.body.classList.contains('intro-pending'),null,{timeout:120000});
  const s=await page.evaluate(()=>window.__DXT__.inspect());
  check('explicit showroom ends at the room, not a content page',s.scene?.ready&&s.selectedPanel===null&&!s.section.active&&new URL(page.url()).pathname==='/');
  await page.locator('[data-mobile-panel="0"]').tap();
  await page.waitForFunction(()=>window.__DXT__.inspect().section.active&&!window.__DXT__.inspect().section.travelling,null,{timeout:90000});
  check('original showroom portal still reaches Berserk',new URL(page.url()).pathname==='/berserk'&&await page.locator('#section-title').innerText()==='Berserk Drift X');
  await page.locator('#brand-spin').tap();
  await page.waitForFunction(()=>!window.__DXT__.inspect().section.active&&!window.__DXT__.inspect().section.travelling,null,{timeout:90000});
  check('header return still reaches the same showroom',new URL(page.url()).pathname==='/');
  await c.close();
 }
 check('no unhandled JavaScript exceptions',report.errors.length===0,report.errors);
})().catch(async e=>{report.failure=e.stack;process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:82}).catch(()=>{});}).finally(async()=>{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.pass).length,errors:report.errors,failure:report.failure}));
 if(browser)await browser.close();server.kill();
});
