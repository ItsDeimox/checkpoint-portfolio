import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {BannerPortal,portalBasis,portalTravelPose} from '../src/scene/room-portal.js';
import {projectPortalExit} from '../src/scene/room-portal-exit.js';
import {RoomCamera} from '../src/scene/room-camera.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {arrivalTransform} from '../src/ui/portal-arrival.js';

function journey(){
 const camera=new T.PerspectiveCamera(48,1.5,.08,100),cameraRig=new RoomCamera(camera,900);
 const panels=createFixedPanelLayout().map(p=>({...p,material:new T.ShaderMaterial({uniforms:{artwork:{value:null},projection:{value:new T.Matrix3()}},fragmentShader:'void main(){vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}'})}));
 const optics={bloomPass:'bloom',composer:{passes:['bloom'],insertPass(p,i){this.passes.splice(i,0,p);}},resetHistory(){}};
 const view={camera,cameraRig,panels,scene:new T.Scene(),ready:true,settings:{quality:'low'},reduced:{matches:false},optics,release(){},clearHover(){},hidePanelContent(){},wake(){}};
 const portal=new BannerPortal(view);
 return {view,portal,drawFrame(dt=1/60){cameraRig.update(dt);portal.prepareFrame(dt);},dispose(){if(portal.attached)portal.shutter.dispose();portal.dispose();panels.forEach(p=>p.material.dispose());}};
}
const area=f=>(f.clip[2]-f.clip[0])*(f.clip[3]-f.clip[1]);

test('each destination is already visible through the opening before tunnel flight starts',()=>{
 for(let index=0;index<5;index++){
  const f=journey(),frames=[];
  f.portal.enter(index,()=>{},(progress,frame)=>frames.push({progress,frame,stage:f.portal.stage}));
  for(let i=0;i<62;i++)f.drawFrame();
  assert.ok(frames.some(({progress,frame,stage})=>stage==='approach'&&progress===0&&frame.opacity>.5&&area(frame)>0&&arrivalTransform(frame)),`destination ${index} stays blank during approach`);
  f.dispose();
 }
});

test('a partially opened entrance hides page pixels outside the physical aperture',()=>{
 const basis=portalBasis(createFixedPanelLayout()[0]),pose=portalTravelPose(basis,0);
 const camera=new T.PerspectiveCamera(48,1.5,.08,100);
 camera.position.copy(basis.center).addScaledVector(basis.forward,-18);
 camera.quaternion.copy(pose.rotation);camera.updateMatrixWorld(true);
 const opening=.2,aperture=opening*1.22-.09;
 const frame=projectPortalExit(camera,basis,portalTravelPose(basis,1),{width:900,height:600,contentWidth:900},opening);
 assert.ok(area(frame)>0);
 const eye=basis.toLocal(camera.position),k=-eye.z/(frame.exitDepth-eye.z);
 for(const u of [frame.clip[0],frame.clip[2]])for(const v of [frame.clip[1],frame.clip[3]]){
  const wall=new T.Vector3(frame.exitOffset+(u*2-1)*frame.exitHalf[0],(1-v*2)*frame.exitHalf[1],frame.exitDepth);
  const entry=eye.clone().lerp(wall,k);
  assert.ok(Math.abs(entry.x)<=basis.half.x*aperture+1e-7,'page leaks through the entrance sides');
  assert.ok(Math.abs(entry.y)<=basis.half.y*aperture+1e-7,'page leaks through the entrance top or floor');
 }
 const closed=projectPortalExit(camera,basis,portalTravelPose(basis,1),{width:900,height:600,contentWidth:900},0);
 assert.equal(area(closed),0,'a closed portal must hide the whole page');
 assert.ok(Number.isFinite(closed.exitDepth),'clipping must not erase the shader geometry');
});

test('the page remains visible while reversing the same approach instead of fading at flight zero',()=>{
 const f=journey(),forward=new Map(),reverse=[];
 f.portal.enter(0,()=>{},(p,frame)=>{if(f.portal.stage==='approach')forward.set(Math.round(f.portal.age*60),frame);});
 for(let i=0;i<240&&f.portal.active;i++)f.drawFrame();
 f.portal.returnToShowroom(0,()=>{},(p,frame)=>{if(f.portal.stage==='approach')reverse.push({age:f.portal.age,frame});});
 for(let i=0;i<240&&f.portal.active;i++)f.drawFrame();
 const visible=reverse.filter(({age,frame})=>age>.6&&age<1&&frame.opacity>.5&&area(frame)>0);
 assert.ok(visible.length>10,'reverse approach loses the destination while the entrance is still open');
 for(const {age,frame} of visible){
  const prior=forward.get(Math.round(age*60));assert.ok(prior);
  assert.ok(Math.abs(frame.opacity-prior.opacity)<1e-7);
  frame.clip.forEach((v,i)=>assert.ok(Math.abs(v-prior.clip[i])<1e-7));
  frame.quad.forEach((p,i)=>p.forEach((v,j)=>assert.ok(Math.abs(v-prior.quad[i][j])<1e-7)));
 }
 f.dispose();
});

test('scene warm-up temporarily renders even when restoration happens behind a parked page',async()=>{
 const f=journey(),v=f.view,initialPosition=v.camera.position.clone(),initialRotation=v.camera.quaternion.clone();
 v.pageActive=true;v.renderer={shadowMap:{needsUpdate:false},getContext:()=>({})};
 let draws=0;
 v.render=()=>{assert.equal(v.pageActive,false,'parked page suppresses the portal warm draw');draws++;assert.ok(f.portal.effects.uniforms.burstHalf.value.x>0,'opening effects must use the real doorway');};
 try{
  await f.portal.prepareScene(new AbortController().signal);
  assert.equal(draws,20,'all five destinations must warm exterior, interior and moving interior');assert.equal(v.pageActive,true);
  assert.ok(v.camera.position.equals(initialPosition));assert.ok(v.camera.quaternion.equals(initialRotation));
  assert.equal(f.portal.active,false);assert.equal(f.portal.effects.group.visible,false);assert.equal(f.portal.scenePrepared,true);
 }finally{f.dispose();}
});

test('portal prewarm covers every page, exterior effects and interior path before first input',async()=>{
 const f=journey(),v=f.view,seen=[];v.settings.quality='auto';
 f.portal.attached=true;
 v.pageActive=false;v.renderer={shadowMap:{needsUpdate:false},getContext:()=>({})};
 v.render=()=>{if(!f.portal.panel)return;f.portal.prepareFrame(1/60);seen.push({index:f.portal.panel.index,interior:f.portal.interior,progress:f.portal.panel.portalUniforms.portalProgress.value,fx:f.portal.effects.group.visible,stage:f.portal.stage,shutter:f.portal.shutter.uniforms.uShutter.value});};
 try{
  await f.portal.prepareScene(new AbortController().signal);
  for(let index=0;index<5;index++){
   const samples=seen.filter(s=>s.index===index);
   assert.equal(samples.length,4);
   assert.deepEqual(samples.map(s=>s.progress),[0,.38,.39,1]);
   assert.ok(samples.some(s=>s.stage==='approach'&&!s.interior&&s.fx));
   assert.ok(samples.some(s=>s.interior));
   assert.ok(samples.some(s=>s.interior&&s.shutter>0),'moving corridor shader must be drawn before the first click');
   assert.equal(v.panels[index].portalUniforms.portalMix.value,0);
  }
  assert.equal(f.portal.panel,null);
 }finally{f.dispose();}
});
