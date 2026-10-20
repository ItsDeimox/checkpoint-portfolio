import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {BannerPortal, PORTAL_APPROACH_SECONDS as A, PORTAL_FLIGHT_SECONDS as F} from '../src/scene/room-portal.js';
import {RoomCamera} from '../src/scene/room-camera.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {SectionRoutes} from '../src/ui/room-section-routes.js';
import {arrivalTransform, arrivalClip} from '../src/ui/portal-arrival.js';

function fixture() {
  const width = 1280, height = 720;
  const camera = new T.PerspectiveCamera(42, width / height, .08, 100), cameraRig = new RoomCamera(camera, width);
  const panels = createFixedPanelLayout().map(panel => ({...panel, material: new T.ShaderMaterial({
    uniforms: {artwork: {value: null}, projection: {value: new T.Matrix3()}},
    fragmentShader: 'void main(){vec2 p=vec2(0.);vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}',
  })}));
  const optics = {
    bloomPass: 'bloom', composer: {passes: ['bloom'], insertPass(pass, index) {this.passes.splice(index, 0, pass);}},
    resetHistory() {},
  };
  const view = {
    camera, cameraRig, panels, optics, width, height, scene: new T.Scene(), ready: true,
    settings: {quality: 'high'}, reduced: {matches: false},
    release() {}, clearHover() {}, hidePanelContent() {}, wake() {},
  };
  const portal = new BannerPortal(view), events = [], surfaceUpdates = [];
  const page = {style: {setProperty(name, value) {this[name] = value;}}};
  // Use the real route presentation callback, without creating a browser DOM.
  const routes = Object.create(SectionRoutes.prototype);
  Object.assign(routes, {
    root: page, token: 1, arrival: {index: 0, viewport: {width, height, contentWidth: width}},
    pageSurface: {update(value) {surfaceUpdates.push(value);}},
  });
  return {
    view, portal, events, page, surfaceUpdates, routes,
    start(direction, index = 0, onComplete = () => events.push({done: true})) {
      routes.arrival.index = index;
      const progress = (value, frame) => {
        events.push({progress: value, frame, index});
        routes.revealArrival(index, routes.token, value, frame);
      };
      return portal[direction === 'entry' ? 'enter' : 'returnToShowroom'](index, onComplete, progress, () => routes.arrival.viewport);
    },
    dispose() {
      if (portal.attached) portal.shutter.dispose();
      portal.dispose();
      panels.forEach(panel => panel.material.dispose());
    },
  };
}

function advance(f, seconds) {
  for (let elapsed = 0; elapsed < seconds - 1e-10;) {
    const dt = Math.min(1 / 60, seconds - elapsed);
    f.view.cameraRig.update(dt);
    elapsed += dt;
  }
}

function draw(f, dt = 1 / 60) {
  const camera = f.view.camera;
  const position = camera.position.toArray(), rotation = camera.quaternion.toArray(), fov = camera.fov;
  f.portal.prepareFrame(dt);
  assert.deepEqual(camera.position.toArray(), position, 'Presenting the page cannot advance the camera');
  assert.deepEqual(camera.quaternion.toArray(), rotation, 'Presenting the page cannot rotate the camera');
  assert.equal(camera.fov, fov, 'Presenting the page cannot change the approved zoom');
}

