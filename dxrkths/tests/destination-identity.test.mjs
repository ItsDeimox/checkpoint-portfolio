import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
const mod=await import('../src/scene/room-identity.js').catch(()=>({}));
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {configurePanelHologram} from '../src/scene/room-hologram.js';
import {roomVertex,displayFragment} from '../src/scene/room-shaders.js';
function fixture(){
 const scene=new T.Scene(),emitter=new T.MeshBasicMaterial({color:new T.Color(5,.01,.02)});
 const panels=createFixedPanelLayout().map(p=>{
  const frame=new T.Group(),material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:0},hoverUv:{value:new T.Vector2(.5,.5)}}});
  const neon=new T.Mesh(new T.BoxGeometry(),emitter);frame.add(neon);scene.add(frame);
  const panel={...p,frame,material};configurePanelHologram(panel);return panel;
 });
 const carPaint=new T.MeshStandardMaterial({color:0xbe1624}),car=new T.Mesh(new T.BoxGeometry(),carPaint);scene.add(car);
 const env=new T.Mesh(new T.TorusGeometry(),emitter);scene.add(env);
 const light=new T.PointLight(0xff0023,3);scene.add(light);
 const screenLight=new T.PointLight(0xff0033,0);scene.add(screenLight);
 const view={scene,panels,screenLight,hoverPanel:-1,settings:{},reduced:{matches:false},reflectionBudget:{invalidate(){}},host:{style:{setProperty(){}}}};
 return {view,carPaint,env,light,clean(){scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});panels.forEach(p=>p.material.dispose());}};
}
test('identity controller starts dim/white, isolates card emitters, and never changes paint',()=>{
 assert.equal(typeof mod.RoomIdentity,'function');const f=fixture(),paint=f.carPaint.color.clone();
 const id=new mod.RoomIdentity(f.view);id.update(1,false);
 assert.ok(Math.abs(f.env.material.color.r-f.env.material.color.g)<.06);
 assert.ok(f.env.material.color.r<.4);assert.ok(f.light.intensity<.5);
 assert.notEqual(f.view.panels[0].frame.children[0].material,f.view.panels[1].frame.children[0].material);
 f.view.hoverPanel=2;for(let i=0;i<100;i++)id.update(1/60,false);
 assert.equal(id.selected,2);assert.ok(f.env.material.color.b>f.env.material.color.g);
 assert.ok(f.view.panels[2].material.uniforms.cardLevel.value>.98);
 assert.ok(f.view.panels[0].material.uniforms.cardLevel.value<.2);
 assert.ok(f.carPaint.color.equals(paint));
 f.view.hoverPanel=-1;for(let i=0;i<100;i++)id.update(1/60,false);
 assert.equal(id.selected,null);assert.ok(f.light.intensity<.5);
 assert.ok(Math.abs(f.env.material.color.r-f.env.material.color.g)<.06);f.clean();
});
test('an active portal keeps its own identity after pointer hover clears',()=>{
 assert.equal(typeof mod.RoomIdentity,'function');const f=fixture(),id=new mod.RoomIdentity(f.view);
 f.view.bannerPortal={active:true,panel:{index:4}};id.update(1,true);
 assert.equal(id.selected,4);assert.ok(f.env.material.color.b>f.env.material.color.r*2);
 for(const p of f.view.panels)assert.ok(p.material.fragmentShader.includes('cardAccent'));
 f.clean();
});
