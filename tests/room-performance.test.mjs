import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {renderBudget} from '../src/scene/room-core.js';
import {restoreVisitorSettings} from '../src/ui/room-visitor-settings.js';
const perf=await import('../src/scene/room-performance.js').catch(()=>({}));
const reflections=await import('../src/scene/room-reflection-budget.js').catch(()=>({}));
test('a 180/240 Hz display cannot submit over 60 low/medium or 90 high frames a second',()=>{
 assert.equal(typeof perf.FramePacer,'function');
 for(const hz of [60,120,144,165,180,240])for(const limit of [30,60,90]){
  const gate=new perf.FramePacer();let count=0;
  for(let i=0;i<hz*10;i++)if(gate.take(i*1000/hz,limit))count++;
  assert.ok(count<=Math.min(hz,limit)*10+1,`${hz}/${limit}: ${count}`);
  assert.ok(count>=Math.min(hz,limit)*10-1,`${hz}/${limit} did not keep its cadence`);
 }
});
test('frame pacing rejects invalid time and does not replay missed frames after a stall',()=>{
 assert.equal(typeof perf.FramePacer,'function');const gate=new perf.FramePacer();
 assert.equal(gate.take(NaN,60),false);assert.equal(gate.take(0,60),true);
 assert.equal(gate.take(5,60),false);assert.equal(gate.take(10000,60),true);assert.equal(gate.take(10001,60),false);
 gate.reset();assert.equal(gate.take(10002,60),true);
});
test('mobile defaults to low without overriding explicit quality or music choices',()=>{
 const hints={mobile:true};
 const fresh=restoreVisitorSettings({},hints);assert.equal(fresh.quality,'low');assert.equal(fresh.qualityPreference,'device');
 assert.equal(restoreVisitorSettings({}, {mobile:false}).quality,'auto');
 assert.equal(restoreVisitorSettings({...fresh,quality:'high',qualityPreference:'manual'},hints).quality,'high');
 const existing=restoreVisitorSettings({visitorPreset:'showroom-intro-v1',quality:'auto',music:{volume:.13,reactivity:.72}},hints);
 assert.equal(existing.quality,'low');assert.deepEqual(existing.music,{volume:.13,reactivity:.72});
});
test('compact retina low is sharper, while 2K and ultrawide stay within 900k pixels',()=>{
 for(const [w,h]of [[390,844],[844,390]]){const b=renderBudget(w,h,3,'low');assert.ok(b.ratio>=1.2);assert.ok(b.width*b.height<=900000);}
 for(const [w,h]of [[2560,1440],[5120,2160]]){const b=renderBudget(w,h,2,'low');assert.ok(b.width*b.height<=900000);}
});
test('reflection budget drops hidden MSAA, caches a stationary view, and invalidates camera/rotation changes',()=>{
 assert.equal(typeof reflections.ReflectionBudget,'function');
 const ground=new T.Mesh(new T.PlaneGeometry(),new T.MeshBasicMaterial()),target=new T.WebGLRenderTarget(64,64,{samples:4});
 let draws=0;ground.getRenderTarget=()=>target;ground.onBeforeRender=()=>{draws++;};
 const view={ground,settings:{quality:'low'},camera:new T.PerspectiveCamera(),turntable:{angle:0},smokes:[],beams:[],optics:{supportedSamples:[4,2]}};
 const budget=new reflections.ReflectionBudget(view);budget.configure('low');assert.equal(target.samples,0);
 const capture=()=>ground.onBeforeRender({}, {},view.camera);
 budget.advance(1/60);capture();assert.equal(draws,1);
 budget.advance(1/60);capture();assert.equal(draws,1);
 view.camera.position.x=1;view.camera.updateMatrixWorld();capture();assert.equal(draws,2);
 view.turntable.angle=.1;capture();assert.equal(draws,3);
 budget.invalidate();capture();assert.equal(draws,4);
 budget.configure('high');assert.equal(target.samples,4);capture();assert.equal(draws,5);
 target.dispose();ground.geometry.dispose();ground.material.dispose();
});

test('reflection capture failures restore temporary atmosphere visibility',()=>{
 const smoke=new T.Object3D(),beam=new T.Object3D(),target=new T.WebGLRenderTarget(2,2);
 const view={settings:{quality:'low'},ground:{getRenderTarget:()=>target,onBeforeRender(){throw Error('lost');}},smokes:[new T.Object3D(),smoke],beams:[beam]};
 const gate=new reflections.ReflectionBudget(view);gate.configure('low');
 assert.throws(()=>view.ground.onBeforeRender({}, {},new T.PerspectiveCamera()),/lost/);
 assert.equal(smoke.visible,true);assert.equal(beam.visible,true);assert.equal(gate.valid,false);target.dispose();
});
test('mobile inference uses touch capability and screen size, not a small desktop window',async()=>{
 const {deviceHints}=await import('../src/ui/room-visitor-settings.js');
 assert.equal(deviceHints({innerWidth:390,innerHeight:844,matchMedia:()=>({matches:false})}).mobile,false);
 assert.equal(deviceHints({screen:{width:390,height:844},matchMedia:q=>({matches:q==='(pointer: coarse)'})}).mobile,true);
 assert.equal(deviceHints({screen:{width:390,height:844},matchMedia:()=>({matches:true})}).mobile,false);
 assert.equal(deviceHints({navigator:{userAgentData:{mobile:true}},screen:{width:1200,height:500}}).mobile,true);
});

test('unhovered holograms take a uniform early-out before noise and beam evaluation',async()=>{
 const {readFile}=await import('node:fs/promises');const s=await readFile(new URL('../src/scene/room-hologram.js',import.meta.url),'utf8');
 assert.match(s,/if\s*\(activity\s*<=\s*0\.0001\)\s*return vec2\(0\.\)/);
 assert.match(s,/if\s*\(activity\s*<=\s*0\.0001\)\s*return vec3\(0\.\)/);
});
