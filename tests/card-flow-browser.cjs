/** Real card fragment shader + recorded paths. Pixel probes are test-only.
 * Frames use controlled simulation time to inspect the moving wake shape;
 * stability-browser.cjs separately exercises unmodified native input/RAF. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),out=process.env.DXT_QA_OUT||path.join(root,'docs/card-flow-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const code=await esbuild.build({stdin:{resolveDir:root,contents:`import * as T from 'three';import {RoomPanelEnergy} from './src/scene/room-panel-energy.js';import {RoomIdentity} from './src/scene/room-identity.js';import {BannerPortal} from './src/scene/room-portal.js';import {RoomCamera} from './src/scene/room-camera.js';import {createFixedPanelLayout} from './src/scene/room-environment.js';import {roomVertex,displayFragment} from './src/scene/room-shaders.js';import {configurePanelHologram} from './src/scene/room-hologram.js';window.Probe={T,RoomPanelEnergy,RoomIdentity,BannerPortal,RoomCamera,createFixedPanelLayout,roomVertex,displayFragment,configurePanelHologram};`},bundle:true,write:false,format:'iife',minify:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:440,height:660}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/__flow',r=>r.fulfill({contentType:'text/html',body:'<html><body style="background:#08080b;margin:0"><script src="/__flow.js"></script></body></html>'}));
 await page.route('**/__flow.js',r=>r.fulfill({contentType:'application/javascript',body:code.outputFiles[0].text}));
 try{
  await page.goto('http://127.0.0.1:3000/__flow');
  await page.evaluate(()=>{
   const {T,RoomPanelEnergy,RoomIdentity,BannerPortal,RoomCamera,createFixedPanelLayout,roomVertex,displayFragment,configurePanelHologram}=Probe;
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(440,660);renderer.setClearColor('#08080b');document.body.append(renderer.domElement);
   const black=new T.DataTexture(new Uint8Array([2,2,3,255]),1,1);black.needsUpdate=true;
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1.5,.08,100),ortho=new T.OrthographicCamera(-1,1,1,-1,.1,10);ortho.position.z=3;
   const panels=createFixedPanelLayout().map(p=>{const frame=new T.Group();scene.add(frame);const material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:1},hoverUv:{value:new T.Vector2()},artwork:{value:black},contentMap:{value:black},contentMix:{value:0},eraseForeground:{value:0},projection:{value:new T.Matrix3()},hoverTime:{value:0}}});const panel={...p,frame,material};configurePanelHologram(panel);return panel;});
   const view={scene,camera,cameraRig:new RoomCamera(camera,900),panels,carPivot:new T.Group(),screenLight:new T.PointLight(),hoverPanel:0,settings:{quality:'low'},reduced:{matches:false},host:{style:{setProperty(){}}},reflectionBudget:{invalidate(){}}};view.bannerPortal=new BannerPortal(view);view.identity=new RoomIdentity(view);view.panelEnergy=new RoomPanelEnergy(view);
   const surface=new T.Scene(),quad=new T.Mesh(new T.PlaneGeometry(2,2),panels[0].material);surface.add(quad);
   const target=new T.WebGLRenderTarget(256,256),buffer=new Uint8Array(256*256*4);
   function read(){renderer.setRenderTarget(target);renderer.render(surface,ortho);renderer.readRenderTargetPixels(target,0,0,256,256,buffer);}
   function score(x,y){let sum=0;for(let j=Math.floor(y*256)-5;j<=Math.floor(y*256)+5;j++)for(let i=Math.floor(x*256)-5;i<=Math.floor(x*256)+5;i++){const k=(j*256+i)*4;sum+=buffer[k]+buffer[k+1]+buffer[k+2];}return sum;}
   window.Flow={view,renderer,ortho,surface,quad,target,buffer,read,score};
  });
  const checks=await page.evaluate(()=>{
   const {view,renderer,quad,read,score}=Flow,results=[];
   for(let index=0;index<5;index++){
    view.panelEnergy.clear();view.hoverPanel=index;view.identity.update(0,true);quad.material=view.panels[index].material;
    read();const base={tail:score(.2,.23),middle:score(.5,.5),head:score(.8,.77),away:score(.15,.85)};
    view.panelEnergy.point(index,{x:.2,y:.23},100);view.panelEnergy.update(.04);
    view.panelEnergy.point(index,{x:.8,y:.77},140);view.panelEnergy.update(.015);read();
    const hit={tail:score(.2,.23)-base.tail,middle:score(.5,.5)-base.middle,head:score(.8,.77)-base.head,away:score(.15,.85)-base.away};
    results.push({name:'continuous native UV path on card '+index,pass:hit.tail>300&&hit.middle>300&&hit.head>300&&hit.away<Math.min(hit.tail,hit.middle)*.15,hit});
    // Moving hoverUv alone must not drag already-deposited pixels elsewhere.
    const before=score(.5,.5);view.panels[index].material.uniforms.hoverUv.value.set(.05,.95);read();
    results.push({name:'deposited path stays fixed when cursor uniform moves '+index,pass:Math.abs(before-score(.5,.5))<10});
    view.panelEnergy.release();for(let n=0;n<60;n++)view.panelEnergy.update(1/60);read();
    results.push({name:'old path fades to the untouched card '+index,pass:Math.abs(score(.5,.5)-base.middle)<10});
   }
   return results;
  });
  // Inspect a turning gesture in multiple rendered frames, including decay.
  for(let frame=0;frame<18;frame++){
   await page.evaluate(frame=>{
    const {view,renderer,surface,ortho,quad}=Flow;
    if(frame===0){view.panelEnergy.clear();view.hoverPanel=0;view.identity.update(0,true);quad.material=view.panels[0].material;}
    if(frame<12){const t=frame/11;view.panelEnergy.point(0,{x:.5+Math.sin(t*Math.PI*2-.9)*.23,y:.2+t*.6},100+frame*40);}
    view.panelEnergy.update(frame<12?.04:.12);renderer.setRenderTarget(null);renderer.render(surface,ortho);
   },frame);
   await page.screenshot({path:path.join(out,`flow-${String(frame).padStart(2,'0')}.png`)});
  }
  const glError=await page.evaluate(()=>Flow.renderer.getContext().getError());
  fs.writeFileSync(path.join(out,'flow-pixels.json'),JSON.stringify({checks,errors,glError},null,2));
  console.log(JSON.stringify({checks,errors,glError}));if(checks.some(c=>!c.pass)||errors.length||glError)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
