import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {partitionStarshipInteriors} from '../scripts/starship-interiors.mjs';
import {assemblyFeature, assemblyCoverage} from '../src/source-assemblies.js';

const file=fileURLToPath(new URL('../.cache/3d/starship.glb',import.meta.url));
const assemblies=[
  ['Object_8','ship-tank-hardware',17506],
  ['Object_98','booster-forward-dome',724],
  ['Object_99','booster-dome-downcomer',14492],
  ['Object_99','hotstage-frame',4744],
  ['Object_100','hotstage-attachments',1496],
];

function triangles(primitive){
  const indices=primitive.getIndices().getArray(),result=[];
  for(let i=0;i<indices.length;i+=3)result.push([indices[i],indices[i+1],indices[i+2]].join('/'));
  return result;
}

test('separating the pinned Starship hardware preserves every original oriented face, attribute and transform',{skip:!existsSync(file)},async()=>{
  await MeshoptDecoder.ready;
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const doc=await io.read(file);
  const sources=assemblies.map(([source])=>{
    const parent=doc.getRoot().listNodes().find(n=>n.getName()===source);
    const primitive=parent.getMesh().listPrimitives()[0];
    return {parent,primitive,original:triangles(primitive).sort()};
  });
  partitionStarshipInteriors(doc);
  for(const [i,[,feature,count]] of assemblies.entries()){
    const {parent,primitive,original}=sources[i];
    const hardware=parent.listChildren().find(n=>n.getExtras().sourceAssembly===feature);
    const inner=hardware.getMesh().listPrimitives()[0];
    assert.deepEqual(hardware.getWorldMatrix(),parent.getWorldMatrix());
    assert.equal(inner.getMaterial(),primitive.getMaterial());
    for(const key of primitive.listSemantics())assert.equal(inner.getAttribute(key),primitive.getAttribute(key));
    const internalFaces=triangles(inner);
    assert.equal(internalFaces.length,count);
    const authoredFaces=parent.listChildren().filter(n=>n.getExtras().sourceAssembly)
      .flatMap(n=>triangles(n.getMesh().listPrimitives()[0]));
    assert.deepEqual([...authoredFaces,...triangles(primitive)].sort(),original);
  }
});

test('the reviewed booster engine bank excludes the heat shield, shell and upper-stage engines',()=>{
  assert.equal(assemblyFeature('starship','Object_105 Superheavy_Block_3_V4_30','Material.498',.018),'booster-raptors');
  assert.equal(assemblyFeature('starship','Object_127 Raptor_3.003_17 Superheavy_Block_3_V4_30','Material.202',.03),'booster-raptors');
  assert.equal(assemblyFeature('starship','Object_116 Superheavy_Block_3_V4_30','Booster_Heatshield',.03),null);
  assert.equal(assemblyFeature('starship','Object_38 Raptor_3_7 Starship_Block_3_V4_13','Material.202',.6),null);
  assert.equal(assemblyCoverage('starship','fairing',new Set(['cargo-rack'])).supported,false);
  assert.equal(assemblyCoverage('starship','tanks',new Set(['booster-forward-dome'])).supported,false);
  assert.equal(assemblyCoverage('starship','tanks',new Set(['booster-forward-dome','booster-dome-downcomer'])).supported,true);
});
