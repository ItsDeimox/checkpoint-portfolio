import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {parseCarOnCpu} from '../tools/car/glb-utils.mjs';
import {createBrandMount,disposeBrandModel,brandFrustum,RoomBrandLogo} from '../src/scene/room-brand-logo.js';

async function logo(){return (await parseCarOnCpu(await readFile(new URL('../assets/models/DXTlogoPrinted.glb',import.meta.url)))).scene;}
test('supplied face and bevel use reflective silver metal instead of a diffuse white face',async()=>{
 const model=await logo(),original=[];
 model.traverse(mesh=>{if(mesh.isMesh)original.push([mesh,mesh.geometry,mesh.material.normalMap]);});
 const mount=createBrandMount(model),materials=new Map();
 try{
  model.traverse(mesh=>{if(mesh.isMesh)materials.set(mesh.material.name,mesh.material);});
  const face=materials.get('Material.002'),edge=materials.get('Material.001');
  assert.ok(face.metalness>=.9,'face must have a metallic reflection response');
  assert.ok(face.roughness>=.10 && face.roughness<=.20,'highlights need definition without zero-roughness shimmer');
  assert.ok(edge.metalness>=.9 && edge.roughness>=.12 && edge.roughness<=.24);
  assert.ok(edge.color.r>.09,'bevel must reflect light instead of disappearing as black');
  assert.ok(face.color.r>edge.color.r && face.color.b>=face.color.r);
  assert.ok(face.envMapIntensity>=1.8 && face.envMapIntensity<=2.5);
  for(const material of materials.values())assert.equal(material.emissive.getHex(),0,'metal is illuminated, not self-lit');
  for(const [mesh,geometry,map]of original){assert.equal(mesh.geometry,geometry);assert.equal(mesh.material.normalMap,map);}
 }finally{disposeBrandModel(mount);}
});
test('more evident relief remains within the original header viewport at every pointer extreme',async()=>{
 const mount=createBrandMount(await logo());
 try{
  const rest=mount.rotation.clone();
  assert.ok(rest.y-Math.PI>=.22 && rest.y-Math.PI<=.35);
  for(const aspect of [.8,1.2,1.78,2.4])for(const yaw of [-.10,0,.10])for(const pitch of [-.04,0,.04]){
   mount.rotation.set(rest.x+pitch,rest.y+yaw,0);mount.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(mount,true),f=brandFrustum(aspect);
   assert.ok(box.min.x>f.left && box.max.x<f.right);
   assert.ok(box.min.y>f.bottom && box.max.y<f.top);
  }
 }finally{disposeBrandModel(mount);}
});
test('accent lighting is confined to the existing small logo scene and retains its render budget',async()=>{
 const renderer={extensions:{has:()=>true}},brand=new RoomBrandLogo(renderer,await logo(),()=>null);
 try{
  const lights=brand.scene.children.filter(o=>o.isLight);
  assert.equal(lights.length,3);assert.equal(lights.filter(o=>o.castShadow).length,0);
  assert.equal(lights.filter(o=>o.isRectAreaLight).length,2,'local softboxes must produce a highlight band across the face');
  const fill=lights.find(o=>o.isHemisphereLight);
  assert.ok(fill.intensity>0 && fill.intensity<=.35);
  assert.equal(brand.target.samples,0);assert.equal(brand.target.width,2);
 }finally{brand.dispose();}
});
