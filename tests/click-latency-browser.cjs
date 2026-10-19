const {chromium}=require('playwright');
const fs=require('node:fs');
const label=process.argv[2]||'click-latency';
const assert=require('node:assert/strict'),path=require('node:path'),out=process.env.DXT_QA_OUT||'docs/click-latency-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({...(process.env.DXT_BROWSER_PATH?{executablePath:process.env.DXT_BROWSER_PATH}:{channel:'msedge'}),headless:process.env.DXT_HEADLESS==='1',args:['--start-maximized','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion']});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.setDefaultTimeout(120000);
 const report={errors:[],runs:[]};page.on('pageerror',e=>report.errors.push(e.message));
 try{
 await page.route('**/src/main.js',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text())+'\nwindow.__QA={scene:()=>scene,routes:()=>sections};'});});
 await page.addInitScript(()=>{
  localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'high',qualityPreference:'manual'}));
  window.__LOG={rafs:[],renders:[],events:[],tasks:[],phase:'loading'};
  const tick=t=>{__LOG.rafs.push({t,phase:__LOG.phase});requestAnimationFrame(tick);};requestAnimationFrame(tick);
  new PerformanceObserver(l=>l.getEntries().forEach(e=>__LOG.tasks.push({t:e.startTime,ms:e.duration,phase:__LOG.phase}))).observe({type:'longtask',buffered:true});
  document.addEventListener('click',e=>__LOG.events.push({t:performance.now(),kind:'click',phase:__LOG.phase}),true);
 });
 await page.goto((process.env.DXT_BASE_URL||'http://127.0.0.1:5187')+'/?debug');await page.bringToFront();await page.locator('#intro-enter').click();
 await page.waitForFunction(()=>__DXT__?.inspect().phase==='ready'&&__DXT__.inspect().intro.closed);
 report.browser=await page.evaluate(()=>({ua:navigator.userAgent,visible:document.visibilityState,focus:document.hasFocus(),screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio}}));
 await page.evaluate(()=>{const s=__QA.scene(),render=s.render.bind(s);s.render=(...a)=>{__LOG.renders.push({t:performance.now(),phase:__LOG.phase});return render(...a)};const r=__QA.routes(),start=r.startReturn.bind(r);r.startReturn=(...a)=>{__LOG.events.push({t:performance.now(),kind:'return-start',phase:__LOG.phase});return start(...a)};});
 report.initial=await page.evaluate(()=>__QA.scene().inspect());
 report.gpu=await page.evaluate(()=>{const gl=__QA.scene().gl,e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
 assert.ok(!/swiftshader|software|llvmpipe/i.test(report.gpu),report.gpu);
 await page.evaluate(()=>__LOG.phase='idle');await page.waitForTimeout(1500);
 for(let i=0;i<3;i++){
  await page.evaluate(i=>__LOG.phase='entry-'+i,i);
  await page.locator('[data-open-panel="1"]').first().click({force:true});
  if(i>0)await page.waitForFunction(()=>__QA.routes().pageSurface.active);
  await page.waitForFunction(()=>__QA.routes().page&&!__QA.routes().travelling);await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>__QA.routes().index),1);
  await page.evaluate(i=>__LOG.phase='return-'+i,i);await page.locator('[data-reset-room]').first().click();
  await page.waitForFunction(()=>!__QA.routes().page&&!__QA.routes().travelling&&!__QA.routes().capturingReturn);await page.waitForTimeout(500);
 }
 report.log=await page.evaluate(()=>__LOG);report.final=await page.evaluate(()=>__QA.scene().inspect());
 const stats=a=>{a.sort((x,y)=>x-y);return {n:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)}};
 for(const phase of [...new Set(report.log.rafs.map(x=>x.phase))].filter(x=>x!=='loading')){
  const rafs=report.log.rafs.filter(x=>x.phase===phase),renders=report.log.renders.filter(x=>x.phase===phase),events=report.log.events.filter(x=>x.phase===phase);
  const click=events.find(x=>x.kind==='click')?.t,start=events.find(x=>x.kind==='return-start')?.t;
  report.runs.push({phase,raf:stats(rafs.slice(1).map((x,i)=>x.t-rafs[i].t)),draw:stats(renders.slice(1).map((x,i)=>x.t-renders[i].t)),clickToReturnStart:start-click,tasks:report.log.tasks.filter(x=>x.phase===phase)});
 }
 assert.equal(report.errors.length,0);assert.equal(report.final.frameLimit,0);
 for(const run of report.runs.filter(r=>r.phase.startsWith('return-'))){assert.ok(run.clickToReturnStart<120,run.phase+' blocked before motion: '+run.clickToReturnStart+' ms');assert.ok(!run.tasks.some(t=>t.ms>=100),run.phase+' has a blocking task');}
 console.log(JSON.stringify({browser:report.browser,runs:report.runs,errors:report.errors,skip:report.final.skippedRefreshes,queue:report.final.gpuBackpressure},null,2));
 }catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(report,null,2));await browser.close();}
})();
