const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const out=path.resolve(process.env.DXT_QA_OUT||'docs/r39-entry-qa');fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],environment:'Actual site in Chromium, desktop and mobile/touch, software WebGL; not physical phone FPS.'};
const base=process.env.DXT_BASE_URL||'http://127.0.0.1:5191';
const server=process.env.DXT_BASE_URL?null:spawn(process.execPath,['tools/server.mjs','--port','5191'],{stdio:'inherit'});
let browser,page;
function check(name,pass,detail){report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)throw Error(name+' '+JSON.stringify(detail));}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function context(mobile=false,extra={}){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,...extra});
 await ctx.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'})));
 return ctx;
}
async function open(ctx,url){page=await ctx.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__DXT__);return page;}
async function room(){await page.waitForFunction(()=>window.__DXT__.inspect().phase==='ready'&&!document.body.classList.contains('intro-pending')&&!window.__DXT__.inspect().section.travelling&&!window.__DXT__.inspect().section.active,null,{timeout:120000});}
async function berserk(){await page.waitForFunction(()=>location.pathname==='/berserk'&&window.__DXT__.inspect().selectedPanel===0&&window.__DXT__.inspect().section.active&&!window.__DXT__.inspect().section.travelling,null,{timeout:120000});}
(async()=>{
 if(server)for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await sleep(100);}
 const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(p=>fs.existsSync(p));
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 const desktop=await context();await open(desktop,'/?debug');
 await page.locator('.intro-kicker').click();
 check('clicking the opening copy does not activate entry or music',await page.evaluate(()=>!__DXT__.inspect().intro.entered&&!__DXT__.inspect().music.enabled));
 await page.waitForFunction(()=>__DXT__.inspect().phase==='ready',null,{timeout:120000});
 await page.waitForTimeout(800);
 check('a prepared showroom never enters by itself',await page.evaluate(()=>!__DXT__.inspect().intro.entered&&!document.querySelector('#room-intro').hidden&&location.pathname==='/'));
 check('loading cover and header have different destination names',await page.locator('#intro-enter').innerText()==='Enter Showroom'&&await page.locator('.room-enter').innerText()==='Enter BDX');
 await page.locator('.intro-kicker').click();
 check('background click after loading still does not navigate',await page.evaluate(()=>!__DXT__.inspect().intro.entered&&__DXT__.inspect().selectedPanel===null));
 const leaving=await page.evaluate(()=>{
  document.querySelector('#intro-enter').click();
  const root=document.querySelector('#room-intro');return {leaving:document.body.classList.contains('intro-leaving'),shield:getComputedStyle(root).pointerEvents,mainInert:document.querySelector('#main').inert,selected:__DXT__.inspect().selectedPanel};
 });
 check('the entry click fades once without activating a destination beneath the cover',leaving.leaving&&leaving.shield==='auto'&&leaving.mainInert&&leaving.selected===null,leaving);
 await room();check('explicit ready-state entry finishes in the showroom',new URL(page.url()).pathname==='/');
 await page.locator('.room-enter').click();await berserk();
 check('Enter BDX opens Berserk rather than About DXT on desktop',await page.locator('#section-title').innerText().then(s=>/Berserk/i.test(s)));
 await page.screenshot({path:path.join(out,'berserk-desktop.jpg'),type:'jpeg',quality:82});
 await page.locator('#brand-spin').click();await room();
 check('Back to showroom still returns without showing the intro again',await page.locator('#room-intro').isHidden());
 await desktop.close();
 const mobile=await context(true);let unblock;const held=new Promise(resolve=>unblock=resolve);
 await mobile.route('**/src/render/showroom.bundle.js',async route=>{await held;await route.continue();});
 await open(mobile,'/?debug');
 await page.locator('.intro-kicker').tap();
 check('mobile decorative tap does not reserve entry during delayed loading',await page.evaluate(()=>!__DXT__.inspect().intro.entered));
 await page.locator('#intro-enter').tap();
 check('explicit early mobile entry is recorded but cannot expose an unprepared scene',await page.evaluate(()=>__DXT__.inspect().intro.entered&&!document.querySelector('#room-intro').hidden&&!__DXT__.inspect().intro.closed));
 await page.locator('#intro-sound-toggle').tap();
 check('intro audio control does not change the queued destination',await page.evaluate(()=>__DXT__.inspect().selectedPanel===null&&document.querySelector('#intro-status').textContent!=='Showroom ready'));
 unblock();await room();
 check('early and late entry converge to the same showroom route',new URL(page.url()).pathname==='/'&&await page.evaluate(()=>__DXT__.inspect().selectedPanel===null));
 const button=await page.locator('.room-enter').evaluate(e=>({label:e.getAttribute('aria-label'),target:e.dataset.openPanel,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
 check('compact BDX action is labelled, touch-sized and targets panel zero',button.label==='Enter BDX'&&button.target==='0'&&button.width>=43.5&&button.height>=43.5,button);
 await page.locator('.room-enter').tap();await berserk();
 check('mobile Enter BDX reaches the same Berserk page',true);
 await page.screenshot({path:path.join(out,'berserk-mobile.jpg'),type:'jpeg',quality:82});await mobile.close();
 const direct=await context(true,{reducedMotion:'reduce'});
 await open(direct,'/projects?debug');
 check('a direct Projects link identifies its actual destination',await page.locator('#intro-enter').innerText()==='Continue to Future Projects');
 await page.locator('#intro-enter').tap();await page.waitForFunction(()=>!document.body.classList.contains('intro-pending'));
 check('direct entry preserves Projects rather than forcing Berserk or the showroom',new URL(page.url()).pathname==='/projects'&&await page.evaluate(()=>__DXT__.inspect().selectedPanel===2));
 await open(direct,'/berserk?debug');
 check('a direct Berserk link is labelled Enter BDX',await page.locator('#intro-enter').innerText()==='Enter BDX');
 await page.locator('#intro-enter').focus();await page.keyboard.press('Enter');await berserk();
 check('keyboard entry preserves the direct Berserk route',true);await direct.close();
 const fallback=await context(true,{reducedMotion:'reduce'});
 await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return /webgl/i.test(type)?null:get.call(this,type,...rest);};});
 await open(fallback,'/?debug');
 await page.waitForFunction(()=>__DXT__.inspect().phase==='unavailable',null,{timeout:120000});
 await page.locator('.intro-kicker').tap();
 check('WebGL failure never causes an automatic or background-click entry',await page.evaluate(()=>!__DXT__.inspect().intro.entered));
 await page.locator('#intro-enter').tap();await page.waitForFunction(()=>!document.body.classList.contains('intro-pending'));
 await page.locator('.room-enter').tap();await berserk();
 check('Enter BDX remains usable without WebGL',true);await fallback.close();
 check('no unhandled JavaScript errors',report.errors.length===0,report.errors);
})().catch(async error=>{report.failure=error.stack;process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:80}).catch(()=>{});}).finally(async()=>{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(x=>x.pass).length,errors:report.errors,failure:report.failure}));if(browser)await browser.close();server?.kill();
});
