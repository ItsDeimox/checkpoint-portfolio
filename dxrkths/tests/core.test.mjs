import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const entry=new URL('../src/core.js',import.meta.url);
test('navigation, pointer and quality core exists',()=>assert.ok(fs.existsSync(entry)));
if(fs.existsSync(entry)){
 const {routeName,coverUV,advance,qualitySize,DragState}=await import(entry);
 for(const r of ['home','groups','projects','about','contact'])test(`route ${r} is reachable`,()=>assert.equal(routeName(r==='home'?'/':`/${r}`),r));
 test('unknown paths are not silently treated as a valid content page',()=>assert.equal(routeName('/wrong'),'not-found'));
 test('covered UVs keep source aspect',()=>{let a=coverUV(1600,900,1600,450);assert.deepEqual(a,[1,.5]);});
 test('quality caps raster pixel cost on high-DPR displays',()=>{let [w,h]=qualitySize(2000,1000,3,'auto');assert.ok(w*h<=2200000);assert.ok(Math.abs(w/h-2)<.02);});
 test('damping is framerate independent',()=>{let a=0,b=0;for(let i=0;i<30;i++)a=advance(a,1,9,1/30);for(let i=0;i<120;i++)b=advance(b,1,9,1/120);assert.ok(Math.abs(a-b)<1e-9);});
 test('a drag cannot become a click',()=>{const d=new DragState();d.start(1,10,20);d.move(1,150,80);assert.equal(d.end(1),false);});
 test('pointer cancellation clears the drag',()=>{const d=new DragState();d.start(2,10,20);d.cancel();assert.equal(d.active,false);});
}
