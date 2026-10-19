import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RoomPanelEnergy} from '../src/scene/room-panel-energy.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {displayFragment,roomVertex} from '../src/scene/room-shaders.js';
import {configurePanelHologram} from '../src/scene/room-hologram.js';
function fixture(){
 const panels=createFixedPanelLayout().map(p=>{const material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:1},hoverUv:{value:new T.Vector2(.5,.5)}}});const panel={...p,frame:new T.Group(),material};configurePanelHologram(panel);return panel;});
 const view={panels,cameraRig:{mode:'overview'},bannerPortal:{active:false},reduced:{matches:false}},hover=new RoomPanelEnergy(view);
 return {view,hover,entry:hover.entries[0],dispose(){hover.dispose();panels.forEach(p=>p.material.dispose());}};
}
function wakeOf(f){assert.ok(f.entry.wake,'hover must retain the travelled UV path, not recenter decoration on the cursor');return f.entry.wake;}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);
test('the wake holds old positions still and ends at the actual bottom-up raycast UV',()=>{
 const f=fixture();try{const w=wakeOf(f);
  for(const [n,uv]of [[.2,.23],[.4,.45],[.7,.84]].entries()){f.hover.point(0,new T.Vector2(...uv),100+n*40);f.hover.update(.04);}
  assert.ok(w.count>=3);close(w.data[0],.2);close(w.data[1],.23);close(w.data[(w.count-1)*4],.7);close(w.data[(w.count-1)*4+1],.84);
  f.hover.update(.1);close(w.data[0],.2);close(w.data[1],.23);
 }finally{f.dispose();}
});
test('the wake connects sparse movement but never bridges a pointer leave/reentry',()=>{
 const f=fixture();try{const w=wakeOf(f);
  f.hover.point(0,new T.Vector2(.15,.2),100);f.hover.update(.04);f.hover.point(0,new T.Vector2(.8,.75),140);
  assert.equal(w.data[3],w.data[7],'fast cursor movement must be a joined segment, not dots');
  f.hover.release();f.hover.update(.04);f.hover.point(0,new T.Vector2(.3,.9),180);
  assert.notEqual(w.data[(w.count-1)*4+3],w.data[(w.count-2)*4+3],'reentry must not draw across the unrelated gap');
 }finally{f.dispose();}
});
test('a stationary pointer and pointer leave allow the wake to disappear completely',()=>{
 const f=fixture();try{const w=wakeOf(f);f.hover.point(0,new T.Vector2(.5,.8),100);
  for(let n=0;n<70;n++){f.hover.point(0,new T.Vector2(.5,.8),100+n*16);f.hover.update(1/60);}
  assert.equal(w.count,0);assert.equal(f.entry.panel.material.uniforms.uWakeCount.value,0);
 }finally{f.dispose();}
});
test('wake storage is bounded and shared with uniforms with no hover-time shader or texture creation',()=>{
 const f=fixture();try{const w=wakeOf(f),storage=w.data,texture=f.entry.texture,version=f.entry.panel.material.version;
  for(let n=0;n<120;n++){f.hover.point(0,new T.Vector2(.5+Math.sin(n*.06)*.3,.5+Math.cos(n*.06)*.3),100+n*8);f.hover.update(1/120);}
  assert.ok(w.count<=16&&w.count>=8);assert.equal(w.data,storage);assert.equal(f.entry.texture,texture);assert.equal(f.entry.panel.material.version,version);
  assert.equal(f.entry.panel.material.uniforms.uWakePoints.value,storage);assert.ok(w.data.every(Number.isFinite));
 }finally{f.dispose();}
});
test('portal travel and reduced motion clear the wake and stop hidden processing',()=>{
 const f=fixture();try{const w=wakeOf(f);f.hover.point(0,new T.Vector2(.4,.5),100);f.hover.update(.02);
  f.view.bannerPortal.active=true;f.hover.update(.02);assert.equal(w.count,0);assert.equal(f.entry.panel.material.uniforms.uWakeCount.value,0);
  f.view.bannerPortal.active=false;f.hover.point(0,new T.Vector2(.6,.5),140);f.view.reduced.matches=true;f.hover.update(.02);assert.equal(w.count,0);
 }finally{f.dispose();}
});
test('card shading uses a continuous recorded wake, without prisms, moving lane gates or cube wires',()=>{
 const f=fixture();try{const shader=f.entry.panel.material.fragmentShader;
  assert.doesNotMatch(shader,/prismTrail|shardA|gatedA|float wires=/);
  assert.match(shader,/flowTrail\(vUv,uSurfaceSpan\)/);assert.match(shader,/uWakePoints/);assert.match(shader,/dot\(ab,ab\)/);
 }finally{f.dispose();}
});
