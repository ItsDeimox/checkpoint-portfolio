const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const out=path.resolve(process.env.DXT_QA_OUT||'docs/r32-qa');
fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],screenshots:[],environment:'Chromium headless, software WebGL; functional and layout checks, not a hardware FPS benchmark'};
function check(name,pass,detail){report.checks.push({name,pass:Boolean(pass),detail:detail===undefined?undefined:structuredClone(detail)});if(!pass)throw Error(name+' '+JSON.stringify(detail));}
const server=spawn(process.execPath,['tools/server.mjs','--port','5186'],{stdio:'inherit'});
let browser,page;
(async()=>{
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:5186/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 report.browser=browser.version();
 page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.setDefaultTimeout(20000);
 page.on('pageerror',e=>report.errors.push(e.message));
 const galleryRequests=[];
 page.on('request',r=>{if(r.url().includes('/assets/projects/'))galleryRequests.push(r.url());});
 await page.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'})));
 await page.goto('http://127.0.0.1:5186/projects?debug',{waitUntil:'load'});
 await page.locator('#intro-enter').click({timeout:120000});
 await page.waitForFunction(()=>!document.body.classList.contains('intro-pending')&&!document.querySelector('#room-section-page').inert,null,{timeout:120000});
 await page.waitForFunction(()=>document.querySelectorAll('[data-project-open]').length===6);
 check('six project cards, with Rally removed',await page.locator('.future-project').count()===6&&!await page.locator('.future-catalogue').innerText().then(s=>s.includes('BERSERK DRIFT: RALLY')));
 check('gallery images are lazy and not downloaded before opening a project',galleryRequests.length===0,galleryRequests);
 check('decorative line is gone while overhead light remains',await page.evaluate(()=>{const stage=document.querySelector('.future-car-stage'),pseudo=getComputedStyle(stage,'::before');return ['none','normal',''].includes(pseudo.content)&&getComputedStyle(document.querySelector('.future-car-light')).backgroundImage.includes('conic-gradient');}));
 async function shot(name){await page.screenshot({path:path.join(out,name),type:'jpeg',quality:82});report.screenshots.push(name);}
 async function readyImage(){
  await page.waitForFunction(()=>{const i=document.querySelector('[data-project-stage] img');return i&&i.complete&&i.naturalWidth>0;});
  return page.locator('[data-project-stage] img').evaluate(async i=>{
   // Natural dimensions can be known before an async-decoding image has been
   // painted. Visual evidence must wait for decode and presentation, not just load.
   await i.decode();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const box=i.getBoundingClientRect();
   return {src:new URL(i.src).pathname,w:i.naturalWidth,h:i.naturalHeight,fit:getComputedStyle(i).objectFit,paintWidth:box.width,paintHeight:box.height};
  });
 }
 const cases=[
  {name:'Right Cut!',credit:'OhTaldoPedro',paths:['right-cut/cover.webp','right-cut/precision-cut.webp','right-cut/fruit-mode.webp'],dimensions:[[1254,1254],[1781,786],[1672,785]],shot:'right-cut-desktop.jpg'},
  {name:'Unnamed Drift Game',credit:'Xablow',paths:['unnamed-drift/car-selection.webp','unnamed-drift/drift-gameplay.webp','unnamed-drift/drift-transition.webp'],dimensions:[[1915,1070],[1914,1071],[1880,1027]],shot:'unnamed-drift-desktop.jpg'}
 ];
 for(const item of cases){
  const button=page.getByRole('button',{name:'View '+item.name+' details',exact:true});
  await button.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
  const before=await page.evaluate(()=>({y:scrollY,x:scrollX}));
  await button.click();await page.waitForTimeout(300);
  check(item.name+' opens the matching project',await page.locator('#future-project-title').innerText()===item.name);
  check(item.name+' has the supplied collaborators',await page.locator('.fp-facts').innerText().then(s=>s.includes('DXT')&&s.includes(item.credit)));
  check(item.name+' does not jump the page behind the modal',await page.evaluate(p=>Math.abs(scrollY-p.y)<=1&&Math.abs(scrollX-p.x)<=1,before));
  const arrows=await page.locator('#future-project-dialog [data-project-step]').evaluateAll(elements=>{
   const stage=document.querySelector('#future-project-dialog [data-project-stage]').getBoundingClientRect();
   return elements.map(element=>{const r=element.getBoundingClientRect();return {
    x:r.x,width:r.width,centerY:r.top+r.height/2,inside:r.left>=stage.left&&r.right<=stage.right&&r.top>=stage.top&&r.bottom<=stage.bottom
   };});
  });
  check(item.name+' shows two accessible arrows within the image, not the PHOTO choice strip',arrows.length===2&&arrows.every(a=>a.inside)&&await page.locator('[data-project-media]').count()===0,arrows);
  check(item.name+' description is English and nonempty',await page.locator('.fp-description').innerText().then(s=>s.length>100&&!/Será|possui|jogador|Colaboradores/.test(s)));
  if(item.name==='Right Cut!')check('Right Cut includes the final-game disclaimer',await page.locator('.fp-development-note').innerText().then(s=>s.includes('do not represent the final game')));
  for(let i=0;i<3;i++){
   if(i>0)await page.locator('[data-project-step="1"]').click();
   const media=await readyImage();
   check(item.name+' photo '+(i+1)+' uses the supplied asset at its original resolution',media.src==='/assets/projects/'+item.paths[i]&&media.w===item.dimensions[i][0]&&media.h===item.dimensions[i][1]&&media.fit==='contain'&&media.paintWidth>100&&media.paintHeight>100,media);
  }
  // Last slide wraps to the first, then Previous wraps back to last.
  await page.locator('[data-project-step="1"]').click();await readyImage();
  check(item.name+' next arrow wraps the gallery',await page.locator('[data-project-stage] img').evaluate((img,name)=>new URL(img.src).pathname.endsWith(name),item.paths[0]));
  await page.locator('[data-project-step="-1"]').click();await readyImage();
  check(item.name+' previous arrow wraps in the other direction',await page.locator('[data-project-stage] img').evaluate((img,name)=>new URL(img.src).pathname.endsWith(name),item.paths[2]));
  await page.locator('[data-project-step="1"]').click();await readyImage();await shot(item.shot);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#future-project-dialog')?.open);
  check(item.name+' restores the same scroll position on close',await page.evaluate(p=>Math.abs(scrollY-p.y)<=1&&Math.abs(scrollX-p.x)<=1,before));
  check(item.name+' closing does not leave Future Projects',new URL(page.url()).pathname==='/projects');
 }
 for(const label of ['Procedural Tiremark Generator','Procedural Vegetation Placer','Drift Judge Score System','FFB System']){
  await page.getByRole('button',{name:'View '+label+' details',exact:true}).click();
  check(label+' retains its original empty-media state without slideshow controls',await page.locator('#future-project-title').innerText()===label&&await page.locator('.fp-empty').isVisible()&&await page.locator('[data-project-step]').count()===0);
  await page.locator('[data-project-close]').click();await page.waitForFunction(()=>!document.querySelector('#future-project-dialog')?.open);
 }
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  await page.getByRole('button',{name:'View Right Cut! details',exact:true}).click();await readyImage();await page.waitForTimeout(300);
  const sizes=await page.evaluate(()=>{const d=document.querySelector('#future-project-dialog');return{page:document.documentElement.scrollWidth,viewport:innerWidth,width:d.getBoundingClientRect().width,client:d.clientWidth,scroll:d.scrollWidth};});
  check(width+'px modal and page fit without horizontal overflow',sizes.page<=width&&sizes.width<=width&&sizes.scroll<=sizes.client+1,sizes);
  await shot('right-cut-'+width+'.jpg');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#future-project-dialog')?.open);
 }
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);await shot('covered-car-no-line.jpg');
 check('no uncaught JavaScript errors',report.errors.length===0,report.errors);
})().catch(async error=>{report.failure=error.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:80}).catch(()=>{});}).finally(async()=>{
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.pass).length,errors:report.errors,failure:report.failure},null,2));
 if(browser)await browser.close();server.kill();
});
