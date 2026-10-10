import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { transform } from 'esbuild';
import * as Three from 'three';
import { RoomCamera } from '../src/scene/room-camera.js';
import { renderBudget, panelIndex } from '../src/scene/room-core.js';
import { ROOM_PANELS, BACK_ACTION } from '../src/pages/room-panel-data.js';
import { RoomPanelContent } from '../src/scene/room-panel-content.js';
import { bindRoomPointer } from '../src/scene/room-input.js';
import { createFixedPanelLayout } from '../src/scene/room-environment.js';
import { refineCarMaterials } from '../src/scene/room-materials.js';
import * as turntable from '../src/scene/room-turntable.js';
import * as lighting from '../src/scene/room-lighting.js';
import { normalizeVisualSettings } from '../src/scene/room-visual-settings.js';
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
    this.capturedPointers = new Set();
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
  setPointerCapture(id) { this.capturedPointers.add(id); }
  releasePointerCapture(id) { this.capturedPointers.delete(id); }
  hasPointerCapture(id) { return this.capturedPointers.has(id); }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
}

function harness(config = {}) {
  const events = [], host = new ElementStub(), canvas = new ElementStub(), document = new ElementStub();
  const media = Object.assign(new ElementStub(), { matches: config.reduced ?? false });
  const frames = new Map();
  const links = Array.from({ length: 5 }, () => new ElementStub());
  host.querySelectorAll = selector => selector === '.room-panel-link' ? links : [];
  canvas.closest = () => host;
  document.hidden = false;
  let compileNumber = 0, nextFrame = 0;
  class Renderer {
    constructor() {
      events.push('renderer-created');
      this.shadowMap = {};
      this.capabilities = { getMaxAnisotropy: () => 8 };
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
    constructor(renderer) { this.renderer = renderer; this.composer = {}; this.sceneTarget = new Three.WebGLRenderTarget(); }
    attachTurntable(root) { this.turntableRoot = root; }
    setQuality() {}
    setVisualSettings(values) { this.visualSettings = normalizeVisualSettings(values, this.visualSettings); }
    resize() {}
    render() { events.push({ render: true, shadows: this.renderer.shadowMap.enabled, needsUpdate: this.renderer.shadowMap.needsUpdate, ready: instance.ready }); }
    dispose() { this.sceneTarget.dispose(); events.push('optics-disposed'); }
  }
  class Content extends RoomPanelContent {
    constructor(options) {
      super({ ...options, fontSet: null, canvasFactory: () => ({
        getContext: () => ({
          font: '30px Arial',
          measureText(value) { return { width: String(value).length * Number(this.font.match(/([\d.]+)px/)?.[1] ?? 30) * .48 }; },
          createLinearGradient: () => ({ addColorStop() {} }),
          save() {}, restore() {}, fillText() {}, fillRect() {}, strokeRect() {},
          beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        }),
      }) });
      if (config.panelReady) this.ready = config.panelReady;
    }
    dispose() { if (!this.disposed) events.push('content-disposed'); super.dispose(); }
  }
  function buildShowroom(view) {
    view.textures = [];view.turntableParts=[];
    const target = new Three.WebGLRenderTarget();
    view.ground = new Three.Mesh(new Three.PlaneGeometry(), new Three.ShaderMaterial({
      uniforms: { time: { value: 0 }, turntableAngle: { value: 0 }, reflectionResolution: { value: new Three.Vector2() } },
    }));
    view.ground.getRenderTarget = () => target;
    view.ground.dispose = () => target.dispose();
    view.scene.add(view.ground);
    view.panels = createFixedPanelLayout().map(shape => {
      const corners = shape.corners.map(corner => corner.clone().sub(shape.center).multiplyScalar(.938 * .986).add(shape.center));
      const geometry = new Three.BufferGeometry();
      geometry.setAttribute('position', new Three.Float32BufferAttribute(corners.flatMap(corner => corner.toArray()), 3));
      geometry.setAttribute('uv', new Three.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
      geometry.setIndex([0, 2, 1, 0, 3, 2]); geometry.computeVertexNormals();
      const material = new Three.ShaderMaterial({ side: Three.DoubleSide, uniforms: {
        contentMap: { value: null }, contentMix: { value: 0 }, hover: { value: 0 }, hoverUv: { value: new Three.Vector2(.5, .5) },
      } });
      const screen = new Three.Mesh(geometry, material), frame = new Three.Group();
      screen.userData.panel = shape.index; frame.add(screen); view.scene.add(frame);
      return { ...shape, screen, frame, material };
    });
    view.loadingManager.itemStart('artwork');
    Promise.resolve(config.textures).then(() => view.loadingManager.itemEnd('artwork'));
  }
  const dependencies = {
    three: { ...Three, WebGLRenderer: Renderer, PMREMGenerator: PMREM },
    'three/addons/environments/RoomEnvironment.js': { RoomEnvironment: Environment },
    './room-car.js': { loadShowroomCar: () => config.vehicle ?? Promise.resolve(new Three.Group()) },
    './room-materials.js': { refineCarMaterials },
    './room-environment.js': { buildShowroom },
    './room-optics.js': { RoomOptics: Optics },
    './room-camera.js': { RoomCamera },
    './room-panel-content.js': { RoomPanelContent: Content },
    './room-input.js': { bindRoomPointer },
    './room-lighting.js': lighting,
    './room-turntable.js': turntable,
    './room-startup.js': {
      waitForAsset,
      async yieldToBrowser(signal) { await Promise.resolve(); signal?.throwIfAborted(); },
      async prepareRoomRenderer(view, options) { events.push('preparation'); await config.prepare?.(view, options); options.signal?.throwIfAborted(); return {}; },
    },
    './room-core.js': { renderBudget, panelIndex },
    '../pages/room-panel-data.js': { ROOM_PANELS },
    '../core.js': { elapsedFrameTime },
  };
  const module = { exports: {} };
  runInNewContext(sceneSource.code, {
    module, exports: module.exports,
    require(name) { assert.ok(name in dependencies, `Unexpected lifecycle dependency: ${name}`); return dependencies[name]; },
    document, window: {}, AbortController, DOMException, performance, console,
    devicePixelRatio: 1, matchMedia: () => media,
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class { observe() {} disconnect() {} },
    setTimeout, clearTimeout,
  }, { filename: 'room-scene.js' });
  const settings = { quality: 'auto', paused: true, sound: false, visual: normalizeVisualSettings(), ...config.settings };
  const instance = new module.exports.HeroScene(canvas, settings, {
    onReady() { events.push('ready'); },
    onUnavailable(error) { events.push({ unavailable: error }); },
    onPanelRequest(index, trigger) { events.push({ panelRequest: index, trigger }); },
    onPanelAction(action) { events.push({ panelAction: action }); },
  });
  instance.readyPromise.catch(() => {});
  const step = (delta = 1 / 60) => {
    const pending = frames.entries().next().value;
    if (!pending) return false;
    const [id, callback] = pending; frames.delete(id);
    callback(instance.last + delta * 1000);
    return true;
  };
  return { instance, settings, events, canvas, host, document, media, frames, step, links };
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

function surfacePoint(view, index, uv) {
  const screen = view.panels[index].screen, positions = screen.geometry.getAttribute('position');
  const origin = new Three.Vector3().fromBufferAttribute(positions, 3);
  const right = new Three.Vector3().fromBufferAttribute(positions, 2).sub(origin);
  const up = new Three.Vector3().fromBufferAttribute(positions, 0).sub(origin);
  const point = origin.addScaledVector(right, uv.x).addScaledVector(up, uv.y);
  screen.localToWorld(point); point.project(view.camera);
  const rect = view.canvas.getBoundingClientRect();
  return [rect.left + (point.x * .5 + .5) * rect.width, rect.top + (-point.y * .5 + .5) * rect.height];
}

function clickSurface(canvas, point) {
  for (const type of ['pointerdown', 'pointerup']) {
    const event = new Event(type);
    Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: point[0], clientY: point[1] });
    canvas.dispatchEvent(event);
  }
}

function finishApproach(fixture, index) {
  const { instance, step } = fixture;
  instance.approach(index, () => instance.showPanelContent(index));
  for (let i = 0; i < 100 && instance.cameraRig.mode !== 'focused'; i++) assert.equal(step(), true);
  assert.equal(instance.cameraRig.mode, 'focused');
  assert.equal(instance.contentPanel, index);
}

function hoverSurface(canvas, point) {
  const event = new Event('pointermove');
  Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: point[0], clientY: point[1] });
  canvas.dispatchEvent(event);
}

