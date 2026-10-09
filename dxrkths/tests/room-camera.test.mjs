import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { RoomCamera, overviewPose } from '../src/scene/room-camera.js';
import { createFixedPanelLayout } from '../src/scene/room-environment.js';
import { PANEL_PATHS, panelFromPath, pathForPanel } from '../src/ui/room-navigation.js';

const panels = createFixedPanelLayout().map((panel, index) => ({ ...panel, index }));
function rig(width = 1672, height = 941) {
  const camera = new PerspectiveCamera(42, width / height, .08, 100);
  return new RoomCamera(camera, width);
}

test('free look changes orientation without moving the eye or any screen corner', () => {
  const controller = rig();
  const eye = controller.camera.position.clone();
  const rotation = controller.camera.quaternion.clone();
  const corners = panels.map(panel => panel.corners.map(corner => corner.toArray()));
  controller.look(.35, .1);
  for (let i = 0; i < 120; i++) controller.update(1 / 60);
  assert.equal(controller.camera.position.distanceTo(eye), 0);
  assert.ok(controller.camera.quaternion.angleTo(rotation) > .2);
  assert.deepEqual(panels.map(panel => panel.corners.map(corner => corner.toArray())), corners);
});

test('approach arrives exactly once, then returns to the same overview', () => {
  const controller = rig();
  const home = overviewPose(1672);
  let arrived = 0;
  controller.approach(panels[2], { onComplete: () => arrived++ });
  controller.update(.5);
  assert.equal(arrived, 0);
  assert.equal(controller.mode, 'approaching');
  controller.update(.8);
  controller.update(.5);
  assert.equal(controller.mode, 'focused');
  assert.equal(arrived, 1);
  assert.ok(controller.camera.position.distanceTo(panels[2].center) < home.position.distanceTo(panels[2].center) * .7);
  controller.reset();
  controller.update(1.2);
  assert.equal(controller.mode, 'overview');
  assert.ok(controller.camera.position.distanceTo(home.position) < 1e-9);
  assert.equal(controller.camera.fov, home.fov);
});

test('interrupted approaches cannot reveal an obsolete panel', () => {
  const controller = rig();
  let stale = 0, latest = 0;
  controller.approach(panels[0], { onComplete: () => stale++ });
  controller.update(.2);
  controller.approach(panels[4], { onComplete: () => latest++ });
  controller.update(1.5);
  assert.equal(stale, 0);
  assert.equal(latest, 1);
  controller.approach(panels[2], { onComplete: () => stale++ });
  controller.reset();
  controller.update(2);
  assert.equal(stale, 0);
});

test('reduced motion arrives immediately and resize keeps focused content in view', () => {
  const controller = rig();
  let arrived = 0;
  controller.approach(panels[4], { reduced: true, onComplete: () => arrived++ });
  assert.equal(arrived, 1);
  controller.camera.aspect = 390 / 844;
  controller.camera.updateProjectionMatrix();
  controller.resize(390);
  for (const corner of panels[4].corners) {
    const ndc = corner.clone().project(controller.camera);
    assert.ok(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1);
  }
});

test('camera transitions consume wall time consistently at 24 and 144 Hz', () => {
  const slow = rig(), fast = rig();
  slow.approach(panels[1]); fast.approach(panels[1]);
  for (let i = 0; i < 18; i++) slow.update(1 / 24);
  for (let i = 0; i < 108; i++) fast.update(1 / 144);
  assert.ok(slow.camera.position.distanceTo(fast.camera.position) < 1e-9);
  assert.ok(Math.abs(slow.camera.fov - fast.camera.fov) < 1e-9);
});

test('all existing deep links map into the same room', () => {
  PANEL_PATHS.forEach((path, index) => {
    assert.equal(panelFromPath(`${path}/`), index);
    assert.equal(pathForPanel(index), path);
  });
  assert.equal(panelFromPath('/'), null);
  assert.equal(panelFromPath('/unknown'), null);
});
