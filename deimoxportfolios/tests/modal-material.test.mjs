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