test('page transform and tunnel clipping stay with the last drawn camera while GPU submissions are skipped', () => {
  for (const [direction, elapsed] of [['entry', .45], ['entry', A + .4], ['retreat', .5], ['retreat', F + .45]]) {
    const f = fixture();
    try {
      assert.equal(f.start(direction), true);
      advance(f, elapsed);
      draw(f);
      const presented = f.events.length, updates = f.surfaceUpdates.length;
      const transform = f.page.style.transform, clip = f.page.style.clipPath, opacity = f.page.style.opacity;
      assert.match(transform, /^matrix3d\(/, 'The destination is already presented through the portal');
      const position = f.view.camera.position.clone();

      // A full GPU queue still lets CPU input/camera simulation advance. No
      // prepareFrame call occurs until the next frame can actually be drawn.
      advance(f, 2 / 60);
      assert.ok(f.view.camera.position.distanceTo(position) > .001, 'The authored camera clock keeps advancing');
      assert.equal(f.events.length, presented, `${direction} published a newer camera pose while the tunnel stayed on the previous GPU frame`);
      assert.equal(f.surfaceUpdates.length, updates);
      assert.equal(f.page.style.transform, transform);
      assert.equal(f.page.style.clipPath, clip);
      assert.equal(f.page.style.opacity, opacity);

      draw(f, 2 / 60);
      assert.equal(f.events.length, presented + 1, 'Resume presents only the latest pose, not each skipped sample');
      assert.equal(f.surfaceUpdates.length, updates + 1);
      assert.equal(f.page.style.transform, arrivalTransform(f.portal.exitFrame));
      assert.equal(f.page.style.clipPath, arrivalClip(f.portal.exitFrame));
      assert.notEqual(f.page.style.transform, transform, 'The next drawn camera pose advances the page');
      assert.equal(f.view.panels[0].portalUniforms.portalExitDepth.value, f.portal.exitFrame.exitDepth);
      draw(f);
      assert.equal(f.events.length, presented + 1, 'Drawing the same camera sample does not republish page styles');
    } finally {f.dispose();}
  }
});

test('the first return page pose is published with its synchronous tunnel draw', () => {
  const f = fixture();
  try {
    assert.equal(f.start('retreat'), true);
    assert.equal(f.events.length, 0, 'Starting the controller cannot publish before its first tunnel frame');
    draw(f);
    assert.equal(f.events.length, 1);
    assert.equal(f.events[0].progress, 1);
    assert.deepEqual(f.events[0].frame.clip, [0, 0, 1, 1]);
    assert.equal(f.page.style.transform, arrivalTransform(f.portal.exitFrame));
  } finally {f.dispose();}
});

test('navigation, reverse completion and reduced motion keep their existing elapsed-time handoffs', () => {
  for (const direction of ['entry', 'retreat']) for (const reduced of [false, true]) {
    const f = fixture(), home = f.view.camera.position.clone();
    try {
      assert.equal(f.start(direction), true);
      draw(f);
      const firstDrawEvents = f.events.length;
      if (reduced) {
        f.view.reduced.matches = true;
        f.view.cameraRig.update(0);
      } else {
        advance(f, A + F - .001);
        assert.equal(f.portal.active, true, 'The journey cannot finish before the authored clock');
        assert.equal(f.events.length, firstDrawEvents, 'Unsubmitted frames cannot publish an intermediate page pose');
        f.view.cameraRig.update(.001 + 1e-9);
      }
      assert.equal(f.portal.active, false, 'Navigation does not wait for another GPU submission');
      assert.equal(f.events.filter(event => event.done).length, 1);
      assert.equal(f.events.at(-1).done, true);
      if (direction === 'entry') assert.equal(f.events.at(-2).progress, 1, 'The final page pose precedes navigation');
      else assert.ok(f.view.camera.position.distanceTo(home) < 1e-7, 'Return restores the same overview pose');
      const terminalEvents = f.events.length;
      draw(f);
      advance(f, 1);
      assert.equal(f.events.length, terminalEvents, 'No queued preview can run after the handoff');
    } finally {f.dispose();}
  }
});

test('cancel, supersession and disposal discard page poses that were never drawn', () => {
  for (const action of ['cancel', 'dispose']) {
    const f = fixture();
    try {
      assert.equal(f.start('entry', 0), true);
      advance(f, .45);
      f.portal[action]();
      const events = f.events.length;
      draw(f);
      assert.equal(f.events.length, events, 'A cancelled callback cannot escape at the next draw');
      if (action === 'cancel') {
        f.events.length = 0;
        assert.equal(f.start('entry', 4), true);
        advance(f, .45);
        draw(f);
        assert.equal(f.events.length, 1);
        assert.equal(f.events[0].index, 4, 'Only the new destination owns the next page presentation');
      }
    } finally {f.dispose();}
  }
});
