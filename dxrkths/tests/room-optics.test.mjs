import test from 'node:test';
import assert from 'node:assert/strict';
import { ACESFilmicToneMapping, Color, HalfFloatType, PerspectiveCamera, Quaternion, Scene, SRGBColorSpace, UnsignedByteType, Vector3 } from 'three';
import { RoomOptics } from '../src/scene/room-optics.js';
import { renderBudget } from '../src/scene/room-core.js';
import { RoomCamera } from '../src/scene/room-camera.js';
import { createFixedPanelLayout } from '../src/scene/room-environment.js';

// GPU transport is unavailable in Node. Keep the actual Three passes, targets,
// camera math and uniforms, and record the calls that would reach WebGL.
function fixture({ hdr = true, samples = [4, 2], depthSamples = samples, maxSamples = 8 } = {}) {
  const draws = [], probes = [];
  const gl = {
    RENDERBUFFER: 0x8d41, RGBA16F: 0x881a, RGBA8: 0x8058, DEPTH_COMPONENT24: 0x81a6, SAMPLES: 0x80a9,
    getInternalformatParameter(target, format, pname) {
      assert.equal(target, this.RENDERBUFFER);
      assert.equal(pname, this.SAMPLES);
      assert.ok([this.RGBA16F, this.RGBA8, this.DEPTH_COMPONENT24].includes(format));
      probes.push(format);
      return Int32Array.from(format === this.DEPTH_COMPONENT24 ? depthSamples : samples);
    },
  };
  let target = null, clearAlpha = 1;
  const clearColor = new Color(0);
  const renderer = {
    extensions: { has: name => name === 'EXT_color_buffer_float' && hdr },
    capabilities: { maxSamples, reversedDepthBuffer: false },
    outputColorSpace: SRGBColorSpace, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1,
    autoClear: true, autoClearColor: true, autoClearDepth: true, autoClearStencil: false,
    getContext: () => gl, getPixelRatio: () => 1, getSize: value => value.set(1280, 720),
    getRenderTarget: () => target,
    setRenderTarget(value) { target = value; },
    getClearColor(value) { return value.copy(clearColor); },
    getClearAlpha() { return clearAlpha; },
    setClearColor(value, alpha) { clearColor.set(value); if (alpha !== undefined) clearAlpha = alpha; },
    clear() {},
    render(object) {
      const material = object.material;
      draws.push({
        object, material, target,
        input: material?.uniforms?.tDiffuse?.value,
        depth: material?.uniforms?.tSceneDepth?.value,
      });
    },
  };
  const scene = new Scene(), camera = new PerspectiveCamera(42, 1280 / 720, .08, 100);
  camera.position.set(0, 4, 16);
  camera.lookAt(0, 3, 0);
  const optics = new RoomOptics(renderer, scene, camera);
  return { optics, renderer, camera, scene, gl, draws, probes };
}

test('scene geometry uses the multisample depth target and the lens consumes its resolved color directly', () => {
  const { optics, renderer, scene, draws } = fixture();
  try {
    assert.ok(optics.sceneTarget, 'Scene needs its own AA target');
    assert.equal(optics.sceneTarget.samples, 2);
    assert.equal(optics.sceneTarget.resolveDepthBuffer, true);
    assert.ok(optics.sceneTarget.depthTexture?.isDepthTexture);
    for (const target of [optics.composer.renderTarget1, optics.composer.renderTarget2]) {
      assert.equal(target.samples, 0);
      assert.equal(target.depthBuffer, false);
      assert.equal(target.depthTexture, null);
    }
    optics.render(1 / 60);
    assert.equal(draws.filter(draw => draw.object === scene).length, 1);
    assert.equal(draws[0].target, optics.sceneTarget);
    const lens = draws.find(draw => draw.material === optics.lensPass.material);
    assert.equal(lens.input, optics.sceneTarget.texture);
    assert.equal(lens.depth, optics.sceneTarget.depthTexture);
    assert.notEqual(lens.target, optics.sceneTarget);
    assert.ok(draws.every(draw => !draw.input || draw.input !== draw.target?.texture));
    const output = draws.find(draw => draw.material === optics.outputPass.material);
    const aa = draws.find(draw => draw.material === optics.aaPass.material);
    assert.equal(aa.input, output.target.texture, 'Final AA must consume tone-mapped sRGB output');
    assert.equal(aa.target, null);
    assert.equal(draws.at(-1), aa);
    assert.equal(renderer.autoClear, true);
    assert.equal(renderer.getRenderTarget(), null);
  } finally { optics.dispose(); }
});

