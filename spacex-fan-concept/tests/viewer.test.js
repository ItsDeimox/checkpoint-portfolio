import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const ready = existsSync(new URL('../src/state.js', import.meta.url));
test('viewer state module exists', () => assert.ok(ready, 'Implement the requested viewer state'));
if (ready) {
  const { initialState, reduce, getQuality, fitView, ease } = await import('../src/state.js');
  const { vehicles, getPart } = await import('../src/data.js');
  test('lineup and default match the approved Falcon 9 concept', () => {
    assert.deepEqual(vehicles.map(v=>v.id), ['falcon-1','falcon-9','falcon-heavy','starship']);
    assert.equal(initialState().index,1); assert.equal(initialState().part,null);
  });
  test('interior links open the specified flight hardware and reject unavailable or unknown parts',()=>{
    assert.deepEqual(initialState('starship/tanks'),{index:3,part:'tanks',payload:'fairing',rotating:false});
    for(const link of ['falcon-1/tanks','unknown/fairing','starship/__proto__','falcon-9/tanks/extra'])
      assert.deepEqual(initialState(link),initialState());
  });
  test('bounded carousel clears focus and does not wrap unexpectedly', () => {
    let s=reduce(initialState(),{type:'FOCUS',part:'engines'});
    assert.equal(s.part,'engines'); s=reduce(s,{type:'NAVIGATE',index:2});
    assert.equal(s.index,2); assert.equal(s.part,null);
    assert.equal(reduce(s,{type:'NAVIGATE',index:99}).index,3);
    assert.equal(reduce(s,{type:'NAVIGATE',index:-1}).index,1);
  });
  test('invalid selection cannot poison camera state', () => {
    const s=initialState(); assert.deepEqual(reduce(s,{type:'FOCUS',part:'unknown'}),s);
    assert.deepEqual(reduce(s,{type:'NAVIGATE',index:NaN}),s);
    assert.deepEqual(reduce(s,{type:'FOCUS',part:'__proto__'}),s);
  });
  test('return preserves vehicle and exits the detail',()=> {
    const s=reduce(reduce(initialState(),{type:'FOCUS',part:'fairing'}),{type:'BACK'});
    assert.equal(s.part,null); assert.equal(s.index,1);
  });
  test('Dragon is only an option on Falcon 9 and changes upper section information',()=> {
    let s=reduce(initialState(),{type:'DRAGON'});
    assert.equal(s.index,1); assert.equal(s.payload,'dragon'); assert.equal(s.part,'fairing');
    assert.equal(getPart(vehicles[1],'fairing',s.payload).title,'DRAGON 2');
    s=reduce(s,{type:'NAVIGATE',index:3}); assert.equal(s.payload,'fairing');
  });
  test('quality bounds DPR for mobile and low-memory devices',()=> {
    assert.ok(getQuality({width:390,dpr:3,memory:4}).dpr<=1.25);
    assert.ok(getQuality({width:1920,dpr:2,memory:16}).dpr<=1.75);
    assert.equal(getQuality({width:1920,dpr:2,memory:2}).reflectionSize,256);
  });
  test('portrait, landscape and tiny viewports produce finite positive camera fits',()=> {
    for(const [w,h] of [[1920,1080],[390,844],[844,390],[320,568],[1,1]]) {
      const fit=fitView(14,w,h); assert.ok(Number.isFinite(fit.distance));
      assert.ok(fit.distance>0); assert.ok(fit.target.every(Number.isFinite));
    }
  });
  test('easing is continuous, clamped, and reaches exact endpoints',()=> {
    assert.equal(ease(-1),0); assert.equal(ease(0),0); assert.equal(ease(1),1); assert.equal(ease(2),1);
    assert.equal(ease(.5),.5); assert.ok(ease(.2)<ease(.3));
  });
  test('each vehicle includes sourced information for every interactive part',()=> {
    for(const vehicle of vehicles) {
      assert.ok(vehicle.height>0); assert.match(vehicle.source,/^https:\/\//);
      for(const part of Object.values(vehicle.parts)) { assert.ok(part.title); assert.ok(part.specs.length>=2); }
    }
  });
}
test('switching from Dragon to a rocket component restores Falcon geometry',async()=>{const {reduce,initialState}=await import('../src/state.js');const dragon=reduce(initialState(),{type:'DRAGON'}),next=reduce(dragon,{type:'FOCUS',part:'engines'});assert.equal(next.payload,'fairing');assert.equal(next.part,'engines');});
