import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {parseCarOnCpu} from '../tools/car/glb-utils.mjs';
const brand = await import('../src/scene/room-brand-logo.js').catch(() => ({}));

test('the supplied logo binary is preserved exactly', async () => {
 const data=await readFile(new URL('../assets/models/DXTlogoPrinted.glb',import.meta.url));
 assert.equal(createHash('sha256').update(data).digest('hex'),'372cf7584a82c7f4b12589e17d5e7cd9ff3abf8962cf4f3caf55e670f753d2da');
});
test('logo orientation and framing use wrapper transforms without editing source vertex buffers', async () => {
 assert.equal(typeof brand.createBrandMount,'function');
 const data=await readFile(new URL('../assets/models/DXTlogoPrinted.glb',import.meta.url));
 const {scene}=await parseCarOnCpu(data),meshes=[];
 scene.traverse(o=>{if(o.isMesh)meshes.push([o,o.geometry,o.geometry.attributes.position.array.slice(),o.material.normalMap]);});
 const mount=brand.createBrandMount(scene);mount.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(mount,true),size=box.getSize(new T.Vector3());
 assert.ok(box.getCenter(new T.Vector3()).length()<.002);
 assert.ok(size.x>size.y && size.y>size.z);
 assert.ok(size.y>.95 && size.y<1.12);
 for(const [mesh,geometry,positions,map]of meshes){assert.equal(mesh.geometry,geometry);assert.deepEqual(mesh.geometry.attributes.position.array,positions);assert.equal(mesh.material.normalMap,map);}
 assert.equal(meshes.length,2);
 brand.disposeBrandModel(mount);
});
test('header logo projection contains the whole model on narrow and wide viewports', () => {
 assert.equal(typeof brand.brandFrustum,'function');
 for(const aspect of [.8,1.2,1.78,2.4]){
  const f=brand.brandFrustum(aspect);
  assert.ok(f.top>=.6 && f.right>=.8);
  assert.ok(Math.abs((f.right-f.left)/(f.top-f.bottom)-aspect)<1e-9);
 }
});

function rendererFixture(){
 let target=null,alpha=.4,scissorTest=false;
 const color=new T.Color(.1,.2,.3),viewport=new T.Vector4(0,0,960,540),scissor=new T.Vector4(1,2,3,4);
 return {
  autoClear:true,extensions:{has:()=>true},fail:false,
  getRenderTarget:()=>target,setRenderTarget(value){target=value;},
  getClearColor:value=>value.copy(color),getClearAlpha:()=>alpha,
  setClearColor(value,a){color.set(value);if(a!==undefined)alpha=a;},
  getViewport:value=>value.copy(viewport),setViewport(...args){args[0]?.isVector4?viewport.copy(args[0]):viewport.set(...args);},
  getScissor:value=>value.copy(scissor),setScissor(...args){args[0]?.isVector4?scissor.copy(args[0]):scissor.set(...args);},
  getScissorTest:()=>scissorTest,setScissorTest(value){scissorTest=value;},
  getSize:value=>value.set(960,540),getPixelRatio:()=>1,
  clear(){},render(){if(this.fail)throw new Error('Test renderer interruption');},
  inspect(){return {target,alpha,scissorTest,color:color.toArray(),viewport:viewport.toArray(),scissor:scissor.toArray(),autoClear:this.autoClear};},
 };
}
test('brand compositing restores renderer state and remounts without creating a second renderer',()=>{
 const renderer=rendererFixture(),model=new T.Group();model.add(new T.Mesh(new T.BoxGeometry(1.4,1,.1),new T.MeshStandardMaterial()));
 const anchor=()=>({isConnected:true,style:{opacity:''},getBoundingClientRect:()=>({left:40,top:20,right:127,bottom:69,width:87,height:49})});
 let selected=anchor();const first=selected;
 const logo=new brand.RoomBrandLogo(renderer,model,()=>selected);logo.ready=true;
 const canvas={getBoundingClientRect:()=>({left:0,top:0,bottom:540,width:960,height:540})};
 const previous=renderer.inspect();
 try{
  assert.equal(logo.render(canvas),true);assert.equal(first.style.opacity,'0');assert.deepEqual(renderer.inspect(),previous);
  selected=anchor();logo.render(canvas);assert.equal(first.style.opacity,'');assert.equal(selected.style.opacity,'0');
  renderer.fail=true;assert.throws(()=>logo.render(canvas),/interruption/);assert.deepEqual(renderer.inspect(),previous);
 }finally{logo.dispose();}
 assert.equal(selected.style.opacity,'');
});
test('logo download failure and already aborted requests cannot leave loaded resources',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(null,{status:404});
  await assert.rejects(brand.loadBrandModel(new AbortController().signal),/404/);
  const controller=new AbortController();controller.abort();
  globalThis.fetch=async(_url,{signal})=>{signal.throwIfAborted();throw Error('fetch should be aborted');};
  await assert.rejects(brand.loadBrandModel(controller.signal),{name:'AbortError'});
 }finally{globalThis.fetch=original;}
});
