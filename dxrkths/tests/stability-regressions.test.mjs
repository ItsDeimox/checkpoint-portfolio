import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {RoomIdentity} from '../src/scene/room-identity.js';
import {DestinationExperience} from '../src/ui/destination-experience.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {roomVertex,displayFragment} from '../src/scene/room-shaders.js';
import {configurePanelHologram} from '../src/scene/room-hologram.js';
function identityFixture(){
 const scene=new T.Scene(),panels=createFixedPanelLayout().map(p=>{const frame=new T.Group();scene.add(frame);const material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:0},hoverUv:{value:new T.Vector2()}}});const panel={...p,frame,material};configurePanelHologram(panel);return panel;});
 const ceiling=new T.Mesh(new T.TorusGeometry(),new T.MeshBasicMaterial({color:new T.Color(5,5.3,5.8)}));ceiling.material.userData.destinationEmitter=true;scene.add(ceiling);
 const carPivot=new T.Group(),paint=new T.MeshBasicMaterial({color:0xff1122});carPivot.add(new T.Mesh(new T.BoxGeometry(),paint));scene.add(carPivot);
 const key=new T.SpotLight(0xdceaff,115);key.name='Car spotlight';scene.add(key);
 const view={scene,panels,carPivot,key,screenLight:new T.PointLight(),hoverPanel:-1,reduced:{matches:false},host:{style:{setProperty(){}}},reflectionBudget:{invalidate(){}}};
 const id=new RoomIdentity(view);return{view,id,ceiling,paint,key,dispose(){id.dispose?.();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});panels.forEach(p=>p.material.dispose());}};
}
test('tagged white ceiling practical joins the active identity without recoloring any vehicle material',()=>{
 const f=identityFixture();try{f.view.hoverPanel=4;f.id.update(1,true);assert.ok(f.ceiling.material.color.b>f.ceiling.material.color.r*2,'ceiling practical stayed white');assert.equal(f.paint.color.getHex(),0xff1122,'a basic vehicle material was recolored');assert.equal(f.key.intensity,115);}finally{f.dispose();}
});
test('the original cube wave graph, not a diffusion approximation, is available to both surfaces',()=>{
 const path=new URL('../src/ui/cube-energy.js',import.meta.url);assert.ok(fs.existsSync(path),'original graph has not been integrated');
 const s=fs.readFileSync(path,'utf8');assert.match(s,/class CubeEnergyField/);assert.match(s,/velocity/);assert.match(s,/afterglow/);
});
test('inert portal preview never attaches or draws a second WebGL renderer',()=>{
 let calls=0;const surface={dataset:{destinationSurface:'car'},querySelector(){return null;}};
 const root={hidden:false,inert:true,querySelector:()=>surface,querySelectorAll:()=>[]};
 const e=Object.create(DestinationExperience.prototype);Object.assign(e,{root,document:{hidden:false},reduced:{matches:false},gpuReady:true,surface,graphics:{attach(){calls++;}},sleep(){},drawOnce(){calls++;},wake(){}});
 e.sync();assert.equal(calls,0,'portal preview performs live GPU work');
});
test('GPU submissions have a nonblocking bounded frame gate',async()=>{
 const path=new URL('../src/scene/room-gpu-gate.js',import.meta.url);assert.ok(fs.existsSync(path),'missing GPU queue ownership');
 const {GpuFrameGate}=await import(path);let ready=false,deleted=0,waits=[];
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,TIMEOUT_EXPIRED:2,WAIT_FAILED:3,ALREADY_SIGNALED:4,CONDITION_SATISFIED:5,fenceSync:()=>({}),flush(){},deleteSync(){deleted++;},clientWaitSync(_f,flags,timeout){waits.push(timeout);return ready?4:2;}};
 const gate=new GpuFrameGate(gl);assert.equal(gate.available(),true);gate.submit();assert.equal(gate.available(),false);assert.equal(gate.available(),false);ready=true;assert.equal(gate.available(),true);assert.equal(deleted,1);assert.ok(waits.every(n=>n===0));gate.dispose();
});
test('cube surface input and sampling preserve square cells on wide buttons and upright panels',async()=>{
 const {CubeSurface}=await import('../src/ui/cube-surface.js');const field=new CubeSurface();field.setAspect(5);
 assert.deepEqual(field.span,[1,.2]);assert.deepEqual(field.surfacePoint(.5,.5),[0,0,1]);
 field.setAspect(NaN);assert.deepEqual(field.span,[1,1]);
 field.point(.5,.5,1);const before=field.impulses;field.point(.5,.5,200);
 assert.equal(field.impulses,before,'a stationary pointer must not pump perpetual energy');
 field.point(.7,.5,250);assert.ok(field.impulses>before);
});
test('GPU failures reject readiness and release the fence rather than silently unlocking input',async()=>{
 const {GpuFrameGate,installShaderChecks}=await import('../src/scene/room-gpu-gate.js');let deleted=0;
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,TIMEOUT_EXPIRED:2,WAIT_FAILED:3,fenceSync:()=>({}),flush(){},clientWaitSync:()=>3,deleteSync(){deleted++;}};
 const gate=new GpuFrameGate(gl);gate.submit();assert.throws(()=>gate.available(),/GPU completion check failed/);assert.equal(deleted,1);
 const renderer={debug:{}};installShaderChecks(renderer);
 assert.throws(()=>renderer.debug.onShaderError({getProgramInfoLog:()=>'',getShaderInfoLog:()=> 'bad shader'},{},{},{}),/Graphics shader preparation failed/);
});