test('content arrival, pointer hover and action focus retain one animation frame chain', async () => {
  for (const paused of [true, false]) {
    const fixture = harness({ settings: { paused } }), { instance, canvas, frames, step, events } = fixture;
    const advance = label => {
      assert.equal(step(), true, `${label}: the requested update must run`);
      assert.ok(frames.size <= 1, `${label}: ${frames.size} animation callbacks are pending`);
    };
    try {
      await instance.readyPromise;
      assert.equal(frames.size, 1);
      let arrivals = 0;
      instance.approach(4, () => { arrivals++; instance.showPanelContent(4); });
      for (let i = 0; i < 100 && instance.cameraRig.mode !== 'focused'; i++) advance('approach/content arrival');
      assert.equal(instance.cameraRig.mode, 'focused');
      assert.equal(instance.contentPanel, 4);
      assert.equal(arrivals, 1);
      const regions = instance.panelContent.entries[4].regions;
      for (const region of regions.slice(0, 2)) {
        const uv = new Three.Vector2((region.x + region.width / 2) / 1024, 1 - (region.y + region.height / 2) / 1024);
        const point = surfacePoint(instance, 4, uv);
        hoverSurface(canvas, point);
        assert.equal(frames.size, 1, 'pointer input must share the scheduled frame');
        advance('hover redraw/onChange');
        assert.equal(instance.panelContent.entries[4].hovered, region.action.id);
        const before = events.filter(event => event?.panelAction).length;
        clickSurface(canvas, point);
        assert.equal(events.filter(event => event?.panelAction).length, before + 1);
        assert.ok(frames.size <= 1, 'surface activation must not duplicate the frame chain');
      }
      for (const region of regions.slice(0, 2)) {
        instance.focusAction(region.action.id);
        assert.equal(frames.size, 1, 'content onChange and focusAction wake must share one callback');
        advance('action focus');
        assert.equal(instance.panelContent.entries[4].hovered, region.action.id);
      }
    } finally { await instance.dispose(); }
  }
});

