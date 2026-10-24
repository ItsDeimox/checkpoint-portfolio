const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const out=path.resolve(process.env.DXT_QA_OUT||'docs/r36-style-qa');fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],screenshots:[],environment:'System Chromium, mobile/touch emulation, software WebGL. Visual/layout evidence, not a physical-phone FPS benchmark.'};
function check(name,pass,detail){report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)throw Error(name+' '+JSON.stringify(detail));}
const server=spawn(process.execPath,['tools/server.mjs','--port','5187'],{stdio:'inherit'});let browser,page;
(async()=>{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5187/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(p=>fs.existsSync(p));
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 await ctx.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'})));
 page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5187/?debug',{waitUntil:'load'});
 await page.locator('#intro-enter').tap({timeout:120000});
 await page.waitForFunction(()=>window.__DXT__?.inspect().phase==='ready'&&!document.body.classList.contains('intro-pending'),null,{timeout:90000});
 for(const [w,h] of [[390,844],[320,568],[360,740],[430,932],[768,1024],[844,390],[568,320]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(650);
  const geometry=await page.locator('[data-mobile-panel]').evaluateAll(els=>els.map(e=>{
   const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),title=e.querySelector('strong'),tr=title.getBoundingClientRect(),s=getComputedStyle(e);
   return {label:title.textContent,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,vw:innerWidth,vh:innerHeight,hit:e===hit||e.contains(hit),font:parseFloat(getComputedStyle(title).fontSize),radius:s.borderRadius,titleInside:tr.x>=r.x-1&&tr.right<=r.right+1&&tr.y>=r.y-1&&tr.bottom<=r.bottom+1};
  }));
  check(w+'x'+h+' retains five visible direct routes',geometry.length===5);
  for(const [i,g] of geometry.entries())check(w+'x'+h+' route '+i+' is readable and touch-safe',g.w>=44&&g.h>=48&&g.x>=0&&g.right<=w+1&&g.y>=0&&g.bottom<=h+1&&g.hit&&g.titleInside,g);
  check(w+'px has no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(w+'px replaces rounded cards with the showroom index',geometry.every(g=>g.radius==='0px'));
  if(h>w)check(w+'px gives Berserk one full-width headline',geometry[0].w>geometry[1].w*1.6&&geometry[0].font>geometry[1].font+8);
  const surface=await page.locator('.room-mobile-context').evaluate(e=>({height:e.getBoundingClientRect().height,radius:getComputedStyle(e).borderRadius,background:getComputedStyle(e).backgroundColor,blur:getComputedStyle(e).backdropFilter,passive:getComputedStyle(e,'::before').pointerEvents}));
  check(w+'px surface remains seamless and avoids new backdrop blur',surface.radius==='0px'&&surface.passive==='none'&&surface.blur==='none',surface);
  check(w+'px lower-third stays compact',surface.height<(h>w?190:95),surface);
  const filename='showroom-'+w+'x'+h+'.jpg';await page.screenshot({path:path.join(out,filename),type:'jpeg',quality:90});report.screenshots.push(filename);
 }
 await page.setViewportSize({width:390,height:844});
 const routes=['/berserk','/groups','/projects','/about','/contact'];
 for(let i=0;i<5;i++){
  await page.locator('[data-mobile-panel="'+i+'"]').tap();
  await page.waitForFunction(i=>window.__DXT__?.inspect().selectedPanel===i&&window.__DXT__.inspect().section.active&&!window.__DXT__.inspect().section.travelling,i,{timeout:60000});
  check('touch still opens '+routes[i],new URL(page.url()).pathname===routes[i]);
  await page.locator('#brand-spin').tap();
  await page.waitForFunction(()=>!window.__DXT__.inspect().section.active&&!window.__DXT__.inspect().section.travelling,null,{timeout:60000});
  await page.waitForTimeout(200);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 check('reduced-motion removes navigation transitions',await page.locator('[data-mobile-panel="0"]').evaluate(e=>getComputedStyle(e).transitionDuration==='0s'));
 check('no uncaught JavaScript errors',report.errors.length===0,report.errors);
})().catch(async e=>{report.failure=e.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:85}).catch(()=>{});}).finally(async()=>{
 fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.pass).length,errors:report.errors,failure:report.failure},null,2));if(browser)await browser.close();server.kill();
});
