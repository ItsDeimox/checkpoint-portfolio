import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export function readGlb(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(4) !== 2) throw new Error('Expected a GLB 2 asset.');
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error('GLB length does not match its header.');
  let json, binary;
  for (let offset = 12; offset < buffer.length;) {
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    if (type === 0x004e4942) binary = chunk;
    offset += 8 + length;
  }
  if (!json || !binary) throw new Error('GLB needs JSON and binary chunks.');
  return {json, binary};
}

export function writeGlb(json, binary) {
  const jsonText = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc((jsonText.length + 3) & ~3, 0x20);
  jsonText.copy(jsonChunk);
  const binaryChunk = Buffer.alloc((binary.length + 3) & ~3);
  binary.copy(binaryChunk);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonChunk.length + binaryChunk.length, 8);
  header.writeUInt32LE(jsonChunk.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(binaryChunk.length, 0);
  binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonChunk, binaryHeader, binaryChunk]);
}

/** Geometry/material CPU checks do not need to decode or transcode image bytes. */
export async function parseCarOnCpu(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const loader = new GLTFLoader();
  loader.register(parser => ({
    name: 'DXT_CPU_TEXTURE_REFERENCES',
    loadTexture(index) {
      const texture = new THREE.Texture();
      texture.flipY = false;
      texture.userData.sourceTextureIndex = index;
      const definition = parser.json.textures[index];
      texture.name = parser.json.images[definition.source]?.name ?? '';
      return Promise.resolve(texture);
    },
  }));
  const arrayBuffer = buffer.byteOffset === 0 && buffer.byteLength === buffer.buffer.byteLength
    ? buffer.buffer
    : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return loader.parseAsync(arrayBuffer, '');
}
