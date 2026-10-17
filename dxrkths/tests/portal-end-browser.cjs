const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const base=process.env.DXT_BASE_URL||'http://127.0.0.1:3000',out=path.resolve('docs/r20');fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[],records=[];let browser;
const check=(name,ok,detail)=>{checks.push({name,pass:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name);if(!ok)throw Error(name+' '+JSON.stringify(detail));};
(async()=>{
 browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars'],args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:900,height:600}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({quality:'low',qualityPreference:'manual'})));
 const source=fs.readFileSync('src/main.js','utf8');
 await page.route('**/src/main.js',r=>r.fulfill({contentType:'text/javascript',body:source+'\nwindow.__exitProbe={scene:()=>scene,routes:()=>sections};\n'}));
 await page.goto(base+'/?debug',{waitUntil:'load'});await page.locator('#intro-enter').click();
 await page.waitForFunction(()=>__DXT__.inspect().phase==='ready'&&!document.body.classList.contains('intro-pending')&&__DXT__.inspect().brand?.ready,null,{polling:100,timeout:60000});
 await page.evaluate(()=>{const s=__exitProbe.scene();s.sleep();window.__savedWake=s.wake;s.wake=()=>{};});
 async function start(index){await page.evaluate(index=>{const r=__exitProbe.routes();r.close('none',true);r.open(index,null,'none');window.__title=document.querySelector('#section-title');},index);}
 async function frame(progress){return page.evaluate(progress=>{
  const s=__exitProbe.scene(),p=s.bannerPortal,target=1.05+progress*1.15;let n=0;
  while(p.active&&p.age<target-1e-8&&n++<500)s.cameraRig.update(Math.min(1/60,target-p.age));
  if(p.active)s.render(1/60,0);
  const root=document.querySelector('#room-section-page'),box=e=>{const b=e.getBoundingClientRect();return[b.x,b.y,b.width,b.height]};
  return {progress,rect:box(root),title:box(document.querySelector('#section-title')),sameTitle:window.__title===document.querySelector('#section-title'),opacity:+getComputedStyle(root).opacity,inert:root.inert,hidden:root.hidden,host:document.querySelector('.room-hero').hidden,projection:p.exitFrame,brand:box(document.querySelector('.room-brand-logo')),glError:s.renderer.getContext().getError(),arrival:root.dataset.portalArrival};
 },progress);}
 for(let index=0;index<5;index++){
  await start(index);
  const a=await frame(.1),b=await frame(.5),c=await frame(.85),d=await frame(.999),e=await frame(1);
  check('page '+index+' begins as a small opaque destination at the far end',a.rect[2]<160&&a.rect[2]>15&&a.opacity===1&&a.inert&&!a.host,a);
  check('page '+index+' grows by camera perspective, not a fullscreen fade',b.rect[2]>a.rect[2]&&b.rect[2]<350&&c.rect[2]>b.rect[2]&&b.opacity===1&&c.opacity===1,{widths:[a.rect[2],b.rect[2],c.rect[2]]});
  const q=b.projection.quad,w=b.projection.width,h=b.projection.height,expected=[q[0][0]*w,q[0][1]*h,(q[1][0]-q[0][0])*w,(q[3][1]-q[0][1])*h];
  check('page '+index+' is geometrically registered to the world-space exit aperture',Math.max(...b.rect.map((v,i)=>Math.abs(v-expected[i])))<.15,{actual:b.rect,expected});
  check('page '+index+' finishes without a second zoom, DOM replacement or layout jump',e.sameTitle&&!e.inert&&e.opacity===1&&e.host&&Math.max(...e.title.map((v,i)=>Math.abs(v-d.title[i])))<.15,{before:d.title,after:e.title});
  check('page '+index+' leaves the persistent navbar in exactly the same place',Math.max(...e.brand.map((v,i)=>Math.abs(v-a.brand[i])))<.1);
  check('page '+index+' has no WebGL error',a.glError===0&&b.glError===0&&c.glError===0&&d.glError===0);
  records.push({index,a,b,c,d,e});
 }
 // Filmstrip is actual browser output at exact camera states, not a concept image.
 await start(0);const shots=[];
 for(const t of[.1,.35,.55,.72,.85,.97]){await frame(t);const image=await page.screenshot();shots.push({input:await sharp(image).resize(450,300).toBuffer(),left:(shots.length%3)*450,top:Math.floor(shots.length/3)*300});if(t===.55)await sharp(image).jpeg({quality:88}).toFile(path.join(out,'corridor-exit-mid.jpg'));}
 await sharp({create:{width:1350,height:600,channels:3,background:'#070709'}}).composite(shots).jpeg({quality:86}).toFile(path.join(out,'exit-zoom-filmstrip.jpg'));
 await frame(1);
 for(const [width,height]of[[390,844],[320,640],[1440,1800]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>{__exitProbe.routes().close('none',true);__exitProbe.scene().resize();});await start(width===1440?2:0);
  const before=await frame(.999),after=await frame(1);
  check('responsive '+width+'x'+height+' keeps its exact page layout after crossing the exit',Math.max(...after.title.map((v,i)=>Math.abs(v-before.title[i])))<.2,{before:before.title,after:after.title});
  check('responsive '+width+' has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.setViewportSize({width:600,height:480});await page.evaluate(()=>{__exitProbe.routes().close('none',true);__exitProbe.scene().resize();});await start(0);await frame(1);
 await page.locator('[data-gallery-select="2"]').click();await page.waitForFunction(()=>document.querySelector('[data-gallery-main]').src.endsWith('/game-3.webp'),null,{polling:100});check('committed gallery remains interactive',true);
 check('Play retains the supplied Roblox destination',await page.locator('.berserk-play-button').evaluate(e=>e.href.includes('/136449173422746/')&&e.target==='_blank'));
 await start(2);await frame(.5);await page.keyboard.press('Escape');check('Escape removes the physical preview without a late flash',await page.evaluate(()=>document.querySelector('#room-section-page').hidden&&!document.body.classList.contains('section-arriving')));
 await page.evaluate(()=>{const s=__exitProbe.scene();s.wake=window.__savedWake;s.resumeShowroom();window.__native=[];window.__tracing=true;const tick=()=>{if(!__tracing)return;const root=document.querySelector('#room-section-page'),b=root.getBoundingClientRect();__native.push({active:__DXT__.inspect().scene?.portal.active,page:__DXT__.inspect().section.active,hidden:root.hidden,host:document.querySelector('.room-hero').hidden,width:b.width,opacity:+getComputedStyle(root).opacity});requestAnimationFrame(tick);};tick();});
 await page.locator('header [data-open-panel="3"]').click();await page.waitForFunction(()=>__DXT__.inspect().section.active&&location.pathname==='/about',null,{polling:150,timeout:150000});
 const native=await page.evaluate(()=>{__tracing=false;return __native;});
 check('native animation shows a small fully visible page before reaching it',native.some(f=>f.active&&!f.hidden&&f.opacity===1&&f.width>15&&f.width<180));
 check('native animation never hides both the world and the page',native.every(f=>!f.host||(!f.hidden&&f.opacity>=.999)));
 await page.locator('#brand-spin').click();check('logo still spins and returns home',await page.evaluate(()=>location.pathname==='/'&&__DXT__.inspect().brand.spinning));await page.waitForFunction(()=>!__DXT__.inspect().section.returning&&!__DXT__.inspect().section.travelling,null,{polling:200,timeout:100000});check('original reverse journey still completes',true);
 await page.close();
 const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args);};});await fallback.goto(base+'/berserk?debug');await fallback.locator('#intro-enter').click();await fallback.waitForFunction(()=>!document.body.classList.contains('intro-pending'),null,{polling:100});check('direct reduced-motion/no-WebGL route remains usable',await fallback.locator('#room-section-page').evaluate(e=>!e.hidden&&!e.inert));
 check('no JavaScript errors in tested flows',errors.length===0,errors);
 fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({browser:browser.version(),renderer:'ANGLE SwiftShader',checks,errors,records,native},null,2));await browser.close();console.log('TOTAL',checks.length);
})().catch(async error=>{console.error(error.stack);fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({checks,errors,error:error.stack},null,2));await browser?.close();process.exit(1);});
