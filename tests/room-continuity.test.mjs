import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {BannerPortal,PORTAL_APPROACH_SECONDS as A,PORTAL_FLIGHT_SECONDS as F} from '../src/scene/room-portal.js';
import {RoomCamera} from '../src/scene/room-camera.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
const brand=await import('../src/scene/room-persistent-brand.js').catch(()=>({}));
function fixture(index=2){
 const camera=new T.PerspectiveCamera(48,1.5,.08,100),rig=new RoomCamera(camera,960);
 const panels=createFixedPanelLayout().map(p=>({...p,material:new T.ShaderMaterial({uniforms:{artwork:{value:null},projection:{value:new T.Matrix3()}},fragmentShader:'void main(){vec2 p=vec2(0.);vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}'})}));
 const view={camera,cameraRig:rig,panels,scene:new T.Scene(),ready:true,settings:{quality:'low'},reduced:{matches:false},optics:{resetHistory(){}},release(){},clearHover(){},hidePanelContent(){},wake(){}};
 const portal=new BannerPortal(view);portal.enter(index,()=>{});
 const advance=t=>{for(let rest=t;rest>1e-10;rest-=1/240)rig.update(Math.min(rest,1/240));};
 return {portal,rig,camera,advance,dispose(){portal.dispose();panels.forEach(p=>p.material.dispose());}};
}
test('all doors carry nonzero matching velocity into the corridor without a stop or restart',()=>{
 for(let i=0;i<5;i++){
  const f=fixture(i),h=1/1200;f.advance(A-h);const left=f.camera.position.clone();f.advance(h);const middle=f.camera.position.clone();f.advance(h);const right=f.camera.position.clone();
  const incoming=middle.clone().sub(left).divideScalar(h),outgoing=right.clone().sub(middle).divideScalar(h);
  assert.ok(incoming.length()>8,`banner ${i} must not ease to zero`);
  assert.ok(incoming.distanceTo(outgoing)/incoming.length()<.025,`banner ${i} velocity join`);
  assert.ok(outgoing.clone().normalize().dot(f.portal.basis.forward)>.999);f.dispose();
 }
});
test('a frame crossing the join consumes its leftover time instead of dropping it',()=>{
 const f=fixture();f.advance(A-.01);f.rig.update(.04);
 assert.ok(Math.abs(f.portal.elapsed-.03)<1e-7);f.dispose();
});
test('reverse still retraces the continuous path and keeps nonzero velocity across the doorway join',()=>{
 const f=fixture(),samples=[];for(let i=0;i<4;i++){f.advance(A/4);samples.push(f.camera.position.clone());}f.advance(F+.1);
 f.portal.returnToShowroom(2,()=>{});const h=1/1200;f.advance(F-h);const a=f.camera.position.clone();f.advance(h);const b=f.camera.position.clone();f.advance(h);const c=f.camera.position.clone();
 assert.ok(b.clone().sub(a).length()/h>8);assert.ok(c.clone().sub(b).normalize().dot(b.clone().sub(a).normalize())>.999);
 f.advance(A/4-h);assert.ok(f.camera.position.distanceTo(samples[2])<1e-5);f.advance(A);assert.equal(f.portal.active,false);f.dispose();
});
test('persistent brand is an on-demand 3D presenter with the existing spin, not a static replacement',()=>{
 assert.equal(typeof brand.PersistentBrand,'function');
 let renders=0,wakes=0;const p=Object.create(brand.PersistentBrand.prototype);
 p.ready=true;p.disposed=false;p.lost=false;p.document={hidden:false};p.spinController={active:true,update(){this.active=false;return false;}};p.reduced={matches:false};p.last=100;p.raf=1;
 p.draw=()=>{renders++;};p.wake=()=>{wakes++;};
 p.frame(120);assert.equal(renders,1);assert.equal(wakes,0,'final resting frame must not restart an idle loop');
 p.document.hidden=true;p.frame(140);assert.equal(renders,1,'hidden page cannot render');
});
test('external header ownership prevents the showroom from loading a duplicate logo',async()=>{
 const {HeroScene}=await import('../src/scene/room-hologram-scene.js');
 const {HeroScene:Base}=await import('../src/scene/room-scene.js');const prior=Base.prototype.initialize;
 const oldFetch=globalThis.fetch;let fetches=0;globalThis.fetch=async()=>{fetches++;throw Error('unwanted duplicate model');};
 Base.prototype.initialize=async()=>true;
 try{const scene={callbacks:{externalBrand:true},workController:new AbortController()};await HeroScene.prototype.initialize.call(scene);assert.equal(await scene.brandModelTask,null);assert.equal(fetches,0);}
 finally{Base.prototype.initialize=prior;globalThis.fetch=oldFetch;}
});
