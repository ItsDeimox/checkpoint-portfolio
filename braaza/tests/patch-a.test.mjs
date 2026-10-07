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

test('top dissolve completes before the logical slot can recycle',()=>{
  assert.equal(cardLifecycle(9.6).exitBurn,0);
  assert.ok(cardLifecycle(10.15).exitBurn>0);
  assert.ok(cardLifecycle(10.8).exitBurn>.8);
  assert.ok(cardLifecycle(11.2).exitBurn>.99);
});

test('incoming card is hidden below the forge and fully readable by its first stable slot',()=>{
  const hidden=cardLifecycle(-1.2),mid=cardLifecycle(.85),clear=cardLifecycle(1.7);
  assert.ok(hidden.reveal<.01);
  assert.ok(mid.reveal>hidden.reveal&&mid.reveal<1);
  assert.ok(clear.reveal>.999);
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

test('wrapped card finishes its top exit before recycling below the forge',()=>{
  const wrapState={mode:'track'};
  let state=wrapCardVisualY(1.72,11.28,10.35,1/60,false,wrapState);
  assert.equal(state.wrapped,false);
  assert.ok(state.visualY>10.35,'first wrapped frame must continue upward instead of disappearing');
  for(let i=0;i<30&&!state.wrapped;i++)state=wrapCardVisualY(1.72,1.72,state.visualY,1/60,false,wrapState);
  assert.equal(state.wrapped,true);
  assert.ok(state.visualY<-1,'the invisible recycle happens below the lower forge');
});

test('final optics uses edge-aware AA rather than relying on resolution alone',()=>{
  const out=fs.readFileSync(new URL('../src/glsl/optics/output.frag',import.meta.url),'utf8');
  assert.match(out,/uAaStrength/);
  assert.match(out,/fxaa/i);
});
