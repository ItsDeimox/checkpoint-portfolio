import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { ACESFilmicToneMapping, BoxGeometry, InstancedMesh, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, ShaderMaterial, SRGBColorSpace, Texture, WebGLRenderTarget } from 'three';
import { waitForAsset, yieldToBrowser, prepareRoomRenderer } from '../src/scene/room-startup.js';

test('asset waits abort without waiting for the download and remove the listener', async () => {
  const controller = new AbortController();
  let rejectDownload;
  const download = new Promise((resolve, reject) => { rejectDownload = reject; });
  const wait = waitForAsset(download, controller.signal);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 1);
  controller.abort();
  await assert.rejects(wait, { name: 'AbortError' });
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  rejectDownload(new Error('Late download failure'));
  await Promise.resolve();
});

test('asset success, failure and pre-aborted signals all clean up their listeners', async () => {
  const controller = new AbortController();
  assert.equal(await waitForAsset(Promise.resolve('asset'), controller.signal), 'asset');
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  await assert.rejects(waitForAsset(Promise.reject(new Error('network failed')), controller.signal), /network failed/);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  controller.abort();
  await assert.rejects(waitForAsset(Promise.reject(new Error('late rejection')), controller.signal), { name: 'AbortError' });
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

function fixture() {
  const scene = new Scene(), shared = new Texture(), calls = [];
  for (let i = 0; i < 9; i++) scene.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial({ map: shared })));
  const original = new WebGLRenderTarget(), linear = new WebGLRenderTarget(), sibling = new WebGLRenderTarget();
  let target = original;
  const renderer = {
    shadowMap: { enabled: true }, outputColorSpace: SRGBColorSpace, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1,
    getRenderTarget: () => target, getActiveCubeFace: () => 2, getActiveMipmapLevel: () => 1,
    setRenderTarget(value, face, mip) { target = value; calls.push({ type: 'target', value, face, mip }); },
    initRenderTarget(value) { calls.push({ type: 'init-target', value }); },
    initTexture(value) { calls.push({ type: 'texture', value }); },
    async compileAsync(subset, camera, fullScene) {
      const objects = []; subset.traverse(object => { if (object.material) objects.push(object); });
      calls.push({ type: 'compile', target, objects, fullScene });
    },
  };
  const view = {
    renderer, scene, camera: new PerspectiveCamera(), textures: [shared, shared],
    optics: {
      composer: { readBuffer: linear, writeBuffer: sibling, renderTarget1: linear, renderTarget2: sibling },
      lensPass: { material: new ShaderMaterial() },
      outputPass: { material: new ShaderMaterial(), uniforms: { toneMappingExposure: { value: 0 } } },
    },
  };
  return { view, calls, original, linear, shared };
}

test('yield is asynchronous and abort cancels pending scheduled work', async () => {
  let yielded = false;
  const next = yieldToBrowser().then(() => { yielded = true; });
  assert.equal(yielded, false);
  await next;
  assert.equal(yielded, true);
  const controller = new AbortController(), cancelled = yieldToBrowser(controller.signal);
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
});

test('startup deduplicates uploads, batches linear scene compilation and preserves parents/state', async () => {
  const { view, calls, original, linear, shared } = fixture();
  const objects = [...view.scene.children], progress = [];
  const result = await prepareRoomRenderer(view, { onProgress: event => progress.push(event) });
  assert.equal(result.textures, 1);
  assert.deepEqual(calls.filter(call => call.type === 'texture').map(call => call.value), [shared]);
  const world = calls.filter(call => call.type === 'compile' && call.fullScene === view.scene);
  assert.deepEqual(world.map(call => call.objects.length), [4, 4, 1]);
  assert.ok(world.every(call => call.target === linear));
  assert.ok(objects.every(object => object.parent === view.scene));
  assert.deepEqual(view.scene.children, objects);
  assert.equal(calls.filter(call => call.type === 'compile').at(-1).target, null);
  assert.deepEqual(view.optics.outputPass.material.defines, { SRGB_TRANSFER: '', ACES_FILMIC_TONE_MAPPING: '' });
  assert.equal(view.renderer.getRenderTarget(), original);
  assert.equal(view.renderer.shadowMap.enabled, true);
  assert.deepEqual(calls.at(-1), { type: 'target', value: original, face: 2, mip: 1 });
  assert.equal(progress.at(-1).stage, 'ready');
});

test('abort after a completed compile prevents later batches and restores renderer target', async () => {
  const { view, original, calls } = fixture(), controller = new AbortController();
  await assert.rejects(prepareRoomRenderer(view, {
    signal: controller.signal,
    onProgress(event) { if (event.stage === 'scene') controller.abort(); },
  }), { name: 'AbortError' });
  assert.equal(calls.filter(call => call.type === 'compile').length, 1);
  assert.equal(view.renderer.getRenderTarget(), original);
  assert.equal(view.renderer.shadowMap.enabled, true);
});

test('custom renderables are not cloned and shared-material variants are awaited separately', async () => {
  const { view, calls } = fixture();
  view.scene.clear();
  const material = new MeshBasicMaterial(), geometry = new BoxGeometry();
  const custom = new Mesh(geometry, material), instances = new InstancedMesh(geometry, material, 2);
  custom.clone = () => { throw new Error('Custom renderable must not be cloned'); };
  view.scene.add(custom, instances);
  await prepareRoomRenderer(view);
  const world = calls.filter(call => call.type === 'compile' && call.fullScene === view.scene);
  assert.deepEqual(world.map(call => call.objects.length), [1, 1]);
  assert.equal(world[1].objects[0].instanceMatrix, instances.instanceMatrix);
  assert.equal(custom.parent, view.scene);
  assert.equal(instances.parent, view.scene);
});

test('compilation failure restores a previously disabled shadow state and active target', async () => {
  const { view, original } = fixture();
  view.renderer.shadowMap.enabled = false;
  view.renderer.compileAsync = async () => { view.renderer.shadowMap.enabled = true; throw new Error('compile failure'); };
  await assert.rejects(prepareRoomRenderer(view), /compile failure/);
  assert.equal(view.renderer.getRenderTarget(), original);
  assert.equal(view.renderer.shadowMap.enabled, false);
});
