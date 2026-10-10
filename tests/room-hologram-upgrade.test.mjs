import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { displayFragment, roomVertex } from '../src/scene/room-shaders.js';
import { createFixedPanelLayout } from '../src/scene/room-environment.js';
const holo = await import('../src/scene/room-hologram.js').catch(() => ({}));

test('three hologram layers have opposed travel, distinct speed and distinct parallax depth', () => {
  assert.equal(holo.HOLOGRAM_LAYERS?.length, 3);
  const layers = holo.HOLOGRAM_LAYERS;
  assert.ok(layers.some(l => l.speed < 0) && layers.some(l => l.speed > 0));
  assert.equal(new Set(layers.map(l => Math.abs(l.speed))).size, 3);
  assert.equal(new Set(layers.map(l => l.depth)).size, 3);
  assert.ok(layers.every(l => l.depth > 0 && l.depth < .08));
});
test('surface upgrade preserves mesh, artwork, fog, content UV and is idempotent', () => {
  assert.equal(typeof holo.configurePanelHologram, 'function');
  const shape = createFixedPanelLayout()[1];
  const material = new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:0},contentMix:{value:0}}});
  const panel = {...shape, material};
  holo.configurePanelHologram(panel);
  const shader=material.fragmentShader, version=material.version;
  assert.equal(material.vertexShader, roomVertex);
  assert.match(shader,/holoWarp\(p\)/);assert.match(shader,/holoLight\(p\)/);
  assert.match(shader,/texture2D\(contentMap,vUv\)/);
  assert.match(shader,/#include <fog_fragment>/);
  assert.match(shader,/holoView/);
  holo.configurePanelHologram(panel);
  assert.equal(material.fragmentShader,shader);assert.equal(material.version,version);
  material.dispose();
});
test('parallax responds to camera motion while all panel transforms remain untouched', () => {
  assert.equal(typeof holo.updateHologramView, 'function');
  const panel={...createFixedPanelLayout()[2],material:new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{}})};
  const original=panel.corners.map(p=>p.toArray());
  holo.configurePanelHologram(panel);
  holo.updateHologramView(panel, new T.Vector3(0,2,-12));
  const first=panel.material.uniforms.holoView.value.clone();
  holo.updateHologramView(panel, new T.Vector3(3,3,-12));
  assert.ok(first.distanceTo(panel.material.uniforms.holoView.value)>.01);
  assert.deepEqual(panel.corners.map(p=>p.toArray()),original);
  panel.material.dispose();
});