test('quality caps actual format-compatible MSAA samples and keeps postprocess targets single-sampled', () => {
  const { optics, probes, gl } = fixture({ samples: [8, 4, 2], depthSamples: [4, 2], maxSamples: 8 });
  try {
    assert.ok(optics.sceneTarget);
    for (const [quality, expected] of [['low', 0], ['auto', 2], ['high', 4]]) {
      optics.setQuality(quality);
      assert.equal(optics.sceneTarget.samples, expected);
      assert.equal(optics.composer.renderTarget1.samples, 0);
      assert.equal(optics.composer.renderTarget2.samples, 0);
    }
    assert.ok(probes.includes(gl.RGBA16F));
    assert.ok(probes.includes(gl.DEPTH_COMPONENT24));
  } finally { optics.dispose(); }
});

test('unsupported HDR sample counts retain HDR with FXAA, and the byte fallback queries RGBA8', () => {
  const limited = fixture({ samples: [4], depthSamples: [4] });
  const byte = fixture({ hdr: false, samples: [4, 2], maxSamples: 2 });
  try {
    assert.ok(limited.optics.sceneTarget);
    assert.equal(limited.optics.sceneTarget.samples, 0, 'Auto must not silently allocate four samples for a two-sample budget');
    assert.equal(limited.optics.sceneTarget.texture.type, HalfFloatType);
    assert.equal(limited.optics.aaPass.enabled, true);
    limited.optics.setQuality('high');
    assert.equal(limited.optics.sceneTarget.samples, 4);
    byte.optics.setQuality('high');
    assert.equal(byte.optics.sceneTarget.samples, 2);
    assert.equal(byte.optics.sceneTarget.texture.type, UnsignedByteType);
    assert.ok(byte.probes.includes(byte.gl.RGBA8));
    assert.ok(!byte.probes.includes(byte.gl.RGBA16F));
  } finally { limited.optics.dispose(); byte.optics.dispose(); }
});

test('all viewport profiles keep scene, AA and bloom inside the existing pixel budgets', () => {
  const { optics } = fixture();
  try {
    assert.ok(optics.sceneTarget);
    for (const [quality, bloomEdge] of [['low', 384], ['auto', 512], ['high', 768]]) {
      optics.setQuality(quality);
      for (const [width, height, dpr] of [[5120, 2160, 2], [390, 844, 3], [1672, 941, 1]]) {
        const budget = renderBudget(width, height, dpr, quality);
        optics.resize(width, height, dpr);
        for (const target of [optics.sceneTarget, optics.composer.renderTarget1, optics.composer.renderTarget2]) {
          assert.ok(target.width * target.height <= budget.maxPixels);
          assert.equal(target.width, budget.width);
          assert.equal(target.height, budget.height);
        }
        for (const target of optics.bloomPass.targets) assert.ok(Math.max(target.width, target.height) <= bloomEdge);
        assert.equal(optics.aaPass.uniforms.resolution.value.x, 1 / budget.width);
        assert.equal(optics.aaPass.uniforms.resolution.value.y, 1 / budget.height);
      }
    }
  } finally { optics.dispose(); }
});

