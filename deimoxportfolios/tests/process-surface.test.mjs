import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const modulePath=new URL('../src/core/process-surface.js',import.meta.url);
test('process surface has an independent rigid interaction model',()=>assert.ok(fs.existsSync(modulePath)));
const api=fs.existsSync(modulePath)?await import(modulePath):{};
if(api.makeProcessSurface){
 const {makeProcessSurface,advanceProcessSurface,processShapeDistance,PROCESS_MATERIAL}=api;
 test('idle surface stays neutral, full scale and at rest',()=>{
  const s=makeProcessSurface(0);for(let i=0;i<60;i++)advanceProcessSurface(s,1/60,false);assert.equal(s.hover,0);assert.equal(s.scale,1);assert.equal(s.lift,0);
 });
 test('hover moves the rigid card toward the viewer without exceeding the cap',()=>{
  const s=makeProcessSurface(1);s.target=1;advanceProcessSurface(s,1/60,false);assert.ok(s.hover>0&&s.hover<1);
  for(let i=0;i<180;i++)advanceProcessSurface(s,1/60,false);assert.ok(s.scale>1.02&&s.scale<=1.032);assert.ok(s.lift<0&&s.lift>=-9);
 });
 test('leaving fades energy and returns transform to the exact rest pose',()=>{
  const s=makeProcessSurface(2);s.target=1;advanceProcessSurface(s,.25,false);s.target=0;for(let i=0;i<400;i++)advanceProcessSurface(s,1/60,false);
  assert.equal(s.hover,0);assert.equal(s.scale,1);assert.equal(s.lift,0);
 });
 test('reduced motion still exposes color but never scales or lifts',()=>{
  const s=makeProcessSurface(0);s.target=1;for(let i=0;i<90;i++)advanceProcessSurface(s,1/60,true);assert.ok(s.hover>.9);assert.equal(s.scale,1);assert.equal(s.lift,0);
 });
 test('same hover response at 30,60,120Hz',()=>{
  const values=[30,60,120].map(hz=>{const s=makeProcessSurface(0);s.target=1;for(let i=0;i<hz;i++)advanceProcessSurface(s,1/hz,false);return s.hover});assert.ok(Math.max(...values)-Math.min(...values)<1e-8);
 });
 test('rounding connects both cut corners and leaves normal corners intact',()=>{
  const w=280,h=500;assert.ok(processShapeDistance([7,h-7],[w,h])<0);assert.ok(processShapeDistance([w-7,7],[w,h])<0);
  assert.ok(processShapeDistance([w-5,h-5],[w,h])>0);assert.ok(processShapeDistance([5,5],[w,h])>0);
  assert.ok(processShapeDistance([w/2,h/2],[w,h])<-100);
 });
 test('rounded outline stays symmetric and continuous over card sizes',()=>{
  for(const [w,h] of [[230,350],[278,522],[330,560]])for(let i=0;i<100;i++){
   let x=w*i/99,y=h*.82,a=processShapeDistance([x,y],[w,h]),b=processShapeDistance([w-x,h-y],[w,h]);assert.ok(Math.abs(a-b)<1e-7);
   if(i<99)assert.ok(Math.abs(a-processShapeDistance([x+w/99,y],[w,h]))<=w/99+1e-6);
  }
 });
 test('fragment grid uses the same CSS-pixel pitch on both axes',()=>assert.equal(PROCESS_MATERIAL.gridPitch,18));
}
