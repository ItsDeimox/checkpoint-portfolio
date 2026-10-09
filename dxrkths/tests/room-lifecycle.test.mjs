import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { transform } from 'esbuild';
import * as Three from 'three';
import { RoomCamera } from '../src/scene/room-camera.js';
import { renderBudget, panelIndex } from '../src/scene/room-core.js';
import { ROOM_PANELS } from '../src/pages/home-room.js';
import { elapsedFrameTime } from '../src/core.js';
import { waitForAsset } from '../src/scene/room-startup.js';

// Execute the actual lifecycle with Three's CPU objects and a GPU-free renderer.
// Only external work is controlled: network, shader completion and browser frames.
const sceneSource = await transform(await readFile(new URL('../src/scene/room-scene.js', import.meta.url), 'utf8'), { format: 'cjs' });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const settle = async () => { for (let i = 0; i < 35; i++) await Promise.resolve(); };
const withDeadline = promise => Promise.race([
  promise.then(() => 'settled', () => 'settled'),
  new Promise(resolve => setTimeout(() => resolve('pending'), 30)),
]);

class ElementStub extends EventTarget {
  constructor() {
    super();
    this.style = {}; this.dataset = {}; this.clientWidth = 1280; this.clientHeight = 720;
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle(name, value) { if (value ?? !classes.has(name)) classes.add(name); else classes.delete(name); },
    };
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  setAttribute() {}
  hasPointerCapture() { return false; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; }
}

function harness(config = {}) {
  const events = [], host = new ElementStub(), canvas = new ElementStub(), document = new ElementStub();
  const links = Array.from({ length: 5 }, () => new ElementStub());
  host.querySelectorAll = selector => selector === '.room-panel-link' ? links : [];
  canvas.closest = () => host;
  document.hidden = false;
  let compileNumber = 0, nextFrame = 0;
  class Renderer {
    constructor() {
      events.push('renderer-created');
      this.shadowMap = {};
      this.info = { autoReset: false, render: {}, reset() {} };
      this.target = null;
    }
    getContext() { return {}; }
    getRenderTarget() { return this.target; }
    setRenderTarget(target) { this.target = target; }
    setClearColor() {}
    setPixelRatio() {}
    setSize(width, height) { canvas.width = width; canvas.height = height; }
    compileAsync() { events.push('environment-compile'); return config.compile?.(++compileNumber) ?? Promise.resolve(); }
    dispose() { events.push('renderer-disposed'); }
  }
  class Environment extends Three.Scene { dispose() { events.push('room-disposed'); } }
  class PMREM {
    fromScene() { events.push('environment-created'); return new Three.WebGLRenderTarget(); }
    dispose() {}
  }
  class Optics {
    constructor(renderer) { this.renderer = renderer; this.composer = {}; }
    setQuality() {}
    resize() {}
    render() { events.push({ render: true, shadows: this.renderer.shadowMap.enabled, needsUpdate: this.renderer.shadowMap.needsUpdate, ready: instance.ready }); }
    dispose() {}
  }
  function buildShowroom(view) {
    view.textures = [];
    const target = new Three.WebGLRenderTarget();
    view.ground = new Three.Mesh(new Three.PlaneGeometry(), new Three.ShaderMaterial({
      uniforms: { time: { value: 0 }, reflectionResolution: { value: new Three.Vector2() } },
    }));
    view.ground.getRenderTarget = () => target;
    view.ground.dispose = () => target.dispose();
    view.scene.add(view.ground);
    view.panels = Array.from({ length: 5 }, (_, index) => ({
      index, center: new Three.Vector3((index - 2) * 3, 3, 3),
      corners: [[-1, 4, 3], [1, 4, 3], [1, 2, 3], [-1, 2, 3]].map(point => new Three.Vector3(...point)),
      screen: new Three.Mesh(new Three.PlaneGeometry(), new Three.MeshBasicMaterial()),
    }));
    view.loadingManager.itemStart('artwork');
    Promise.resolve(config.textures).then(() => view.loadingManager.itemEnd('artwork'));
  }
  const dependencies = {
    three: { ...Three, WebGLRenderer: Renderer, PMREMGenerator: PMREM },
    'three/addons/environments/RoomEnvironment.js': { RoomEnvironment: Environment },
    'three/addons/lights/RectAreaLightUniformsLib.js': { RectAreaLightUniformsLib: { init() {} } },
    './room-car.js': { loadShowroomCar: () => config.vehicle ?? Promise.resolve(new Three.Group()) },
    './room-environment.js': { buildShowroom },
    './room-optics.js': { RoomOptics: Optics },
    './room-camera.js': { RoomCamera },
    './room-startup.js': {
      waitForAsset,
      async yieldToBrowser(signal) { await Promise.resolve(); signal?.throwIfAborted(); },
      async prepareRoomRenderer(view, options) { events.push('preparation'); await config.prepare?.(view, options); options.signal?.throwIfAborted(); return {}; },
    },
    './room-core.js': { renderBudget, panelIndex },
    '../pages/home-room.js': { ROOM_PANELS },
    './room-shaders.js': { roomVertex: '', smokeFragment: '', beamFragment: '' },
    '../core.js': { elapsedFrameTime },
  };
  const module = { exports: {} };
  runInNewContext(sceneSource.code, {
    module, exports: module.exports,
    require(name) { assert.ok(name in dependencies, `Unexpected lifecycle dependency: ${name}`); return dependencies[name]; },
    document, window: {}, AbortController, DOMException, performance, console,
    devicePixelRatio: 1, matchMedia: () => Object.assign(new ElementStub(), { matches: false }),
    requestAnimationFrame: () => ++nextFrame, cancelAnimationFrame() {},
    ResizeObserver: class { observe() {} disconnect() {} },
    setTimeout, clearTimeout,
  }, { filename: 'room-scene.js' });
  const settings = { quality: 'auto', paused: true, sound: false };
  const instance = new module.exports.HeroScene(canvas, settings, {
    onReady() { events.push('ready'); },
    onUnavailable(error) { events.push({ unavailable: error }); },
  });
  instance.readyPromise.catch(() => {});
  return { instance, settings, events, canvas, host };
}