test('camera motion is bounded and disappears immediately for stationary, paused and discontinuous frames', () => {
  const { optics, camera } = fixture();
  const render = (delta = 1 / 60, options = {}) => { optics.render(delta, options); return optics.lensPass.uniforms.uShutter.value; };
  try {
    assert.equal(render(), 0);
    camera.position.x += .01;
    assert.ok(render() > 0);
    assert.equal(render(), 0);
    assert.deepEqual(optics.lensPass.uniforms.uPreviousViewProjection.value.elements, optics.currentViewProjection.elements);
    camera.position.x += .01;
    assert.equal(render(1 / 60, { paused: true }), 0);
    camera.position.x += .01;
    assert.equal(render(), 0, 'Resuming must not blur a stale paused frame');
    camera.position.x += .01;
    assert.equal(render(.3), 0);
    camera.position.x += 20;
    assert.equal(render(), 0);
    assert.ok(optics.lensPass.uniforms.uMotionLimit.value <= 8 * optics.pixelRatio);
  } finally { optics.dispose(); }
});

test('projection, resize and quality changes reset motion reprojection history', () => {
  const { optics, camera } = fixture();
  try {
    optics.render(1 / 60);
    camera.fov += .1;
    camera.updateProjectionMatrix();
    optics.render(1 / 60);
    assert.equal(optics.lensPass.uniforms.uShutter.value, 0, 'A focal-length change is not camera velocity');
    camera.position.x += .01;
    optics.render(1 / 60);
    assert.ok(optics.lensPass.uniforms.uShutter.value > 0);
    optics.resize(1280, 720, 1);
    camera.position.x += .01;
    optics.render(1 / 60);
    assert.equal(optics.lensPass.uniforms.uShutter.value, 0);
    optics.setQuality('high');
    camera.position.x += .01;
    optics.render(1 / 60);
    assert.equal(optics.lensPass.uniforms.uShutter.value, 0);
  } finally { optics.dispose(); }
});

test('focus stays on the supplied panel plane and invalid inputs never put NaN into optical uniforms', () => {
  const { optics, camera } = fixture();
  try {
    optics.render(1 / 60, { focusDistance: 12.5 });
    assert.equal(optics.lensPass.uniforms.uFocusDistance.value, 12.5);
    const planePoint = new Vector3(0, 0, -12.5);
    const projected = planePoint.clone().applyMatrix4(camera.projectionMatrix);
    const recovered = projected.applyMatrix4(optics.lensPass.uniforms.uInverseProjection.value);
    assert.ok(Math.abs(-recovered.z - 12.5) < 1e-10);
    for (const value of [NaN, Infinity, -Infinity, undefined]) {
      optics.resize(value, value, value);
      camera.position.x += .01;
      optics.render(value, { time: value, motion: value, focusDistance: value });
      for (const uniforms of [optics.lensPass.uniforms, optics.gradePass.uniforms, optics.aaPass.uniforms]) {
        for (const uniform of Object.values(uniforms)) {
          if (typeof uniform.value === 'number') assert.ok(Number.isFinite(uniform.value));
          if (uniform.value?.isVector2) assert.ok(Number.isFinite(uniform.value.x) && Number.isFinite(uniform.value.y));
          if (uniform.value?.isMatrix4) assert.ok(uniform.value.elements.every(Number.isFinite));
        }
      }
      assert.equal(optics.lensPass.uniforms.uShutter.value, 0);
    }
  } finally { optics.dispose(); }
});

test('tuning uses bounded uniforms, exact effect-off values and never reallocates targets', () => {
  const { optics, renderer, camera } = fixture();
  try {
    assert.equal(typeof optics.setVisualSettings, 'function');
    const targets = [optics.sceneTarget, optics.composer.renderTarget1, optics.composer.renderTarget2, ...optics.bloomPass.targets];
    let disposals = 0;
    targets.forEach(target => target.addEventListener('dispose', () => disposals++));
    optics.setVisualSettings({ exposure: 1.2, bloom: 0, depthOfField: 0, motionBlur: 0, lens: 0, sharpness: .2, contrast: 1.1 });
    optics.render(1 / 60);
    camera.position.x += .01;
    optics.render(1 / 60);
    assert.equal(renderer.toneMappingExposure, 1.2);
    assert.equal(optics.lensPass.uniforms.uCocScale.value, 0);
    assert.equal(optics.lensPass.uniforms.uShutter.value, 0);
    assert.equal(optics.gradePass.uniforms.uBloomStrength.value, 0);
    assert.equal(optics.gradePass.uniforms.uLensStrength.value, 0);
    assert.equal(optics.gradePass.uniforms.uSharpness.value, .2);
    assert.equal(optics.gradePass.uniforms.uContrast.value, 1.1);
    assert.equal(disposals, 0);
    const result = optics.setVisualSettings({ bloom: .4 });
    assert.equal(result.exposure, 1.2);
    assert.equal(result.depthOfField, 0);
  } finally { optics.dispose(); }
});

