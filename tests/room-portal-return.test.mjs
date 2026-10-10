import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {BannerPortal,portalTravelPose} from '../src/scene/room-portal.js';
import {RoomCamera} from '../src/scene/room-camera.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {SectionRoutes} from '../src/ui/room-section-routes.js';

function fixture(width=960,height=640){
 const camera=new T.PerspectiveCamera(48,width/height,.08,100),cameraRig=new RoomCamera(camera,width);
 const panels=createFixedPanelLayout().map(p=>({...p,material:new T.ShaderMaterial({uniforms:{artwork:{value:null},projection:{value:new T.Matrix3()}},fragmentShader:'void main(){vec2 p=vec2(0.);vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}'})}));
 const view={camera,cameraRig,panels,scene:new T.Scene(),ready:true,settings:{quality:'low'},reduced:{matches:false},optics:{bloomPass:'bloom',composer:{passes:['bloom'],insertPass(p,i){this.passes.splice(i,0,p);}},resetHistory(){}},release(){},clearHover(){},hidePanelContent(){},wake(){}};
 const portal=new BannerPortal(view);return {...view,view,portal};
}
const advance=(f,seconds)=>{for(let t=0;t<seconds-1e-8;t+=1/60)f.cameraRig.update(Math.min(1/60,seconds-t));};
const dispose=f=>{if(f.portal.attached)f.portal.shutter.dispose();f.portal.dispose();for(const p of f.panels)p.material.dispose();};

