import {
  ACESFilmicToneMapping, AgXToneMapping, CineonToneMapping, ColorManagement,
  CustomToneMapping, Group, LinearToneMapping, Mesh, NeutralToneMapping,
  OrthographicCamera, PlaneGeometry, ReinhardToneMapping, Scene, SRGBTransfer,
} from 'three';

function abortReason(signal) {
  return signal?.reason ?? new DOMException('Room startup was cancelled.', 'AbortError');
}

function checkAbort(signal) {
  if (signal?.aborted) throw abortReason(signal);
}

/** Stop waiting for network assets on abort; never use for driver compilation. */
export function waitForAsset(promise, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (success, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', aborted);
      success ? resolve(value) : reject(value);
    };
    const aborted = () => finish(false, abortReason(signal));
    signal?.addEventListener('abort', aborted, { once: true });
    // Keep both handlers even if already aborted: a later download rejection
    // must still be handled. The loader owns cleanup of any late asset result.
    Promise.resolve(promise).then(value => finish(true, value), error => finish(false, error));
    if (signal?.aborted) aborted();
  });
}

/** Yield through a paint opportunity; the timer also works in hidden tabs. */
export function yieldToBrowser(signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(abortReason(signal)); return; }
    let frame = null, timer = null, finished = false;
    const finish = error => {
      if (finished) return;
      finished = true;
      if (frame !== null) globalThis.cancelAnimationFrame?.(frame);
      if (timer !== null) clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      error === undefined ? resolve() : reject(error);
    };
    const aborted = () => finish(abortReason(signal));
    signal?.addEventListener('abort', aborted, { once: true });
    if (typeof globalThis.requestAnimationFrame === 'function') {
      timer = setTimeout(() => finish(), 32);
      frame = globalThis.requestAnimationFrame(() => {
        clearTimeout(timer);
        timer = setTimeout(() => finish(), 0);
      });
    } else {
      timer = setTimeout(() => finish(), 0);
    }
  });
}

function materialList(object) {
  return (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean);
}

// A shared material can still need separate instancing, skinning or color variants.
function objectVariant(object) {
  const geometry = object.geometry;
  return [object.type, Boolean(object.isSkinnedMesh), Boolean(object.isInstancedMesh),
    Boolean(object.instanceColor), Boolean(object.morphTexture),
    ...Object.entries(geometry?.attributes ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([name, attribute]) => `${name}:${attribute.itemSize}`),
    ...Object.entries(geometry?.morphAttributes ?? {}).map(([name, attributes]) => `${name}:${attributes.length}`),
  ].join('|');
}

function sceneRepresentatives(scene) {
  const seen = new Map(), representatives = [], materials = new Set();
  scene.traverse(object => {
    if (!(object.isMesh || object.isPoints || object.isLine || object.isSprite)) return;
    for (const material of materialList(object)) {
      materials.add(material);
      const variants = seen.get(material) ?? new Set(), variant = objectVariant(object);
      if (variants.has(variant)) continue;
      variants.add(variant); seen.set(material, variants);
      representatives.push({ object, material });
    }
  });
  return { representatives, materials };
}

function sourceTextures(view, materials) {
  const textures = new Set(), visited = new WeakSet();
  const collect = value => {
    if (!value || typeof value !== 'object') return;
    if (value.isTexture) {
      // Attachment storage belongs to initRenderTarget, not initTexture.
      if (!value.isRenderTargetTexture && !value.isDepthTexture) textures.add(value);
      return;
    }
    if (visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) value.forEach(collect);
    else if (Object.getPrototypeOf(value) === Object.prototype) Object.values(value).forEach(collect);
  };
  for (const texture of view.textures ?? []) collect(texture);
  collect(view.scene.background); collect(view.scene.environment);
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) collect(value);
    for (const uniform of Object.values(material.uniforms ?? {})) collect(uniform.value);
  }
  return [...textures];
}

function prepareOutputDefines(pass, renderer) {
  // Mirrors OutputPass r180's public material setup without calling render() or
  // writing its private cache fields. Its first render can reuse this program.
  const defines = {};
  if (ColorManagement.getTransfer(renderer.outputColorSpace) === SRGBTransfer) defines.SRGB_TRANSFER = '';
  const toneDefines = new Map([
    [LinearToneMapping, 'LINEAR_TONE_MAPPING'], [ReinhardToneMapping, 'REINHARD_TONE_MAPPING'],
    [CineonToneMapping, 'CINEON_TONE_MAPPING'], [ACESFilmicToneMapping, 'ACES_FILMIC_TONE_MAPPING'],
    [AgXToneMapping, 'AGX_TONE_MAPPING'], [NeutralToneMapping, 'NEUTRAL_TONE_MAPPING'],
    [CustomToneMapping, 'CUSTOM_TONE_MAPPING'],
  ]);
  const toneDefine = toneDefines.get(renderer.toneMapping);
  if (toneDefine) defines[toneDefine] = '';
  pass.material.defines = defines;
  pass.material.needsUpdate = true;
  if (pass.uniforms?.toneMappingExposure) pass.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
}

/**
 * Call after final startup lighting, PMREM, geometry and viewport setup, before
 * starting the interactive loop. Serialize renderer use until this resolves.
 * onProgress receives {stage, completed, total}; no frames are rendered here.
 * compileAsync itself cannot be cancelled: abort stops the next batch after
 * the in-flight driver compilation settles. Await this before renderer disposal.
 */
