const {chromium}=require('playwright'),fs=require('fs');
const out='dxrkths/docs/r21-diagnostics/fresh-native.json';
(async()=>{const all=[];for(const [label,base] of [['baseline','https://dxrkths.vercel.app'],['revised','http://127.0.0.1:3000']]){
 const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars'],args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const p=await browser.newPage({viewport:{width:900,height:640}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('dxt-settings',JSON.stringify({quality:'auto',qualityPreference:'manual'}));window.__long=[];new PerformanceObserver(list=>__long.push(...list.getEntries().map(e=>({t:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});});
 await p.route('**/src/main.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())+'\nwindow.__PERF__={scene:()=>scene,routes:()=>sections};\n'});});
 await p.goto(base+'/?debug',{waitUntil:'load',timeout:40000});await p.locator('#intro-enter').click();await p.waitForFunction(()=>window.__DXT__?.inspect().phase==='ready'&&!document.body.classList.contains('intro-pending'),null,{polling:150,timeout:90000});await p.waitForTimeout(500);
 await p.evaluate(()=>{window.__samples=[];__long=[];const s=__PERF__.scene(),frame=s.frame.bind(s);s.frame=function(now){const start=performance.now();frame(now);if(this.bannerPortal.active)__samples.push({now,cpu:performance.now()-start,stage:this.bannerPortal.stage,age:this.bannerPortal.age,interior:this.bannerPortal.interior,returning:this.bannerPortal.returning,width:this.canvas.width,height:this.canvas.height});};});
 // The live header exposes Enter DXT (panel 3), not a nonexistent panel-0 control.
 const entry=p.locator('header [data-open-panel="3"]');await entry.waitFor({state:'visible',timeout:10000});
 const start=Date.now();await entry.click();await p.waitForFunction(()=>__DXT__.inspect().section.active&&location.pathname==='/about',null,{polling:100,timeout:120000});const entryMs=Date.now()-start;
 await p.waitForTimeout(500);const back=Date.now();await p.locator('#brand-spin').click();await p.waitForFunction(()=>!__DXT__.inspect().section.returning&&!__DXT__.inspect().section.travelling&&location.pathname==='/',null,{polling:100,timeout:120000});const returnMs=Date.now()-back;
 const report=await p.evaluate(()=>({samples:__samples,longTasks:__long,startup:__DXT__.inspect().scene.startup}));
 if(report.samples.length<10||!report.samples.some(s=>s.interior&&!s.returning)||!report.samples.some(s=>s.interior&&s.returning)||errors.length)throw Error('Incomplete native journey '+JSON.stringify({frames:report.samples.length,errors}));
 const phaseStats=returning=>{const frames=report.samples.filter(s=>s.returning===returning),gaps=frames.slice(1).map((f,i)=>f.now-frames[i].now).sort((a,b)=>a-b),cpu=frames.map(s=>s.cpu).sort((a,b)=>a-b);return{frames:frames.length,gapMedianMs:gaps[Math.floor(gaps.length*.5)],gapP95Ms:gaps[Math.floor(gaps.length*.95)],cpuMedianMs:cpu[Math.floor(cpu.length*.5)],cpuP95Ms:cpu[Math.floor(cpu.length*.95)],cpuMaxMs:cpu.at(-1)};};
 const result={label,entryMs,returnMs,...report,errors,entry:phaseStats(false),return:phaseStats(true)};all.push(result);console.log('NATIVE',JSON.stringify({label,entryMs,returnMs,entry:result.entry,return:result.return,longTasks:report.longTasks}));
 }finally{await browser.close();}
 }fs.writeFileSync(out,JSON.stringify(all,null,2)+'\n');})().catch(e=>{console.error(e.stack);fs.writeFileSync(out,JSON.stringify({error:e.stack},null,2));process.exit(1)});
