import test from 'node:test';import assert from 'node:assert/strict';import * as p from '../src/ui/card-projection.js';
test('inactive card starts undimmed and sharp',()=>assert.deepEqual(p.backgroundTreatment(0,0),[1,0]));
test('background defocus has no threshold pop while hover enters',()=>{const a=p.backgroundTreatment(0,.14999),b=p.backgroundTreatment(0,.15001);assert.ok(Math.abs(a[0]-b[0])<.00001&&Math.abs(a[1]-b[1])<.0001);});
test('focused card remains sharp and full intensity',()=>assert.deepEqual(p.backgroundTreatment(1,1),[1,0]));
