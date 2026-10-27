// Actual site, not a mock. BASELINE=1 records the unmodified Low profile.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const baseline=process.env.BASELINE==='1',out=path.resolve(process.env.DXT_QA_OUT||'docs/r37-qa');fs.mkdirSync(out,{recursive:true});
const report={baseline,checks:[],errors:[],environment:'Chrome Linux mobile touch/DPR2, SwiftShader. Draw counts are not physical-phone FPS.'};
const server=spawn(process.execPath,['tools/server.mjs','--port','5188'],{stdio:'inherit'});let browser,page;
function check(name,pass,detail){report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)throw Error(name+' '+JSON.stringify(detail));}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function inspect(){return page.evaluate(()=>JSON.parse(JSON.stringify(window.__DXT__.inspect())));}
async function roomReady(){await page.waitForFunction(()=>window.__DXT__?.inspect().phase==='ready'&&!window.__DXT__.inspect().section.active&&!window.__DXT__.inspect().section.travelling&&!document.body.classList.contains('intro-pending'),null,{timeout:120000});}
async function routeReady(index){await page.waitForFunction(i=>window.__DXT__.inspect().selectedPanel===i&&window.__DXT__.inspect().section.active&&!window.__DXT__.inspect().section.travelling,index,{timeout:90000});}
async function quality(next){await page.locator('#quality').tap();await page.waitForFunction(q=>window.__DXT__.inspect().settings.quality===q&&!document.querySelector('#quality').disabled&&!window.__DXT__.inspect().scene?.qualityChanging,next,{timeout:120000});await page.waitForTimeout(200);}
(async()=>{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5188/')).ok)break;}catch{}await sleep(100);}
 const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(x=>fs.existsSync(x));
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 await ctx.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'})));
 page=await ctx.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5188/?debug',{waitUntil:'load'});
 await page.locator('#intro-enter').tap({timeout:120000});await roomReady();await page.waitForTimeout(1500);
 report.low=await inspect();await page.screenshot({path:path.join(out,'showroom-low.jpg'),type:'jpeg',quality:88});
 const first=await inspect();await page.waitForTimeout(2400);const last=await inspect();
 report.idle={durationMs:2400,frames:last.scene.frames-first.scene.frames,reflections:last.scene.reflectionCaptures-first.scene.reflectionCaptures,musicAnalysisReads:last.music.analysisReads-first.music.analysisReads};
 if(baseline){check('baseline initialized real Low scene',report.low.scene.quality==='low');return;}
 check('five native mobile destinations remain',await page.locator('[data-mobile-panel]:visible').count()===5);
 const low=report.low.scene;
 check('Low stops ambient frames and reflection captures at rest',report.idle.frames<=1&&report.idle.reflections===0,report.idle);
 check('Low main render at 390x844 is native-resolution not supersampled',low.width<=390&&low.height<=844,{width:low.width,height:low.height});
 check('Low disables atmosphere, bloom, lens and reflections',low.visibleSmoke===0&&low.bloomLevels===0&&low.motionShutter===0&&!low.effects.bloom&&!low.effects.lens&&!low.effects.reflection,low.effects);
 const cdp=await ctx.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:470}]});
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190+90*i/12,y:470}]});await page.waitForTimeout(25);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(400);
 const dragged=await inspect();report.dragged=dragged.scene;
 check('touch motion wakes Low and still never submits reflection capture',dragged.scene.frames>last.scene.frames&&dragged.scene.reflectionCaptures===0);
 await page.waitForTimeout(2500);await page.locator('[data-mobile-panel="2"]').tap();
 await page.waitForFunction(()=>window.__DXT__.inspect().scene.portal.active);report.portal=await inspect();
 check('Low travel retains the portal but not burst/chromatic/shutter effects',report.portal.scene.portal.active&&!report.portal.scene.portal.burstVisible&&report.portal.scene.portal.shutter===0&&report.portal.scene.portal.chromaticPixels===0,report.portal.scene.portal);
 await routeReady(2);check('mobile portal arrives at Projects',new URL(page.url()).pathname==='/projects');
 await page.evaluate(async()=>{const {DestinationGraphics}=await import('/src/render/showroom.bundle.js');const draw=DestinationGraphics.prototype.draw;window.__pageDraws=0;DestinationGraphics.prototype.draw=function(...args){window.__pageDraws++;return draw.apply(this,args);};});
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(800);await page.evaluate(()=>window.__pageDraws=0);await page.waitForTimeout(1600);
 report.staticPageDraws=await page.evaluate(()=>window.__pageDraws);
 check('Low covered-car page has no perpetual GPU draws',report.staticPageDraws===0,report.staticPageDraws);
 await quality('auto');await page.waitForTimeout(1200);
 check('Medium reactivates the approved covered-car animation',await page.evaluate(()=>window.__pageDraws)>2);
 await quality('high');await page.locator('#brand-spin').tap();await roomReady();await page.waitForTimeout(300);
 report.high=await inspect();await page.screenshot({path:path.join(out,'showroom-high.jpg'),type:'jpeg',quality:88});
 const high=report.high.scene;
 check('High restores original smoke, bloom and 4x scene AA',high.visibleSmoke===20&&high.bloomLevels===6&&high.sceneSamples===4&&high.effects.bloom&&high.effects.reflection,{smoke:high.visibleSmoke,bloom:high.bloomLevels,samples:high.sceneSamples,effects:high.effects});
 check('High retains larger raster and live planar reflections',high.width>low.width&&high.reflectionCaptures>0,{width:high.width,reflections:high.reflectionCaptures});
 await quality('low');await page.waitForTimeout(2000);const a=await inspect();await page.waitForTimeout(1400);const b=await inspect();
 check('switching High back to Low parks the scene again',b.scene.frames-a.scene.frames<=1&&!b.scene.effects.bloom&&b.scene.visibleSmoke===0,{frames:b.scene.frames-a.scene.frames,effects:b.scene.effects});
 for(const [width,height]of [[320,568],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(350);const state=await inspect();check(`${width}x${height} keeps Low within 450k pixels and all destinations accessible`,state.scene.width*state.scene.height<=450000&&await page.locator('[data-mobile-panel]:visible').count()===5);}
 check('no unhandled JavaScript errors',report.errors.length===0,report.errors);
})().catch(async e=>{report.failure=e.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:80}).catch(()=>{});}).finally(async()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({baseline,checks:report.checks.length,passed:report.checks.filter(x=>x.pass).length,idle:report.idle,low:report.low?.scene,errors:report.errors,failure:report.failure},null,2));if(browser)await browser.close();server.kill();});
