import test from 'node:test';
import assert from 'node:assert/strict';
import { BUTTERFLY_FLIGHTS, butterflyPose } from '../src/lib/butterfly-flight.ts';

const names = ['canopy', 'sky', 'meadow', 'music'];

test('only three quiet hero flights and one music-edge flight are configured', () => {
  assert.deepEqual(Object.keys(BUTTERFLY_FLIGHTS), names);
  assert.equal(names.filter(name => BUTTERFLY_FLIGHTS[name].region === 'hero').length, 3);
  assert.equal(names.filter(name => BUTTERFLY_FLIGHTS[name].region === 'music').length, 1);
});

test('closed cubic paths meet precisely at the end of an orbit', () => {
  for (const name of names) {
    const period = BUTTERFLY_FLIGHTS[name].period;
    const first = butterflyPose(name, 0);
    const last = butterflyPose(name, period);
    assert.ok(Math.abs(first.x - last.x) < 1e-9, name + ': no x teleport');
    assert.ok(Math.abs(first.y - last.y) < 1e-9, name + ': no y teleport');
  }
});

test('motion is continuous, smooth and constrained to quiet edges of the hero', () => {
  for (const name of names) {
    const duration = BUTTERFLY_FLIGHTS[name].period;
    const points = Array.from({length: 900}, (_, i) => butterflyPose(name, i * duration / 900));
    for (let i=1;i<points.length;i++) {
      assert.ok(Math.abs(points[i].x - points[i - 1].x) < .012, name + ': no horizontal jumps');
      assert.ok(Math.abs(points[i].y - points[i - 1].y) < .012, name + ': no vertical jumps');
    }
    for (const pose of points) {
      assert.ok(Number.isFinite(pose.bank) && Math.abs(pose.bank) <= 17, name + ': bounded bank');
      assert.ok(pose.x >= .02 && pose.x <= .98, name + ': bounded x');
      assert.ok(pose.y >= .05 && pose.y <= .92, name + ': bounded y');
    }
    if (name === 'canopy' || name === 'meadow') assert.ok(Math.max(...points.map(p => p.x)) < .27);
    if (name === 'sky' || name === 'music') assert.ok(Math.min(...points.map(p => p.x)) > .80);
  }
});

test('paired wing strokes have variable speed, with occasional outstretched glide', () => {
  const samples = Array.from({length: 1800}, (_, i) => butterflyPose('sky', i * .025));
  const angles = samples.map(s => s.wing);
  const glides = samples.map(s => s.glide);
  assert.ok(Math.min(...angles) < 13, 'wide wings at the top of a stroke');
  assert.ok(Math.max(...angles) > 70, 'folded wings at the end of a stroke');
  assert.ok(Math.max(...glides) > .8, 'brief glide with reduced stroke amplitude');
  assert.ok(Math.min(...glides) === 0, 'powered flapping resumes');
  const v = samples.slice(1).map((p, i) => Math.hypot(p.x - samples[i].x, p.y - samples[i].y));
  assert.ok(Math.max(...v) > Math.min(...v) * 1.5, 'transient travel speed');
});

test('deterministic flight is independent of sampling order and frame rate', () => {
  for (const name of names) {
    const early = butterflyPose(name, 6.128);
    butterflyPose(name, 200);
    butterflyPose(name, 0.001);
    assert.deepEqual(butterflyPose(name, 6.128), early);
  }
});
