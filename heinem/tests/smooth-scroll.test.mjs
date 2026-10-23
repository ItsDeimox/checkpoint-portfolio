import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const source = stripTypeScriptTypes(
  readFileSync(new URL('../src/lib/smooth-scroll.ts', import.meta.url), 'utf8'),
).replace('export function createSmoothScroll', 'function createSmoothScroll');

class Element extends EventTarget {
  constructor({ native = false, height = 3000, viewport = 800, overflow = 'visible' } = {}) {
    super();
    this.native = native;
    this.height = height;
    this.viewport = viewport;
    this.overflow = overflow;
    this.geometryReads = 0;
  }
  matches() { return this.native; }
  get scrollHeight() { this.geometryReads++; return this.height; }
  get clientHeight() { this.geometryReads++; return this.viewport; }
  get scrollWidth() { this.geometryReads++; return 800; }
  get clientWidth() { this.geometryReads++; return 800; }
}

function setup({ reduced = false, position = 0, height = 3000, viewport = 800, quantize = false } = {}) {
  const root = new Element({ height, viewport });
  const body = new Element({ height, viewport });
  const document = Object.assign(new EventTarget(), {
    documentElement: root, body, scrollingElement: root, hidden: false,
  });
  const frames = new Map();
  const writes = [];
  const notifications = [];
  const wheelListeners = new Set();
  const observers = [];
  let now = 0;
  let nextFrame = 0;
  let styleReads = 0;
  class TestWindow extends EventTarget {
    addEventListener(type, callback, options) {
      if (type === 'wheel') wheelListeners.add(callback);
      return super.addEventListener(type, callback, options);
    }
    removeEventListener(type, callback, options) {
      if (type === 'wheel') wheelListeners.delete(callback);
      return super.removeEventListener(type, callback, options);
    }
  }
  const window = Object.assign(new TestWindow(), {
    scrollY: position, innerHeight: viewport,
    requestAnimationFrame(callback) {
      const id = ++nextFrame;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    scrollTo(options) {
      writes.push(options);
      window.scrollY = quantize ? Math.round(options.top) : options.top;
      window.dispatchEvent(new Event('scroll'));
    },
    getComputedStyle(element) {
      styleReads++;
      return { lineHeight: '20px', overflowY: element.overflow, overflowX: 'visible' };
    },
  });
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.elements = []; observers.push(this); }
    observe(element) { this.elements.push(element); }
    disconnect() { this.disconnected = true; this.elements = []; }
  }
  const context = vm.createContext({
    window, document, Element, AbortController, ResizeObserver,
    performance: { now: () => now },
    onScroll: () => notifications.push(window.scrollY),
  });
  vm.runInContext(source, context);
  const controller = vm.runInContext(`createSmoothScroll(${reduced}, onScroll)`, context);

  function event(type, properties = {}, target = body) {
    const result = new Event(type, { cancelable: true });
    Object.defineProperties(result, Object.fromEntries(Object.entries({
      deltaX: 0, deltaY: 0, deltaMode: 0,
      ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
      composedPath: () => target === body
        ? [body, root, window]
        : [target, body, root, window],
      ...properties,
    }).map(([key, value]) => [key, { value }])));
    window.dispatchEvent(result);
    return result;
  }
  function tick(milliseconds = 16) {
    now += milliseconds;
    const scheduled = [...frames];
    frames.clear();
    for (const [, callback] of scheduled) callback(now);
  }
  function settle() {
    let count = 0;
    while (frames.size && count++ < 100) tick();
    assert.equal(frames.size, 0, 'animation must stop after reaching its target');
  }
  return {
    controller, window, document, root, body, frames, writes, notifications, wheelListeners, observers,
    event, tick, settle,
    wheel: (deltaY, properties, target) => event('wheel', { deltaY, ...properties }, target),
    get geometryReads() { return root.geometryReads + body.geometryReads + styleReads; },
  };
}

