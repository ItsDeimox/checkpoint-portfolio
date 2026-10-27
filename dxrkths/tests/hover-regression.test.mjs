import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {HeroScene} from '../src/scene/room-scene.js';
import {RoomPanelEnergy} from '../src/scene/room-panel-energy.js';
import {RoomIdentity} from '../src/scene/room-identity.js';
import {BannerPortal} from '../src/scene/room-portal.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {roomVertex,displayFragment} from '../src/scene/room-shaders.js';
import {configurePanelHologram} from '../src/scene/room-hologram.js';
import {RoomCamera} from '../src/scene/room-camera.js';
import {DestinationGraphics} from '../src/scene/destination-graphics.js';
import {DestinationExperience} from '../src/ui/destination-experience.js';
import {FramePacer} from '../src/scene/room-performance.js';
function fixture(){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1.5,.08,100);
 const panels=createFixedPanelLayout().map(p=>{const frame=new T.Group();scene.add(frame);const material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:0},hoverUv:{value:new T.Vector2()},artwork:{value:null},projection:{value:new T.Matrix3()}}});const panel={...p,frame,material};configurePanelHologram(panel);return panel;});
 const v={scene,camera,cameraRig:new RoomCamera(camera,900),panels,carPivot:new T.Group(),screenLight:new T.PointLight(),hoverPanel:-1,settings:{quality:'auto'},reduced:{matches:false},host:{style:{setProperty(){}}},reflectionBudget:{invalidate(){}}};
 v.bannerPortal=new BannerPortal(v);v.identity=new RoomIdentity(v);v.panelEnergy=new RoomPanelEnergy(v);
 return {v,dispose(){v.panelEnergy.dispose();v.bannerPortal.dispose();panels.forEach(p=>p.material.dispose());}};
}
test('card wave samples the same bottom-up mesh UV supplied by raycasting, never artwork coordinates',()=>{
 const f=fixture();try{for(const {panel,field}of f.v.panelEnergy.entries){
  assert.match(panel.material.fragmentShader,/panelNetwork\(vUv\)/,'image p flips Y and must not drive the hover wave');
  f.v.panelEnergy.point(panel.index,new T.Vector2(.25,.85),100);
  assert.ok(field.previous.p[1]>0,'a ray hit near the upper edge must inject above the center');
 }}finally{f.dispose();}
});
test('a saturated draw queue never freezes pointer or camera updates and only submits when a slot opens',()=>{
 const old={document:globalThis.document,raf:globalThis.requestAnimationFrame};let next=0,updates=0,moves=0,draws=0,submissions=0,available=false;
 globalThis.document={hidden:false};globalThis.requestAnimationFrame=()=>++next;
 const v=Object.create(HeroScene.prototype);Object.assign(v,{ready:true,disposed:false,lost:false,qualityChanging:false,last:0,time:0,settings:{quality:'low',paused:false},reduced:{matches:false},framePacer:new FramePacer(),drawQueue:{canSubmit(){return available;},submitted(){submissions++;}},cameraRig:{mode:'overview',update(){moves++;return false;}},updateHover(){updates++;},updatePanels(){return false;},updateAtmosphere(){},render(){draws++;},callbacks:{}});
 try{
  for(let n=1;n<=6;n++)v.frame(n*1000/60);
  assert.equal(updates,6,'input must not wait for GPU completion');assert.equal(moves,6,'the camera clock must stay live');assert.equal(draws,0,'a saturated GPU must not accumulate another frame');
  available=true;v.frame(7*1000/60);assert.equal(draws,1);assert.equal(updates,7);assert.equal(submissions,1);
 }finally{globalThis.document=old.document;globalThis.requestAnimationFrame=old.raf;}
});
test('two in-flight draws overlap without flush, never exceed two, and release completed fences',async()=>{
 const module=await import('../src/scene/room-gpu-gate.js');assert.equal(typeof module.GpuDrawQueue,'function');
 let id=0,polls=0,done=0,flushes=0;const deleted=[];
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,TIMEOUT_EXPIRED:2,WAIT_FAILED:3,CONDITION_SATISFIED:4,
  fenceSync(){return ++id;},flush(){flushes++;},clientWaitSync(f,flags,timeout){assert.equal(flags,0);assert.equal(timeout,0);polls++;return f<=done?4:2;},deleteSync(f){deleted.push(f);}};
 const q=new module.GpuDrawQueue(gl);
 try{
  assert.equal(q.canSubmit(),true);q.submitted();assert.equal(q.canSubmit(),true,'do not serialize on the preceding frame');q.submitted();
  assert.equal(id,2);assert.equal(polls,0);assert.equal(flushes,0);
  for(let i=0;i<60;i++)assert.equal(q.canSubmit(),false);
  assert.equal(id,2);assert.equal(q.pending,2);
  done=1;assert.equal(q.canSubmit(),true);q.submitted();assert.equal(id,3);assert.equal(q.pending,2);
  done=3;assert.equal(q.canSubmit(),true);q.reset();assert.equal(q.pending,0);assert.deepEqual([...deleted].sort(),[1,2,3]);
 }finally{q.dispose();}
});
test('closed hover simulations do no per-frame work during a portal journey',()=>{
 const f=fixture();try{
  const e=f.v.panelEnergy;e.prime();f.v.bannerPortal.active=true;
  let steps=0;for(const item of e.entries){const step=item.field.step.bind(item.field);item.field.step=dt=>{steps++;step(dt);};}
  for(let n=0;n<8;n++)e.update(1/60);
  assert.equal(steps,0,'hidden six-face wave grids are still being stepped during travel');
  assert.ok(e.entries.every(({field,panel})=>!field.awake&&panel.material.uniforms.uEnergyActive.value===0));
 }finally{f.dispose();}
});
test('Play Now retains the cube pattern with a separate restrained emission gain',()=>{
 const g=Object.create(DestinationGraphics.prototype);g.buildEnergy();
 try{assert.ok(g.energyMaterial.uniforms.uEnergyStrength?.value>0&&g.energyMaterial.uniforms.uEnergyStrength.value<=.22,'CTA has the unattenuated HDR emission');assert.match(g.energyMaterial.fragmentShader,/uEnergyStrength/);}
 finally{g.energyTexture.dispose();g.energyScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
});
test('high-rate CTA pointer events coalesce instead of running the full cube solver in every event',()=>{
 let injections=0,wakes=0;
 const button={getBoundingClientRect:()=>({left:0,top:0,width:300,height:60})};
 const e=Object.create(DestinationExperience.prototype);Object.assign(e,{root:{inert:false},reduced:{matches:false},network:{setAspect(){},point(){injections++;}},wake(){wakes++;}});
 for(let n=0;n<80;n++)e.point({target:{closest:()=>button},clientX:n*3,clientY:15,timeStamp:n});
 assert.equal(injections,0,'pointer events execute a graph-wide velocity injection before the animation frame');assert.equal(e.pendingPointer.x,237/300);assert.equal(wakes,80);
});
test('slow display intervals do not stretch the approved portal path into a many-second stall',()=>{
 const slow=fixture(),fast=fixture();
 function begin(f){Object.assign(f.v,{ready:true,release(){},clearHover(){},hidePanelContent(){},wake(){},optics:{resetHistory(){}}});f.v.bannerPortal.enter(0,()=>{});}
 try{
  begin(slow);begin(fast);
  for(let i=0;i<6;i++)slow.v.bannerPortal.update(.25);
  for(let i=0;i<180;i++)fast.v.bannerPortal.update(1/120);
  assert.ok(slow.v.camera.position.distanceTo(fast.v.camera.position)<1e-7,'portal progress is capped per rendered frame rather than elapsed time');
  for(let i=0;i<8;i++)slow.v.bannerPortal.update(.25);
  assert.equal(slow.v.bannerPortal.active,false,'3.1 second journey is still active after 3.5 seconds');
  let returned=false;slow.v.bannerPortal.returnToShowroom(0,()=>{returned=true;});
  for(let i=0;i<14;i++)slow.v.bannerPortal.update(.25);
  assert.equal(returned,true,'return clock also stretches under slow frames');
 }finally{slow.dispose();fast.dispose();}
});
test('a just-opened aperture never shades the tunnel over the entire untouched card',()=>{
 const f=fixture();try{assert.match(f.v.panels[0].material.fragmentShader,/if\(aperture>0\.\)\s*c=mix\(c,portalRadiance/,'portal ray shading runs even where aperture alpha is exactly zero');}finally{f.dispose();}
});
test('quality changes insert a fresh preparation fence after normal submissions have stopped',async()=>{
 const {QualityTransition}=await import('../src/scene/room-quality.js');let submitted=false;const events=[];
 const v={settings:{quality:'low'},appliedQuality:'low',workController:new AbortController(),sleep(){events.push('sleep');},wake(){},callbacks:{},renderer:{getContext:()=>({})},optics:{resetHistory(){}},render(){},gpuFrameGate:{submit(){submitted=true;events.push('submit');},async wait(){assert.equal(submitted,true,'waiting on an empty gate no longer protects reallocation');events.push('wait');}},async applyQuality(q){events.push(q);this.settings.quality=q;}};
 await new QualityTransition(v).request('auto');assert.deepEqual(events.slice(0,4),['sleep','submit','wait','auto']);assert.equal(v.appliedQuality,'auto');
});
test('the first coalesced CTA hover wakes its sleeping renderer and injects at the next frame',async()=>{
 const {CubeSurface}=await import('../src/ui/cube-surface.js');let callback=null,id=0,draws=0;
 const e=Object.create(DestinationExperience.prototype),button={getBoundingClientRect:()=>({left:0,top:0,width:300,height:60})};
 Object.assign(e,{network:new CubeSurface(),root:{inert:false,hidden:false},document:{hidden:false},window:{performance:{now:()=>100},requestAnimationFrame(fn){callback=fn;return ++id;}},surface:{dataset:{destinationSurface:'energy'}},visible:true,gpuReady:true,reduced:{matches:false},graphics:{uploadEnergy(){},draw(){draws++;}},raf:0,time:0});
 e.point({target:{closest:()=>button},clientX:150,clientY:30,timeStamp:100});
 assert.equal(typeof callback,'function','coalesced input must start the sleeping animation, not wait for an already-active network');assert.equal(e.network.impulses,0);
 callback(134);assert.equal(e.network.impulses,1);assert.equal(e.pendingPointer,null);assert.equal(draws,1);
});
test('a draw completion failure stops scheduling and reports the fallback instead of an unhandled RAF error',()=>{
 const old=globalThis.document;globalThis.document={hidden:false};let fallback=null,stops=0;
 const v=Object.create(HeroScene.prototype);Object.assign(v,{ready:true,last:0,time:0,settings:{quality:'low',paused:false},reduced:{matches:false},framePacer:new FramePacer(),drawQueue:{canSubmit(){throw Error('lost draw fence');}},cameraRig:{update:()=>false},updateHover(){},updatePanels(){},updateAtmosphere(){},callbacks:{onUnavailable(e){fallback=e.message;}},sleep(){this.raf=0;stops++;}});
 try{assert.doesNotThrow(()=>v.frame(20));assert.equal(v.ready,false);assert.equal(v.raf,0);assert.equal(stops,1);assert.equal(fallback,'lost draw fence');}finally{globalThis.document=old;}
});