test('dispose releases the independent scene target once as well as every composer pass', () => {
  const { optics } = fixture();
  assert.ok(optics.sceneTarget);
  let sceneDisposals = 0, aaDisposals = 0;
  optics.sceneTarget.addEventListener('dispose', () => sceneDisposals++);
  optics.aaPass.material.addEventListener('dispose', () => aaDisposals++);
  optics.dispose();
  optics.dispose();
  assert.equal(sceneDisposals, 1);
  assert.equal(aaDisposals, 1);
});

test('authorized camera approaches and returns retain bounded motion blur across all panels, viewports and frame rates', () => {
  const panels = createFixedPanelLayout();
  for (const fps of [24, 60, 144]) {
    for (const [width, height] of [[1672, 941], [390, 844], [3840, 1080], [320, 960]]) {
      for (const panel of panels) {
        const { optics, camera, draws } = fixture();
        try {
          camera.aspect = width / height; camera.updateProjectionMatrix();
          const rig = new RoomCamera(camera, width);
          optics.resize(width, height, 1);
          const dt = 1 / fps;
          optics.render(dt, { focusDistance: rig.focusDistance });
          for (const phase of ['approach', 'return']) {
            if (phase === 'approach') rig.approach(panel); else rig.reset();
            let activeFrames = 0, blurredFrames = 0;
            for (let frame = 0; frame < fps * 2 && rig.transition; frame++) {
              const position = camera.position.clone(), rotation = camera.quaternion.clone();
              rig.update(dt);
              const projectionAnimated = rig.mode === 'approaching' || rig.mode === 'returning';
              draws.length = 0;
              optics.render(dt, { projectionAnimated, motion: .5, focusDistance: rig.focusDistance });
              const shutter = optics.lensPass.uniforms.uShutter.value;
              assert.ok(shutter >= 0 && shutter <= .65);
              if (projectionAnimated && (position.distanceTo(camera.position) > .000001 || rotation.angleTo(camera.quaternion) > .000001)) {
                activeFrames++;
                if (shutter > 0) blurredFrames++;
              }
            }
            assert.ok(activeFrames > fps * .9, `${phase} must exercise a full path`);
            assert.equal(blurredFrames, activeFrames,
              `${width}x${height} panel ${panel.index} ${phase} at ${fps} Hz lost blur during smooth FOV travel`);
            optics.render(dt, { focusDistance: rig.focusDistance });
            assert.equal(optics.lensPass.uniforms.uShutter.value, 0, 'Settled screen content has no residual blur');
          }
        } finally { optics.dispose(); }
      }
    }
  }
});

test('animated projection permission accepts smooth isotropic FOV only and rejects aspect, clip, offset and lens jumps', () => {
  const { optics, camera } = fixture();
  const render = options => { optics.render(1 / 60, { projectionAnimated: true, ...options }); return optics.lensPass.uniforms.uShutter.value; };
  try {
    render();
    camera.fov += .1; camera.updateProjectionMatrix();
    assert.ok(render() > 0, 'A small explicitly animated FOV change must remain reprojectable');
    for (const mutate of [
      () => { camera.aspect *= 1.1; },
      () => { camera.aspect += .000000001; },
      () => { camera.near *= 1.05; },
      () => { camera.near += .000000001; },
      () => { camera.far *= .9; },
      () => { camera.far += .001; },
      () => { camera.zoom += .01; },
      () => { camera.filmOffset += .001; },
      () => { camera.setViewOffset(1280, 720, 20, 0, 1260, 720); },
      () => { camera.fov += 20; },
    ]) {
      camera.position.x += .01; mutate(); camera.updateProjectionMatrix();
      assert.equal(render(), 0);
    }
    camera.clearViewOffset(); camera.updateProjectionMatrix(); render();
    camera.fov += .1; camera.updateProjectionMatrix();
    assert.equal(render({ projectionAnimated: false }), 0, 'External FOV changes are not authorized animation');
    camera.fov += .1; camera.updateProjectionMatrix();
    assert.equal(render({ projectionAnimated: 'true' }), 0, 'Permission requires the explicit boolean');
  } finally { optics.dispose(); }
});

