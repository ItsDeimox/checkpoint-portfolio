import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
const module=await import('../src/scene/room-portal.js').catch(()=>({}));
const sections=await import('../src/pages/section-pages.js').catch(()=>({}));

test('portal coordinates match all five rigid banners and point into their own surface',()=>{
 assert.equal(typeof module.portalBasis,'function');
 for(const panel of createFixedPanelLayout()){
  const b=module.portalBasis(panel);
  assert.ok(b.forward.dot(panel.normal)<-.99999);
  const topLeft=b.toLocal(panel.corners[0]);
  assert.ok(topLeft.x<0&&topLeft.y>0&&Math.abs(topLeft.z)<1e-5);
  assert.ok(b.right.clone().cross(b.up).dot(panel.normal)>.99999);
  assert.ok(b.toLocal(panel.center.clone().addScaledVector(panel.normal,3)).z<0);
 }
});
test('travel crosses the banner center once and ends behind it, not in front of a fullscreen graphic',()=>{
 assert.equal(typeof module.portalTravelPose,'function');
 for(const panel of createFixedPanelLayout()){
  const b=module.portalBasis(panel);let previous=-Infinity,crossings=0;
  for(let i=0;i<=240;i++){
   const p=module.portalTravelPose(b,i/240),local=b.toLocal(p.position);
   assert.ok(local.z>=previous-1e-8);
   assert.ok(Math.abs(local.x)<1e-8&&Math.abs(local.y)<1e-8);
   if(previous<0&&local.z>=0)crossings++;
   const direction=new T.Vector3(0,0,-1).applyQuaternion(p.rotation);
   assert.ok(direction.dot(b.forward)>.9999);previous=local.z;
  }
  assert.equal(crossings,1);assert.ok(previous>=20);
 }
});
test('portal and interior ray projections agree on both sides of the camera near plane',()=>{
 assert.equal(typeof module.portalBasis,'function');
 for(const panel of createFixedPanelLayout())for(const aspect of [.45,1.777,3.55]){
  const b=module.portalBasis(panel),camera=new T.PerspectiveCamera(48,aspect,.08,100);
  camera.position.copy(b.center).addScaledVector(panel.normal,.12);camera.lookAt(b.center);camera.updateMatrixWorld(true);
  for(const [x,y]of [[0,0],[-.9,.9],[.9,-.9]]){
   const point=new T.Vector3(x,y,1).unproject(camera),ray=point.sub(camera.position).normalize();
   const distance=-b.toLocal(camera.position).z/ray.dot(b.forward);
   const hit=camera.position.clone().addScaledVector(ray,distance);
   assert.ok(Math.abs(b.toLocal(hit).z)<1e-6);
   assert.ok(ray.distanceTo(hit.sub(camera.position).normalize())<1e-6);
  }
 }
});
test('each destination is a full accessible page with authored links, not an in-world decal',()=>{
 assert.equal(typeof sections.renderSectionPage,'function');
 for(let i=0;i<5;i++){
  const html=sections.renderSectionPage(i);
  assert.match(html,/class="section-layout/);assert.match(html,/id="section-title"/);
  assert.match(html,/data-return-showroom/);assert.doesNotMatch(html,/data-room-panel-action|aria-modal|<canvas/);
  assert.match(html,/rel="noopener noreferrer"/);
 }
 assert.match(sections.renderSectionPage(2),/No new projects have been announced/);
});

test('resizing an active portal never redirects the camera to the showroom overview',async()=>{
 const {RoomCamera}=await import('../src/scene/room-camera.js');
 const camera=new T.PerspectiveCamera(42,1.5,.08,100),rig=new RoomCamera(camera,960);
 const panels=createFixedPanelLayout().map(p=>({...p,material:new T.ShaderMaterial({uniforms:{artwork:{value:null},projection:{value:new T.Matrix3()}},fragmentShader:'void main(){vec2 p=vec2(0.);vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}'})}));
 const view={camera,cameraRig:rig,panels,ready:true,settings:{quality:'low'},reduced:{matches:false},optics:{resetHistory(){}},release(){},clearHover(){},hidePanelContent(){},wake(){}};
 const originalFocus=rig.focusTarget.clone();
 const journey=new module.BannerPortal(view);journey.enter(0,()=>{});rig.update(.1);
 const endpoint=rig.transition.end.clone();camera.aspect=.45;camera.updateProjectionMatrix();rig.resize(390);
 assert.equal(rig.mode,'portal');assert.ok(rig.transition.end.distanceTo(endpoint)<1e-8);
 journey.cancel();assert.ok(rig.focusTarget.distanceTo(originalFocus)<1e-8,'Return restores car focus, not portal focus');assert.equal(rig.mode,'overview');assert.ok(panels.every(p=>p.portalUniforms.portalMix.value===0));journey.dispose();
});
test('destination layout removes the entire viewport-sized showroom wrapper',async()=>{
 const {readFile}=await import('node:fs/promises');const css=await readFile(new URL('../src/styles-sections.css',import.meta.url),'utf8');
 assert.match(css,/body\.section-active \.room-home\s*\{\s*display:\s*none/);
});

test('arrival during a frame cannot leave an orphan RAF blocking the return to showroom',async()=>{
 const {HeroScene}=await import('../src/scene/room-portal-scene.js');
 const {HeroScene:Parent}=await import('../src/scene/room-hologram-scene.js');
 const prior=Parent.prototype.frame;let sleeps=0;
 Parent.prototype.frame=function(){this.pageActive=true;this.raf=73;};
 const view=Object.create(HeroScene.prototype);Object.assign(view,{pageActive:false,raf:0,sleep(){this.raf=0;sleeps++;}});
 try{view.frame(1000);assert.equal(view.raf,0);assert.equal(sleeps,1);}finally{Parent.prototype.frame=prior;}
});
