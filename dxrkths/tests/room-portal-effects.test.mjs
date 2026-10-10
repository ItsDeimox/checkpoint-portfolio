import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {portalBasis,portalTravelPose,BannerPortal} from '../src/scene/room-portal.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {RoomCamera} from '../src/scene/room-camera.js';
const fx=await import('../src/scene/room-portal-effects.js').catch(()=>({}));
const post=await import('../src/scene/room-portal-optics.js').catch(()=>({}));

test('impact envelope starts quietly, has one bounded opening pulse and clears on arrival/cancel/reduced motion',()=>{
 assert.equal(typeof fx.portalImpactEnvelope,'function');
 for(const quality of ['low','auto','high'])for(const age of [-1,0,.12,.28,.5,1,2,3,NaN,Infinity])for(const p of [0,.2,.6,1]){
  const state=fx.portalImpactEnvelope(age,p,true,false);
  for(const value of Object.values(state))assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
 }
 assert.equal(fx.portalImpactEnvelope(0,0,true,false).opening,0);
 assert.ok(fx.portalImpactEnvelope(.28,0,true,false).opening>.65);
 for(const args of [[2,.5,false,false],[2,.5,true,true],[3,1,true,false]])assert.ok(Object.values(fx.portalImpactEnvelope(...args)).every(x=>x===0));
});
test('Low keeps instanced particles and shutter sampling below the higher profiles',()=>{
 assert.ok(fx.PORTAL_FX_PROFILES);
 const {low,auto,high}=fx.PORTAL_FX_PROFILES;
 assert.ok(low.smoke<=8&&low.sparks<=32&&low.shutterSamples<=6);
 assert.ok(low.smoke<auto.smoke&&auto.smoke<=high.smoke);
 assert.ok(high.shutterSamples<=12&&high.sparks<=112);
});
test('opening atmosphere is anchored to the selected 3D banner, reused, and invisible off-transition',()=>{
 assert.equal(typeof fx.PortalEffects,'function');
 const scene=new T.Scene(),effects=new fx.PortalEffects(scene);
 const geometry=effects.smoke.geometry,material=effects.smoke.material;
 assert.equal(effects.group.visible,false);
 for(const panel of createFixedPanelLayout()){
  const basis=portalBasis(panel);effects.start(basis);effects.update(.3,0,'low',true,false);
  assert.equal(effects.group.visible,true);assert.ok(effects.origin.distanceTo(basis.center)<1e-8);
  assert.equal(effects.smoke.geometry,geometry);assert.equal(effects.smoke.material,material);
  assert.equal(geometry.isInstancedBufferGeometry,true);assert.ok(geometry.instanceCount<=8);
  effects.update(2,.5,'high',true,true);assert.equal(effects.group.visible,false);
  effects.reset();assert.equal(effects.group.visible,false);
 }
 effects.dispose();effects.dispose();assert.equal(scene.children.length,0);
});
test('corridor motion is accelerating and the lens widens without moving the banner or leaving the centerline',()=>{
 const b=portalBasis(createFixedPanelLayout()[0]);
 const a=portalTravelPose(b,.02),c=portalTravelPose(b,.07),d=portalTravelPose(b,.45),e=portalTravelPose(b,.5);
 assert.ok(e.position.distanceTo(d.position)>c.position.distanceTo(a.position)*1.3);
 assert.ok(d.fov>a.fov+5&&d.fov<=62);
 assert.ok(Math.abs(b.toLocal(e.position).x)<1e-8&&Math.abs(b.toLocal(e.position).y)<1e-8);
});
test('portal shutter reprojects camera velocity, has no private render target, and resets on a cut',()=>{
 assert.equal(typeof post.PortalShutterPass,'function');
 const pass=new post.PortalShutterPass(),camera=new T.PerspectiveCamera(48,1.5,.08,100),b=portalBasis(createFixedPanelLayout()[2]);
 pass.setSize(960,640);
 const put=p=>{const pose=portalTravelPose(b,p);camera.position.copy(pose.position);camera.quaternion.copy(pose.rotation);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);};
 put(.5);pass.update(camera,b,{age:2,progress:.5,active:true,interior:true,quality:'low',dt:1/60});
 assert.equal(pass.uniforms.uShutter.value,0);put(.504);
 pass.update(camera,b,{age:2.017,progress:.504,active:true,interior:true,quality:'low',dt:1/60});
 assert.ok(pass.uniforms.uShutter.value>0);assert.ok(pass.uniforms.uChromaticPixels.value>0);
 assert.equal(pass.target,undefined);assert.equal(pass.enabled,true);assert.ok(pass.uniforms.uSamples.value<=6);
 put(.9);pass.update(camera,b,{age:2.5,progress:.9,active:true,interior:true,quality:'high',dt:1/60});
 assert.equal(pass.uniforms.uShutter.value,0,'A cut must not smear history');
 pass.reset();assert.equal(pass.enabled,false);assert.equal(pass.uniforms.uShutter.value,0);pass.dispose();
});
test('optics attachment is idempotent, idle passes stay off, and cancellation releases every temporary effect',()=>{
 const camera=new T.PerspectiveCamera(48,1.5,.08,100),rig=new RoomCamera(camera,960),scene=new T.Scene();
 const panels=createFixedPanelLayout().map(p=>({...p,material:new T.ShaderMaterial({uniforms:{artwork:{value:null},projection:{value:new T.Matrix3()}},fragmentShader:'void main(){vec2 p=vec2(0.);vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}'})}));
 const optics={composer:{passes:['lens','bloom'],insertPass(pass,i){this.passes.splice(i,0,pass);}},bloomPass:'bloom',resetHistory(){}};
 const view={scene,camera,cameraRig:rig,panels,ready:true,settings:{quality:'low'},reduced:{matches:false},optics,release(){},clearHover(){},hidePanelContent(){},wake(){}};
 const portal=new BannerPortal(view);
 assert.equal(typeof portal.attachOptics,'function');portal.attachOptics(optics);portal.attachOptics(optics);assert.equal(optics.composer.passes.length,3);
 portal.enter(1,()=>{});rig.update(.3);portal.prepareFrame(1/60);assert.equal(portal.effects.group.visible,true);
 portal.cancel();assert.equal(portal.effects.group.visible,false);assert.equal(optics.portalPass.enabled,false);assert.equal(rig.mode,'overview');
 portal.dispose();
});

