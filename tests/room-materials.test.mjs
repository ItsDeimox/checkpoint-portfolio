import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BoxGeometry, Group, Mesh, MeshPhysicalMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadShowroomCar } from '../src/scene/room-car.js';
import { refineCarMaterials } from '../src/scene/room-materials.js';
import { parseCarOnCpu } from '../tools/car/glb-utils.mjs';

const refinedNames = new Set(['Body', 'Hood', 'XHROME__env_4_spec', 'mirrors', 'Front_rims', 'Rear_rims', 'Ext_Glass']);
const scalarKeys = ['type', 'metalness', 'roughness', 'clearcoat', 'clearcoatRoughness', 'envMapIntensity', 'opacity', 'transparent', 'depthWrite', 'transmission', 'thickness', 'ior', 'forceSinglePass', 'toneMapped', 'emissiveIntensity', 'version'];
function materialState(material) {
  return {
    ...Object.fromEntries(scalarKeys.map(key => [key, material[key]])),
    color: material.color?.toArray(), emissive: material.emissive?.toArray(),
  };
}
function hash(array) {
  return createHash('sha256').update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest('hex');
}
function attributeState(attribute) {
  return attribute && { attribute, array: attribute.array, hash: hash(attribute.array) };
}

let car, meshes, materials, originalMaterials, originalMeshes;
before(async () => {
  const data = await readFile(new URL('../assets/models/nissan-s15-showroom.glb', import.meta.url));
  const originalLoad = GLTFLoader.prototype.loadAsync;
  GLTFLoader.prototype.loadAsync = () => parseCarOnCpu(data);
  try { car = await loadShowroomCar(); } finally { GLTFLoader.prototype.loadAsync = originalLoad; }
  car.updateMatrixWorld(true);
  meshes = []; materials = new Map();
  car.traverse(mesh => {
    if (!mesh.isMesh) return;
    meshes.push(mesh);
    for (const material of [mesh.material].flat()) materials.set(material.name, material);
  });
  originalMaterials = new Map([...materials].map(([name, material]) => [name, materialState(material)]));
  originalMeshes = meshes.map(mesh => ({
    mesh, geometry: mesh.geometry, material: mesh.material, parent: mesh.parent,
    position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(),
    visible: mesh.visible, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow,
    index: attributeState(mesh.geometry.index),
    attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]) => [name, attributeState(attribute)])),
    textures: [mesh.material].flat().flatMap(material => Object.entries(material).filter(([, value]) => value?.isTexture).map(([key, texture]) => ({ material, key, texture }))),
  }));
});
after(() => {
  const geometries = new Set(meshes?.map(mesh => mesh.geometry));
  geometries.forEach(geometry => geometry.dispose());
  materials?.forEach(material => material.dispose());
});

test('red paint retains its identity with a metallic base and a polished clearcoat', () => {
  assert.equal(refineCarMaterials(car), car);
  for (const name of ['Body', 'Hood']) {
    const material = materials.get(name), original = originalMaterials.get(name);
    assert.ok(material?.isMeshPhysicalMaterial, `expected existing physical paint ${name}`);
    assert.deepEqual(material.color.toArray(), original.color);
    assert.equal(material.color.getHexString(), 'c7081b');
    assert.ok(material.metalness >= .84 && material.metalness <= .9, 'metallic paint must retain some colored diffuse response');
    assert.ok(material.roughness >= .09 && material.roughness <= .125, 'polished reflections need a nonzero antialiasing floor');
    assert.equal(material.clearcoat, 1);
    assert.ok(material.clearcoatRoughness >= .04 && material.clearcoatRoughness <= .065);
    assert.ok(material.envMapIntensity >= 1.7 && material.envMapIntensity <= 2.0);
  }
});

