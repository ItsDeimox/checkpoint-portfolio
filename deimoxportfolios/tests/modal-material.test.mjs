import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const entry=new URL('../src/ui/modal-material.js',import.meta.url);
test('dialog optical controller is installed as an independent module',()=>assert.ok(existsSync(entry)));
if(existsSync(entry)){
 const {modalLocalPoint,modalTextureSize,ModalEnergy}=await import(entry);
 test('CSS pointer coordinates do not depend on DPR or page scroll',()=>{
  assert.deepEqual(modalLocalPoint(320,150,{left:120,top:50,width:400,height:200}),[.5,.5]);
  assert.deepEqual(modalLocalPoint(120,50,{left:120,top:50,width:400,height:200}),[0,1]);
  assert.deepEqual(modalLocalPoint(520,250,{left:120,top:50,width:400,height:200}),[1,0]);
 });
 test('resolution is bounded uniformly, not stretched in one dimension',()=>{
  const [w,h]=modalTextureSize(840,500,3);assert.ok(w<=1260&&h<=800);assert.ok(Math.abs(w/h-840/500)<.005);
 });
 test('finite impulses travel beyond their source and decay after leave',()=>{
  const e=new ModalEnergy(800,500);e.stroke([.40,.45],0,[320,225]);e.stroke([.48,.45],35,[384,225]);
  const first=e.field.inspect();assert.ok(first.awake);for(let i=0;i<20;i++)e.step(1/120);
  assert.ok(e.field.inspect().activeNodes>first.activeNodes);e.leave();const impulses=e.field.impulses;
  for(let i=0;i<2400;i++)e.step(1/120);
  assert.equal(e.field.impulses,impulses);assert.equal(e.field.awake,false);
 });
 test('repeated stationary pointer events do not perpetually excite the field',()=>{
  const e=new ModalEnergy(840,500);e.stroke([.5,.5],10,[100,100]);const count=e.field.impulses;
  for(let t=20;t<800;t+=10){e.stroke([.5,.5],t,[100,100]);e.step(.01);}
  assert.equal(e.field.impulses,count);
 });
}

// Each control needs its own envelope/anchor so a leave fades where the light was,
// rather than making the spot jump to the next button or switching the border on/off.
const modalModule=await import(entry);
test('modal control light has a continuous per-control response',()=>{
 assert.equal(typeof modalModule.ModalHoverResponse,'function');
});
if(modalModule.ModalHoverResponse){
 const {ModalHoverResponse}=modalModule;
 test('first hover frame is partial and the held highlight approaches its peak',()=>{
  const s=new ModalHoverResponse();s.update(1,[.2,.7],1/60);
  assert.ok(s.level>.01&&s.level<.2);assert.deepEqual(s.point,[.2,.7]);
  for(let i=0;i<40;i++)s.update(1,[.2,.7],1/60);
  assert.ok(s.level>.99);
 });
 test('hover exit retains the light anchor and fades over multiple frames',()=>{
  const s=new ModalHoverResponse();for(let i=0;i<60;i++)s.update(1,[.2,.7],1/60);
  const before=[...s.point];s.update(0,[1.9,-.5],1/60);
  assert.ok(s.level>.8&&s.level<1);assert.deepEqual(s.point,before);
  let pending;for(let i=0;i<180;i++)pending=s.update(0,[1.9,-.5],1/60);
  assert.equal(s.level,0);assert.equal(pending,false);
 });
 test('re-entry reverses the envelope without snapping or resetting the intensity',()=>{
  const s=new ModalHoverResponse();for(let i=0;i<25;i++)s.update(1,[.3,.5],1/60);
  for(let i=0;i<7;i++)s.update(0,[.9,.5],1/60);const low=s.level;
  s.update(1,[.8,.5],1/60);assert.ok(s.level>low&&s.level<.85);
  assert.ok(s.point[0]>.3&&s.point[0]<.8);
 });
 test('light position is smoothed while the control stays hovered',()=>{
  const s=new ModalHoverResponse();s.update(1,[.1,.2],.05);
  const previous=[...s.point];s.update(1,[.9,.8],1/60);
  assert.ok(s.point[0]>previous[0]&&s.point[0]<.9);
  assert.ok(s.point[1]>previous[1]&&s.point[1]<.8);
 });
 test('response remains equal at 30, 60 and 120Hz',()=>{
  const result=[];
  for(const hz of[30,60,120]){const s=new ModalHoverResponse();s.update(1,[.1,.2],0);
   for(let i=0;i<hz/2;i++)s.update(1,[.8,.7],1/hz);
   for(let i=0;i<hz/5;i++)s.update(0,[2,2],1/hz);
   result.push([s.level,...s.point]);
  }
  for(let i=1;i<result.length;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(result[i][j]-result[0][j])<1e-8);
 });
 test('reduced motion changes only to static states, with no pending animation',()=>{
  const s=new ModalHoverResponse();assert.equal(s.update(1,[.9,.2],.01,true),false);
  assert.equal(s.level,1);assert.deepEqual(s.point,[.9,.2]);
  assert.equal(s.update(0,[.1,.2],.01,true),false);assert.equal(s.level,0);
 });
 test('zero delta never advances the visible envelope',()=>{
  const s=new ModalHoverResponse();s.update(1,[.2,.5],0);assert.equal(s.level,0);
 });
}