test('sleep and disposal cancel the entire chain after a content hover redraw', async () => {
  const fixture = harness({ settings: { paused: false } }), { instance, canvas, frames, step, events } = fixture;
  try {
    await instance.readyPromise;
    instance.cameraRig.approach(instance.panels[4], { reduced: true });
    instance.showPanelContent(4);
    const regions = instance.panelContent.entries[4].regions;
    const hover = region => {
      const uv = new Three.Vector2((region.x + region.width / 2) / 1024, 1 - (region.y + region.height / 2) / 1024);
      hoverSurface(canvas, surfacePoint(instance, 4, uv));
      assert.equal(step(), true);
      assert.equal(instance.panelContent.entries[4].hovered, region.action.id);
    };
    // setHovered -> onChange -> wake runs inside the real frame callback.
    // A duplicated callback becomes an orphan if sleep cancels only this.raf.
    hover(regions[0]);
    instance.sleep();
    assert.equal(frames.size, 0, 'sleep must leave no orphan animation callback');
    assert.equal(step(), false, 'a sleeping scene must have no chain left to execute');
    instance.wake();
    assert.equal(frames.size, 1, 'waking after sleep starts exactly one chain');
    hover(regions[1]);
    const staleCallbacks = [...frames.values()], renders = events.filter(event => event?.render).length;
    await instance.dispose();
    assert.equal(frames.size, 0, 'disposal must cancel every callback after hover');
    for (const callback of staleCallbacks) callback(performance.now() + 1000);
    instance.wake();
    assert.equal(frames.size, 0, 'late callbacks cannot revive a disposed scene');
    assert.equal(events.filter(event => event?.render).length, renders);
    assert.equal(step(), false);
  } finally { await instance.dispose(); }
});

test('initialization binds the stable content texture of each panel before renderer preparation', async () => {
  let prepared = false;
  const fixture = harness({
    prepare(view) {
      prepared = true;
      for (const panel of view.panels) {
        const texture = panel.material.uniforms.contentMap.value;
        assert.equal(texture, view.panelContent.getTexture(panel.index));
        assert.equal(texture.isCanvasTexture, true);
        assert.equal(texture.anisotropy, 8);
      }
    },
  });
  try {
    await fixture.instance.readyPromise;
    assert.equal(prepared, true);
    assert.equal(fixture.events.filter(event => event?.render).length, 1);
  } finally { await fixture.instance.dispose(); }
});

