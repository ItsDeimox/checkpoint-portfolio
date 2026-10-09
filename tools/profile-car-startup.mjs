import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loadShowroomCar} from '../src/scene/room-car.js';
import {prepareShowroomCar} from './car/prepare-car.mjs';
import {parseCarOnCpu} from './car/glb-utils.mjs';

// CPU benchmark only. Network transfer, image decoding, GPU uploads and shader
// compilation need a WebGL-capable device and are deliberately not estimated.
const mode = process.argv[2];
if (!['original', 'prepared'].includes(mode)) {
  const measurements = [];
  for (let run = 0; run < 5; run++) {
    for (const candidate of ['original', 'prepared']) {
      measurements.push(JSON.parse(execFileSync(process.execPath, ['--expose-gc', import.meta.filename, candidate], {encoding: 'utf8'})));
    }
  }
  const summary = Object.fromEntries(['original', 'prepared'].map(candidate => {
    const entries = measurements.filter(entry => entry.mode === candidate);
    const median = key => entries.map(entry => entry[key]).sort((a, b) => a - b)[2];
    return [candidate, Object.fromEntries(['totalMs', 'parseMs', 'prepareMs', 'arrayBufferMiB'].map(key => [key, median(key)]))];
  }));
  console.log(JSON.stringify({
    method: 'Five fresh Node processes per variant, pre-read local GLB, real GLTF parsing with inert textures; medians in milliseconds. No GPU/image/network timing.',
    summary,
    measurements,
  }, null, 2));
} else {
  const filename = mode === 'original' ? 'nissan-s15-lbwk.glb' : 'nissan-s15-showroom.glb';
  const bytes = await fs.readFile(new URL(`../assets/models/${filename}`, import.meta.url));
  let parseMs;
  const operations = {};
  for (const method of ['clone', 'applyMatrix4', 'computeBoundingBox', 'computeBoundingSphere']) {
    const original = THREE.BufferGeometry.prototype[method];
    operations[method] = 0;
    THREE.BufferGeometry.prototype[method] = function (...args) {
      operations[method]++;
      return original.apply(this, args);
    };
  }
  GLTFLoader.prototype.loadAsync = async function () {
    const start = performance.now();
    const parsed = await parseCarOnCpu(bytes);
    parseMs = performance.now() - start;
    return parsed;
  };
  globalThis.gc?.();
  const buffersBefore = process.memoryUsage().arrayBuffers;
  const start = performance.now();
  const car = mode === 'original'
    ? prepareShowroomCar(await new GLTFLoader().loadAsync('/original.glb'))
    : await loadShowroomCar();
  const totalMs = performance.now() - start;
  console.log(JSON.stringify({
    mode, totalMs, parseMs, prepareMs: totalMs - parseMs,
    arrayBufferMiB: (process.memoryUsage().arrayBuffers - buffersBefore) / 1048576,
    operations, visibleTriangles: car.userData.triangleCount,
  }));
}