test('animated travel permission does not bypass pause, resize, quality, camera-cut or invalid-delta resets', () => {
  const { optics, camera } = fixture();
  const render = (dt = 1 / 60, options = {}) => {
    optics.render(dt, { projectionAnimated: true, ...options });
    return optics.lensPass.uniforms.uShutter.value;
  };
  const move = () => { camera.position.x += .01; camera.fov += .05; camera.updateProjectionMatrix(); };
  try {
    render(); move(); assert.ok(render() > 0);
    move(); assert.equal(render(1 / 60, { paused: true }), 0);
    move(); assert.equal(render(), 0);
    move(); assert.ok(render() > 0);
    optics.resize(1280, 720, 1); move(); assert.equal(render(), 0);
    optics.setQuality('high'); move(); assert.equal(render(), 0);
    move(); assert.ok(render() > 0);
    camera.position.x += 20; assert.equal(render(), 0);
    camera.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2));
    assert.equal(render(), 0);
    move(); assert.equal(render(.3), 0);
    move(); assert.equal(render(NaN), 0);
    move(); assert.equal(render(), 0, 'An invalid prior frame is not used as history');
    move(); assert.ok(render() > 0);
    move(); assert.equal(render(1 / 60, { projectionAnimated: false }), 0, 'Animation completion discards the last motion sample');
    assert.equal(render(), 0, 'Stationary authorized frames are still sharp');
  } finally { optics.dispose(); }
});

test('bloom contains six decreasing scales within the existing resolution budget', () => {
 const {optics}=fixture();try{optics.setQuality('high');optics.resize(1920,1080,1);
 assert.equal(optics.bloomPass.levels?.length,6);
 for(let i=1;i<6;i++)assert.ok(optics.bloomPass.levels[i].vertical.width<optics.bloomPass.levels[i-1].vertical.width);
 assert.ok(optics.bloomPass.levels.every(level=>level.vertical.width<=768));
 assert.equal(optics.lensPass.uniforms.uSamples.value,32);
 }finally{optics.dispose();}
});

test('turntable velocity uses object history without smearing the stationary room', () => {
 const {optics}=fixture();
 const pass=optics.attachTurntable(new Scene());
 try{
  optics.render(1/60,{turntableDelta:0});
  optics.render(1/60,{turntableDelta:.02});
  assert.equal(pass.enabled,true);
  assert.equal(optics.lensPass.uniforms.uObjectMotion.value,1);
  assert.ok(optics.lensPass.uniforms.uShutter.value>0);
  const pivot=new Vector3(0,0,1.458534911).applyMatrix4(pass.previousTransform);
  assert.ok(pivot.distanceTo(new Vector3(0,0,1.458534911))<1e-8);
  optics.render(1/60,{turntableDelta:0});assert.equal(pass.enabled,false);
  optics.render(1/60,{turntableDelta:.02,paused:true});
  assert.equal(pass.enabled,false);assert.equal(optics.lensPass.uniforms.uShutter.value,0);
 }finally{optics.dispose();}
});
test('gentle pointer-look rotation receives camera motion blur without a panel approach', () => {
 const {optics,camera}=fixture();try{
  optics.render(1/60,{motion:0});camera.rotation.y+=.004;
  optics.render(1/60,{motion:.65,projectionAnimated:false});
  assert.ok(optics.lensPass.uniforms.uShutter.value>0);
  assert.equal(optics.lensPass.uniforms.uObjectMotion.value,0);
 }finally{optics.dispose();}
});
