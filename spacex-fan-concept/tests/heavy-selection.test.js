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
