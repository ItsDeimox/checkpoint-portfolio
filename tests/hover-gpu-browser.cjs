const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),out=process.env.DXT_QA_OUT||path.join(root,'docs/hover-r24-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
const code=await esbuild.build({stdin:{resolveDir:root,contents:`import * as T from 'three';import {RoomPanelEnergy} from './src/scene/room-panel-energy.js';import {RoomIdentity} from './src/scene/room-identity.js';import {BannerPortal} from './src/scene/room-portal.js';import {RoomCamera} from './src/scene/room-camera.js';import {createFixedPanelLayout} from './src/scene/room-environment.js';import {roomVertex,displayFragment} from './src/scene/room-shaders.js';import {configurePanelHologram} from './src/scene/room-hologram.js';import {DestinationGraphics} from './src/scene/destination-graphics.js';import {CubeSurface} from './src/ui/cube-surface.js';window.Probe={T,RoomPanelEnergy,RoomIdentity,BannerPortal,RoomCamera,createFixedPanelLayout,roomVertex,displayFragment,configurePanelHologram,DestinationGraphics,CubeSurface};`},bundle:true,write:false,format:'iife',minify:true});
const b=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await b.newPage({viewport:{width:550,height:300}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/__probe',r=>r.fulfill({contentType:'text/html',body:'<html><body style="background:#07070b;color:white;margin:0"><script src="/__probe.js"></script></body></html>'}));await page.route('**/__probe.js',r=>r.fulfill({contentType:'application/javascript',body:code.outputFiles[0].text}));await page.goto('http://127.0.0.1:3000/__probe');
const result=await page.evaluate(()=>{
const {T,RoomPanelEnergy,RoomIdentity,BannerPortal,RoomCamera,createFixedPanelLayout,roomVertex,displayFragment,configurePanelHologram,DestinationGraphics,CubeSurface}=Probe;
const renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(256,256);renderer.setPixelRatio(1);document.body.append(renderer.domElement);
const black=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);black.needsUpdate=true;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1.5,.08,100),orthographic=new T.OrthographicCamera(-1,1,1,-1,.1,10);orthographic.position.z=3;
const panels=createFixedPanelLayout().map(p=>{const frame=new T.Group();scene.add(frame);const material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:1},hoverUv:{value:new T.Vector2()},artwork:{value:black},contentMap:{value:black},contentMix:{value:0},eraseForeground:{value:0},projection:{value:new T.Matrix3()},hoverTime:{value:0}}});const panel={...p,frame,material};configurePanelHologram(panel);return panel;});
const view={scene,camera,cameraRig:new RoomCamera(camera,900),panels,carPivot:new T.Group(),screenLight:new T.PointLight(),hoverPanel:0,settings:{quality:'low'},reduced:{matches:false},host:{style:{setProperty(){}}},reflectionBudget:{invalidate(){}}};view.bannerPortal=new BannerPortal(view);view.identity=new RoomIdentity(view);view.panelEnergy=new RoomPanelEnergy(view);
const probeScene=new T.Scene(),quad=new T.Mesh(new T.PlaneGeometry(2,2),panels[0].material);probeScene.add(quad);const target=new T.WebGLRenderTarget(256,256),buffer=new Uint8Array(256*256*4),results=[];
function score(x,y){let sum=0;for(let j=Math.floor(y*256)-15;j<=Math.floor(y*256)+15;j++)for(let i=Math.floor(x*256)-15;i<=Math.floor(x*256)+15;i++){const k=(j*256+i)*4;sum+=buffer[k]+buffer[k+1]+buffer[k+2];}return sum;}
for(let index=0;index<5;index++)for(const y of [.16,.84]){
 view.panelEnergy.clear();view.hoverPanel=index;view.identity.update(0,true);quad.material=panels[index].material;view.panelEnergy.point(index,new T.Vector2(.31,y),100);view.panelEnergy.update(1/120);
 renderer.setRenderTarget(target);renderer.render(probeScene,orthographic);renderer.readRenderTargetPixels(target,0,0,256,256,buffer);
 const hit=score(.31,y),mirror=score(.31,1-y);results.push({index,y,hit,mirror,pass:hit>mirror*4&&hit>1000});
}
const g=Object.create(DestinationGraphics.prototype);g.buildEnergy();const grid=new CubeSurface();grid.setAspect(5);grid.inject(.5,.5,1.6);grid.step(1/30);g.uploadEnergy(grid);g.energyMaterial.uniforms.uSurfaceSpan.value.set(...grid.span);
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const levels=[];
for(const gain of [1,.2]){g.energyMaterial.uniforms.uEnergyStrength.value=gain;renderer.setRenderTarget(target);renderer.render(g.energyScene,g.energyCamera);renderer.readRenderTargetPixels(target,0,0,256,256,buffer);let sum=0,peak=0;for(let i=0;i<buffer.length;i+=4){sum+=buffer[i]+buffer[i+1]+buffer[i+2];peak=Math.max(peak,buffer[i]);}levels.push({gain,sum,peak});}
renderer.setRenderTarget(null);renderer.render(g.energyScene,g.energyCamera);
return {orientation:results,cta:levels,allOriented:results.every(x=>x.pass),reduced:levels[1].sum<levels[0].sum*.6,glError:renderer.getContext().getError()};
});await page.screenshot({path:path.join(out,'cta-reduced-probe.png')});fs.writeFileSync(path.join(out,'pixel-probe.json'),JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors}));await b.close();if(!result.allOriented||!result.reduced||result.glError||errors.length)process.exitCode=1;
})();
