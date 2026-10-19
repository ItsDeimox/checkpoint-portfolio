/** Native-input regression suite. No sleep()/wake override, camera stepping,
 * synthetic frame deltas or disabled application RAF. Run with Playwright 1.56.1.
 * A software GPU validates behavior, not RTX 2060 frame-rate guarantees. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const base=process.env.DXT_BASE_URL||'http://127.0.0.1:3000',out=process.env.DXT_QA_OUT||'docs/stability-r23-qa';
fs.mkdirSync(out,{recursive:true});
const report={scope:'Native input and live render loops; software WebGL2',checks:[],errors:[],samples:[]};
const save=()=>fs.writeFileSync(path.join(out,'native-browser.json'),JSON.stringify(report,null,2));
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`,detail??'');save();if(!pass)throw Error(name);};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:900,height:600}});page.setDefaultTimeout(90000);
 page.on('pageerror',error=>report.errors.push(error.message));page.on('crash',()=>{report.errors.push('PAGE CRASH');save();});
 page.on('console',message=>{if(message.type()==='error'&&/THREE.WebGLProgram|VALIDATE_STATUS|shader error/i.test(message.text()))report.errors.push(message.text());});
 const source=fs.readFileSync('src/main.js','utf8');
 // Read-only handles are injected into the test response, never shipped.
 await page.route('**/src/main.js',route=>route.fulfill({contentType:'text/javascript',body:source+'\nwindow.__STABILITY__={scene:()=>scene,routes:()=>sections,experience:()=>sectionMedia.experience};'}));
 await page.addInitScript(()=>{
  localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'}));
  window.__AUDIT__={calls:{},tasks:[],beats:[],contextEvents:[],phase:'loading'};
  for(const key of ['createProgram','linkProgram','bufferData','texImage2D','texStorage2D','renderbufferStorageMultisample','deleteTexture','deleteFramebuffer']){
   const original=WebGL2RenderingContext.prototype[key];
   WebGL2RenderingContext.prototype[key]=function(...args){__AUDIT__.calls[key]=(__AUDIT__.calls[key]||0)+1;return original.apply(this,args);};
  }
  new PerformanceObserver(list=>{for(const task of list.getEntries())__AUDIT__.tasks.push({phase:__AUDIT__.phase,ms:task.duration,start:task.startTime});}).observe({type:'longtask',buffered:true});
  document.addEventListener('webglcontextlost',()=>__AUDIT__.contextEvents.push({type:'lost',phase:__AUDIT__.phase}),true);
  document.addEventListener('webglcontextrestored',()=>__AUDIT__.contextEvents.push({type:'restored',phase:__AUDIT__.phase}),true);
  let last=performance.now();setInterval(()=>{let now=performance.now();__AUDIT__.beats.push({phase:__AUDIT__.phase,ms:now-last});last=now;},50);
 });
 const phase=name=>page.evaluate(name=>__AUDIT__.phase=name,name);
 const sample=async label=>{
  const s=await page.evaluate(label=>{let s=__STABILITY__.scene();return{label,quality:s.settings.quality,changing:!!s.qualityChanging,error:s.qualityError,frames:s.frames,programs:s.renderer.info.programs.length,memory:{...s.renderer.info.memory},calls:{...__AUDIT__.calls},gpuWaits:s.gpuFrameGate.skipped};},label);
  report.samples.push(s);save();return s;
 };
 const position=async index=>page.evaluate(index=>{
  const s=__STABILITY__.scene(),p=s.panels[index],origin=p.corners[3],right=p.corners[2].clone().sub(origin),up=p.corners[0].clone().sub(origin);
  for(const v of[.78,.90,.62])for(const u of[.5,.75,.25,.9,.1]){
   const point=origin.clone().addScaledVector(right,u).addScaledVector(up,v).project(s.camera);
   const x=(point.x*.5+.5)*innerWidth,y=(.5-point.y*.5)*innerHeight;
   if(x>20&&x<innerWidth-20&&y>115&&y<innerHeight-65&&s.pick(x,y)===index)return{x,y};
  }
  throw Error('No visible interior point for panel '+index);
 },index);
 const aim=async index=>{
  for(let attempt=0;attempt<4;attempt++){
   const p=await position(index);await page.mouse.move(p.x,p.y);await page.waitForTimeout(350);
   if(await page.evaluate(index=>__STABILITY__.scene().hoverPanel===index,index))return p;
  }
  throw Error('Native pointer could not hover panel '+index);
 };
 try{
  await page.goto(base+'/?debug',{waitUntil:'load'});await page.locator('#intro-enter').click();
  await page.waitForFunction(()=>window.__DXT__?.inspect().phase==='ready'&&!document.body.classList.contains('intro-pending'),null,{timeout:180000});
  const initial=await sample('initial');
  const prepared=await page.evaluate(()=>{let s=__STABILITY__.scene(),e=__STABILITY__.experience(),r=__STABILITY__.routes();return{pageGraphics:e.gpuReady,portal:s.bannerPortal.prepared&&s.bannerPortal.scenePrepared,snap:r.pageCache.get(2).holder.querySelector('.destination-preview')?.naturalWidth,car:s.carPivot.position.toArray(),spot:s.carSpot?.intensity,beam:s.beams[0]?.material.uniforms.beamStrength.value};});
  check('all paths and the covered-car wall preview exist before entry unlocks',prepared.portal&&prepared.pageGraphics&&prepared.snap>200,prepared);
  check('car is centered and the neutral spotlight remains restrained',Math.abs(prepared.car[0])<.001&&prepared.spot===115&&prepared.beam>0&&prepared.beam<.3,prepared);
  await phase('native-quality');
  for(let i=0;i<6;i++){
   const before=performance.now();await page.locator('#quality').click();
   await page.waitForFunction(()=>!__STABILITY__.scene().qualityChanging&&__STABILITY__.scene().ready);
   const after=await sample('quality-'+i);
   check('quality change '+i+' completes without late program/geometry construction',!after.error&&after.programs===initial.programs&&after.calls.createProgram===initial.calls.createProgram&&after.calls.bufferData===initial.calls.bufferData,{...after,elapsedMs:performance.now()-before});
  }
  const paint=await page.evaluate(()=>{const s=__STABILITY__.scene(),colors=[];s.carPivot.traverse(o=>{for(const m of[o.material].flat().filter(Boolean))if(m.color)colors.push(m.color.getHexString());});return colors;});
  for(const index of[0,1,2,3,4]){
   await phase('hover-'+index);await aim(index);
   await page.waitForFunction(i=>{const s=__STABILITY__.scene();return s.identity.selected===i&&s.panels[i].material.uniforms.cardLevel.value>.98;},index);
   const hover=await page.evaluate(({index,paint})=>{
    const s=__STABILITY__.scene(),t=s.identity.color,ceil=s.scene.getObjectByName('Ceiling neon').material.color;
    const normalized=ceil.clone().multiplyScalar(1/Math.max(ceil.r,ceil.g,ceil.b)),goal=t.clone().multiplyScalar(1/Math.max(t.r,t.g,t.b));
    const actual=[];s.carPivot.traverse(o=>{for(const m of[o.material].flat().filter(Boolean))if(m.color)actual.push(m.color.getHexString());});
    return{selected:s.identity.selected,ceilingError:Math.abs(normalized.r-goal.r)+Math.abs(normalized.g-goal.g)+Math.abs(normalized.b-goal.b),paint:JSON.stringify(actual)===JSON.stringify(paint),levels:s.panels.map(p=>p.material.uniforms.cardLevel.value),energy:s.panelEnergy.entries[index].field.inspect()};
   },{index,paint});
   check('native hover '+index+' lights ceiling and floor, isolates card and preserves paint',hover.selected===index&&hover.ceilingError<.001&&hover.paint&&hover.levels.every((n,i)=>i===index||n<.15),hover);
   await phase('entry-'+index);const before=await sample('before-entry-'+index);
   const p=await position(index);await page.mouse.click(p.x,p.y);
   await page.waitForFunction(()=>__STABILITY__.routes().travelling||__STABILITY__.routes().page);
   const preview=await page.evaluate(()=>({inert:document.querySelector('#room-section-page').inert,connected:__STABILITY__.experience().graphics.canvas.isConnected}));
   check('portal '+index+' never starts the page renderer while travelling',preview.inert&&!preview.connected,preview);
   await page.waitForFunction(()=>__STABILITY__.routes().page,null,{timeout:120000});
   const arrived=await sample('arrived-'+index);
   check('first entry '+index+' reuses compiled programs and geometry',arrived.calls.createProgram===before.calls.createProgram&&arrived.calls.bufferData===before.calls.bufferData,arrived);
   check('page '+index+' remains readable, decoded and inside viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('#room-section-page img')].every(i=>i.complete&&i.naturalWidth>0)));
   if(index===0){
    const button=page.locator('[data-energy-button]'),box=await button.boundingBox();
    await page.mouse.move(box.x+box.width*.42,box.y+box.height*.5);await page.waitForTimeout(180);
    await button.screenshot({path:path.join(out,'play-cube-wave.png')});
    check('CTA uses the closed cube wave graph',await page.evaluate(()=>{const e=__STABILITY__.experience();return e.network.count===3458&&e.network.impulses>0&&e.graphics.mode==='energy';}));
    await page.mouse.move(30,120);await page.waitForFunction(()=>__STABILITY__.experience().raf===0,null,{timeout:15000});
    check('CTA renderer sleeps after the wave decays',true);
   }
   if(index===1){
    await page.locator('[data-group-track]').hover();await page.mouse.wheel(0,220);await page.waitForTimeout(800);
    check('groups advance only on explicit scroll and games remain non-links',await page.evaluate(()=>{let t=document.querySelector('[data-group-track]');return t.scrollLeft>t.clientWidth*.7&&[...document.querySelectorAll('[data-group-game]')].every(e=>!e.closest('a')&&!e.querySelector('a'));}));
   }
   if(index===2){
    await page.screenshot({path:path.join(out,'future-car.png')});
    check('covered car is live only after arrival and all seven projects remain',await page.evaluate(()=>__STABILITY__.experience().graphics.mode==='car'&&document.querySelectorAll('.future-project').length===7));
   }
   await phase('return-'+index);
   await page.locator('.section-return').click();await page.waitForFunction(()=>!__STABILITY__.routes().travelling&&!__STABILITY__.routes().page,null,{timeout:120000});
   const returned=await sample('returned-'+index);
   check('return '+index+' restores one live showroom and no stale graphics surface',await page.evaluate(()=>{let s=__STABILITY__.scene();return !s.pageActive&&!s.bannerPortal.active&&!__STABILITY__.experience().graphics.canvas.isConnected&&!!s.raf;}),returned);
   await page.mouse.move(450,555);await page.waitForTimeout(300);
  }
  await phase('resolution-quality');await page.setViewportSize({width:2560,height:1440});
  await page.locator('#quality').click();await page.waitForFunction(()=>!__STABILITY__.scene().qualityChanging);
  await page.locator('#quality').click();await page.waitForFunction(()=>!__STABILITY__.scene().qualityChanging);
  const high=await sample('1440p-high');check('1440p High stays bounded and responds after allocation',high.quality==='high'&&!high.error&&high.programs===initial.programs,high);
  await page.locator('#quality').click();await page.waitForFunction(()=>!__STABILITY__.scene().qualityChanging);
  await page.setViewportSize({width:900,height:600});
  await phase('reduced-motion');await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-open-panel="3"]').first().click();await page.waitForFunction(()=>__STABILITY__.routes().page);
  check('reduced motion retains instant native navigation',await page.evaluate(()=>__STABILITY__.routes().index===3&&!__STABILITY__.routes().travelling));
  await phase('complete');
  report.telemetry=await page.evaluate(()=>__AUDIT__);
  check('no unexpected context loss, page crash or shader error',report.errors.length===0&&report.telemetry.contextEvents.length===0,report.errors);
 }catch(error){report.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{try{report.telemetry=await page.evaluate(()=>__AUDIT__);}catch{}save();await browser.close();}
})();
