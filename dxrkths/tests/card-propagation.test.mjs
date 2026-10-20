import test from 'node:test';
import assert from 'node:assert/strict';
import {ShaderMaterial,Vector2,Group} from 'three';
import {CubeSurface} from '../src/ui/cube-surface.js';
import {CUBE_NETWORK_GLSL} from '../src/shaders/cube-network.js';
import {PanelEnergyField} from '../src/scene/panel-energy-field.js';
import {PANEL_NETWORK_GLSL} from '../src/shaders/panel-network.js';
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
 for(let id=0;id<field.count;id++){
  const [x,y]=field.vertices[id],g=field.glow[id],r2=x*x+y*y;
  total+=g;second+=r2*g;if(r2>.18)outside+=g;
 }
 return {radius:Math.sqrt(second/Math.max(total,1e-12)),outside};
}
test('cards use their own chevron network with the established emission gain and no path-history mask',()=>{
 const f=fixture();try{for(const {panel,wake}of f.hover.entries){
  assert.ok(panel.material.fragmentShader.includes(PANEL_NETWORK_GLSL),'the card must render its actual planar graph');
  assert.ok(!panel.material.fragmentShader.includes(CUBE_NETWORK_GLSL),'the card must have its own geometry instead of the copied cube pattern');
  assert.match(panel.material.fragmentShader,/panelNetwork\(vUv\)/);
  assert.match(panel.material.fragmentShader,/panelWave\.x\*\.42\+panelWave\.y\*\.46/);
  assert.doesNotMatch(panel.material.fragmentShader,/flowTrail|prismTrail|uWakePoints|uWakeCount|uSignalSeed/);
  assert.equal(wake,undefined);assert.equal(panel.material.uniforms.uWakeCount,undefined);
 }}finally{f.dispose();}
});
test('card simulation only contains its plane and leaves the separate cube/CTA graph untouched',()=>{
 const original=new CubeSurface(),before=structuredClone({vertices:original.vertices,faces:original.faces,edges:original.edges,data:original.data,inspect:original.inspect()});
 const step=original.step,inject=original.inject,f=fixture();try{
  for(const {field}of f.hover.entries){
   assert.ok(field instanceof PanelEnergyField);assert.equal(field instanceof CubeSurface,false);
   assert.ok(field.vertices.every(p=>p[2]===1),'the card cannot simulate hidden cube faces');
   assert.ok(field.count<original.count/3&&field.edges.length<original.edges.length/4,'the dedicated graph must remove the hidden-face work');
   assert.ok(field.data.length<original.data.length/3,'uploads must be limited to the planar atlas');
  }
  f.hover.prime();f.hover.point(0,new Vector2(.3,.8),100);f.hover.update(1/60);
  const after=new CubeSurface();
  assert.deepEqual(original.inspect(),before.inspect);assert.deepEqual(original.data,before.data);
  assert.deepEqual(after.vertices,before.vertices);assert.deepEqual(after.faces,before.faces);
  assert.deepEqual(after.edges,before.edges);assert.deepEqual(after.data,before.data);
  assert.equal(after.step,step);assert.equal(after.inject,inject);
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
test('chevron routes create a directional wave footprint while preserving the initial response strength',()=>{
 const f=fixture(),original=new CubeSurface();try{
  const field=f.hover.entries[0].field;original.setAspect(field.span[0]/field.span[1]);
  original.inject(.5,.5,.4);field.inject(.5,.5,.4);
  field.step(1/60);original.step(1/60);
  assert.ok(field.peak>original.peak*.8&&field.peak<original.peak*1.3,'the new geometry must retain a vivid local response');
  for(let i=0;i<35;i++){field.step(1/60);original.step(1/60);}
  function directionality(graph,ids){let x=0,y=0;for(const id of ids){const p=graph.vertices[id],g=graph.glow[id];x+=g*p[0]*p[0];y+=g*p[1]*p[1];}return x/y;}
  const planar=directionality(field,field.vertices.keys()),cube=directionality(original,original.faces[4]);
  assert.ok(planar>cube*2,'waves must favour the long chevron rails and branch through shorter ribs');
  assert.ok(cube>.6&&cube<1.4,'the separate cube must retain its original roughly radial transport');
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
