import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {addHeavyCenterCore} from '../scripts/heavy-center-core.mjs';
import {heavyCorePart} from '../src/heavy-regions.js';

test('physical Heavy picking distinguishes a side nosecone from the central interstage',()=>{
  assert.equal(heavyCorePart(.02,true),'engines');
  assert.equal(heavyCorePart(.02),'engines');
  assert.equal(heavyCorePart(.62,true),'tanks');
  assert.equal(heavyCorePart(.62),'interstage');
  assert.equal(heavyCorePart(.88),'fairing');
});

const source=new URL('../.cache/3d/heavy-reference.glb',import.meta.url);
const base=new URL('../.cache/3d/falconheavy/scene.gltf',import.meta.url);
test('the inspected Heavy center core contains only original face triplets and attributes',
 {skip:!existsSync(source)||!existsSync(base)},async()=>{
  const io=new NodeIO(),doc=await io.read(base.pathname),donor=await io.read(source.pathname);
  const original=donor.getRoot().listNodes().find(n=>n.getName()==='Stage_1_Engine')
   .listChildren()[0].getMesh().listPrimitives()[0];
  const faces=primitive=>{
   const indices=primitive.getIndices().getArray(),result=[];
   for(let i=0;i<indices.length;i+=3)result.push(indices.slice(i,i+3).join(','));
   return result;
  };
  addHeavyCenterCore(doc,donor);
  const pieces=doc.getRoot().listNodes().filter(n=>n.getExtras().heavyCore);
  assert.deepEqual(pieces.map(n=>n.getExtras().heavyCore).sort(),['cover','ends','shell']);
  const combined=[];
  for(const node of pieces){
   const p=node.getMesh().listPrimitives()[0];combined.push(...faces(p));
   for(const key of original.listSemantics())assert.deepEqual(p.getAttribute(key).getArray(),original.getAttribute(key).getArray());
  }
  assert.equal(combined.length,412);
  assert.deepEqual(combined.sort(),faces(original).sort());
 });

test('the central upper-stage barrel above the shared sleeve has its own inspection',()=>{
 assert.equal(heavyCorePart(.625),'interstage');
 assert.equal(heavyCorePart(.75),'upperstage');
 assert.equal(heavyCorePart(.75,true),'tanks');
 assert.equal(heavyCorePart(.83),'fairing');
});

test('Heavy upper stage preserves the four native meshes, their materials and their relative transforms',
 {skip:!existsSync(source)},async()=>{
 const {isolateHeavyUpperStage}=await import('../scripts/heavy-upper-stage.mjs');
 const {Matrix4}=await import('three'),io=new NodeIO(),doc=await io.read(source.pathname);
 const names=['Stage_2_Engine','Stage_2_FuelTank','Stage_2_Cover_Left','Stage_2_Cover_Right'];
 const nodes=names.map(name=>doc.getRoot().listNodes().find(n=>n.getParentNode()?.getName()===name));
 const relatives=()=>nodes.map(n=>new Matrix4().fromArray(nodes[0].getWorldMatrix()).invert().multiply(new Matrix4().fromArray(n.getWorldMatrix())).toArray());
 const initial=relatives(),primitives=nodes.map(n=>n.getMesh().listPrimitives()[0]);
 await isolateHeavyUpperStage(doc);
 assert.equal(doc.getRoot().listNodes().length,4);
 assert.deepEqual(nodes.map(n=>n.getMesh().listPrimitives()[0]),primitives);
 assert.deepEqual(nodes.map(n=>n.getExtras().sourceAssembly),['heavy-upper-engine','heavy-upper-tank','heavy-upper-cover','heavy-upper-cover']);
 for(const [i,relative]of relatives().entries())for(const [j,value] of relative.entries())assert.ok(Math.abs(value-initial[i][j])<1e-5);
});
