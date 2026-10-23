const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const out=path.resolve('docs/r35-mobile-baseline');fs.mkdirSync(out,{recursive:true});
const report={pages:[],errors:[],browser:'',environment:'Chromium touchscreen emulation, software WebGL; no physical-device FPS claim'};
const server=spawn(process.execPath,['tools/server.mjs','--port','5186'],{stdio:'inherit'});
let browser;
(async()=>{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5186/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await ctx.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'})));
 const page=await ctx.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
 async function inspect(name){
  const state=await page.evaluate(()=>({url:location.pathname,viewport:{w:innerWidth,h:innerHeight},width:document.documentElement.scrollWidth,body:document.body.className,debug:window.__DXT__?.inspect(),controls:[...document.querySelectorAll('button,a,summary,input')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>1&&r.height>1&&s.display!=='none'&&s.visibility!=='hidden'&&s.clipPath==='none'&&!e.closest('[hidden]');}).map(e=>{const r=e.getBoundingClientRect();const x=Math.max(0,Math.min(innerWidth-1,r.x+r.width/2)),y=Math.max(0,Math.min(innerHeight-1,r.y+r.height/2));const hit=document.elementFromPoint(x,y);return {id:e.id,cls:e.className,label:e.getAttribute('aria-label')||e.innerText||e.title,x:r.x,y:r.y,w:r.width,h:r.height,inside:r.left>=-1&&r.right<=innerWidth+1,hit:hit===e||e.contains(hit),disabled:!!e.disabled};})}));
  report.pages.push({name,...state});await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:80});
 }
 await page.goto('http://127.0.0.1:5186/?debug',{waitUntil:'load'});await page.locator('#intro-enter').tap({timeout:120000});
 await page.waitForFunction(()=>!document.body.classList.contains('intro-pending'),null,{timeout:120000});await page.waitForTimeout(500);await inspect('showroom-390');
 for(const [w,h] of [[320,568],[844,390]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(600);await inspect('showroom-'+w);}
 await page.setViewportSize({width:390,height:844});
 for(const route of ['berserk','groups','projects','about','contact']){
  await page.goto('http://127.0.0.1:5186/'+route+'?debug',{waitUntil:'load'});await page.locator('#intro-enter').tap({timeout:120000});await page.waitForFunction(()=>!document.body.classList.contains('intro-pending'));await page.waitForTimeout(700);
  await inspect(route+'-390');
  if(route==='projects'){
   await page.locator('[data-project-open]').first().tap();await page.waitForTimeout(400);await inspect('project-dialog-390');await page.locator('[data-project-close]').tap();await page.waitForTimeout(250);
  }
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(300);await inspect(route+'-390-bottom');
  await page.setViewportSize({width:320,height:568});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(250);await inspect(route+'-320');await page.setViewportSize({width:390,height:844});
 }
})().catch(e=>{report.failure=e.stack;process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pages:report.pages.length,errors:report.errors,failure:report.failure}));if(browser)await browser.close();server.kill();});