test('wheel uses actual scrollY, animates only on demand and performs no frame layout reads', () => {
  const view = setup();
  assert.equal(view.frames.size, 0);
  assert.equal(view.writes.length, 0);
  assert.equal(view.wheel(120).defaultPrevented, true);
  assert.equal(view.window.scrollY, 0, 'wheel should not jump directly to the target');
  assert.equal(view.frames.size, 1);
  const measured = view.geometryReads;
  view.tick();
  assert.ok(view.window.scrollY > 0 && view.window.scrollY < 120);
  view.settle();
  assert.equal(view.window.scrollY, 120);
  assert.equal(view.geometryReads, measured, 'layout reads are limited to input/resize');
  assert.ok(view.writes.every(({ behavior }) => behavior === 'instant'));
  const writes = view.writes.length;
  view.tick();
  assert.equal(view.writes.length, writes, 'no work should remain while idle');
  view.controller.destroy();
});

test('depth synchronization observes each actual wheel scroll in its write frame, without idle or rounded duplicates', () => {
  const view = setup({ quantize: true });
  view.wheel(120);
  const measured = view.geometryReads;
  view.tick(0);
  assert.equal(view.notifications.length, 0, 'a zero-distance presentation must not notify depth');
  view.tick();
  assert.ok(view.window.scrollY > 0);
  assert.equal(view.notifications.at(-1), view.window.scrollY, 'depth updates before the animation frame returns');
  view.settle();
  const positions = [];
  let previous = 0;
  for (const write of view.writes) {
    const actual = Math.round(write.top);
    if (actual !== previous) positions.push(actual);
    previous = actual;
  }
  assert.deepEqual(view.notifications, positions, 'only actual document movement requests depth work');
  assert.equal(view.geometryReads, measured, 'stable animation does not measure layout');
  const count = view.notifications.length;
  view.tick();
  assert.equal(view.notifications.length, count);
  view.controller.destroy();
});

test('reduced motion removes wheel interception immediately and can be toggled', () => {
  const view = setup({ reduced: true });
  assert.equal(view.wheelListeners.size, 0);
  assert.equal(view.wheel(100).defaultPrevented, false);
  assert.equal(view.frames.size, 0);
  view.controller.setReducedMotion(false);
  assert.equal(view.wheelListeners.size, 1);
  assert.equal(view.wheel(100).defaultPrevented, true);
  view.tick();
  const position = view.window.scrollY;
  view.controller.setReducedMotion(true);
  assert.equal(view.frames.size, 0);
  assert.equal(view.wheelListeners.size, 0);
  view.tick();
  assert.equal(view.window.scrollY, position);
  view.controller.destroy();
});

test('keyboard, pointer, touch and anchor navigation cancel pending motion', () => {
  const view = setup();
  for (const [type, properties] of [
    ['keydown', { key: 'PageDown' }], ['keydown', { key: 'Home' }],
    ['pointerdown', {}], ['touchstart', {}], ['click', {}],
    ['hashchange', {}], ['popstate', {}], ['blur', {}],
  ]) {
    view.wheel(120);
    view.tick();
    assert.equal(view.frames.size, 1);
    const event = view.event(type, properties);
    assert.equal(event.defaultPrevented, false, `${type} must remain native`);
    assert.equal(view.frames.size, 0, `${type} must cancel wheel interpolation`);
  }
  view.wheel(120);
  view.window.scrollY = 700;
  view.event('scroll');
  assert.equal(view.frames.size, 0, 'native scrollbar or external scrolling takes ownership');
  view.tick();
  assert.equal(view.window.scrollY, 700);
  view.controller.destroy();
});

