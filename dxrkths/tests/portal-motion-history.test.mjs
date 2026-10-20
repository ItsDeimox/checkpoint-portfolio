import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {HeroScene} from '../src/scene/room-portal-scene.js';
import {BannerPortal, PORTAL_APPROACH_SECONDS, PORTAL_FLIGHT_SECONDS} from '../src/scene/room-portal.js';
import {RoomCamera} from '../src/scene/room-camera.js';
import {RoomOptics} from '../src/scene/room-optics.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';

// Exercise the real scene/controller/optics contract. Only GPU transport is
// replaced: Node cannot submit WebGL, but camera history and pass uniforms run.
function fixture(width = 1280, height = 720) {
  let target = null, clearAlpha = 1;
  const clearColor = new T.Color();
  const renderer = {
    extensions: {has: name => name === 'EXT_color_buffer_float'},
    capabilities: {maxSamples: 0, reversedDepthBuffer: false},
    outputColorSpace: T.SRGBColorSpace, toneMapping: T.ACESFilmicToneMapping, toneMappingExposure: 1,
    autoClear: true, autoClearColor: true, autoClearDepth: true, autoClearStencil: false,
    info: {reset() {}}, shadowMap: {enabled: true, needsUpdate: false},
    getContext: () => ({}), getPixelRatio: () => 1, getSize: value => value.set(width, height),
    getRenderTarget: () => target, setRenderTarget(value) {target = value;},
    getClearColor: value => value.copy(clearColor), getClearAlpha: () => clearAlpha,
    setClearColor(value, alpha) {clearColor.set(value); if (alpha !== undefined) clearAlpha = alpha;},
    clear() {}, render() {},
  };
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(42, width / height, .08, 100);
  const cameraRig = new RoomCamera(camera, width);
  const panels = createFixedPanelLayout().map(panel => ({...panel, material: new T.ShaderMaterial({
    uniforms: {artwork: {value: null}, projection: {value: new T.Matrix3()}},
    fragmentShader: 'void main(){vec2 p=vec2(0.);vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}',
  })}));
  const optics = new RoomOptics(renderer, scene, camera);
  optics.setQuality('high');
  const view = Object.create(HeroScene.prototype);
  Object.assign(view, {
    renderer, scene, camera, cameraRig, panels, optics, width, height,
    ready: true, frames: 0, time: 0, settings: {quality: 'high', paused: false},
    reduced: {matches: false}, screenLight: new T.PointLight(),
    release() {}, clearHover() {}, hidePanelContent() {}, wake() {},
  });
  view.bannerPortal = new BannerPortal(view);
  return view;
}

function draw(view, dt) {
  const position = view.camera.position.toArray(), rotation = view.camera.quaternion.toArray(), fov = view.camera.fov;
  view.render(dt, .65);
  assert.deepEqual(view.camera.position.toArray(), position, 'Optical history cannot alter the camera path');
  assert.deepEqual(view.camera.quaternion.toArray(), rotation, 'Optical history cannot alter the camera orientation');
  assert.equal(view.camera.fov, fov, 'Optical history cannot alter the authored zoom');
  return view.optics.lensPass.uniforms.uShutter.value;
}

function advance(view, duration, dt = 1 / 60) {
  for (let elapsed = 0; elapsed < duration - 1e-9;) {
    const step = Math.min(dt, duration - elapsed);
    view.cameraRig.update(step);
    draw(view, step);
    elapsed += step;
  }
}

function dispose(view) {
  view.optics.dispose();
  view.bannerPortal.dispose();
  for (const panel of view.panels) panel.material.dispose();
}

test('actual portal entry and retreat retain camera motion blur across every doorway without changing the camera', () => {
  for (const [width, height, hz] of [[1280, 720, 60], [390, 844, 30], [3440, 1440, 144]]) {
    for (let index = 0; index < 5; index++) {
      const view = fixture(width, height), dt = 1 / hz, portal = view.bannerPortal;
      try {
        // Outer doorways also have to admit the approved pointer-look starting pose.
        view.cameraRig.pointLook(index < 2 ? 1 : -1, -1);
        advance(view, 3, dt);
        const home = {position: view.camera.position.clone(), rotation: view.camera.quaternion.clone(), fov: view.camera.fov};
        assert.equal(portal.enter(index), true);
        for (const direction of ['entry', 'retreat']) {
          if (direction === 'retreat') assert.equal(portal.returnToShowroom(index), true);
          let checked = 0;
          for (let frame = 0; portal.active && frame < Math.ceil((PORTAL_APPROACH_SECONDS + PORTAL_FLIGHT_SECONDS) * hz) + 2; frame++) {
            view.cameraRig.update(dt);
            const shutter = draw(view, dt);
            if (portal.active && portal.stage === 'approach' && portal.age > .2 && portal.age < .85) {
              assert.ok(shutter > 0, `${width}x${height}/${hz}Hz panel ${index} ${direction}, age ${portal.age.toFixed(3)} lost continuous camera motion`);
              assert.ok(shutter <= .65, 'Portal authorization retains the bounded shutter');
              checked++;
            }
          }
          assert.ok(checked >= 10, `${direction} must exercise the moving approach, including its peak rotation`);
          assert.equal(portal.active, false, `${direction} completes on the authored clock`);
        }
        assert.ok(view.camera.position.distanceTo(home.position) < 1e-7);
        assert.ok(view.camera.quaternion.angleTo(home.rotation) < 1e-7);
        assert.ok(Math.abs(view.camera.fov - home.fov) < 1e-6, 'Return preserves the rig lens precision');
      } finally {dispose(view);}
    }
  }
});

test('portal motion authorization still rejects a camera cut, a stalled draw and a paused frame', () => {
  for (const disruption of ['cut', 'stall', 'pause']) {
    const view = fixture();
    try {
      view.bannerPortal.enter(0);
      advance(view, .25);
      assert.ok(view.optics.lensPass.uniforms.uShutter.value > 0);
      if (disruption === 'cut') {
        view.camera.position.x += 20;
        assert.equal(draw(view, 1 / 60), 0);
      } else if (disruption === 'stall') {
        view.cameraRig.update(.3);
        assert.equal(draw(view, .3), 0);
      } else {
        view.settings.paused = true;
        view.cameraRig.update(1 / 60);
        assert.equal(draw(view, 1 / 60), 0);
      }
    } finally {dispose(view);}
  }
});

test('leaving a portal restores the ordinary camera cut and external zoom guards', () => {
  const view = fixture();
  try {
    view.bannerPortal.enter(4);
    advance(view, .3);
    assert.ok(view.optics.lensPass.uniforms.uShutter.value > 0);
    view.bannerPortal.cancel();
    assert.equal(draw(view, 1 / 60), 0, 'Cancellation drops portal history');
    view.camera.rotation.y += .048; // 2.88 rad/s is outside the ordinary camera envelope.
    assert.equal(draw(view, 1 / 60), 0, 'The portal rotation envelope cannot leak into the overview');
    view.camera.position.x += .78; // 46.8 units/s is outside the ordinary camera envelope.
    assert.equal(draw(view, 1 / 60), 0, 'The portal translation envelope cannot leak into the overview');
    view.camera.fov += .1;
    view.camera.updateProjectionMatrix();
    assert.equal(draw(view, 1 / 60), 0, 'An external overview zoom is not portal lens animation');
  } finally {dispose(view);}
});
