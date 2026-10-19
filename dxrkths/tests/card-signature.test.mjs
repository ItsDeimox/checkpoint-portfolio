import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RoomPanelEnergy} from '../src/scene/room-panel-energy.js';
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

test('physical cards use recorded continuous wakes, not the rejected fragments or cube lattice',()=>{
 const f=fixture();try{
  for(const {panel,texture,wake}of f.hover.entries){
   const code=panel.material.fragmentShader;
   assert.match(code,/flowTrail\(vUv,uSurfaceSpan\)/);
   assert.doesNotMatch(code,/prismTrail|shardA|gatedA|network\(4,|float wires=max\(/);
   assert.ok(panel.material.uniforms.uEnergyMap.value===texture);
   assert.ok(panel.material.uniforms.uWakePoints.value===wake.data);
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
