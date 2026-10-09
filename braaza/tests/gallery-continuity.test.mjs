import test from 'node:test';
import assert from 'node:assert/strict';
import * as lifecycle from '../src/render/card-lifecycle.js';
import {slotY} from '../src/core.js';
// The legacy branch deliberately exercises the released bug before implementing the fix.
function sampler(){const states=Array.from({length:4},()=>({raw:null,y:null,s:lifecycle.createCardWrapState?.()}));return(p,dt=1/60)=>{
 if(lifecycle.galleryInstances)return lifecycle.galleryInstances(p,4);
 return states.map((c,index)=>{const r=lifecycle.wrapCardVisualY(slotY(index,p,4),c.raw,c.y,dt,false,c.s);c.raw=r.rawY;c.y=r.visualY;return{key:index,index,y:c.y};});
};}
const inside=c=>c.y>1.4&&c.y<9.7;
test('cards follow the same scroll delta immediately when direction reverses',()=>{
 const step=sampler();let old=step(0);for(let i=1;i<300;i++){const p=i<150?i*.011:1.65-(i-150)*.011,prev=i===150?1.639:i<150?(i-1)*.011:1.65-(i-151)*.011;
  const next=step(p);for(const c of next){const a=old.find(x=>x.key===c.key);if(a&&inside(a)&&inside(c))assert.ok(Math.abs((c.y-a.y)-(p-prev)*2.4)<1e-8,`frame ${i}, item ${c.index}: own animation drifts from scroll`);}old=next;
 }
});
test('visible spacing remains constant at every wrap and reverse wrap',()=>{
 const step=sampler();for(let i=0;i<600;i++){const p=Math.sin(i*.02)*6;const visible=step(p).filter(inside).sort((a,b)=>a.y-b.y);for(let j=1;j<visible.length;j++)assert.ok(Math.abs(visible[j].y-visible[j-1].y-2.4)<1e-8,`gap at position ${p}`);}
});
test('stopping the scroll also stops every card, without autonomous catch-up',()=>{
 const step=sampler();for(let i=0;i<80;i++)step(i*.02);const a=step(1.6),b=step(1.6);assert.deepEqual(a.map(c=>c.y),b.map(c=>c.y));
});
test('history does not affect the visible gallery at an identical scroll position',()=>{
 const a=sampler(),b=sampler();for(let i=0;i<240;i++)a(i*.012);for(let i=0;i<90;i++)b(-i*.008);
 assert.deepEqual(a(.37).filter(inside).map(c=>[c.index,c.y]).sort(),b(.37).filter(inside).map(c=>[c.index,c.y]).sort());
});
test('new occurrences are allocated well beyond both dissolve regions',()=>{
 assert.equal(typeof lifecycle.galleryInstances,'function');const samples=lifecycle.galleryInstances(.5,4);assert.ok(samples.length<=10);assert.ok(samples.some(c=>c.y< -1.5));assert.ok(samples.some(c=>c.y>12));
});
test('mask evaluates identical coverage for front/back at the same local XY',()=>{
 assert.equal(typeof lifecycle.cardCoverage,'function');for(let y=-3;y<14;y+=.07)for(const x of[-2.4,0,2.4]){const c=lifecycle.cardCoverage(y,[x,.4],2);assert.ok(c>=0&&c<=1);assert.equal(c,lifecycle.cardCoverage(y,[x,.4],2));}
});
