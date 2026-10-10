import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as visual from '../src/scene/room-visual-settings.js';
import { buildRoomLights, dressStudioEnvironment } from '../src/scene/room-lighting.js';

const requested = Object.freeze({ exposure: 1.15, bloom: .65, depthOfField: 1.5, motionBlur: 1, lens: 1, contrast: 1.74, sharpness: .35 });
const screenshot = { ...requested, contrast: 1.16 };

test('dark-metal defaults match the supplied controls with contrast multiplied by 1.5', () => {
  assert.deepEqual(visual.DEFAULT_VISUAL_SETTINGS, requested);
  assert.deepEqual(visual.normalizeVisualSettings(), requested);
  assert.ok(Math.abs(requested.contrast - screenshot.contrast * 1.5) < 1e-12);
});

test('contrast reaches 1.74 through both normalization and the slider without losing its bounds', () => {
  const control = visual.VISUAL_CONTROLS.find(control => control.key === 'contrast');
  assert.ok(control.max >= 1.74 && control.max <= 2);
  assert.equal(visual.normalizeVisualSettings({ contrast: 1.74 }).contrast, 1.74);
  assert.equal(visual.normalizeVisualSettings({ contrast: 300 }).contrast, control.max);
  assert.equal(visual.normalizeVisualSettings({ contrast: -3 }).contrast, control.min);
  assert.equal(visual.normalizeVisualSettings({ contrast: NaN }).contrast, requested.contrast);
});

test('old persisted screenshot settings receive the new preset without mutating quality or motion', () => {
  assert.equal(typeof visual.restoreVisualSettings, 'function');
  assert.equal(typeof visual.VISUAL_PRESET_VERSION, 'string');
  const stored = { quality: 'high', paused: true, visual: screenshot };
  const before = structuredClone(stored);
  assert.deepEqual(visual.restoreVisualSettings(stored), requested);
  assert.deepEqual(stored, before);
  assert.deepEqual(visual.restoreVisualSettings({ ...stored, visualPreset: 'previous-preset' }), requested);
});

test('saving and reloading the current preset keeps later edits instead of multiplying again', () => {
  assert.equal(typeof visual.restoreVisualSettings, 'function');
  let stored = { visual: screenshot };
  stored = { ...stored, visual: visual.restoreVisualSettings(stored), visualPreset: visual.VISUAL_PRESET_VERSION };
  for (let i = 0; i < 4; i++) stored = JSON.parse(JSON.stringify({ ...stored, visual: visual.restoreVisualSettings(stored) }));
  assert.deepEqual(stored.visual, requested);
  stored.visual.contrast = 1.57;
  stored.visual.exposure = .97;
  assert.deepEqual(visual.restoreVisualSettings(stored), stored.visual);
});

test('missing or corrupt persisted settings recover to finite values from the new preset', () => {
  assert.equal(typeof visual.restoreVisualSettings, 'function');
  for (const input of [undefined, null, false, 3, 'broken', []]) assert.deepEqual(visual.restoreVisualSettings(input), requested);
  assert.deepEqual(visual.restoreVisualSettings({ visualPreset: visual.VISUAL_PRESET_VERSION, visual: { contrast: Infinity } }), requested);
});

test('dark lighting reduces global fill and keeps the same five reflection sources and shadow budget', () => {
  const view = { scene: new T.Scene(), renderer: { shadowMap: {} } };
  buildRoomLights(view);
  const lights = [];
  view.scene.traverse(object => { if (object.isLight) lights.push(object); });
  const fill = lights.find(light => light.isHemisphereLight);
  assert.ok(fill.intensity > 0 && fill.intensity <= .12, 'ambient fill should leave dark gaps between highlights');
  assert.ok(view.key.intensity >= 1.4 && view.key.intensity <= 2, 'broad key must not flatten metallic shading');
  assert.equal(lights.filter(light => light.isRectAreaLight).length, 5);
  assert.equal(lights.filter(light => light.castShadow).length, 1);
  assert.equal(view.key.shadow.mapSize.x, 1536);
  assert.equal(view.screenLight.intensity, 0);
  view.key.shadow.dispose();
});

test('the reflection studio reduces broad inherited fill while keeping four bright reflection strips', () => {
  const room = new RoomEnvironment();
  try {
    const oldLights = room.children.filter(object => object.isLight).map(light => [light, light.intensity]);
    const count = room.children.length;
    dressStudioEnvironment(room);
    assert.equal(room.children.length, count + 4);
    for (const [light, intensity] of oldLights) assert.ok(light.intensity > 0 && light.intensity <= intensity * .6);
    const cards = room.children.slice(count);
    assert.ok(cards.every(card => card.isMesh && card.material.toneMapped === false));
    assert.ok(cards.some(card => Math.max(...card.material.color.toArray()) >= 7));
    const state = room.children.map(object => [object.uuid, object.intensity, object.material?.color?.toArray(), object.material?.emissiveIntensity]);
    dressStudioEnvironment(room);
    assert.deepEqual(room.children.map(object => [object.uuid, object.intensity, object.material?.color?.toArray(), object.material?.emissiveIntensity]), state);
  } finally { room.dispose(); }
});

test('legacy custom controls and a newly saved 1.16 contrast remain intentional choices', () => {
  const legacy = { visual: { exposure: 1.2, bloom: 0, lens: -1, contrast: 1.12 } };
  const result = visual.restoreVisualSettings(legacy);
  assert.equal(result.exposure, 1.2);
  assert.equal(result.bloom, 0);
  assert.equal(result.lens, 0);
  assert.equal(result.contrast, 1.12);
  assert.equal(visual.restoreVisualSettings({ visualPreset: visual.VISUAL_PRESET_VERSION, visual: screenshot }).contrast, 1.16);
});
