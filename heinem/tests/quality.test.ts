import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveQuality } from '../src/lib/quality.ts';

const desktop = { cores: 8, memory: 8, coarse: false, saveData: false, reducedMotion: false };

test('Auto chooses High for an unconstrained desktop', () => {
  assert.equal(resolveQuality('auto', desktop), 'high');
});

test('Auto conserves resources when data saving is requested', () => {
  assert.equal(resolveQuality('auto', { ...desktop, saveData: true }), 'low');
});

test('Auto chooses Low when either memory or CPU hint is constrained', () => {
  assert.equal(resolveQuality('auto', { ...desktop, memory: 2 }), 'low');
  assert.equal(resolveQuality('auto', { ...desktop, cores: 2 }), 'low');
});

test('Auto chooses Medium for touch-oriented or midrange devices', () => {
  assert.equal(resolveQuality('auto', { ...desktop, coarse: true }), 'medium');
  assert.equal(resolveQuality('auto', { ...desktop, memory: 4 }), 'medium');
  assert.equal(resolveQuality('auto', { ...desktop, cores: 4 }), 'medium');
});

test('Low device constraints take precedence over Medium hints', () => {
  assert.equal(resolveQuality('auto', { ...desktop, coarse: true, memory: 2 }), 'low');
});

test('Manual choices remain authoritative even with save-data and reduced-motion', () => {
  const constrained = { cores: 2, memory: 2, coarse: true, saveData: true, reducedMotion: true };
  assert.equal(resolveQuality('high', constrained), 'high');
  assert.equal(resolveQuality('medium', constrained), 'medium');
  assert.equal(resolveQuality('low', desktop), 'low');
});

test('Missing optional hardware hints do not invent a low-power device', () => {
  assert.equal(resolveQuality('auto', { coarse: false, saveData: false, reducedMotion: false }), 'high');
  assert.equal(resolveQuality('auto', { coarse: true, saveData: false, reducedMotion: false }), 'medium');
});

test('Reduced motion stays independent of graphical fidelity', () => {
  assert.equal(resolveQuality('auto', { ...desktop, reducedMotion: true }), 'high');
});

test('Invalid hardware hints are treated as unavailable', () => {
  assert.equal(resolveQuality('auto', { ...desktop, memory: NaN, cores: 0 }), 'high');
});
