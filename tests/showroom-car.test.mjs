import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loadShowroomCar} from '../src/scene/room-car.js';
import {prepareShowroomCar} from '../tools/car/prepare-car.mjs';
import {parseCarOnCpu, readGlb} from '../tools/car/glb-utils.mjs';

let expected, actual, sourceBytes, preparedBytes, vertexOperations;
before(async () => {
  [sourceBytes, preparedBytes] = await Promise.all([
    fs.readFile(new URL('../assets/models/nissan-s15-lbwk.glb', import.meta.url)),
    fs.readFile(new URL('../assets/models/nissan-s15-showroom.glb', import.meta.url)),
  ]);
  expected = prepareShowroomCar(await parseCarOnCpu(sourceBytes));
  const loadAsync = GLTFLoader.prototype.loadAsync;
  const methods = ['clone', 'applyMatrix4', 'computeBoundingBox', 'computeBoundingSphere', 'computeVertexNormals'];
  const originals = new Map();
  vertexOperations = Object.fromEntries(methods.map(name => [name, 0]));
  for (const name of methods) {
    originals.set(name, THREE.BufferGeometry.prototype[name]);
    THREE.BufferGeometry.prototype[name] = function (...args) {
      vertexOperations[name]++;
      return originals.get(name).apply(this, args);
    };
  }
  GLTFLoader.prototype.loadAsync = async function (url) {
    assert.equal(url, '/assets/models/nissan-s15-showroom.glb');
    return parseCarOnCpu(preparedBytes);
  };
  try {
    actual = await loadShowroomCar();
  } finally {
    GLTFLoader.prototype.loadAsync = loadAsync;
    for (const [name, original] of originals) THREE.BufferGeometry.prototype[name] = original;
  }
});

test('prepared asset preserves every original prepared attribute and triangle', () => {
  assert.equal(actual.children.length, expected.children.length);
  for (const oldMesh of expected.children) {
    const mesh = actual.children.find(candidate => candidate.name === oldMesh.name);
    assert.ok(mesh, oldMesh.name);
    assert.deepEqual(mesh.matrix.elements, oldMesh.matrix.elements);
    assert.deepEqual(Object.keys(mesh.geometry.attributes).sort(), Object.keys(oldMesh.geometry.attributes).sort());
    for (const [name, attribute] of Object.entries(oldMesh.geometry.attributes)) {
      const baked = mesh.geometry.attributes[name];
      assert.equal(baked.itemSize, attribute.itemSize, `${mesh.name}.${name} itemSize`);
      assert.equal(baked.normalized, attribute.normalized, `${mesh.name}.${name} normalization`);
      assert.deepEqual(baked.array, attribute.array, `${mesh.name}.${name} data`);
    }
    assert.deepEqual(mesh.geometry.index?.array, oldMesh.geometry.index?.array, `${mesh.name} triangle indices`);
    assert.deepEqual(mesh.geometry.boundingBox, oldMesh.geometry.boundingBox, `${mesh.name} bounds`);
  }
  assert.equal(actual.userData.triangleCount, 231983);
  assert.equal(actual.userData.frontWheelSteeringRadians, 0.3);
  assert.deepEqual(actual.userData.frontWheelPivots, expected.userData.frontWheelPivots);
  assert.equal(actual.userData.projectors, 2);
  assert.equal(actual.userData.pilotLamps, 2);
  assert.equal(actual.userData.lengthMeters, 4.8327);
  assert.equal(actual.userData.groundY, 0.06);
  assert.deepEqual(actual.userData.frontDirection, [0, 0, -1]);
});

function materialState(material) {
  const state = {};
  for (const [name, value] of Object.entries(material)) {
    if (['uuid', 'version', 'userData'].includes(name)) continue;
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) state[name] = value;
    else if (value.isTexture) state[name] = {sourceTextureIndex: value.userData.sourceTextureIndex, flipY: value.flipY, colorSpace: value.colorSpace, channel: value.channel};
    else if (Array.isArray(value)) state[name] = [...value];
    else if (value.toArray) state[name] = value.toArray();
    else if (name === 'defines') state[name] = value;
  }
  return state;
}

test('prepared materials, lamp emission, glass, visibility and shadows retain the prior appearance', () => {
  for (const oldMesh of expected.children) {
    const mesh = actual.children.find(candidate => candidate.name === oldMesh.name);
    assert.equal(mesh.visible, oldMesh.visible, mesh.name);
    assert.equal(mesh.castShadow, oldMesh.castShadow, mesh.name);
    assert.equal(mesh.receiveShadow, oldMesh.receiveShadow, mesh.name);
    assert.deepEqual(materialState(mesh.material), materialState(oldMesh.material), mesh.material.name);
  }
});

test('embedded texture bytes and model credits survive the offline bake', () => {
  const source = readGlb(sourceBytes), baked = readGlb(preparedBytes);
  assert.equal(baked.json.images.length, source.json.images.length);
  assert.deepEqual(baked.json.samplers, source.json.samplers);
  assert.deepEqual(baked.json.textures, source.json.textures);
  const imageBytes = (glb, image) => {
    const view = glb.json.bufferViews[image.bufferView];
    return glb.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  };
  for (let index = 0; index < source.json.images.length; index++) {
    assert.ok(!baked.json.images[index].uri);
    assert.deepEqual(imageBytes(baked, baked.json.images[index]), imageBytes(source, source.json.images[index]));
  }
  assert.equal(baked.json.asset.extras.sourceSha256, createHash('sha256').update(sourceBytes).digest('hex'));
  for (const name of ['title', 'author', 'authorUrl', 'source', 'license', 'licenseUrl', 'sourceTriangleCount']) {
    assert.deepEqual(actual.userData[name], expected.userData[name]);
  }
  assert.match(baked.json.asset.copyright, /kevin.*CC BY 4\.0/);
});

test('production car startup performs no vertex copies, transforms or geometry scans', () => {
  assert.deepEqual(vertexOperations, {clone: 0, applyMatrix4: 0, computeBoundingBox: 0, computeBoundingSphere: 0, computeVertexNormals: 0});
  assert.equal(actual.userData.preparedOffline, true);
  assert.equal(actual.userData.ready, true);
});
