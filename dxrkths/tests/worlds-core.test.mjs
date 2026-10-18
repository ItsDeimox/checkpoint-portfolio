import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
async function load(path){const url=new URL(path,import.meta.url);assert.ok(existsSync(url),`Missing implementation: ${path}`);return import(url.href);}
test('five exact identities and an independent dim white idle state',async()=>{
 const {PAGE_THEMES,NEUTRAL_THEME,themeFor}=await load('../src/world-themes.js');
 assert.deepEqual(PAGE_THEMES.map(t=>t.hex),['#ff2849','#f1f4f8','#a879ff','#ff964b','#70d5ff']);
 for(let i=0;i<5;i++)assert.equal(themeFor(i),PAGE_THEMES[i]);
 for(const i of[-1,5,NaN,null,undefined])assert.equal(themeFor(i),NEUTRAL_THEME);
 assert.ok(Object.isFrozen(PAGE_THEMES));
});
test('theme damping is frame-rate independent, bounded and handles invalid time',async()=>{
 const {damp}=await load('../src/world-themes.js');
 let a=0,b=0;for(let i=0;i<60;i++)a=damp(a,1,1/60);for(let i=0;i<120;i++)b=damp(b,1,1/120);
 assert.ok(Math.abs(a-b)<1e-10);assert.ok(a>0.99&&a<=1);
 assert.equal(damp(.5,1,NaN),.5);assert.equal(damp(.5,1,-2),.5);
});
test('pointer energy propagates along connections, remains finite and decays after release',async()=>{
 const {EnergyField}=await load('../src/ui/energy-field.js');const field=new EnergyField(32,10);
 field.inject(.5,.5,1);const seed=Array.from(field.values);for(let i=0;i<16;i++)field.step(1/60);
 assert.ok(field.values.some((v,i)=>v>seed[i]+.001));for(let i=0;i<900;i++)field.step(1/60);
 assert.ok(field.values.every(v=>Number.isFinite(v)&&v>=0&&v<=1.5));assert.ok(Math.max(...field.values)<.001);
 field.inject(NaN,Infinity,1);field.step(NaN);assert.ok(field.values.every(Number.isFinite));
});
test('group wheel input never traps vertical scrolling at either edge',async()=>{
 const {wheelTravel}=await load('../src/ui/group-deck.js');
 assert.equal(wheelTravel(0,80,0,900),80);assert.equal(wheelTravel(0,-80,0,900),0);
 assert.equal(wheelTravel(0,80,900,900),0);assert.equal(wheelTravel(0,-80,900,900),-80);
 assert.equal(wheelTravel(100,2,400,900),0);assert.equal(wheelTravel(0,80,0,0),0);
});
