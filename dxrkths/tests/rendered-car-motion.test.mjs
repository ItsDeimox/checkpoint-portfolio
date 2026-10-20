import test from 'node:test';
import assert from 'node:assert/strict';
import {HeroScene} from '../src/scene/room-scene.js';

test('car velocity spans the last submitted draw when GPU pressure skips intermediate poses',()=>{
  const samples=[],view=Object.create(HeroScene.prototype);
  Object.assign(view,{
    renderer:{info:{reset(){}}},reflectionBudget:{advance(){}},
    optics:{render:(dt,options)=>samples.push({dt,...options})},
    cameraRig:{mode:'overview',focusDistance:12},settings:{quality:'high',paused:false},
    reduced:{matches:false},turntable:{angle:.4,frameDelta:0},time:0,frames:0,
  });
  view.render(1/60,0);
  // These are real simulation poses that the GPU queue did not submit.
  view.turntable.angle=.41;view.turntable.frameDelta=.01;
  view.turntable.angle=.43;view.turntable.frameDelta=.02;
  view.turntable.angle=.46;view.turntable.frameDelta=.03;
  view.render(3/60,.65);
  assert.ok(Math.abs(samples.at(-1).turntableDelta-.06)<1e-12,
    'Object velocity must cover the same interval as camera and depth history');
  view.turntable.angle=.47;view.turntable.frameDelta=.01;view.render(1/60,.65);
  assert.ok(Math.abs(samples.at(-1).turntableDelta-.01)<1e-12);
  view.render(1/60,0);
  assert.equal(samples.at(-1).turntableDelta,0,'A repeated draw has no stale per-RAF velocity');
  view.settings.quality='low';view.turntable.angle=.49;view.render(1/60,.65);
  assert.equal(samples.at(-1).turntableDelta,0);
  view.settings.quality='high';view.turntable.angle=.50;view.render(1/60,.65);
  assert.ok(Math.abs(samples.at(-1).turntableDelta-.01)<1e-12);
});
