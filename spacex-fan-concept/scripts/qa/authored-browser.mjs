import {chromium as pw} from 'playwright-core';import chromium from '@sparticuz/chromium';import fs from 'node:fs';import assert from 'node:assert/strict';
const browser=await pw.launch({executablePath:process.env.CHROMIUM_PATH||await chromium.executablePath(),args:[...chromium.args,'--enable-unsafe-swiftshader'],headless:true}),base=process.env.BASE_URL||'http://localhost:4173/';
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],passed=[],failed=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
async function check(name,fn){try{await fn();passed.push(name);console.log('PASS',name);}catch(e){failed.push({name,error:e.message});console.log('FAIL',name,e.message.slice(0,400));}}
const stats=()=>page.evaluate(()=>window.__SPACEX_QA__.stats());
async function act(event){await page.evaluate(e=>window.__SPACEX_QA__.action(e),event);await page.waitForTimeout(300);}
async function rendered(fn,arg){const before=(await stats()).frames;await page.evaluate(fn,arg);await page.waitForFunction(n=>window.__SPACEX_QA__.stats().frames>n,before);}
await page.goto(base+'?qa');await page.waitForFunction(()=>window.__SPACEX_QA__);await rendered(()=>window.__SPACEX_QA__.quality('high'));await page.waitForFunction(()=>window.__SPACEX_QA__.assets()[1]==='licensed-high');
await check('no generated Falcon 1 placeholder',async()=>{const m=await page.evaluate(()=>window.__SPACEX_QA__.models());assert.equal(m[0].source,'unavailable');assert.equal(m[0].meshes,0);assert.equal(await page.locator('#previous').isDisabled(),true);assert.equal(await page.locator('#pagination button').first().isVisible(),false);});
for(const [n,y] of [0,Math.PI/2,Math.PI,Math.PI*1.5].entries()){await rendered(y=>window.__SPACEX_QA__.yaw(y),y);await page.screenshot({path:`/tmp/fidelity-f9-angle-${n}.png`});}
for(const index of [1,2,3]){
 await act({type:'NAVIGATE',index});await page.waitForFunction(i=>window.__SPACEX_QA__.assets()[i]==='licensed-high',index,{timeout:90000});await page.waitForTimeout(500);await page.screenshot({path:`/tmp/fidelity-${index}-overview.png`});
 for(const part of ['engines','tanks','interstage','fairing'])await check(`authored/${index}/${part}`,async()=>{
  await act({type:'FOCUS',part});await page.waitForFunction(({index,part})=>window.__SPACEX_QA__.inspection()?.key===`${index}:${part}:fairing`,{index,part});
  const i=await page.evaluate(()=>window.__SPACEX_QA__.inspection());assert.equal(i.originalsVisible,0);assert.equal(i.interiorVisible,part==='tanks');assert.equal(i.supportsInterior,i.internalMeshes>0);assert.ok(i.exteriorCount>0);
  const p=await page.evaluate(()=>window.__SPACEX_QA__.framing());assert.ok(p.every(([x,y])=>x>0&&x<1010&&y>60&&y<850),JSON.stringify(p));assert.equal(await page.locator('#view-cutaway').isVisible(),i.supportsInterior);
  if(['engines','fairing'].includes(part))await page.screenshot({path:`/tmp/fidelity-${index}-${part}.png`});
 });
}
await check('authored historical Dragon and correct return',async()=>{await act({type:'DRAGON'});await page.waitForFunction(()=>window.__SPACEX_QA__.assets().dragon==='licensed-high',{timeout:90000});await page.waitForFunction(()=>window.__SPACEX_QA__.inspection()?.key==='1:fairing:dragon');assert.match(await page.locator('#interior-note').textContent(),/HISTORICAL/);await page.screenshot({path:'/tmp/fidelity-dragon.png'});await act({type:'BACK'});const s=await page.evaluate(()=>window.__SPACEX_QA__.state());assert.equal(s.payload,'fairing');assert.equal(s.part,null);});
await act({type:'FOCUS',part:'engines'});
await check('drag isolated source geometry',async()=>{const y=await page.evaluate(()=>window.__SPACEX_QA__.orientation());await page.mouse.move(470,330);await page.mouse.down();await page.mouse.move(540,340,{steps:7});await page.mouse.up();await page.waitForTimeout(100);assert.notEqual(await page.evaluate(()=>window.__SPACEX_QA__.orientation()),y);});
await check('outside-click return',async()=>{await page.mouse.click(5,450);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__SPACEX_QA__.state().part),null);});
for(const tier of ['low','medium','high'])await check('quality/'+tier,async()=>{await rendered(t=>window.__SPACEX_QA__.quality(t),tier);assert.equal((await stats()).quality,tier);assert.equal((await stats()).bloom,tier!=='low');});
await check('idle frame count stable',async()=>{await page.mouse.move(5,100);await page.waitForTimeout(1800);const a=(await stats()).frames;await page.waitForTimeout(650);assert.equal((await stats()).frames,a);});
await check('quality request race uses final request',async()=>{await page.evaluate(()=>{const q=window.__SPACEX_QA__;q.quality('low');q.quality('high');q.quality('low');});await page.waitForFunction(()=>window.__SPACEX_QA__.assets()[1]==='licensed-eco');await page.waitForTimeout(800);assert.equal((await stats()).quality,'low');assert.equal((await stats()).assets[1],'licensed-eco');});
await check('inspection resources remain bounded',async()=>{for(let i=0;i<3;i++){await act({type:'FOCUS',part:'tanks'});await act({type:'FOCUS',part:'engines'});}const g=(await stats()).geometries;for(let i=0;i<6;i++){await act({type:'FOCUS',part:'tanks'});await act({type:'FOCUS',part:'engines'});}assert.ok((await stats()).geometries<=g+2);});
for(const viewport of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
 await page.setViewportSize(viewport);await rendered(()=>window.__SPACEX_QA__.quality('medium'));await page.waitForTimeout(250);
 for(const part of ['engines','fairing'])await check(`responsive/${viewport.width}x${viewport.height}/${part}`,async()=>{await act({type:'FOCUS',part});const p=await page.evaluate(()=>window.__SPACEX_QA__.framing());assert.ok(p.every(([x,y])=>x>0&&x<viewport.width&&y>20&&y<viewport.height-40),JSON.stringify(p));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`/tmp/fidelity-${viewport.width}-${part}.png`});});
}
await check('no JavaScript or shader errors',async()=>assert.deepEqual(errors,[]));
const report={base,passed:passed.length,failed:failed.length,checks:passed,failures:failed,errors};fs.writeFileSync('/tmp/fidelity-smoke.json',JSON.stringify(report,null,2));console.log('RESULT',JSON.stringify(report));await browser.close();if(failed.length)process.exitCode=1;