test('real screen raycasts route every focused action and Back by UV to exactly one callback', async () => {
  const fixture = harness(), { instance, canvas, events } = fixture;
  try {
    await instance.readyPromise;
    for (let index = 0; index < ROOM_PANELS.length; index++) {
      finishApproach(fixture, index);
      for (const region of instance.panelContent.entries[index].regions) {
        const uv = new Three.Vector2((region.x + region.width / 2) / 1024, 1 - (region.y + region.height / 2) / 1024);
        const point = surfacePoint(instance, index, uv), hit = instance.hitAt(...point);
        assert.equal(hit?.object, instance.panels[index].screen);
        assert.ok(hit.uv.distanceTo(uv) < 1e-6, 'Camera projection and raycast preserve the content UV');
        const before = events.filter(event => event?.panelAction).length;
        clickSurface(canvas, point);
        const actions = events.filter(event => event?.panelAction);
        assert.equal(actions.length, before + 1);
        assert.equal(actions.at(-1).panelAction, region.action);
      }
      const before = events.filter(event => event?.panelAction).length;
      const blank = surfacePoint(instance, index, new Three.Vector2(.08, .94));
      assert.ok(instance.hitAt(...blank), 'The non-action header still hits the physical screen');
      clickSurface(canvas, blank);
      assert.equal(events.filter(event => event?.panelAction).length, before);
    }
    assert.equal(events.filter(event => event?.panelAction === BACK_ACTION).length, ROOM_PANELS.length);
    assert.equal(events.filter(event => 'panelRequest' in Object(event)).length, 0);
  } finally { await instance.dispose(); }
});

test('overview selection preserves native triggers and focused content cannot activate a different panel', async () => {
  const fixture = harness(), { instance, canvas, events, links } = fixture;
  try {
    await instance.readyPromise;
    for (let index = 0; index < ROOM_PANELS.length; index++) {
      const point = surfacePoint(instance, index, new Three.Vector2(.5, .6));
      clickSurface(canvas, point);
      const requests = events.filter(event => 'panelRequest' in Object(event));
      assert.equal(requests.length, index + 1);
      assert.equal(requests.at(-1).panelRequest, index);
      assert.equal(requests.at(-1).trigger, links[index]);
    }
    assert.equal(events.filter(event => event?.panelAction).length, 0);
    finishApproach(fixture, 2);
    const other = surfacePoint(instance, 0, new Three.Vector2(.5, .6));
    assert.equal(instance.hitAt(...other)?.object.userData.panel, 0);
    clickSurface(canvas, other);
    assert.equal(events.filter(event => event?.panelAction).length, 0);
    assert.equal(events.filter(event => 'panelRequest' in Object(event)).length, ROOM_PANELS.length);
    instance.hidePanelContent();
    clickSurface(canvas, surfacePoint(instance, 2, new Three.Vector2(.5, .15)));
    assert.equal(events.filter(event => event?.panelAction).length, 0);
  } finally { await instance.dispose(); }
});

test('approach, content hover and return only change uniforms and leave screen geometry and transforms fixed', async () => {
  const fixture = harness(), { instance, step } = fixture;
  const snapshot = () => instance.panels.map(panel => ({
    positions: Array.from(panel.screen.geometry.getAttribute('position').array),
    uv: Array.from(panel.screen.geometry.getAttribute('uv').array),
    screen: panel.screen.matrixWorld.toArray(), frame: panel.frame.matrixWorld.toArray(),
  }));
  try {
    await instance.readyPromise;
    const original = snapshot(), textures = instance.panels.map(panel => panel.material.uniforms.contentMap.value);
    finishApproach(fixture, 4);
    const region = instance.panelContent.entries[4].regions[1];
    const uv = new Three.Vector2((region.x + region.width / 2) / 1024, 1 - (region.y + region.height / 2) / 1024);
    instance.pendingPick = surfacePoint(instance, 4, uv); instance.wake(); step();
    assert.equal(instance.panelContent.entries[4].hovered, region.action.id);
    assert.ok(instance.panels[4].material.uniforms.hoverUv.value.distanceTo(uv) < 1e-6);
    assert.ok(instance.panels[4].material.uniforms.contentMix.value > 0);
    assert.deepEqual(snapshot(), original);
    assert.deepEqual(instance.panels.map(panel => panel.material.uniforms.contentMap.value), textures);
    instance.reset();
    for (let i = 0; i < 100 && instance.cameraRig.mode !== 'overview'; i++) assert.equal(step(), true);
    assert.equal(instance.cameraRig.mode, 'overview');
    assert.equal(instance.contentPanel, null);
    assert.deepEqual(snapshot(), original);
  } finally { await instance.dispose(); }
});