test('polished metals and rim clearcoats have bounded nonzero highlight roughness', () => {
  refineCarMaterials(car);
  for (const name of ['XHROME__env_4_spec', 'mirrors', 'Front_rims', 'Rear_rims']) {
    const material = materials.get(name), original = originalMaterials.get(name);
    assert.ok(material, name);
    assert.deepEqual(material.color.toArray(), original.color);
    assert.equal(material.metalness, original.metalness);
    assert.ok(material.roughness >= .08 && material.roughness <= .35, `${name}: unstable mirror highlight`);
    if (name.endsWith('_rims')) {
      assert.ok(material.roughness >= original.roughness, 'already rough rims must not become sharper');
      assert.ok(material.clearcoatRoughness >= .1, 'rim clearcoat needs its own highlight floor');
    }
  }
});

test('window reflections improve without changing alpha or enabling a transmission pass', () => {
  refineCarMaterials(car);
  const material = materials.get('Ext_Glass'), original = originalMaterials.get('Ext_Glass');
  assert.deepEqual(material.color.toArray(), original.color);
  assert.equal(material.opacity, original.opacity);
  assert.equal(material.opacity, .27);
  assert.equal(material.transparent, true);
  assert.equal(material.depthWrite, false);
  assert.equal(material.transmission, 0);
  assert.equal(material.thickness, original.thickness);
  assert.equal(material.forceSinglePass, original.forceSinglePass);
  assert.ok(material.envMapIntensity > original.envMapIntensity && material.envMapIntensity <= 1.2);
  assert.ok(material.clearcoatRoughness >= .06 && material.clearcoatRoughness <= .1);
  assert.deepEqual(materialState(materials.get('rear_glass')), originalMaterials.get('rear_glass'), 'rear_glass is a tail lamp, not a window');
});

test('the material pass preserves every mesh, vertex buffer, transform, texture and unrelated surface', () => {
  refineCarMaterials(car);
  for (const original of originalMeshes) {
    const mesh = original.mesh;
    assert.equal(mesh.geometry, original.geometry);
    assert.equal(mesh.material, original.material);
    assert.equal(mesh.parent, original.parent);
    assert.deepEqual(mesh.position.toArray(), original.position);
    assert.deepEqual(mesh.quaternion.toArray(), original.quaternion);
    assert.deepEqual(mesh.scale.toArray(), original.scale);
    assert.equal(mesh.visible, original.visible);
    assert.equal(mesh.castShadow, original.castShadow);
    assert.equal(mesh.receiveShadow, original.receiveShadow);
    for (const [name, attribute] of Object.entries(original.attributes)) {
      assert.equal(mesh.geometry.attributes[name], attribute.attribute);
      assert.equal(mesh.geometry.attributes[name].array, attribute.array);
      assert.equal(hash(mesh.geometry.attributes[name].array), attribute.hash);
    }
    if (original.index) {
      assert.equal(mesh.geometry.index, original.index.attribute);
      assert.equal(mesh.geometry.index.array, original.index.array);
      assert.equal(hash(mesh.geometry.index.array), original.index.hash);
    }
    for (const { material, key, texture } of original.textures) assert.equal(material[key], texture);
  }
  for (const [name, material] of materials) if (!refinedNames.has(name)) {
    assert.deepEqual(materialState(material), originalMaterials.get(name), `unrelated material changed: ${name}`);
  }
});

test('shared paint is refined once and repeated calls never compound values or recompile', () => {
  const group = new Group(), geometry = new BoxGeometry(), paint = new MeshPhysicalMaterial({
    name: 'Body', color: 0xc7081b, metalness: .52, roughness: .19, clearcoat: 1,
    clearcoatRoughness: .065, envMapIntensity: 1.25,
  });
  group.add(new Mesh(geometry, paint), new Mesh(geometry, paint));
  try {
    refineCarMaterials(group);
    const first = materialState(paint);
    assert.ok(paint.envMapIntensity >= 1.7 && paint.envMapIntensity <= 2.0);
    refineCarMaterials(group); refineCarMaterials(group);
    assert.deepEqual(materialState(paint), first);
    assert.ok(group.children.every(mesh => mesh.material === paint && mesh.geometry === geometry));
  } finally { paint.dispose(); geometry.dispose(); }
});
