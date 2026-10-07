import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {qualityProfile} from '../src/render/quality.js';
import {cardLifecycle} from '../src/render/card-lifecycle.js';

test('ultra preset supersamples above DPR 1 and raises explicit desktop budget',()=>{
  const p=qualityProfile('ultra',false,1,0);
  assert.ok(p.scale>=1.9,'ultra should target ~2x internal resolution on DPR1 desktop');
  assert.ok(p.memoryBudget>=384*1024**2,'ultra needs its own opt-in framebuffer budget');
  assert.ok(p.shadow>=2048);
  assert.equal(p.motion,true);
});

test('high remains sharper than auto on DPR1',()=>{
  const auto=qualityProfile('auto',false,1,0);
  const high=qualityProfile('high',false,1,0);
  assert.ok(high.scale>auto.scale);
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
