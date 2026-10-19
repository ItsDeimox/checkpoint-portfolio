/** Native direct navigation and deliberate driver-loss recovery. The only
 * injected mutation is WEBGL_lose_context, the public browser testing extension.
 * No scheduler, camera, route or rendering methods are overridden. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const base=process.env.DXT_BASE_URL||'http://127.0.0.1:3000',out=process.env.DXT_QA_OUT||'docs/stability-r23-qa';
fs.mkdirSync(out,{recursive:true});
const report={scope:'Native direct routes, parked-page recovery and quality changes',checks:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'recovery-browser.json'),JSON.stringify(report,null,2));
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`,detail??'');save();if(!pass)throw Error(name);};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:900,height:600}});page.setDefaultTimeout(180000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('crash',()=>{report.errors.push('PAGE CRASH');save();});
 page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|VALIDATE_STATUS|shader error/i.test(m.text()))report.errors.push(m.text());});
 const source=fs.readFileSync('src/main.js','utf8');
 await page.route('**/src/main.js',route=>route.fulfill({contentType:'text/javascript',body:source+'\nwindow.__RECOVERY__={scene:()=>scene,routes:()=>sections,experience:()=>sectionMedia.experience};'}));
 await page.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'})));
 try{
  await page.goto(base+'/projects?debug',{waitUntil:'load'});await page.locator('#intro-enter').click();
  await page.waitForFunction(()=>!document.body.classList.contains('intro-pending')&&window.__RECOVERY__.experience().gpuReady);
  check('direct Future Projects is interactive without constructing a hidden showroom',await page.evaluate(()=>!__RECOVERY__.scene()&&__RECOVERY__.routes().page&&__RECOVERY__.experience().gpuReady));
  await page.locator('.section-return').click();
  await page.waitForFunction(()=>__RECOVERY__.scene()?.ready&&!__RECOVERY__.routes().travelling&&!__RECOVERY__.routes().page,null,{timeout:180000});
  check('direct page return warms the dormant showroom and restores native input',await page.evaluate(()=>{let s=__RECOVERY__.scene();return s.bannerPortal.scenePrepared&&s.appliedQuality==='low'&&!s.pageActive&&!!s.raf;}));
  await page.locator('[data-open-panel="3"]').first().click();
  await page.waitForFunction(()=>__RECOVERY__.routes().page);
  check('About page is parked before testing main GPU loss',await page.evaluate(()=>__RECOVERY__.scene().pageActive));
  await page.evaluate(()=>{const s=__RECOVERY__.scene();window.__loss=s.renderer.getContext().getExtension('WEBGL_lose_context');__loss.loseContext();});
  await page.waitForFunction(()=>__RECOVERY__.scene().lost);
  check('context loss leaves the existing HTML page readable',await page.evaluate(()=>!document.querySelector('#room-section-page').hidden&&document.querySelector('#section-title').textContent.includes('DXT')));
  await page.waitForTimeout(250);await page.evaluate(()=>__loss.restoreContext());
  await page.waitForFunction(()=>__RECOVERY__.scene().ready&&!__RECOVERY__.scene().lost,null,{timeout:180000});
  const restored=await page.evaluate(()=>{let s=__RECOVERY__.scene();return{ready:s.ready,parked:s.pageActive,prepared:s.bannerPortal.scenePrepared,programs:s.renderer.info.programs.length,quality:s.appliedQuality};});
  check('restoration warms both shadow paths behind the parked page',restored.parked&&restored.prepared&&restored.programs>=60,restored);
  await page.locator('#quality').click();await page.waitForFunction(()=>!__RECOVERY__.scene().qualityChanging);
  const after=await page.evaluate(()=>{let s=__RECOVERY__.scene();return{programs:s.renderer.info.programs.length,parked:s.pageActive,raf:s.raf,quality:s.appliedQuality,error:s.qualityError};});
  check('quality after recovery creates no new shader program and keeps page asleep',after.programs===restored.programs&&after.parked&&!after.raf&&!after.error,after);
  // A real, immediate Back click during the next quality allocation must wait
  // for that transaction rather than submit a competing portal frame.
  await page.locator('#quality').click();
  await page.locator('.section-return').click();await page.waitForFunction(()=>!__RECOVERY__.scene().qualityChanging&&!__RECOVERY__.routes().travelling&&!__RECOVERY__.routes().page,null,{timeout:180000});
  check('native return remains functional after loss and interrupted quality change',await page.evaluate(()=>{let s=__RECOVERY__.scene();return s.ready&&!s.lost&&!s.pageActive&&!!s.raf&&!document.body.classList.contains('quality-preparing');}));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-open-panel="3"]').first().click();await page.waitForFunction(()=>__RECOVERY__.routes().page);
  await page.locator('[data-section-route="0"]').click();await page.waitForFunction(()=>__RECOVERY__.routes().index===0);
  await page.evaluate(()=>{let g=__RECOVERY__.experience().graphics;window.__pageLoss=g.renderer.getContext().getExtension('WEBGL_lose_context');__pageLoss.loseContext();});
  await page.waitForFunction(()=>!__RECOVERY__.experience().gpuReady);await page.waitForTimeout(250);await page.evaluate(()=>__pageLoss.restoreContext());
  await page.waitForFunction(()=>__RECOVERY__.experience().gpuReady);
  check('optional CTA graphics recover without breaking the native Play link',await page.evaluate(()=>__RECOVERY__.experience().gpuReady&&document.querySelector('[data-energy-button]').href.includes('roblox.com')));
  check('no page crash or shader error across deliberate context losses',report.errors.length===0,report.errors);
 }catch(error){report.failure=error.stack;console.error(error);process.exitCode=1;}
 finally{save();await browser.close();}
})();
