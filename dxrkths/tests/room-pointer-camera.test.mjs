import test from 'node:test';
import assert from 'node:assert/strict';
import { MathUtils, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { RoomCamera, overviewPose } from '../src/scene/room-camera.js';
import { createFixedPanelLayout, createRoomShell } from '../src/scene/room-environment.js';

const panels = createFixedPanelLayout();
function rig(width = 1920, height = 1080) {
  return new RoomCamera(new PerspectiveCamera(42, width / height, .08, 100), width);
}
function point(controller, x, y) {
  assert.equal(typeof controller.pointLook, 'function', 'camera exposes absolute pointer look');
  controller.pointLook(x, y);
}
function neutral(controller) {
  assert.equal(typeof controller.neutralLook, 'function', 'camera exposes a damped neutral return');
  controller.neutralLook();
}

test('absolute pointer look follows screen right and reverses the old downward drag pitch', () => {
  const controller = rig(), initialEye = controller.camera.position.clone();
  const initialDirection = controller.camera.getWorldDirection(new Vector3());
  point(controller, .7, .6);
  const target = [controller.targetYaw, controller.targetPitch];
  point(controller, .7, .6);
  assert.deepEqual([controller.targetYaw, controller.targetPitch], target, 'repeated coordinates must not accumulate rotation');
  controller.update(2);
  const direction = controller.camera.getWorldDirection(new Vector3());
  assert.ok(direction.x < 0, 'screen right is world negative X from this camera');
  assert.ok(direction.y < initialDirection.y, 'pointer down must lower the view');
  assert.equal(controller.camera.position.distanceTo(initialEye), 0);
  point(controller, 20, -20);
  assert.ok(Math.abs(controller.targetYaw) <= .055 && Math.abs(controller.targetPitch) <= .025, 'coordinates outside the canvas must remain bounded');
});

test('pointer follow starts softly and converges at the same rate across frame rates', () => {
  const controller = rig(), initial = controller.camera.quaternion.clone();
  point(controller, 1, -1);
  const target = Math.hypot(controller.targetYaw, controller.targetPitch);
  controller.update(1 / 60);
  const firstTurn = controller.camera.quaternion.angleTo(initial);
  assert.ok(firstTurn > 0 && firstTurn < target * .1, 'one frame must not jump to the pointer');
  controller.update(.75 - 1 / 60);
  assert.ok(Math.abs(controller.targetYaw - controller.yaw) < .003);
  const slow = rig(), fast = rig();
  point(slow, -1, .8); point(fast, -1, .8);
  for (let i = 0; i < 18; i++) slow.update(1 / 24);
  for (let i = 0; i < 108; i++) fast.update(1 / 144);
  assert.ok(slow.camera.quaternion.angleTo(fast.camera.quaternion) < 1e-7);
});

test('leaving the pointer area eases back to the identical neutral overview', () => {
  const controller = rig(), initial = controller.camera.quaternion.clone();
  point(controller, -1, 1); controller.update(.8);
  const before = controller.camera.quaternion.clone();
  neutral(controller);
  assert.deepEqual(controller.camera.quaternion.toArray(), before.toArray(), 'neutral return must not snap');
  assert.deepEqual([controller.targetYaw, controller.targetPitch], [0, 0]);
  controller.update(2.5);
  assert.ok(controller.camera.quaternion.angleTo(initial) < 1e-5);
});

test('pointer and neutral events cannot steer an approach, focused view, or return', () => {
  const controller = rig();
  point(controller, .5, -.5); controller.update(.2);
  controller.approach(panels[1]);
  for (const phase of ['approaching', 'focused', 'returning']) {
    if (phase === 'focused') controller.update(2);
    if (phase === 'returning') controller.reset();
    assert.equal(controller.mode, phase);
    const targets = [controller.targetYaw, controller.targetPitch];
    const rotation = controller.camera.quaternion.clone();
    const position = controller.camera.position.clone();
    point(controller, -1, 1); neutral(controller); controller.look(.3, -.3);
    assert.deepEqual([controller.targetYaw, controller.targetPitch], targets);
    assert.deepEqual(controller.camera.quaternion.toArray(), rotation.toArray());
    assert.equal(controller.camera.position.distanceTo(position), 0);
  }
  controller.update(2);
  assert.equal(controller.mode, 'overview');
  assert.deepEqual([controller.targetYaw, controller.targetPitch], [0, 0]);
});

test('approved overview poses remain exact while ultrawide horizontal FOV is bounded', () => {
  for (const [width, height] of [[1920, 1080], [2560, 1080], [390, 844]]) {
    const current = overviewPose(width, width / height), original = overviewPose(width);
    assert.equal(current.fov, 42);
    assert.equal(original.fov, 42, 'callers without an aspect keep the original overview pose');
    assert.deepEqual(current.position.toArray(), original.position.toArray());
    assert.deepEqual(current.target.toArray(), original.target.toArray());
  }
  const wide = overviewPose(3840, 3840 / 1080);
  const horizontal = MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(wide.fov / 2)) * 3840 / 1080));
  assert.ok(horizontal <= 90 + 1e-9, `ultrawide horizontal FOV escaped: ${horizontal}`);
  assert.ok(wide.fov < 32);
});

test('resizing and returning from a panel retain the ultrawide overview lens', () => {
  const controller = rig();
  controller.camera.aspect = 3840 / 1080;
  controller.camera.updateProjectionMatrix();
  controller.resize(3840);
  const expected = overviewPose(3840, controller.camera.aspect);
  assert.ok(controller.camera.fov < 32);
  assert.equal(controller.camera.fov, expected.fov);
  controller.approach(panels[2], { reduced: true });
  controller.reset();
  assert.equal(controller.transition.endFov, expected.fov, 'return must target the responsive lens before arrival');
  controller.update(2);
  assert.equal(controller.camera.fov, expected.fov);
  assert.deepEqual(controller.camera.position.toArray(), expected.position.toArray());
});

test('every overview frustum edge stays within the real side and back wall arc', () => {
  const shell = createRoomShell(), wall = shell.getObjectByName('Side and back wall');
  shell.updateMatrixWorld(true);
  const ray = new Raycaster();
  let checked = 0;
  try {
    for (const [width, height] of [[1920, 1080], [2560, 1080], [3840, 1080], [390, 844], [320, 960], [740, 320]]) {
      for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
        const controller = rig(width, height);
        point(controller, x, y); controller.update(3);
        for (const edgeX of [-1, -.5, 0, .5, 1]) for (const edgeY of [-1, 0, 1]) {
          ray.setFromCamera(new Vector2(edgeX, edgeY), controller.camera);
          // Project each frustum direction onto the shell's horizontal plane:
          // all of these sightlines must meet physical wall, not the open bay.
          ray.ray.direction.y = 0; ray.ray.direction.normalize();
          ray.ray.origin.y = 4.2;
          assert.ok(ray.intersectObject(wall).length, `${width}x${height}, pointer ${x},${y}, edge ${edgeX},${edgeY}: outside room opening`);
          checked++;
        }
      }
    }
    assert.equal(checked, 810);
  } finally {
    shell.traverse(object => object.geometry?.dispose());
    const materials = new Set();
    shell.traverse(object => { if (object.material) materials.add(object.material); });
    materials.forEach(material => material.dispose());
  }
});
