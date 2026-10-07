import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {qualityProfile} from '../src/render/quality.js';
import {cardLifecycle,wrapCardVisualY} from '../src/render/card-lifecycle.js';

test('ultra preset supersamples above DPR 1 and raises explicit desktop budget',()=>{
  const p=qualityProfile('ultra',false,1,0);
  assert.ok(p.scale>=1.2&&p.scale<=1.45,'ultra should use moderate supersampling, not brute-force 2x');
  assert.ok(p.memoryBudget<=384*1024**2,'ultra should stay inside a bounded opt-in framebuffer budget');
  assert.ok(p.shadow>=2048);
  assert.equal(p.motion,true);
});

test('high remains sharper than auto on DPR1',()=>{
  const auto=qualityProfile('auto',false,1,0);
  const high=qualityProfile('high',false,1,0);
  assert.ok(high.scale>auto.scale);
  assert.ok(high.scale<=1.2,'high should not brute-force 1.45x+ supersampling');
});

test('top dissolve starts later and does not eat a normal top card',()=>{
  assert.equal(cardLifecycle(8.9).exitBurn,0);
  assert.equal(cardLifecycle(10.15).exitBurn,0);
  assert.ok(cardLifecycle(10.9).exitBurn>0);
  assert.ok(cardLifecycle(12.2).exitBurn>.95);
});

test('incoming card grows out of the lower flame zone instead of popping fully visible',()=>{
  const first=cardLifecycle(1.7);
  const mid=cardLifecycle(2.15);
  const clear=cardLifecycle(2.7);
  assert.ok(first.reveal>0&&first.reveal<.35);
  assert.ok(mid.reveal>first.reveal&&mid.reveal<1);
  assert.equal(clear.reveal,1);
});

test('glass and media shaders share lifecycle burn/reveal uniforms and hover crater field',()=>{
  const crystal=fs.readFileSync(new URL('../src/glsl/glass/crystal.frag',import.meta.url),'utf8');
  const media=fs.readFileSync(new URL('../src/glsl/glass/media.frag',import.meta.url),'utf8');
  assert.match(crystal,/uniform float[^;]*uReveal/);
  assert.match(media,/uniform float[^;]*uReveal/);
  assert.match(crystal,/crater/i);
  assert.match(crystal,/revealBand/);
  assert.match(crystal,/burnBand/);
});

test('wrapped incoming card starts below the lower flame instead of teleporting into view',()=>{
  const state=wrapCardVisualY(1.72,11.28,11.28,1/60,false);
  assert.equal(state.wrapped,true);
  assert.ok(state.visualY<0,'first wrapped frame should remain below the lower forge');
  let next=state;
  for(let i=0;i<5;i++)next=wrapCardVisualY(1.72+i*.06,next.rawY,next.visualY,1/60,false);
  assert.ok(next.visualY<1.45,'card should still be below the reveal threshold after a few frames');
});

test('final optics uses edge-aware AA rather than relying on resolution alone',()=>{
  const out=fs.readFileSync(new URL('../src/glsl/optics/output.frag',import.meta.url),'utf8');
  assert.match(out,/uAaStrength/);
  assert.match(out,/fxaa/i);
});
