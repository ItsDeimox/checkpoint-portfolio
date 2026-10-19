const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const out='/tmp/dxt-r26-qa';fs.mkdirSync(out,{recursive:true});
const report={steps:[],errors:[]};const mark=(label,pass,data)=>{report.steps.push({label,pass,data});console.log(pass?'PASS '+label:'FAIL '+label,data||'');if(!pass)throw Error(label);};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1100,height:720}});page.setDefaultTimeout(120000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('crash',()=>report.errors.push('PAGE CRASH'));
 page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|shader error|GL_INVALID/i.test(m.text()))report.errors.push(m.text());});
 const source=fs.readFileSync('src/main.js','utf8');
 await page.route('**/src/main.js',route=>route.fulfill({contentType:'text/javascript',body:source+'\nwindow.__R26__=()=>scene;'}));
 await page.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({visitorPreset:'showroom-intro-v1',quality:'low',qualityPreference:'manual'})));
 try{
  await page.goto('http://127.0.0.1:3000/',{waitUntil:'load'});
  await page.locator('#intro-enter').click();
  await page.waitForFunction(()=>window.__R26__?.()?.ready&&!document.body.classList.contains('intro-pending'),null,{timeout:180000});
  const initial=await page.evaluate(()=>({programs:__R26__().renderer.info.programs.length,geometries:__R26__().renderer.info.memory.geometries}));
  mark('preloaded showroom starts normally',initial.programs>0&&initial.geometries>0,initial);
  const points=await page.evaluate(()=>{
   const s=__R26__(),p=s.panels[0],origin=p.corners[3],right=p.corners[2].clone().sub(origin),up=p.corners[0].clone().sub(origin),pts=[];
   for(const [u,v]of [[.39,.6],[.48,.7],[.57,.76],[.46,.60],[.55,.67],[.38,.73]]){
    const point=origin.clone().addScaledVector(right,u).addScaledVector(up,v).project(s.camera),x=(point.x*.5+.5)*innerWidth,y=(.5-point.y*.5)*innerHeight;
    if(x>45&&x<innerWidth-45&&y>150&&y<innerHeight-70&&s.pick(x,y)===0)pts.push({x,y});
   }return pts;
  });
  mark('panel is reachable with the native pointer',points.length>=2,points);
  for(const pt of points){await page.mouse.move(pt.x,pt.y);await page.waitForTimeout(90);}
  const state=await page.evaluate(()=>{const s=__R26__();return {hover:s.hoverPanel,awake:s.panelEnergy.entries[0].field.awake,impulses:s.panelEnergy.entries[0].field.impulses,seed:s.panels[0].material.uniforms.uSignalSeed.value,programs:s.renderer.info.programs.length,geometries:s.renderer.info.memory.geometries};});
  mark('prismatic hover follows movement without allocating renderer objects',state.hover===0&&state.impulses>1&&state.seed>0&&state.programs===initial.programs&&state.geometries===initial.geometries,state);
  await page.screenshot({path:path.join(out,'prism-card-hover.png')});
  const pt=points.at(-1);await page.mouse.click(pt.x,pt.y);
  await page.waitForFunction(()=>document.body.classList.contains('section-active'),null,{timeout:120000});
  mark('first native panel click completes the approved portal',await page.locator('#room-section-page').isVisible());
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.body.classList.contains('section-active'),null,{timeout:120000});
  mark('native return restores the showroom',await page.evaluate(()=>__R26__().ready&&!__R26__().pageActive));
  mark('no shader compiler errors or page crash',report.errors.length===0,report.errors);
 }catch(err){report.errors.push(err.message);console.error(err);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,'native-hover.json'),JSON.stringify(report,null,2));await browser.close();}
})();
