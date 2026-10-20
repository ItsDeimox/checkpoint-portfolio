import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RoomPanelEnergy} from '../src/scene/room-panel-energy.js';
import {PANEL_NETWORK_GLSL} from '../src/shaders/panel-network.js';
import {CUBE_NETWORK_GLSL} from '../src/shaders/cube-network.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {roomVertex,displayFragment} from '../src/scene/room-shaders.js';
import {configurePanelHologram} from '../src/scene/room-hologram.js';

function fixture(){
 const panels=createFixedPanelLayout().map(p=>{
  const material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:1},hoverUv:{value:new T.Vector2(.5,.5)}}});
  const panel={...p,frame:new T.Group(),material};configurePanelHologram(panel);return panel;
 });
 const view={panels,cameraRig:{mode:'overview'},bannerPortal:{active:false,interior:false},reduced:{matches:false}};
 const hover=new RoomPanelEnergy(view);
 return {view,hover,panels,dispose(){hover.dispose();for(const p of panels)p.material.dispose();}};
}

test('physical cards render chevron wires and luminous junctions with the established tint and brightness',()=>{
 const f=fixture();try{
  for(const {panel,field,texture}of f.hover.entries){
   const code=panel.material.fragmentShader;
   assert.ok(code.includes(PANEL_NETWORK_GLSL));assert.ok(!code.includes(CUBE_NETWORK_GLSL));
   assert.match(code,/panelNetwork\(vUv\)/);
   assert.match(code,/float wires=max\(/);
   assert.match(code,/junctionDistance/);
   assert.match(code,/panelWave\.x\*\.42\+panelWave\.y\*\.46/);
   assert.match(code,/mix\(vec3\(\.80,\.92,1\.\),cardAccent,\.60\)/);
   assert.doesNotMatch(code,/prismTrail|flowTrail|uWakeCount|uWakePoints/);
   assert.ok(panel.material.uniforms.uEnergyMap.value===texture);
   assert.deepEqual(panel.material.uniforms.uPanelGrid.value.toArray(),field.grid);
   assert.equal(panel.material.uniforms.uEnergyActive.value,0);
  }
 }finally{f.dispose();}
});

test('only uniforms and texture data change after hover; geometry and shader versions stay stable',()=>{
 const f=fixture();try{
  const versions=f.panels.map(p=>p.material.version),textures=f.hover.entries.map(e=>e.texture);
  f.hover.point(2,new T.Vector2(.24,.83),100);
  f.hover.update(1/60);f.hover.update(1/60);f.hover.release();f.hover.update(1/60);
  assert.deepEqual(f.panels.map(p=>p.material.version),versions);
  assert.ok(f.hover.entries.every((e,i)=>e.texture===textures[i]));
  assert.ok(f.hover.entries.every(e=>e.panel.frame.children.length===0));
 }finally{f.dispose();}
});