test('interior shader preparation uses the real HDR scene target and restores renderer state',async()=>{
 const target={name:'scene-linear'},prior={name:'previous'},scene={name:'portal'};let active=prior,captured;
 const renderer={getRenderTarget:()=>active,setRenderTarget:x=>{active=x;},async compileAsync(s){captured={target:active,scene:s};}};
 const owner={fullScene:scene,view:{renderer,camera:{},optics:{sceneTarget:target}}};
 await BannerPortal.prototype.prepare.call(owner);
 assert.equal(captured.target,target);assert.equal(captured.scene,scene);assert.equal(active,prior);
 renderer.compileAsync=async()=>{throw Error('lost context');};await assert.rejects(BannerPortal.prototype.prepare.call(owner),/lost context/);assert.equal(active,prior);
});
test('temporary portal light/bloom/optical overrides restore even when rendering fails',async()=>{
 const {HeroScene}=await import('../src/scene/room-portal-scene.js');
 const {HeroScene:Parent}=await import('../src/scene/room-hologram-scene.js');
 const prior=Parent.prototype.render,position=new T.Vector3(2,3,4),light=new T.PointLight(0xff0011,1.3);light.position.copy(position);
 const scene={},visual={depthOfField:1.5,motionBlur:1},bloom={value:.65};let prepared=0;
 const v={pageActive:false,reduced:{matches:false},screenLight:light,optics:{renderPass:{scene},visualSettings:visual,gradePass:{uniforms:{uBloomStrength:bloom}}},
  bannerPortal:{active:true,interior:false,stage:'approach',age:.28,basis:portalBasis(createFixedPanelLayout()[0]),panel:{portalUniforms:{portalProgress:{value:0}}},prepareFrame(){prepared++;}}};
 Parent.prototype.render=function(){assert.ok(light.intensity>10);assert.ok(bloom.value>.8);throw Error('draw failed');};
 try{assert.throws(()=>HeroScene.prototype.render.call(v,1/60,.65),/draw failed/);assert.equal(prepared,1);assert.equal(light.intensity,1.3);assert.ok(light.position.equals(position));assert.equal(bloom.value,.65);assert.equal(v.optics.visualSettings,visual);assert.equal(v.optics.renderPass.scene,scene);}finally{Parent.prototype.render=prior;}
});
