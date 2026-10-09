import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {prepareShowroomCar} from './car/prepare-car.mjs';
import {parseCarOnCpu, readGlb, writeGlb} from './car/glb-utils.mjs';

// Run explicitly with `node tools/bake-showroom-car.mjs`. The browser and normal
// site build use the committed output and never execute this geometry recipe.
const sourceUrl = new URL('../assets/models/nissan-s15-lbwk.glb', import.meta.url);
const targetUrl = new URL('../assets/models/nissan-s15-showroom.glb', import.meta.url);
const input = await fs.readFile(sourceUrl);
const source = readGlb(input);
const car = prepareShowroomCar(await parseCarOnCpu(input));
car.userData.assetUrl = '/assets/models/nissan-s15-showroom.glb';
car.userData.preparedOffline = true;
car.userData.preparationVersion = 1;

const maps = new Map();
const materialSet = new Set();
car.traverse(mesh => {
  if (!mesh.isMesh) return;
  mesh.userData.dxtRuntime = {
    name: mesh.name,
    visible: mesh.visible,
    castShadow: mesh.castShadow,
    receiveShadow: mesh.receiveShadow,
  };
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materialSet.add(material);
});
for (const material of materialSet) {
  // These renderer settings have no glTF equivalent. Preserve them explicitly;
  // the runtime restores this fixed-size metadata without touching vertices.
  material.userData.dxtRuntime = {
    depthWrite: material.depthWrite,
    envMapIntensity: material.envMapIntensity,
    toneMapped: material.toneMapped,
    forceSinglePass: material.forceSinglePass,
    normalScale: material.normalScale?.toArray(),
    clearcoatNormalScale: material.clearcoatNormalScale?.toArray(),
  };
  for (const [key, value] of Object.entries(material)) {
    if (value?.isTexture && key !== 'map') throw new Error(`Unmapped source texture slot: ${material.name}.${key}`);
  }
  if (material.map) {
    maps.set(material.name, material.map.userData.sourceTextureIndex);
    // GLTFExporter handles geometry and physical materials. Image bytes are
    // copied losslessly from the input below, avoiding canvas transcoding.
    material.map = null;
  }
}

// Node supplies Blob but not FileReader. No DOM or image decode is involved.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
const scene = new THREE.Scene();
scene.name = car.name;
scene.userData = car.userData;
scene.add(...car.children);
const geometryOnly = await new GLTFExporter().parseAsync(scene, {binary: true, onlyVisible: false});
const output = readGlb(geometryOnly);
const binaryParts = [output.binary];
let byteOffset = output.binary.length;
output.json.images = source.json.images.map(image => {
  if (image.uri || image.bufferView === undefined) throw new Error('Expected an embedded source image.');
  const view = source.json.bufferViews[image.bufferView];
  const bytes = source.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  const bufferView = output.json.bufferViews.length;
  output.json.bufferViews.push({buffer: 0, byteOffset, byteLength: bytes.length});
  const padding = Buffer.alloc((4 - bytes.length % 4) % 4);
  binaryParts.push(bytes, padding);
  byteOffset += bytes.length + padding.length;
  return {...image, bufferView};
});
output.json.textures = structuredClone(source.json.textures);
output.json.samplers = structuredClone(source.json.samplers);
for (const material of output.json.materials) {
  if (!maps.has(material.name)) continue;
  const original = source.json.materials.find(candidate => candidate.name === material.name);
  const binding = original?.pbrMetallicRoughness?.baseColorTexture;
  if (!binding || binding.index !== maps.get(material.name)) throw new Error(`Missing texture binding for ${material.name}`);
  material.pbrMetallicRoughness.baseColorTexture = structuredClone(binding);
}
output.json.buffers[0].byteLength = byteOffset;
output.json.asset.copyright = `Nissan Silvia S15 LBWK Super Silhouette by kevin (ケビン), CC BY 4.0. ${car.userData.source}`;
output.json.asset.extras = {
  ...source.json.asset.extras,
  sourceSha256: createHash('sha256').update(input).digest('hex'),
  preparation: 'DXT red physical paint, dark wheels/wing, glass, 0.30-radian front-wheel steering, authored headlamp-face inserts, and meter normalization baked offline. No mesh simplification. Original image bytes preserved.',
};
const encoded = writeGlb(output.json, Buffer.concat(binaryParts));
await fs.writeFile(targetUrl, encoded);
console.log(JSON.stringify({
  output: targetUrl.pathname,
  bytes: encoded.length,
  visibleTriangles: car.userData.triangleCount,
  meshes: output.json.meshes.length,
  materials: output.json.materials.length,
  images: output.json.images.length,
  sha256: createHash('sha256').update(encoded).digest('hex'),
}, null, 2));