export async function prepareRoomRenderer(view, { signal, onProgress } = {}) {
  checkAbort(signal);
  const { renderer, scene, camera, optics } = view;
  const linearTarget = optics?.composer?.readBuffer;
  if (!linearTarget) throw new Error('Room startup requires the composer’s scene-linear readBuffer.');
  const sceneTarget = optics.sceneTarget ?? linearTarget;
  const oldTarget = renderer.getRenderTarget();
  const oldFace = renderer.getActiveCubeFace?.() ?? 0;
  const oldMip = renderer.getActiveMipmapLevel?.() ?? 0;
  const oldShadows = renderer.shadowMap.enabled;
  const fullscreenGeometry = new PlaneGeometry(2, 2);
  const screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const screenScene = new Scene();
  const report = (stage, completed, total) => { checkAbort(signal); onProgress?.({ stage, completed, total }); };
  const { representatives, materials } = sceneRepresentatives(scene);
  const bloom = optics.bloomPass;
  const opticalMaterials = [...new Set([
    optics.lensPass?.material, bloom?.brightMaterial, bloom?.blurMaterial,
    bloom?.streakMaterial, bloom?.combineMaterial, optics.gradePass?.material,
  ].filter(Boolean))];
  opticalMaterials.forEach(material => materials.add(material));
  if (optics.outputPass?.material) materials.add(optics.outputPass.material);
  if (optics.aaPass?.material) materials.add(optics.aaPass.material);
  const textures = sourceTextures(view, materials);
  const targets = [...new Set([
    sceneTarget,
    optics.composer.readBuffer, optics.composer.writeBuffer,
    optics.composer.renderTarget1, optics.composer.renderTarget2,
    ...(bloom?.targets ?? []), optics.turntableMotion?.target, view.ground?.getRenderTarget?.(),
  ].filter(Boolean))];
  let compiled = 0;
  try {
    await yieldToBrowser(signal);
    for (let i = 0; i < targets.length; i++) {
      checkAbort(signal);
      renderer.initRenderTarget(targets[i]);
      report('targets', i + 1, targets.length);
      await yieldToBrowser(signal);
    }
    for (let i = 0; i < textures.length; i += 2) {
      checkAbort(signal);
      textures.slice(i, i + 2).forEach(texture => renderer.initTexture(texture));
      report('textures', Math.min(i + 2, textures.length), textures.length);
      await yieldToBrowser(signal);
    }
    const pending = [...representatives];
    while (pending.length) {
      checkAbort(signal);
      const group = new Group(), batch = [], batchMaterials = new Set();
      for (let i = 0; i < pending.length && batch.length < 4;) {
        // compileAsync waits on the current program for each material. Keep
        // different variants of one material in separate awaited batches.
        if (batchMaterials.has(pending[i].material)) { i++; continue; }
        const representative = pending.splice(i, 1)[0];
        batch.push(representative); batchMaterials.add(representative.material);
      }
      for (const { object, material } of batch) {
        // A traversal-only facade retains all public geometry/skin/instance
        // features without invoking custom constructors (e.g. Reflector),
        // duplicating instance buffers or reparenting live scene objects.
        const proxy = Object.create(object);
        proxy.children = [];
        proxy.material = material;
        group.children.push(proxy);
      }
      renderer.setRenderTarget(sceneTarget);
      await renderer.compileAsync(group, camera, scene);
      group.children.length = 0;
      compiled += batch.length;
      report('scene', compiled, representatives.length);
      await yieldToBrowser(signal);
    }
    for (let i = 0; i < opticalMaterials.length; i += 4) {
      checkAbort(signal);
      const group = new Group();
      for (const material of opticalMaterials.slice(i, i + 4)) group.add(new Mesh(fullscreenGeometry, material));
      renderer.setRenderTarget(linearTarget);
      await renderer.compileAsync(group, screenCamera, screenScene);
      group.clear();
      report('optics', Math.min(i + 4, opticalMaterials.length), opticalMaterials.length);
      await yieldToBrowser(signal);
    }
    if (optics.turntableMotion) {
      checkAbort(signal); renderer.setRenderTarget(optics.turntableMotion.target);
      optics.turntableMotion.prepare(camera.projectionMatrix,0);
      await renderer.compileAsync(optics.turntableMotion.scene,camera,optics.turntableMotion.scene);
      await yieldToBrowser(signal);
    }
    if (optics.outputPass?.material) {
      checkAbort(signal);
      prepareOutputDefines(optics.outputPass, renderer);
      const output = new Mesh(fullscreenGeometry, optics.outputPass.material);
      // The output shader writes tone-mapped sRGB into the intermediate color
      // buffer when AA follows it. Match that domain during precompilation.
      renderer.setRenderTarget(optics.aaPass?.material ? optics.composer.writeBuffer : null);
      await renderer.compileAsync(output, screenCamera, screenScene);
      report('output', 1, 1);
      await yieldToBrowser(signal);
    }
    if (optics.aaPass?.material) {
      checkAbort(signal);
      const antialias = new Mesh(fullscreenGeometry, optics.aaPass.material);
      renderer.setRenderTarget(null);
      await renderer.compileAsync(antialias, screenCamera, screenScene);
      report('antialias', 1, 1);
      await yieldToBrowser(signal);
    }
    report('ready', 1, 1);
    return {
      textures: textures.length, targets: targets.length, sceneVariants: compiled,
      opticalMaterials: opticalMaterials.length + Number(Boolean(optics.outputPass?.material)) + Number(Boolean(optics.aaPass?.material)),
    };
  } finally {
    fullscreenGeometry.dispose();
    renderer.shadowMap.enabled = oldShadows;
    renderer.setRenderTarget(oldTarget, oldFace, oldMip);
  }
}
