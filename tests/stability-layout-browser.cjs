/** Real DOM navigation and pointer input. Covers desktop and 390px mobile. */
const {chromium}=require('playwright'),fs=require('fs');
const out=process.env.DXT_QA_OUT||'docs/stability-r23-qa/layout',base=process.env.DXT_BASE_URL||'http://127.0.0.1:3000';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(45000);
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 const main=fs.readFileSync('src/main.js','utf8');
 await page.route('**/src/main.js',r=>r.fulfill({contentType:'text/javascript',body:main+'\nwindow.__QA__={scene:()=>scene,sections:()=>sections,experience:()=>sectionMedia.experience};'}));
 try{
 await page.goto(base+'/berserk?debug');await page.locator('#intro-enter').click();
 await page.waitForFunction(()=>window.__QA__?.experience()?.gpuReady&&!document.body.classList.contains('intro-pending'));
 const button=page.locator('[data-energy-button]'),box=await button.boundingBox();
 await page.mouse.move(box.x+25,box.y+box.height*.4);
 await page.mouse.move(box.x+box.width*.7,box.y+box.height*.6,{steps:24});
 await page.waitForTimeout(140);console.log('CTA',await page.evaluate(()=>__QA__.experience().network.inspect()));
 await button.screenshot({path:out+'/cta-hover.png'});await page.screenshot({path:out+'/berserk.png'});
 await page.mouse.move(20,20);await page.waitForFunction(()=>__QA__.experience().raf===0,null,{timeout:15000});checks.push({test:'CTA wave decays without a stationary cursor source',pass:true});
 for(const i of[1,2,3,4]){
  await page.locator(`[data-section-route="${i}"]`).click();await page.waitForFunction(i=>__QA__.sections().index===i&&__QA__.sections().page,i);
  await page.waitForTimeout(500);const stats=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,images:[...document.querySelectorAll('#room-section-page img')].every(i=>i.complete&&i.naturalWidth>0),mode:__QA__.experience().graphics?.mode}));
  console.log('PAGE',i,stats);checks.push({test:'page '+i,pass:!stats.overflow&&stats.images});
  await page.screenshot({path:out+'/page-'+i+'.png'});
  if(i===1){await page.locator('[data-group-track]').hover();await page.mouse.wheel(0,280);await page.waitForTimeout(750);console.log('GROUP',await page.locator('[data-group-track]').evaluate(e=>e.scrollLeft));}
  if(i===2){console.log('CAR',await page.evaluate(()=>({mode:__QA__.experience().graphics.mode,size:[__QA__.experience().graphics.canvas.width,__QA__.experience().graphics.canvas.height]})));await page.locator('[data-scroll-catalogue]').click();await page.waitForTimeout(800);await page.screenshot({path:out+'/catalogue.png'});}
 }
 await page.setViewportSize({width:390,height:844});
 for(const i of[0,1,2,3,4]){await page.locator(`[data-section-route="${i}"]`).click();await page.waitForTimeout(350);let width=await page.evaluate(()=>document.documentElement.scrollWidth);checks.push({test:'mobile '+i,pass:width<=390,width});await page.screenshot({path:out+'/mobile-'+i+'.png'});}
 console.log('ERRORS',errors);fs.writeFileSync(out+'/layout-browser.json',JSON.stringify({scope:'Native desktop and mobile page layout',errors,checks},null,2));if(errors.length||checks.some(c=>!c.pass))throw Error('Native layout audit failed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
