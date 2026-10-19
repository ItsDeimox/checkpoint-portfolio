import test from 'node:test';
import assert from 'node:assert/strict';
import {ShaderMaterial,Vector2,Group} from 'three';
import {CubeSurface} from '../src/ui/cube-surface.js';
import {CUBE_NETWORK_GLSL} from '../src/shaders/cube-network.js';
import {RoomPanelEnergy} from '../src/scene/room-panel-energy.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {roomVertex,displayFragment} from '../src/scene/room-shaders.js';
import {configurePanelHologram} from '../src/scene/room-hologram.js';
function fixture(){
 const panels=createFixedPanelLayout().map(p=>{
  const material=new ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:1},hoverUv:{value:new Vector2(.5,.5)}}});
  const panel={...p,frame:new Group(),material};configurePanelHologram(panel);return panel;
 });
 const view={panels,cameraRig:{mode:'overview'},bannerPortal:{active:false,interior:false},reduced:{matches:false}};
 const hover=new RoomPanelEnergy(view);
 return {view,hover,panels,dispose(){hover.dispose();panels.forEach(p=>p.material.dispose());}};
}
function spread(field){
 let total=0,second=0,outside=0;
 for(const id of field.faces[4]){
  const [x,y]=field.vertices[id],g=field.glow[id],r2=x*x+y*y;
  total+=g;second+=r2*g;if(r2>.18)outside+=g;
 }
 return {radius:Math.sqrt(second/Math.max(total,1e-12)),outside};
}
test('cards restore the exact original network shading and emission, with no path-history mask',()=>{
 const f=fixture();try{for(const {panel,wake}of f.hover.entries){
  assert.ok(panel.material.fragmentShader.includes(CUBE_NETWORK_GLSL),'the original node/connection shader must be restored');
  assert.match(panel.material.fragmentShader,/network\(4,\(vUv-\.5\)\*uSurfaceSpan\+\.5\)/);
  assert.match(panel.material.fragmentShader,/cubeWave\.x\*\.42\+cubeWave\.y\*\.46/);
  assert.doesNotMatch(panel.material.fragmentShader,/flowTrail|prismTrail|uWakePoints|uWakeCount|uSignalSeed/);
  assert.equal(wake,undefined);assert.equal(panel.material.uniforms.uWakeCount,undefined);
 }}finally{f.dispose();}
});
test('only card transport weights change; vertices, links, solver, atlas and the CTA defaults are identical',()=>{
 const f=fixture(),original=new CubeSurface();try{
  const field=f.hover.entries[0].field;let changed=0;
  assert.deepEqual(field.vertices,original.vertices);assert.deepEqual(field.faces,original.faces);
  assert.equal(field.edges.length,original.edges.length);assert.equal(field.fixedStep,original.fixedStep);
  assert.equal(field.step,original.step);assert.equal(field.inject,original.inject);
  for(let i=0;i<field.edges.length;i++){
   const [a,b,w]=field.edges[i],before=original.edges[i];
   assert.equal(a,before[0]);assert.equal(b,before[1]);assert.ok(Number.isFinite(w)&&w>0&&w<=before[2]);
   if(field.vertices[a][2]===1&&field.vertices[b][2]===1){if(Math.abs(w-before[2])>1e-8)changed++;}
   else assert.equal(w,before[2],'hidden face transport must remain unchanged');
  }
  assert.ok(changed>1000,'the card propagation cannot stay identical to the cube');
  assert.deepEqual(original.edges,new CubeSurface().edges,'the button must keep its original transport');
  assert.equal(field.data.length,original.data.length);assert.equal(field.count,original.count);
 }finally{f.dispose();}
});
test('one stationary impulse travels beyond the cursor and keeps propagating after release',()=>{
 const f=fixture();try{
  const e=f.hover.entries[0];f.hover.point(0,new Vector2(.5,.5),100);f.hover.release();
  f.hover.update(1/60);const early=spread(e.field),impulses=e.field.impulses;
  for(let i=0;i<40;i++)f.hover.update(1/60);
  const later=spread(e.field);
  assert.ok(later.radius>early.radius*1.4,JSON.stringify({early,later}));
  assert.ok(later.outside>early.outside+1,'light must reach unvisited nodes');
  assert.equal(e.field.impulses,impulses);assert.equal(e.panel.material.uniforms.uEnergyActive.value,1);
 }finally{f.dispose();}
});
test('transport produces a different wave footprint without changing the cursor injection',()=>{
 const f=fixture(),original=new CubeSurface();try{
  const field=f.hover.entries[0].field;original.setAspect(field.span[0]/field.span[1]);
  original.inject(.5,.5,.4);field.inject(.5,.5,.4);
  assert.deepEqual(field.velocity,original.velocity,'input and strength are unchanged');
  for(let i=0;i<36;i++){field.step(1/60);original.step(1/60);}
  let error=0,total=0;
  for(const id of field.faces[4]){error+=Math.abs(field.glow[id]-original.glow[id]);total+=original.glow[id];}
  assert.ok(error/total>.15,'transport must visibly differ from the unchanged cube wave');
 }finally{f.dispose();}
});
test('propagation preserves resources and reaches rest without a separate cursor-trail renderer',()=>{
 const f=fixture();try{
  const entry=f.hover.entries[0],texture=entry.texture,version=entry.panel.material.version,weights=entry.field.edges.map(e=>e[2]);
  f.hover.point(0,new Vector2(.3,.8),100);const impulses=entry.field.impulses;
  for(let i=0;i<30;i++){f.hover.point(0,new Vector2(.3,.8),110+i*17);f.hover.update(1/60);}
  assert.equal(entry.field.impulses,impulses,'stationary input must not keep injecting');
  f.hover.release();for(let i=0;i<720;i++)f.hover.update(1/60);
  assert.equal(entry.field.awake,false);assert.equal(entry.panel.material.uniforms.uEnergyActive.value,0);
  assert.equal(entry.texture,texture);assert.equal(entry.panel.material.version,version);
  assert.deepEqual(entry.field.edges.map(e=>e[2]),weights,'weights are configured once, not rebuilt each frame');
  assert.equal(entry.panel.frame.children.length,0);
 }finally{f.dispose();}
});
test('portal and reduced-motion still bypass all card waves',()=>{
 const f=fixture();try{
  f.hover.prime();f.view.bannerPortal.active=true;
  assert.equal(f.hover.update(1/60),false);assert.ok(f.hover.entries.every(e=>!e.field.awake));
  f.view.bannerPortal.active=false;f.view.reduced.matches=true;f.hover.point(2,new Vector2(.5,.5),100);
  assert.equal(f.hover.update(1/60),false);assert.ok(f.hover.entries.every(e=>e.panel.material.uniforms.uReduced.value===1));
 }finally{f.dispose();}
});
