import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferAttribute, BufferGeometry} from 'three';
import {falconStageSurfaces} from '../src/falcon-stage-surfaces.js';
import {assemblyCoverage, assemblyFeature} from '../src/source-assemblies.js';

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
