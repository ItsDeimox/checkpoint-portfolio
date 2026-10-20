const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const out='docs/destination-r22-qa',base=process.env.DXT_BASE_URL||'http://127.0.0.1:3000';fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[],screenshots=[],timings=[];
const check=(name,condition,detail)=>{checks.push({name,pass:!!condition,detail});console.log((condition?'PASS ':'FAIL ')+name);if(!condition)throw Error(name+' '+JSON.stringify(detail));};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1024,height:720}});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/THREE.WebGLProgram|VALIDATE_STATUS|shader error/i.test(message.text()))errors.push(message.text());});
 const main=fs.readFileSync('src/main.js','utf8');
 await page.route('**/src/main.js',route=>route.fulfill({contentType:'text/javascript',body:main+'\nwindow.__DEST_QA__={scene:()=>scene,routes:()=>sections,experience:()=>sectionMedia.experience,music:()=>soundtrack};\n'}));
 await page.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({quality:'low',qualityPreference:'manual'})));
 await page.goto(base+'/?debug',{waitUntil:'load'});await page.locator('#intro-enter').click();
 await page.waitForFunction(()=>window.__DXT__?.inspect().phase==='ready'&&!document.body.classList.contains('intro-pending'),null,{timeout:120000,polling:100});
 const cold=await page.evaluate(()=>{const s=__DEST_QA__.scene(),e=__DEST_QA__.experience();return{ready:e.gpuReady,prepared:s.bannerPortal.prepared&&s.bannerPortal.scenePrepared,beams:s.beams.length,strength:s.identity.strength,selected:s.identity.selected,gl:s.renderer.getContext().getError()};});
 check('all page shaders and portal draws finish before entry unlocks',cold.ready&&cold.prepared,cold);
 check('showroom starts neutral with the overhead volume removed',cold.beams===0&&cold.selected===null&&cold.strength<.05,cold);
 await page.evaluate(()=>{const s=__DEST_QA__.scene();s.sleep();s.wake=()=>{};__DEST_QA__.music().setEnabled(false);window.__paint=[];s.carPivot.traverse(o=>{if(o.material)for(const m of[o.material].flat())if(m.color)__paint.push([m,m.color.getHexString()]);});});
 for(let index=0;index<5;index++){
  const result=await page.evaluate(index=>{const s=__DEST_QA__.scene();s.hoverPanel=index;for(let i=0;i<150;i++)s.identity.update(1/60);s.render(1/60,0);return{selected:s.identity.selected,color:s.identity.color.getHexString(),levels:s.panels.map(p=>p.material.uniforms.cardLevel.value),paint:__paint.every(([m,c])=>m.color.getHexString()===c),gl:s.renderer.getContext().getError()};},index);
  check('card '+index+' selects the right color and dims all other screens',result.selected===index&&result.levels[index]>.98&&result.levels.every((n,i)=>i===index||n<.14),result);
  check('card '+index+' preserves vehicle paint and raises no GL error',result.paint&&result.gl===0,result);
  const file='hover-'+index+'.png';await page.screenshot({path:path.join(out,file)});screenshots.push(file);
 }
 await page.evaluate(()=>{const s=__DEST_QA__.scene();s.hoverPanel=-1;s.identity.update(0,true);});
 for(const index of[0,1,2,3,4]){
  await page.evaluate(index=>__DEST_QA__.routes().open(index,null,'none',true),index);await page.waitForTimeout(900);
  check('page '+index+' has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check('page '+index+' retains only decoded real images',await page.evaluate(()=>[...document.querySelectorAll('#room-section-page img')].every(i=>i.complete&&i.naturalWidth>0)));
  if(index===0){
   check('Berserk has one play link, retained gallery and no community section',await page.evaluate(()=>document.querySelectorAll('.berserk-play-button').length===1&&!!document.querySelector('[data-game-gallery]')&&!document.querySelector('.section-links')));
   await page.locator('[data-energy-button]').hover();await page.waitForTimeout(300);
   check('Play Now uploads a propagating energy network on pointer interaction',await page.evaluate(()=>{const e=__DEST_QA__.experience();return e.network.activeCount()>3&&e.graphics.mode==='energy'&&e.graphics.renderer.getContext().getError()===0;}));
   await page.screenshot({path:path.join(out,'play-energy.png')});screenshots.push('play-energy.png');
   await page.mouse.move(20,20);await page.waitForTimeout(4500);
   check('the button renderer stops after its energy has decayed',await page.evaluate(()=>__DEST_QA__.experience().raf===0));
  }
  if(index===1){
   const track=page.locator('[data-group-track]');
   await track.scrollIntoViewIfNeeded();await track.hover();
   const initial=await page.evaluate(()=>({y:scrollY,x:document.querySelector('[data-group-track]').scrollLeft}));
   await page.mouse.wheel(0,240);await page.waitForTimeout(450);
   const afterVertical=await page.evaluate(()=>({y:scrollY,x:document.querySelector('[data-group-track]').scrollLeft}));
   check('normal vertical wheel scrolls page without changing Groups & Games',afterVertical.y>initial.y+35&&Math.abs(afterVertical.x-initial.x)<2,{initial,afterVertical});
   await track.hover();
   // Synthetic Shift+wheel checks the explicit carousel shortcut even when
   // the host OS remaps physical Shift+wheel to deltaX before dispatch.
   await track.evaluate(e=>e.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,shiftKey:true,deltaY:220})));
   await page.waitForTimeout(850);
   check('explicit Shift + wheel changes group, rather than autoplay',await track.evaluate(e=>e.scrollLeft>e.clientWidth*.7));
   check('group game media never navigates to a game',await page.evaluate(()=>[...document.querySelectorAll('[data-group-game]')].every(e=>!e.closest('a')&&!e.querySelector('a'))));
   const stable=await track.evaluate(e=>e.scrollLeft);await page.waitForTimeout(700);
   check('groups stay still after scrolling',Math.abs(await track.evaluate((e,left)=>e.scrollLeft-left,stable))<1);
   await page.locator('[data-group-select="0"]').click();await page.waitForTimeout(500);
   check('native group selection buttons still work',await track.evaluate(e=>e.scrollLeft<5));
   await track.hover();
   const rect=await track.boundingBox();
   const sx=rect.x+rect.width*.8,ex=rect.x+rect.width*.16,y=rect.y+Math.min(rect.height*.12,46);
   await page.mouse.move(sx,y);await page.mouse.down();await page.mouse.move(ex,y,{steps:10});await page.mouse.up();
   await page.waitForTimeout(600);
   check('horizontal mouse drag switches the group',await track.evaluate(e=>e.scrollLeft>e.clientWidth*.7));
  }
  if(index===2){
   check('future car uses the live 3D surface and a complete catalogue',await page.evaluate(()=>{const e=__DEST_QA__.experience();return e.graphics.mode==='car'&&document.querySelector('[data-covered-car]').dataset.graphicsReady==='true'&&document.querySelectorAll('.future-project').length===7&&e.graphics.renderer.getContext().getError()===0;}));
   await page.screenshot({path:path.join(out,'covered-car.png')});screenshots.push('covered-car.png');
   await page.locator('[data-scroll-catalogue]').click();await page.waitForTimeout(1000);
   check('scroll cue reveals the project catalogue',await page.evaluate(()=>document.querySelector('.future-category').classList.contains('is-revealed')));
  }
  if(index===3)check('About has the authored bio and a real transparent portrait',await page.evaluate(()=>document.querySelector('[data-portrait] img').src.includes('avatar-cutout.webp')&&document.querySelector('.section-personal').textContent.includes('tenho 22 anos')));
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
  const file='page-'+index+'.png';await page.screenshot({path:path.join(out,file),fullPage:true});screenshots.push(file);
 }
 for(const [w,h]of[[390,844],[320,640]]){
  await page.setViewportSize({width:w,height:h});
  for(let i=0;i<5;i++){await page.evaluate(i=>__DEST_QA__.routes().open(i,null,'none',true),i);await page.waitForTimeout(300);check(w+'px page '+i+' fits without horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>__DEST_QA__.routes().open(2,null,'none',true));await page.waitForTimeout(500);
 check('reduced motion draws the car once without an animation loop',await page.evaluate(()=>__DEST_QA__.experience().raf===0));
 await page.evaluate(()=>__DEST_QA__.routes().close('none',true));
 check('returning to showroom stops and detaches page graphics',await page.evaluate(()=>{const e=__DEST_QA__.experience();return e.raf===0&&!e.graphics.canvas.isConnected;}));
 check('no browser or shader errors in tested flows',errors.length===0,errors);
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({checks,errors,screenshots,timings,browser:browser.version()},null,2));await browser.close();
})().catch(error=>{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({checks,errors,screenshots,error:error.stack},null,2));console.error(error);process.exit(1);});