test('controls, nested scrolling, horizontal gestures and zoom retain native wheel behavior', () => {
  const view = setup();
  const input = new Element({ native: true });
  const nested = new Element({ height: 500, viewport: 100, overflow: 'auto' });
  const cases = [
    [{}, input], [{}, nested], [{ ctrlKey: true }], [{ metaKey: true }],
    [{ shiftKey: true }], [{ altKey: true }], [{ deltaX: 140 }],
  ];
  for (const [properties, target] of cases) {
    view.wheel(100);
    assert.equal(view.frames.size, 1);
    assert.equal(view.wheel(100, properties, target).defaultPrevented, false);
    assert.equal(view.frames.size, 0, 'native input also discards pending custom momentum');
  }
  const consumed = new Event('wheel', { cancelable: true });
  consumed.preventDefault();
  view.window.dispatchEvent(consumed);
  assert.equal(view.frames.size, 0);
  view.controller.destroy();
});

test('Tab and Shift+Tab stop pending motion even when focus remains inside the viewport', () => {
  const view = setup();
  for (const shiftKey of [false, true]) {
    view.wheel(120);
    view.tick();
    const position = view.window.scrollY;
    const writes = view.writes.length;
    assert.equal(view.frames.size, 1);
    const tab = view.event('keydown', { key: 'Tab', shiftKey });
    assert.equal(tab.defaultPrevented, false, 'focus navigation must remain native');
    assert.equal(view.frames.size, 0);
    // No native scroll/focus event occurs when the next control is already visible.
    view.tick();
    assert.equal(view.window.scrollY, position);
    assert.equal(view.writes.length, writes);
  }
  view.controller.destroy();
});

test('line/page deltas are converted, huge deltas capped and page boundaries respected', () => {
  const view = setup();
  view.wheel(3, { deltaMode: 1 });
  view.settle();
  assert.equal(view.window.scrollY, 60);
  view.wheel(0.5, { deltaMode: 2 });
  view.settle();
  assert.equal(view.window.scrollY, 460);
  view.wheel(100000);
  view.settle();
  assert.ok(view.window.scrollY <= 1100, 'one large wheel delta must not cause a long runaway');
  view.window.scrollY = 2190;
  view.event('scroll');
  view.wheel(120);
  view.settle();
  assert.equal(view.window.scrollY, 2200);
  assert.equal(view.wheel(120).defaultPrevented, false, 'bottom boundary should stay native');
  view.window.scrollY = 10;
  view.event('scroll');
  view.wheel(-120);
  view.settle();
  assert.equal(view.window.scrollY, 0);
  assert.equal(view.wheel(-120).defaultPrevented, false, 'top boundary should stay native');
  view.controller.destroy();
});

test('reversing wheel direction responds immediately instead of finishing forward momentum', () => {
  const view = setup({ position: 500 });
  view.wheel(300);
  view.tick();
  const beforeReverse = view.window.scrollY;
  view.wheel(-80);
  view.tick();
  assert.ok(view.window.scrollY < beforeReverse);
  view.settle();
  assert.ok(Math.abs(view.window.scrollY - (beforeReverse - 80)) < 0.001);
  view.controller.destroy();
});

test('resize, tab visibility and destroy keep bounds and lifecycle clean', () => {
  const view = setup({ position: 900 });
  view.root.height = view.body.height = 1800;
  view.observers[0].callback();
  view.wheel(400);
  view.settle();
  assert.equal(view.window.scrollY, 1000);
  view.root.height = view.body.height = 4000;
  view.event('resize');
  view.wheel(100);
  view.document.hidden = true;
  view.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(view.frames.size, 0);
  assert.equal(view.wheelListeners.size, 0);
  view.document.hidden = false;
  view.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(view.wheelListeners.size, 1);
  view.wheel(100);
  view.controller.destroy();
  view.controller.destroy();
  assert.equal(view.frames.size, 0);
  assert.equal(view.wheelListeners.size, 0);
  assert.equal(view.observers[0].disconnected, true);
  assert.equal(view.wheel(120).defaultPrevented, false);
  view.controller.setReducedMotion(false);
  view.event('resize');
  assert.equal(view.frames.size, 0);
});
