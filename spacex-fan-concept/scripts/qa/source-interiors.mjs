import{chromium as pw}from'playwright-core';import chromium from'@sparticuz/chromium';import assert from'node:assert/strict';import fs from'node:fs';
const browser=await pw.launch({executablePath:process.env.CHROMIUM_PATH||await chromium.executablePath(),args:[...chromium.args,'--enable-unsafe-swiftshader'],headless:true}),context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'}),p=await context.newPage(),errors=[],pass=[],fail=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.setDefaultTimeout(40000);
async function check(n,fn){try{await fn();pass.push(n);console.log('PASS',n);}catch(e){fail.push({name:n,error:e.message});console.log('FAIL',n,e.message.slice(0,600));}}
const act=async e=>{const before=await p.evaluate(()=>__SPACEX_QA__.stats().frames);await p.evaluate(e=>__SPACEX_QA__.action(e),e);await p.waitForFunction(n=>__SPACEX_QA__.stats().frames>n,before);};
await p.goto((process.env.BASE_URL||'http://localhost:4173/')+'?qa');await p.waitForFunction(()=>window.__SPACEX_QA__);await p.evaluate(()=>__SPACEX_QA__.quality('low'));await p.waitForFunction(()=>__SPACEX_QA__.assets()[1]==='licensed-eco');
for(const [index,part,feature]of[[1,'engines','octaweb'],[1,'interstage','upper-stage-aft-dome'],[1,'fairing','payload-adapter'],[2,'fairing','payload-adapter'],[2,'interstage','upper-stage-aft-dome'],[3,'interstage','hotstage-frame'],[3,'tanks','booster-dome-downcomer'],[3,'engines','booster-raptors'],[3,'fairing','ship-tank-hardware']]){
 await act({type:'NAVIGATE',index});await p.waitForFunction(i=>__SPACEX_QA__.assets()[i]?.startsWith('licensed'),index);await act({type:'FOCUS',part});await p.waitForFunction(k=>__SPACEX_QA__.stats().inspection===k,`${index}:${part}:fairing`);
 await check(`${index}/${part}: only preauthored features enable internal mode`,async()=>{const v=await p.evaluate(()=>__SPACEX_QA__.inspection());assert.equal(v.supportsInterior,true);assert.ok(v.features.includes(feature));assert.ok(v.internalMeshes>0);assert.equal(v.coverage.complete,false);assert.equal(await p.locator('#view-cutaway').isVisible(),true);assert.match(await p.locator('#assembly-source').getAttribute('href'),/sketchfab/);console.log('CAPABILITY',JSON.stringify(v));});
 await p.screenshot({path:`/tmp/interior-${index}-${part}-assembled.png`});
 await check(`${index}/${part}: original structures can be exposed and restored`,async()=>{await p.click('#view-cutaway');await p.waitForFunction(()=>__SPACEX_QA__.stats().internalProgress===1);assert.equal((await p.evaluate(()=>__SPACEX_QA__.inspection())).interiorVisible,true);await p.screenshot({path:`/tmp/interior-${index}-${part}-inside.png`});await p.click('#view-exterior');await p.waitForFunction(()=>__SPACEX_QA__.stats().internalProgress===0);});
}
await check('missing tank internals do not enable fabricated cutaways',async()=>{await act({type:'NAVIGATE',index:1});await act({type:'FOCUS',part:'tanks'});assert.equal((await p.evaluate(()=>__SPACEX_QA__.inspection())).supportsInterior,false);assert.equal(await p.locator('.inspection-controls').isVisible(),false);assert.match(await p.locator('#interior-note').textContent(),/NOT AVAILABLE/);});
await check('Heavy booster tanks and the local Dragon shell never claim unsupported internal structures',async()=>{await act({type:'NAVIGATE',index:2});await p.waitForFunction(()=>__SPACEX_QA__.assets()[2]?.startsWith('licensed'));await act({type:'FOCUS',part:'tanks'});assert.equal((await p.evaluate(()=>__SPACEX_QA__.inspection())).supportsInterior,false);await act({type:'DRAGON'});await p.waitForFunction(()=>__SPACEX_QA__.stats().inspection==='1:fairing:dragon');assert.equal((await p.evaluate(()=>__SPACEX_QA__.inspection())).supportsInterior,false);});
await act({type:'NAVIGATE',index:1});await act({type:'FOCUS',part:'interstage'});
await check('quality replacement preserves supported internal mode',async()=>{await p.click('#view-cutaway');await p.waitForFunction(()=>__SPACEX_QA__.stats().internalProgress===1);await p.evaluate(()=>__SPACEX_QA__.quality('high'));await p.waitForFunction(()=>__SPACEX_QA__.assets()[1]==='licensed-high');await p.waitForFunction(()=>__SPACEX_QA__.stats().internalProgress===1);assert.equal((await p.evaluate(()=>__SPACEX_QA__.inspection())).internalMeshes>0,true);});
await check('source structure does not retain stale opacity on return',async()=>{await act({type:'BACK'});await act({type:'FOCUS',part:'interstage'});assert.equal((await p.evaluate(()=>__SPACEX_QA__.stats())).internalProgress,0);assert.equal(await p.locator('#view-exterior').getAttribute('aria-pressed'),'true');});
await p.evaluate(()=>__SPACEX_QA__.quality('low'));await p.setViewportSize({width:390,height:844});await act({type:'FOCUS',part:'interstage'});
await check('mobile internal controls are reachable and view stays framed',async()=>{await p.locator('#view-cutaway').scrollIntoViewIfNeeded();await p.click('#view-cutaway');await p.waitForFunction(()=>__SPACEX_QA__.stats().internalProgress===1);const points=await p.evaluate(()=>__SPACEX_QA__.framing());assert.ok(points.every(([x,y])=>x>0&&x<390&&y>30&&y<844));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:'/tmp/interior-mobile.png'});});
await check('idle rendering sleeps with internal mode active',async()=>{await p.mouse.move(2,110);await p.waitForTimeout(500);const n=await p.evaluate(()=>__SPACEX_QA__.stats().frames);await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>__SPACEX_QA__.stats().frames),n);});
await p.setViewportSize({width:1000,height:700});await p.emulateMedia({reducedMotion:'no-preference'});
await check('inner covers and focus transition continuously',async()=>{await p.click('#view-exterior');await p.waitForFunction(()=>__SPACEX_QA__.stats().internalProgress===0);await p.click('#view-cutaway');await p.waitForFunction(()=>{const s=__SPACEX_QA__.stats();return s.internalProgress>.05&&s.internalProgress<.95;});await p.waitForFunction(()=>__SPACEX_QA__.stats().internalProgress===1);});
await check('changing modules interrupts the internal view safely',async()=>{await act({type:'FOCUS',part:'tanks'});await p.waitForFunction(()=>!__SPACEX_QA__.stats().transition&&!__SPACEX_QA__.stats().retiring);assert.equal((await p.evaluate(()=>__SPACEX_QA__.inspection())).supportsInterior,false);assert.equal(await p.locator('.inspection-controls').isVisible(),false);});
for(const target of ['starship/tanks','falcon-9/fairing','falcon-heavy/interstage']){
 await check('direct interior link opens '+target,async()=>{
  await p.goto((process.env.BASE_URL||'http://localhost:4173/')+'?qa&inside='+target);
  await p.waitForFunction(()=>window.__SPACEX_QA__?.stats().internalProgress===1);
  assert.equal(await p.locator('#view-cutaway').getAttribute('aria-pressed'),'true');
  assert.equal((await p.evaluate(()=>__SPACEX_QA__.state())).part,target.split('/')[1]);
 });
}
await check('return to assembled during a Heavy interior retry cancels automatic opening',async()=>{
 const tab=await p.context().newPage();
 await tab.emulateMedia({reducedMotion:'reduce'});
 try{
  let block=true,release;const gate=new Promise(resolve=>release=resolve);
  await tab.route('**/assets/falcon9-*.glb',async route=>{if(block)return route.abort('failed');await gate;return route.continue();});
  await tab.goto((process.env.BASE_URL||'http://localhost:4173/')+'?qa&inside=falcon-heavy/interstage');
  await tab.waitForFunction(()=>window.__SPACEX_QA__?.assets()[1]==='unavailable');
  block=false;await tab.getByRole('button',{name:'RETRY INTERIOR'}).click();
  await tab.waitForFunction(()=>__SPACEX_QA__.assets()[1]==='loading');
  await tab.click('#view-exterior');release();
  await tab.waitForFunction(()=>__SPACEX_QA__.inspection()?.supportsInterior);
  assert.equal(await tab.locator('#view-exterior').getAttribute('aria-pressed'),'true');
 }finally{await tab.close();}
});
await check('Crew Dragon link opens the actual seat photograph without loading the video',async()=>{
 await p.goto((process.env.BASE_URL||'http://localhost:4173/')+'?reference=crew-dragon-cabin');
 await p.waitForFunction(()=>document.querySelector('#cabin-dialog').open&&document.querySelector('#cabin-photo img').naturalWidth===731);
 assert.equal(await p.locator('#cabin-player iframe').count(),0);
 await p.locator('#cabin-dialog .close-button').click();
 assert.equal(await p.locator('#cabin-dialog').isVisible(),false);
});
await check('no JavaScript or shader errors',async()=>assert.deepEqual(errors,[]));const result={passed:pass.length,failed:fail.length,checks:pass,failures:fail,errors};fs.writeFileSync('/tmp/interior-browser-report.json',JSON.stringify(result,null,2));console.log('RESULT',JSON.stringify(result));await browser.close();if(fail.length)process.exitCode=1;
