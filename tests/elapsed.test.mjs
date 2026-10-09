import test from 'node:test';import assert from 'node:assert/strict';import * as core from '../src/core.js';
test('camera transitions consume elapsed time even during a slow GPU frame',()=>{assert.equal(typeof core.elapsedFrameTime,'function');const remaining=core.advance(0,1,8,core.elapsedFrameTime(1500,1000));assert.ok(remaining>.98);});
test('elapsed time is finite and never negative',()=>{assert.equal(core.elapsedFrameTime(100,200),0);assert.equal(core.elapsedFrameTime(NaN,0),0);});
test('elapsed interpolation agrees across split and long frames',()=>{const long=core.advance(0,1,8,core.elapsedFrameTime(1500,1000));let split=0;for(let i=0;i<10;i++)split=core.advance(split,1,8,.05);assert.ok(Math.abs(long-split)<1e-12);});