test('all five doorways reverse across the plane exactly once and restore the original view',()=>{
 assert.equal(typeof BannerPortal.prototype.returnToShowroom,'function');
 for(const [w,h] of [[960,640],[390,844]])for(let i=0;i<5;i++){
  const f=fixture(w,h),v=f.camera;f.cameraRig.pointLook(.6,-.3);advance(f,2);
  const home={p:v.position.clone(),q:v.quaternion.clone(),fov:v.fov};let arrivals=0,returns=0;
  f.portal.enter(i,()=>arrivals++);advance(f,3);assert.equal(arrivals,1);
  assert.equal(f.portal.returnToShowroom(i,()=>returns++),true);
  assert.equal(f.portal.returning,true);assert.ok(f.portal.basis.toLocal(v.position).z>20);
  let last=23,crossings=0;
  for(let n=0;n<110;n++){f.cameraRig.update(1/60);const z=f.portal.basis.toLocal(v.position).z;if(last>0&&z<=0)crossings++;if(f.portal.stage==='flight')assert.ok(z<=last+1e-6);last=z;}
  advance(f,1.5);assert.equal(crossings,1);assert.equal(returns,1);assert.equal(arrivals,1);
  assert.ok(v.position.distanceTo(home.p)<1e-7);assert.ok(v.quaternion.angleTo(home.q)<1e-7);assert.ok(Math.abs(v.fov-home.fov)<1e-6);
  assert.equal(f.portal.active,false);assert.equal(f.portal.interior,false);assert.equal(f.cameraRig.mode,'overview');
  assert.equal(f.portal.effects.group.visible,false);assert.equal(f.portal.shutter.enabled,false);
  assert.ok(f.panels.every(p=>p.portalUniforms.portalMix.value===0));advance(f,.5);assert.equal(returns,1);dispose(f);
 }
});
test('reverse approach retraces the same Bezier and camera orientation, not a hard reset',()=>{
 const f=fixture();const samples=[];f.portal.enter(4,()=>{});
 for(let i=0;i<=12;i++){if(i)advance(f,.1);samples.push({p:f.camera.position.clone(),q:f.camera.quaternion.clone(),fov:f.camera.fov});}
 advance(f,2);assert.equal(typeof f.portal.returnToShowroom,'function');f.portal.returnToShowroom(4,()=>{});advance(f,1.65);
 for(let i=0;i<=12;i++){if(i)advance(f,.1);const s=samples[12-i];assert.ok(f.camera.position.distanceTo(s.p)<1e-5,`reverse sample ${i}`);assert.ok(f.camera.quaternion.angleTo(s.q)<1e-5);}
 dispose(f);
});
test('reverse motion reuses signed camera reprojection and the existing effects without extra targets',()=>{
 const f=fixture();assert.equal(typeof f.portal.returnToShowroom,'function');f.portal.returnToShowroom(2,()=>{});const pass=f.portal.shutter;pass.setSize(960,640);
 advance(f,.3);f.portal.prepareFrame(1/60);assert.equal(pass.uniforms.uShutter.value,0);
 advance(f,1/60);f.portal.prepareFrame(1/60);assert.ok(pass.uniforms.uShutter.value>0);assert.ok(pass.uniforms.uChromaticPixels.value>0);
 const geometry=f.portal.effects.smoke.geometry;advance(f,1.9);assert.equal(f.portal.effects.smoke.geometry,geometry);
 assert.equal(f.portal.effects.group.visible,true);assert.equal(pass.target,undefined);
 f.portal.cancel();assert.equal(pass.enabled,false);assert.equal(f.portal.returning,false);dispose(f);
});
test('resize during reverse flight or retreat preserves continuity and ends at the new viewport overview',()=>{
 for(const when of [.5,2]){
  const f=fixture();assert.equal(typeof f.portal.returnToShowroom,'function');f.portal.returnToShowroom(1,()=>{});advance(f,when);
  const before=f.camera.position.clone();f.camera.aspect=390/844;f.camera.updateProjectionMatrix();f.cameraRig.resize(390);
  assert.ok(f.camera.position.distanceTo(before)<1e-7);advance(f,3);
  const expected=new T.PerspectiveCamera(48,390/844,.08,100);new RoomCamera(expected,390);
  assert.ok(f.camera.position.distanceTo(expected.position)<1e-7);assert.equal(f.camera.fov,expected.fov);dispose(f);
 }
});
test('reduced motion, cancellation and disposal cannot deliver a stale reverse callback',()=>{
 for(const mode of ['reduced','cancel','dispose']){
  const f=fixture();let calls=0;assert.equal(typeof f.portal.returnToShowroom,'function');f.portal.returnToShowroom(0,()=>calls++);advance(f,.2);
  if(mode==='reduced'){f.reduced.matches=true;f.cameraRig.update(1/60);assert.equal(calls,1);}
  else{f.portal[mode]();advance(f,4);assert.equal(calls,0);}
  assert.equal(f.portal.active,false);assert.equal(f.portal.effects.group.visible,false);dispose(f);
 }
});
function routesFixture({ready=true,reduced=false}={}){
 const element=()=>({hidden:false,inert:false,innerHTML:'',style:{setProperty(){}},classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},querySelector:()=>null,focus(){},getBoundingClientRect:()=>({top:0})});
 const calls=[],scene={ready,reduced:{matches:reduced},returnPortal(index,callback){calls.push({index,callback});return true;},cancelPortal(){},resumeShowroom(){calls.push('resume');},parkSection(){calls.push('park');}};
 const doc={body:element(),defaultView:{scrollTo(){}}},root=element(),host=element(),footer=element(),canvas=element();let phase=ready?'ready':'dormant';
 const routes=new SectionRoutes({document:doc,root,host,footer,canvas,getScene:()=>scene,getPhase:()=>phase,entered:()=>true,setLocation:(i,m)=>calls.push({path:i,mode:m}),onSelect(){},onNeedScene:()=>calls.push('load'),onRefresh(){}});
 routes.open(3,null,'none',true);calls.length=0;return {routes,scene,calls,root,host,canvas,footer,ready(){scene.ready=true;phase='ready';routes.ready();}};
}
test('Back/Home/history return keeps interactions locked until reverse arrival and ignores duplicate clicks',()=>{
 for(const mode of ['push','none']){
  const f=routesFixture();f.routes.close(mode);f.routes.close(mode);
  assert.equal(f.routes.returning,true);assert.equal(f.routes.travelling,true);assert.equal(f.canvas.inert,true);
  const trips=f.calls.filter(c=>c.callback);assert.equal(trips.length,1);assert.equal(trips[0].index,3);
  trips[0].callback();assert.equal(f.routes.travelling,false);assert.equal(f.routes.returning,false);assert.equal(f.root.hidden,true);assert.equal(f.canvas.inert,false);
 }
});
test('history supersession and Escape cannot let a pending reverse callback overwrite a new page',()=>{
 const f=routesFixture();f.routes.close();assert.equal(f.routes.returning,true);const late=f.calls.find(c=>c.callback).callback;
 f.routes.open(1,null,'none',true);late();assert.equal(f.routes.page,true);assert.equal(f.routes.index,1);assert.equal(f.root.hidden,false);
 f.routes.close();f.routes.close('none',true);assert.equal(f.routes.returning,false);assert.equal(f.canvas.inert,false);
});
test('direct-page return waits for lazy scene preparation then reverses once; failure remains usable',()=>{
 const f=routesFixture({ready:false});f.routes.close();assert.equal(f.routes.returning,true);assert.ok(f.calls.includes('load'));assert.equal(f.root.hidden,false);
 f.ready();assert.equal(f.calls.filter(c=>c.callback).length,1);f.calls.find(c=>c.callback).callback();assert.equal(f.routes.travelling,false);
 const failed=routesFixture({ready:false});failed.routes.close();failed.routes.unavailable();assert.equal(failed.routes.returning,false);assert.equal(failed.host.hidden,false);assert.equal(failed.canvas.inert,false);
});
test('reduced-motion page returns bypass travel entirely',()=>{
 const f=routesFixture({reduced:true});f.routes.close();assert.equal(f.calls.some(c=>c.callback),false);assert.equal(f.canvas.inert,false);assert.equal(f.root.hidden,true);
});
