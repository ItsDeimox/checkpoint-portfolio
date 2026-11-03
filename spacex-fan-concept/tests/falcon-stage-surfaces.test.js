import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,BufferAttribute,BufferGeometry,Float32BufferAttribute,Group,Matrix4,Mesh,MeshStandardMaterial} from 'three';
import {createInspection} from '../src/inspection.js';
import {falconStageSurfaces} from '../src/falcon-stage-surfaces.js';
import {assemblyCoverage, assemblyFeature} from '../src/source-assemblies.js';

import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {bakeSourceRange} from '../src/source-geometry.js';

const name = 'Second_Stage_F9_Second_Stage_0 Second_Stage';
const variants = [
  ['high', '1dcd39fcba7ea75ccb62acdd320a0f4a5e2b5747ad266977da48b0814b975694', 1404, 286, 606],
  ['eco', '96d28d896548e2a4cd7c5223313a6712d395721a1a791551d8991288197e6bdd', 870, 218, 268],
];

for (const [quality, hash, total, dome, deck] of variants) {
  test(`Falcon 9 ${quality} dome and adapter partitions preserve each face, winding and attribute`, () => {
    const geometry = new BufferGeometry();
    for (const [attribute, size] of [['position',3], ['uv',2], ['tangent',4]]) {
      geometry.setAttribute(attribute, new BufferAttribute(Float32Array.from(
        {length: total * 3 * size}, (_, i) => i), size));
    }
    const parts = falconStageSurfaces(name, geometry, hash);
    assert.deepEqual(parts.map(p => p.geometry.attributes.position.count / 3), [total - dome - deck, dome, deck]);
    const seen = [];
    for (const part of parts) {
      const attrs = part.geometry.attributes;
      for (let i = 0; i < attrs.position.count; i += 3) {
        const face = attrs.position.getX(i) / 9;
        seen.push(face);
        for (const a of Object.values(attrs)) {
          const stride = a.itemSize;
          for (let j = 0; j < 3 * stride; j++) assert.equal(a.array[i * stride + j], face * 3 * stride + j);
        }
      }
    }
    assert.deepEqual(seen.sort((a, b) => a-b), Array.from({length: total}, (_, i) => i));
    assert.equal(falconStageSurfaces(name, geometry, 'different-asset'), null);
    assert.equal(falconStageSurfaces('First_Stage_F9_First_Stage_0', geometry, hash), null);
  });
}

test('only the far-side authored fairing half and its own fittings stay inside', () => {
  assert.equal(assemblyFeature('falcon','Fairing_2_F9_Fairing_0','F9_Fairing',.9),'fairing-inner-wall');
  assert.equal(assemblyFeature('falcon','Fairing_2_Detail_F9_Fairing_0','F9_Fairing',.85),'fairing-fittings');
  assert.equal(assemblyFeature('falcon','Fairing_1_F9_Fairing_0','F9_Fairing',.9),null);
  assert.equal(assemblyCoverage('falcon','fairing',new Set(['fairing-inner-wall'])).supported,false);
  assert.equal(assemblyCoverage('falcon','fairing',new Set(['fairing-inner-wall','payload-adapter'])).supported,true);
});

const publicRoot=new URL('../public/',import.meta.url),manifestPath=new URL('assets/manifest.json',publicRoot);
for(const [quality,hash] of variants){
 test(`Falcon 9 ${quality} open barrel keeps original back panels and both physical end decks`,{skip:!existsSync(manifestPath)},async()=>{
  await MeshoptDecoder.ready;
  const manifest=JSON.parse(readFileSync(manifestPath)),file=manifest.files['falcon9-'+quality];
  assert.equal(file.sha256,hash);
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const doc=await io.read(fileURLToPath(new URL(file.url.slice(1),publicRoot)));
  function partition(sourceName){
   const node=doc.getRoot().listNodes().find(n=>n.getName()===sourceName);
   const prim=node.getMesh().listPrimitives()[0],original=new BufferGeometry();
   original.setAttribute('position',new Float32BufferAttribute(prim.getAttribute('POSITION').getArray(),3));
   original.setIndex(new BufferAttribute(prim.getIndices().getArray(),1));
   // glTF mesh quantization can use normalized integer vertex positions.
   const attr=original.attributes.position;
   const positions=prim.getAttribute('POSITION');
   if(positions.getNormalized())for(let i=0;i<attr.count;i++)attr.setXYZ(i,...positions.getElement(i,[]));
   const baked=bakeSourceRange(original,0,original.index.count,new Matrix4().fromArray(node.getWorldMatrix()));
   const sections=falconStageSurfaces(sourceName.replaceAll(' ','_'),baked,hash);
   assert.equal(sections.reduce((n,p)=>n+p.geometry.attributes.position.count,0),baked.attributes.position.count);
   return sections;
  }
  const [cover,wall]=partition('First Stage_F9 First Stage_0');
  assert.equal(wall.feature,'first-stage-barrel-section');assert.ok(cover.geometry.attributes.position.count>0);
  wall.geometry.computeBoundingBox();cover.geometry.computeBoundingBox();
  assert.ok(wall.geometry.boundingBox.max.z < cover.geometry.boundingBox.max.z*.5);
  const [front,rear,deck]=partition('Interstage_F9 Black_0');
  assert.equal(front.feature,'interstage-front-cover');
  assert.equal(rear.feature,'interstage-rear-shell');
  assert.ok(front.geometry.attributes.position.count>0);
  assert.ok(rear.geometry.attributes.position.count>0);
  deck.geometry.computeBoundingBox();
  assert.ok(deck.inspectionParts.includes('tanks'));const box=deck.geometry.boundingBox;
  assert.ok(box.max.y-box.min.y < (box.max.x-box.min.x)*.06);
  assert.equal(assemblyFeature('falcon','First_Stage_F9_Octaweb_Black_0','',0),'first-stage-thrust-deck');
  assert.equal(assemblyCoverage('falcon','tanks',new Set([deck.feature,wall.feature,cover.feature,'first-stage-thrust-deck'])).supported,true);
 });
}

test('opening Falcon tanks hides only the original front skin and restoring assembles it without moving its geometry',()=>{
 const group=new Group();
 for(const feature of ['first-stage-open-panel','first-stage-barrel-section','first-stage-forward-deck','first-stage-thrust-deck']){
  const m=new Mesh(new BoxGeometry(1,10,.5),new MeshStandardMaterial());
  m.userData={part:'tanks',assemblyFeature:feature};group.add(m);
 }
 const v=createInspection({group,family:'falcon'},1,'tanks');
 const panel=v.exterior.children.find(m=>m.userData.assemblyFeature==='first-stage-open-panel');
 const wall=v.exterior.children.find(m=>m.userData.assemblyFeature==='first-stage-barrel-section');
 const assembled=panel.matrix.clone();
 assert.ok(v.setCutaway(true));v.step(1,true);v.update();
 assert.equal(panel.visible,false);assert.equal(wall.visible,true);
 assert.deepEqual(panel.matrix.elements,assembled.elements);
 assert.ok(v.setCutaway(false));v.step(1,true);v.update();
 assert.equal(panel.visible,true);
 assert.deepEqual(panel.matrix.elements,assembled.elements);
 assert.equal(group.children[0].position.x,0);v.dispose();
});
