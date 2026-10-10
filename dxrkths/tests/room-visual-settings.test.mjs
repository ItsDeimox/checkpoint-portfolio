import test from 'node:test';
import assert from 'node:assert/strict';

// Import the existing module namespace so the first run reports the missing
// public contract as an assertion rather than a module-resolution error.
import * as optics from '../src/scene/room-optics.js';

test('visual settings expose finite, bounded controls with a normalized default for each control', () => {
  assert.equal(typeof optics.normalizeVisualSettings, 'function');
  const defaults = optics.normalizeVisualSettings();
  assert.deepEqual(defaults, optics.DEFAULT_VISUAL_SETTINGS);
  assert.equal(optics.VISUAL_CONTROLS.length, 7);
  for (const control of optics.VISUAL_CONTROLS) {
    assert.ok(Number.isFinite(defaults[control.key]));
    assert.ok(defaults[control.key] >= control.min && defaults[control.key] <= control.max);
    assert.ok(control.step > 0 && control.max > control.min);
  }
});

test('visual settings reject corrupt persisted values, clamp valid numbers and discard unknown keys', () => {
  assert.equal(typeof optics.normalizeVisualSettings, 'function');
  const defaults = optics.DEFAULT_VISUAL_SETTINGS;
  const result = optics.normalizeVisualSettings({
    exposure: NaN, bloom: Infinity, depthOfField: -4, motionBlur: 20,
    lens: '0.8', contrast: null, sharpness: 100, injected: true,
  });
  assert.deepEqual(result, {
    exposure: defaults.exposure, bloom: defaults.bloom, depthOfField: 0, motionBlur: 1,
    lens: defaults.lens, contrast: defaults.contrast, sharpness: .35,
  });
  assert.deepEqual(optics.normalizeVisualSettings(null), defaults);
  assert.deepEqual(optics.normalizeVisualSettings([], { exposure: Infinity }), defaults);
});

test('partial tuning preserves other validated values and zero effect settings remain exactly zero', () => {
  assert.equal(typeof optics.normalizeVisualSettings, 'function');
  const base = optics.normalizeVisualSettings({ exposure: 1.2, contrast: 1.1 });
  const result = optics.normalizeVisualSettings({ bloom: 0, depthOfField: 0, motionBlur: 0, lens: 0 }, base);
  assert.equal(result.exposure, 1.2);
  assert.equal(result.contrast, 1.1);
  for (const key of ['bloom', 'depthOfField', 'motionBlur', 'lens']) assert.equal(result[key], 0);
  assert.notEqual(result, base);
  assert.notEqual(result, optics.DEFAULT_VISUAL_SETTINGS);
});