test('screen light fades toward hover and content intensities without creating lights or moving a screen', async () => {
  const fixture = harness(), { instance } = fixture;
  try {
    await instance.readyPromise;
    const lights = []; instance.scene.traverse(object => { if (object.isLight) lights.push(object); });
    const panel = instance.panels[1], world = panel.screen.matrixWorld.toArray();
    instance.hoverPanel = 1;
    assert.equal(instance.screenLight.intensity, 0);
    assert.equal(instance.updatePanels(1 / 60), true);
    const first = instance.screenLight.intensity;
    assert.ok(first > 0 && first < 2.5);
    assert.ok(instance.screenLight.position.distanceTo(panel.center.clone().addScaledVector(panel.normal, .65)) < 1e-9);
    instance.updatePanels(1 / 60);
    assert.ok(instance.screenLight.intensity > first && instance.screenLight.intensity < 2.5);
    for (let i = 0; i < 45; i++) instance.updatePanels(1 / 60);
    const beforeContent = instance.screenLight.intensity;
    instance.cameraRig.approach(panel, { reduced: true }); instance.showPanelContent(1);
    instance.updatePanels(1 / 60);
    assert.ok(instance.screenLight.intensity < beforeContent && instance.screenLight.intensity > 1.2);
    const after = []; instance.scene.traverse(object => { if (object.isLight) after.push(object); });
    assert.deepEqual(after, lights);
    assert.deepEqual(panel.screen.matrixWorld.toArray(), world);
  } finally { await instance.dispose(); }
});

test('enabling reduced motion during approach settles once and keeps selected content and screens stable', async () => {
  const fixture = harness(), { instance, media, step } = fixture;
  try {
    await instance.readyPromise;
    let arrivals = 0;
    instance.approach(3, () => { arrivals++; instance.showPanelContent(3); });
    for (let i = 0; i < 8; i++) step();
    assert.equal(instance.cameraRig.mode, 'approaching');
    media.matches = true; media.dispatchEvent(new Event('change'));
    assert.equal(instance.cameraRig.mode, 'focused');
    assert.equal(instance.cameraRig.transition, null);
    assert.equal(instance.contentPanel, 3);
    assert.equal(arrivals, 1);
    for (let i = 0; i < 3; i++) step();
    assert.equal(arrivals, 1);
    assert.equal(instance.panels[3].material.uniforms.contentMix.value, 1);
  } finally { await instance.dispose(); }
});

test('disposing aborts a pending font wait and cannot publish the initial frame afterward', async () => {
  const fonts = deferred(), fixture = harness({ panelReady: fonts.promise });
  const { instance, events } = fixture;
  await settle();
  assert.ok(instance.panelContent);
  assert.equal(events.some(event => event?.render), false);
  const disposal = instance.dispose();
  try {
    assert.equal(await withDeadline(disposal), 'settled');
    assert.equal(instance.panelContent.disposed, true);
    fonts.resolve(true); await settle();
    assert.equal(events.some(event => event?.render), false);
    assert.equal(events.includes('ready'), false);
    assert.equal(events.filter(event => event === 'renderer-disposed').length, 1);
  } finally { fonts.resolve(true); await disposal; }
});

test('disposing waits for in-flight preparation and never destroys a renderer still compiling', async () => {
  const preparation = deferred(), fixture = harness({ prepare: () => preparation.promise });
  const { instance, events } = fixture;
  await settle();
  assert.equal(events.includes('preparation'), true);
  const disposal = instance.dispose();
  try {
    assert.equal(await withDeadline(disposal), 'pending');
    assert.equal(events.includes('renderer-disposed'), false);
    assert.equal(events.some(event => event?.render), false);
  } finally { preparation.resolve(); await disposal; }
  assert.equal(events.includes('ready'), false);
  assert.equal(events.filter(event => event === 'renderer-disposed').length, 1);
});

test('disposal cancels scheduled rendering, clears captured gestures and blocks late events', async () => {
  const fixture = harness(), { instance, canvas, document, media, events, frames } = fixture;
  await instance.readyPromise;
  const staleFrame = frames.values().next().value;
  assert.equal(typeof staleFrame, 'function');
  const down = new Event('pointerdown');
  Object.assign(down, { pointerId: 9, pointerType: 'mouse', button: 0, clientX: 640, clientY: 360 });
  canvas.dispatchEvent(down);
  assert.equal(canvas.hasPointerCapture(9), true);
  const renders = events.filter(event => event?.render).length;
  await instance.dispose(); await instance.dispose();
  assert.equal(frames.size, 0);
  assert.equal(canvas.hasPointerCapture(9), false);
  assert.equal(instance.drag, null);
  staleFrame(performance.now() + 1000);
  canvas.dispatchEvent(down);
  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  document.dispatchEvent(new Event('visibilitychange'));
  media.dispatchEvent(new Event('change'));
  assert.equal(events.filter(event => event?.render).length, renders);
  assert.equal(events.filter(event => event?.unavailable).length, 0);
  assert.equal(events.filter(event => event === 'renderer-disposed').length, 1);
  assert.equal(events.filter(event => event === 'optics-disposed').length, 1);
  assert.equal(events.filter(event => event === 'content-disposed').length, 1);
  assert.equal(instance.drag, null);
});
