import test from 'node:test';
import assert from 'node:assert/strict';
import { bindRoomPointer } from '../src/scene/room-input.js';

function fixture() {
  const canvas = new EventTarget(), calls = [], capture = new Set();
  canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500 });
  canvas.setPointerCapture = id => capture.add(id);
  canvas.hasPointerCapture = id => capture.has(id);
  canvas.releasePointerCapture = id => capture.delete(id);
  canvas.classList = { add() {}, remove() {} }; canvas.style = {};
  const view = {
    canvas, ready: true, contentPanel: null, reduced: { matches: false },
    cameraRig: { mode: 'overview', pointLook: (...args) => calls.push(['point', ...args]), look: (...args) => calls.push(['look', ...args]), neutralLook: () => calls.push(['neutral']) },
    wake: () => calls.push(['wake']), activateAt: (...args) => calls.push(['activate', ...args]),
    release() { if (this.drag) canvas.releasePointerCapture(this.drag.id); this.drag = null; },
    clearHover: () => calls.push(['clear']),
  };
  bindRoomPointer(view, (element, type, fn) => element.addEventListener(type, fn));
  const send = (type, fields = {}) => {
    const event = new Event(type);
    Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 850, clientY: 425, ...fields });
    canvas.dispatchEvent(event);
  };
  return { view, calls, capture, send };
}

test('mouse movement controls the camera without a pressed button, using viewport coordinates', () => {
  const f = fixture(); f.send('pointermove');
  assert.deepEqual(f.calls[0], ['point', .5, .5]);
  assert.deepEqual(f.view.pendingPick, [850, 425]);
  assert.equal(f.capture.size, 0);
  f.send('pointerleave');
  assert.ok(f.calls.some(call => call[0] === 'neutral'));
  assert.equal(f.view.lastPointer, null);
});

test('focused screens receive clicks but never move with the pointer', () => {
  const f = fixture(); f.view.cameraRig.mode = 'focused'; f.view.contentPanel = 2;
  f.send('pointermove'); f.send('pointerdown'); f.send('pointerup');
  assert.deepEqual(f.calls.filter(call => call[0] === 'activate'), [['activate', 850, 425]]);
  assert.equal(f.calls.some(call => call[0] === 'point' || call[0] === 'look'), false);
  assert.equal(f.capture.size, 0);
});

test('touch retains a gentle drag with inverted vertical deltas and suppresses drag-clicks', () => {
  const f = fixture();
  f.send('pointerdown', { pointerType: 'touch', clientX: 500, clientY: 300 });
  f.send('pointermove', { pointerType: 'touch', clientX: 530, clientY: 320 });
  assert.deepEqual(f.calls.find(call => call[0] === 'look'), ['look', -.024, -.016]);
  f.send('pointerup', { pointerType: 'touch' });
  assert.equal(f.calls.some(call => call[0] === 'activate'), false);
  assert.equal(f.capture.size, 0);
});

test('travelling, cancelled gestures and secondary pointers cannot activate a screen', () => {
  const f = fixture();
  f.view.cameraRig.mode = 'approaching';
  f.send('pointerdown'); f.send('pointermove'); f.send('pointerup');
  assert.equal(f.calls.length, 0);
  f.view.cameraRig.mode = 'overview';
  f.send('pointerdown'); f.send('pointerdown', { pointerId: 2 });
  f.send('pointerup', { pointerId: 2 });
  f.send('pointercancel', { pointerId: 2 });
  f.send('lostpointercapture', { pointerId: 2 });
  assert.equal(f.view.drag.id, 1);
  f.send('pointercancel'); f.send('pointerup');
  assert.equal(f.calls.some(call => call[0] === 'activate'), false);
});

test('reduced motion keeps direct screen selection while disabling pointer parallax', () => {
  const f = fixture(); f.view.reduced.matches = true;
  f.send('pointermove'); f.send('pointerdown'); f.send('pointerup');
  assert.equal(f.calls.some(call => call[0] === 'point'), false);
  assert.ok(f.calls.some(call => call[0] === 'activate'));
});

test('a turntable drag owns the gesture without steering the camera or activating panels', () => {
 const f=fixture();let pixels=0,starts=0,ends=[];
 f.view.beginTurntable=()=>{starts++;return true;};
 f.view.turntable={movePixels(delta){pixels+=delta;},end(inertia){ends.push(inertia);}};
 f.view.settings={paused:false};
 f.send('pointerdown',{clientX:500,clientY:350});
 f.send('pointermove',{clientX:700,clientY:370});
 f.send('pointerup',{clientX:700,clientY:370});
 assert.equal(starts,1);assert.equal(pixels,200);
 assert.equal(f.calls.some(c=>['point','look','activate'].includes(c[0])),false);
 assert.ok(ends.includes(true));assert.equal(f.capture.size,0);
});
test('turntable cancellation kills inertia and does not let a second pointer interfere',()=>{
 const f=fixture();let stops=0;
 f.view.beginTurntable=()=>true;
 f.view.turntable={movePixels(){},end(inertia){if(!inertia)stops++;}};
 f.view.settings={paused:false};f.send('pointerdown');
 f.send('pointercancel',{pointerId:2});assert.equal(stops,0);
 f.send('pointercancel');assert.equal(stops,1);assert.equal(f.capture.size,0);
});
