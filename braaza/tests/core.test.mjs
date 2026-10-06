import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const exists=fs.existsSync(new URL('../src/core.js',import.meta.url));
test('gallery core exists',()=>assert.ok(exists));
if(exists){
 const {wrap,Motion,slotY,chainOffset,dragGesture}=await import('../src/core.js');
 test('wrap remains positive across backward revolutions',()=>{assert.equal(wrap(-1,4),3);assert.equal(wrap(9,4),1);});
 test('positive wheel moves cards up, not sideways',()=>{const m=new Motion(4);m.advance(1);for(let i=0;i<180;i++)m.step(1/60);assert.ok(m.value>.9);});
 test('reduced motion snaps to requested position',()=>{const m=new Motion(4);m.advance(2);m.step(.016,true);assert.equal(m.value,2);});
 test('chains are strictly opposed and phase has no autonomous drift',()=>{assert.equal(chainOffset(2,-1),-chainOffset(2,1));assert.equal(chainOffset(0,1),0);});
 test('each card occupies a different vertical slot',()=>{const ys=Array.from({length:4},(_,i)=>slotY(i,.3,4));assert.equal(new Set(ys).size,4);});
 test('large deltas remain bounded and finite',()=>{const m=new Motion(4);for(let i=0;i<100;i++){m.advance(1e9);m.step(100);}assert.ok(Number.isFinite(m.value));assert.ok(Math.abs(m.velocity)<100);});
 test('click and drag are not confused',()=>{assert.equal(dragGesture(2,2),false);assert.equal(dragGesture(9,0),true);});
 test('motion eventually sleeps',()=>{const m=new Motion(4);m.advance(1);for(let i=0;i<600;i++)m.step(1/60);assert.ok(Math.abs(m.velocity)<1e-4);});
}

test('Home reset clears motion immediately even after a long drag',async()=>{
 const {Motion}=await import('../src/core.js');
 const m=new Motion(4);m.advance(2);m.step(.04);assert.equal(typeof m.reset,'function');m.reset();assert.equal(m.value,0);assert.equal(m.target,0);assert.equal(m.velocity,0);
});