test('initialization primes the real pipeline before marking the persistent scene ready', async () => {
  const { instance, events } = harness();
  try {
    await instance.readyPromise;
    const render = events.find(event => event?.render);
    assert.deepEqual(render, { render: true, shadows: true, needsUpdate: true, ready: false });
    assert.ok(events.indexOf('preparation') < events.indexOf(render));
    assert.ok(events.indexOf(render) < events.indexOf('ready'));
    assert.equal(events.filter(event => event === 'renderer-created').length, 1);
  } finally { await instance.dispose(); }
});

test('navigation requests during the initial paint cannot access an unbuilt scene', async () => {
  const { instance } = harness();
  try {
    assert.doesNotThrow(() => instance.focusPanel(2));
    await instance.readyPromise;
  } finally { await instance.dispose(); }
});

test('dispose waits for an in-flight environment compilation during context restoration', async () => {
  const gate = deferred();
  const { instance, events, canvas } = harness({ compile: number => number === 2 ? gate.promise : undefined });
  await instance.readyPromise;
  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  canvas.dispatchEvent(new Event('webglcontextrestored'));
  await settle();
  const restore = instance.restoration;
  const disposal = instance.dispose();
  try {
    await settle();
    assert.equal(events.includes('renderer-disposed'), false, 'Renderer was disposed while restore compileAsync was polling');
  } finally {
    gate.resolve();
    await Promise.allSettled([restore, disposal]);
  }
  assert.equal(events.filter(event => event === 'renderer-disposed').length, 1);
});

test('a context loss while assets are pending is reported and cannot publish ready', async () => {
  const vehicle = deferred();
  const { instance, events, canvas } = harness({ vehicle: vehicle.promise });
  try {
    await settle();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    assert.ok(events.some(event => event?.unavailable), 'Early context loss never reached the fallback callback');
    assert.equal(await withDeadline(instance.readyPromise), 'settled', 'Startup remained blocked on network after context loss');
    assert.equal(instance.ready, false);
    assert.equal(events.includes('ready'), false);
  } finally {
    vehicle.resolve(new Three.Group());
    await instance.readyPromise.catch(() => {});
    await instance.dispose();
  }
});

test('disposal does not wait for a stalled asset download', async () => {
  const vehicle = deferred();
  const { instance, events } = harness({ vehicle: vehicle.promise });
  await settle();
  const disposal = instance.dispose();
  try {
    assert.equal(await withDeadline(disposal), 'settled', 'Network wait prevented lifecycle cancellation');
    assert.equal(events.includes('ready'), false);
    assert.equal(events.includes('renderer-disposed'), true);
  } finally {
    vehicle.resolve(new Three.Group());
    await disposal;
  }
});
