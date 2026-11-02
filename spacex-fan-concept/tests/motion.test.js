import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {existsSync}from'node:fs';
import {qualityProfile}from'../src/quality.js';
test('high bloom does not quarter-sample the bright extraction',()=>{assert.ok(qualityProfile({mode:'high'}).bloomScale>=1);});
const url=new URL('../src/viewer-motion.js',import.meta.url);
test('screen-relative inspection and continuous carousel controller exist',()=>assert.ok(existsSync(url)));
if(existsSync(url)){
 const {rotateInView,componentPose,depthRange,dragCarousel,settleCarousel,inspectionFit}=await import(url);
 test('engine preset shows underside at a readable oblique angle',()=>{const n=new T.Vector3(0,-1,0).applyQuaternion(componentPose('engines'));assert.ok(n.z>.75&&n.z<.98);assert.ok(Math.abs(n.x)+Math.abs(n.y)>.2);});
 test('camera-oriented drag is independent of the current object rotation',()=>{const c=new T.Quaternion().setFromEuler(new T.Euler(.3,.8,.2)),q=new T.Quaternion().setFromEuler(new T.Euler(1.4,2.8,-.9)),before=q.clone();rotateInView(q,40,0,c,800);const delta=q.clone().multiply(before.invert()),axis=new T.Vector3(delta.x,delta.y,delta.z).normalize(),up=new T.Vector3(0,1,0).applyQuaternion(c);assert.ok(axis.dot(up)>.999);});
 test('unbounded XY rotation stays normalized after thousands of moves',()=>{const q=new T.Quaternion(),c=new T.Quaternion();for(let i=0;i<8000;i++)rotateInView(q,5,3,c,600);assert.ok(Math.abs(q.length()-1)<1e-10);});
 test('camera near/far improves precision without clipping a sphere',()=>{const r=depthRange(2.7,.56);assert.ok(r.near>.025);assert.ok(r.near<2.7-.56);assert.ok(r.far>2.7+.56);assert.ok(r.far/r.near<1500);});
 test('inspection fit leaves room for every rotation and zoom limit',()=>{for(const [w,h]of[[1440,900],[390,844],[320,568]]){const b=new T.Box3(new T.Vector3(-.4,-.3,-.4),new T.Vector3(.4,.3,.4));const f=inspectionFit(b,w,h);assert.ok(f.distance>f.radius*1.5);assert.ok(f.position.every(Number.isFinite));}});
 test('carousel responds before release and has edge resistance',()=>{assert.equal(dragCarousel(1,-200,400,1,3),1.5);assert.ok(dragCarousel(1,300,400,1,3)>0.7);assert.ok(dragCarousel(3,-300,400,1,3)<3.3);});
 test('carousel settles to neighbor with bounded flick, or back when cancelled',()=>{assert.equal(settleCarousel(1.65,0,1,1,3),2);assert.equal(settleCarousel(1.15,1,1,1,3),2);assert.equal(settleCarousel(.8,-1,1,1,3),1);assert.equal(settleCarousel(1.65,1,1,1,3,true),1);});
}
if(existsSync(url)){
 const {createFade,CarouselMotion}=await import(url);
 test('partial fades preserve source opacity and restore exact depth flags',()=>{const m=new T.MeshStandardMaterial({opacity:.8,transparent:false,depthWrite:true,side:T.DoubleSide}),g=new T.Group();g.add(new T.Mesh(new T.BoxGeometry(),m));const f=createFade(g);f.set(.5);assert.equal(m.opacity,.4);assert.equal(m.transparent,true);assert.equal(m.depthWrite,false);f.set(0);assert.equal(g.visible,false);f.set(1);assert.equal(m.opacity,.8);assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);assert.equal(m.side,T.DoubleSide);});
 test('carousel converges without overshoot or permanent render loop',()=>{const m=new CarouselMotion(1.4);m.target=2;for(let i=0;i<240;i++)m.step(1/60);assert.equal(m.position,2);assert.equal(m.velocity,0);assert.equal(m.step(1/60),false);});
}
const {LensBloomPass}=await import('../src/lens-bloom.js');
test('high bloom starts at half raster resolution with five smoothly reconstructed layers',()=>{const b=new LensBloomPass();b.setSize(1440,900);assert.equal(b.renderTargetBright.width,720);assert.equal(b.renderTargetsVertical.length,5);assert.equal(b.compositeMaterial.uniforms.bloomTexSizes.value[0].x,720);assert.match(b.compositeMaterial.fragmentShader,/bloomSample/);assert.ok(b.highPassUniforms.smoothWidth.value>.1);b.dispose();});
if(existsSync(url)){
 const {createFade}=await import(url);
 test('stable fade endpoint resynchronizes visibility after replacing a model',()=>{const g=new T.Group(),f=createFade(g);g.visible=false;f.set(1);assert.equal(g.visible,true);f.set(0);g.visible=true;f.set(0);assert.equal(g.visible,false);});
}
