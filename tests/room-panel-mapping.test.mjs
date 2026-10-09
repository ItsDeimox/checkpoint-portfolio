import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildShowroom} from '../src/scene/room-environment.js';
import {RoomCamera} from '../src/scene/room-camera.js';

// Only image I/O is replaced. Production code still builds the screen meshes,
// their indexed geometry, frame transforms and artwork projection uniforms.
const view = {
  scene: new T.Scene(),
  renderer: {capabilities: {getMaxAnisotropy: () => 8}},
  loadingManager: new T.LoadingManager(),
  wake() {},
};
const originalLoad = T.TextureLoader.prototype.load;
T.TextureLoader.prototype.load = function loadWithoutImageRequest(url, onLoad) {
  const texture = new T.Texture();
  onLoad?.(texture);
  return texture;
};
try {
  buildShowroom(view);
} finally {
  T.TextureLoader.prototype.load = originalLoad;
}
view.scene.updateMatrixWorld(true);

after(() => {
  const geometries = new Set(), materials = new Set();
  view.scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  view.textures.forEach(texture => texture.dispose());
  view.ground.dispose();
});

function screenCorners(screen) {
  const {position, uv} = screen.geometry.attributes;
  return [[0, 1], [1, 1], [1, 0], [0, 0]].map(([u, v]) => {
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(uv.getX(i) - u) < 1e-8 && Math.abs(uv.getY(i) - v) < 1e-8) {
        return new T.Vector3().fromBufferAttribute(position, i).applyMatrix4(screen.matrixWorld);
      }
    }
    assert.fail('Missing screen UV corner ' + u + ',' + v);
  });
}

function* cameraViews(panel, width, height) {
  const camera = new T.PerspectiveCamera(42, width / height, .08, 100);
  const rig = new RoomCamera(camera, width);
  yield {name: 'overview', camera};
  rig.approach(panel);
  const duration = rig.transition.duration;
  for (let step = 1; step <= 4; step++) {
    rig.update(duration / 4);
    yield {name: step === 4 ? 'focused' : 'approach ' + step + '/4', camera};
  }
  rig.reset();
  const returnDuration = rig.transition.duration;
  for (let step = 1; step <= 2; step++) {
    rig.update(returnDuration / 2);
    yield {name: step === 2 ? 'returned' : 'return halfway', camera};
  }
}

for (const panel of view.panels) {
  test(panel.screen.name + ' is a rectangular physical screen', () => {
    const corners = screenCorners(panel.screen);
    const edges = corners.map((corner, i) => corners[(i + 1) % 4].clone().sub(corner));
    const scale = Math.max(...edges.map(edge => edge.length()));
    const plane = new T.Plane().setFromCoplanarPoints(corners[0], corners[1], corners[2]);
    assert.ok(Math.abs(plane.distanceToPoint(corners[3])) < scale * 1e-6, 'all four corners must share one plane');
    for (let i = 0; i < 4; i++) {
      const cosine = edges[i].dot(edges[(i + 1) % 4]) / (edges[i].length() * edges[(i + 1) % 4].length());
      const angle = T.MathUtils.radToDeg(Math.acos(T.MathUtils.clamp(-cosine, -1, 1)));
      assert.ok(Math.abs(cosine) < 1e-6, 'corner ' + ((i + 1) % 4) + ' must be 90 degrees; received ' + angle.toFixed(4));
    }
    for (let i = 0; i < 2; i++) {
      assert.ok(edges[i].clone().add(edges[i + 2]).length() < scale * 1e-6, 'opposing edges must be parallel and equal');
    }
  });
}

const raycaster = new T.Raycaster();
function sampleArtwork(screen, camera, worldPoint) {
  const projected = worldPoint.clone().project(camera);
  raycaster.setFromCamera(new T.Vector2(projected.x, projected.y), camera);
  const hit = raycaster.intersectObject(screen, false)[0];
  assert.ok(hit?.uv, 'the camera ray must intersect the real screen geometry');
  assert.ok(hit.point.distanceTo(worldPoint) < 1e-5, 'ray must sample the requested physical point');
  // This is the display material's source-coordinate equation. UV interpolation
  // comes from Three's real indexed-mesh raycast, not a second panel-layout model.
  const source = new T.Vector3(hit.uv.x, 1 - hit.uv.y, 1).applyMatrix3(screen.material.uniforms.projection.value);
  assert.ok(Number.isFinite(source.z) && Math.abs(source.z) > 1e-8);
  return {source: new T.Vector2(source.x / source.z, source.y / source.z), face: hit.faceIndex};
}

test('straight artwork lines span the screen triangles throughout camera travel', () => {
  const failures = [];
  let sampledRays = 0;
  for (const panel of view.panels) {
    const corners = screenCorners(panel.screen);
    let worst = {error: 0, location: ''};
    for (const [width, height] of [[1672, 941], [390, 844], [320, 960]]) {
      for (const {name, camera} of cameraViews(panel, width, height)) {
        for (const axis of ['horizontal', 'vertical']) for (const t of [.25, .5, .75]) {
          const left = axis === 'horizontal' ? corners[0].clone().lerp(corners[3], t) : corners[0].clone().lerp(corners[1], t);
          const right = axis === 'horizontal' ? corners[1].clone().lerp(corners[2], t) : corners[3].clone().lerp(corners[2], t);
          const start = left.clone().lerp(right, .04), end = left.clone().lerp(right, .96);
          const samples = Array.from({length: 17}, (_, i) => sampleArtwork(panel.screen, camera, start.clone().lerp(end, i / 16)));
          sampledRays += samples.length;
          assert.ok(new Set(samples.map(sample => sample.face)).size >= 2, 'line must cross a mesh triangle boundary');
          const a = samples[0].source, b = samples.at(-1).source, direction = b.clone().sub(a);
          assert.ok(direction.lengthSq() > 1e-8, 'source line must span visible artwork');
          for (const {source} of samples) {
            const offset = source.clone().sub(a);
            const error = Math.abs(direction.x * offset.y - direction.y * offset.x) / direction.lengthSq();
            if (error > worst.error) worst = {error, location: width + 'x' + height + ', ' + name + ', ' + axis + ' ' + t};
          }
        }
      }
    }
    // A projective image printed on one plane preserves straight lines. This
    // catches interior UV kinks even when all four artwork corners are correct.
    if (worst.error > 1e-5) failures.push(panel.screen.name + ': ' + (worst.error * 100).toFixed(4) + '% line bow at ' + worst.location);
  }
  assert.ok(sampledRays > 10000, 'exercise every screen, both UV axes and the complete approach/return');
  assert.deepEqual(failures, [], failures.join('\n'));
});

test('camera approach and return preserve the actual screen geometry and frame transforms', () => {
  const snapshot = () => view.panels.map(panel => ({
    positions: Array.from(panel.screen.geometry.attributes.position.array),
    uvs: Array.from(panel.screen.geometry.attributes.uv.array),
    screenMatrix: panel.screen.matrixWorld.toArray(),
    frameMatrix: panel.frame.matrixWorld.toArray(),
    artworkProjection: panel.screen.material.uniforms.projection.value.toArray(),
  }));
  const original = snapshot();
  for (const panel of view.panels) for (const [width, height] of [[1672, 941], [390, 844], [320, 960]]) {
    for (const {name} of cameraViews(panel, width, height)) {
      view.scene.updateMatrixWorld(true);
      assert.deepEqual(snapshot(), original, panel.screen.name + ', ' + width + 'x' + height + ', ' + name);
    }
  }
});
