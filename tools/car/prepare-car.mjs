import * as THREE from 'three';

const MODEL_URL = '/assets/models/nissan-s15-lbwk.glb';
const CAR_LENGTH = 4.8327;
const GROUND_Y = 0.06;
const STEERING_ANGLE = 0.30;
const WHEEL_MATERIALS = new Set(['Tyres', 'Front_rims', 'Discs', 'Calipers']);
const ASSET = {
  title: 'Nissan Silvia S15 LBWK Super Silhouette',
  author: 'kevin (ケビン)',
  authorUrl: 'https://sketchfab.com/sohyalebret',
  source: 'https://sketchfab.com/3d-models/nissan-silvia-s15-lbwk-super-silhouette-faa3ea6d43f14cec93eda98963bf9a5f',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceTriangleCount: 240175,
};

function showroomMaterial(original) {
  const name = original.name;
  if (name === 'Body' || name === 'Hood') {
    return new THREE.MeshPhysicalMaterial({
      name, color: 0xc7081b, metalness: 0.52, roughness: 0.19,
      clearcoat: 1, clearcoatRoughness: 0.065,
      envMapIntensity: 1.25, side: THREE.DoubleSide,
    });
  }
  if (name === 'Ext_Glass') {
    return new THREE.MeshPhysicalMaterial({
      name, color: 0x444649, metalness: 0.04, roughness: 0.065,
      transparent: true, opacity: 0.27, depthWrite: false,
      clearcoat: 1, clearcoatRoughness: 0.04, ior: 1.45,
      envMapIntensity: 0.95, side: THREE.DoubleSide,
    });
  }
  if (name === 'Wing') {
    return new THREE.MeshPhysicalMaterial({
      name, color: 0x0b0c0e, metalness: 0.27, roughness: 0.29,
      clearcoat: 0.5, clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    });
  }

  // Cloning retains the artist's UV maps, textures, alpha and small detail colors.
  const material = original.clone();
  if (name === 'Tyres') {
    material.metalness = 0.015;
    material.roughness = 0.83;
  } else if (name === 'Front_rims' || name === 'Rear_rims') {
    material.color.set(0x26282d);
    material.metalness = 0.86;
    material.roughness = 0.26;
  } else if (name === 'Discs') {
    material.metalness = 0.82;
    material.roughness = 0.32;
  } else if (name === 'Calipers') {
    material.metalness = 0.3;
    material.roughness = 0.34;
  } else if (name === 'Headlights') {
    material.color.set(0x0d1014);
    material.metalness = 0.4;
    material.roughness = 0.22;
  } else if (name === 'Rollcage') {
    material.color.set(0x17191b);
    material.metalness = 0.55;
    material.roughness = 0.31;
  } else if (name === 'rear_glass') {
    // This source material covers the tail lamps, not the rear windshield.
    material.roughness = 0.11;
    material.depthWrite = false;
  }
  if (material.transparent && material.opacity >= 0.98) {
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
  } else if (material.transparent) {
    material.depthWrite = false;
  }
  return material;
}

function wheelPartition(position, index) {
  if (position.getZ(index) <= 0.5) return 0;
  return position.getX(index) < 0 ? 1 : 2;
}

function wheelTrianglesAreSeparate(geometry) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const a = index ? index.getX(i) : i;
    const b = index ? index.getX(i + 1) : i + 1;
    const c = index ? index.getX(i + 2) : i + 2;
    const partition = wheelPartition(position, a);
    if (wheelPartition(position, b) !== partition || wheelPartition(position, c) !== partition) return false;
  }
  return true;
}

function steerFrontWheels(entries) {
  const tyres = entries.find(entry => entry.materialNames.includes('Tyres'));
  const wheels = entries.filter(entry => entry.materialNames.every(name => WHEEL_MATERIALS.has(name)));
  if (!tyres || wheels.length < 4 || !wheels.every(entry => wheelTrianglesAreSeparate(entry.mesh.geometry))) return null;

  const boxes = [null, new THREE.Box3(), new THREE.Box3()];
  const point = new THREE.Vector3();
  const position = tyres.mesh.geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const side = wheelPartition(position, i);
    if (side) boxes[side].expandByPoint(point.fromBufferAttribute(position, i));
  }
  const pivots = [null];
  for (const side of [1, 2]) {
    const size = boxes[side].getSize(new THREE.Vector3());
    // These bounds also guard against steering an unexpected replacement asset.
    if (boxes[side].isEmpty() || size.x < 0.2 || size.x > 0.4 || size.y < 0.5 || size.y > 0.75 || size.z < 0.5 || size.z > 0.75) return null;
    pivots[side] = boxes[side].getCenter(new THREE.Vector3());
  }

  // Every triangle belongs wholly to one wheel. The same pivot and rotation are
  // applied to its tire, rim and brake pieces, including normals and tangents.
  const cosine = Math.cos(STEERING_ANGLE), sine = Math.sin(STEERING_ANGLE);
  for (const {mesh} of wheels) {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const tangents = geometry.attributes.tangent;
    for (let i = 0; i < positions.count; i++) {
      const side = wheelPartition(positions, i);
      if (!side) continue;
      const pivot = pivots[side];
      const x = positions.getX(i) - pivot.x, z = positions.getZ(i) - pivot.z;
      positions.setXYZ(i, pivot.x + cosine * x + sine * z, positions.getY(i), pivot.z - sine * x + cosine * z);
      for (const attribute of [normals, tangents]) {
        if (!attribute) continue;
        const nx = attribute.getX(i), nz = attribute.getZ(i);
        attribute.setXYZ(i, cosine * nx + sine * nz, attribute.getY(i), -sine * nx + cosine * nz);
      }
    }
    positions.needsUpdate = true;
    if (normals) normals.needsUpdate = true;
    if (tangents) tangents.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  return pivots.slice(1);
}

function connectedSurfaces(geometry) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  if (!index) return [];
  const parents = Array.from({length: position.count}, (_, i) => i);
  const find = i => {
    while (parents[i] !== i) {
      parents[i] = parents[parents[i]];
      i = parents[i];
    }
    return i;
  };
  for (let i = 0; i < index.count; i += 3) {
    const root = find(index.getX(i));
    parents[find(index.getX(i + 1))] = root;
    parents[find(index.getX(i + 2))] = root;
  }
  const components = new Map();
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    const root = find(i);
    if (!components.has(root)) components.set(root, {vertices: [], indices: [], bounds: new THREE.Box3()});
    const component = components.get(root);
    component.vertices.push(i);
    component.bounds.expandByPoint(point.fromBufferAttribute(position, i));
  }
  for (let i = 0; i < index.count; i += 3) {
    components.get(find(index.getX(i))).indices.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  }
  return [...components.values()];
}

function copyLensSurface(source, component) {
  const geometry = new THREE.BufferGeometry();
  const remap = new Map(component.vertices.map((index, i) => [index, i]));
  const positions = [], normals = [];
  for (const index of component.vertices) {
    const position = source.attributes.position;
    positions.push(position.getX(index), position.getY(index), position.getZ(index) + 0.0015);
    if (source.attributes.normal) {
      const normal = source.attributes.normal;
      normals.push(normal.getX(index), normal.getY(index), normal.getZ(index));
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(component.indices.map(index => remap.get(index)));
  if (normals.length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  else geometry.computeVertexNormals();
  return geometry;
}

function addProjectorInserts(group, entries) {
  const headlights = entries.find(entry => entry.materialNames.includes('Headlights'));
  if (!headlights) return {projectors: 0, pilotLamps: 0};
  const geometry = headlights.mesh.geometry;
  const primary = [], secondary = [];
  for (const surface of connectedSurfaces(geometry)) {
    const size = surface.bounds.getSize(new THREE.Vector3());
    const center = surface.bounds.getCenter(new THREE.Vector3());
    const x = Math.abs(center.x);
    // Measured author-modeled projector faces: ~75 mm lenses at Z 1.95,
    // plus their ~21 mm pilot lamps at Z 1.89. No new housing is invented.
    if (x > 0.59 && x < 0.72 && center.y > 0.55 && center.y < 0.66 && center.z > 1.935 && center.z < 1.985 && size.x > 0.055 && size.x < 0.09 && size.y > 0.05 && size.y < 0.09 && size.z < 0.03) primary.push(surface);
    else if (x > 0.68 && x < 0.74 && center.y > 0.61 && center.y < 0.65 && center.z > 1.87 && center.z < 1.905 && size.x > 0.017 && size.x < 0.026 && size.y > 0.015 && size.y < 0.025 && size.z < 0.006) secondary.push(surface);
  }
  const addPair = (surfaces, intensity, label) => {
    if (surfaces.length !== 2) return 0;
    const material = new THREE.MeshPhysicalMaterial({
      name: label, color: 0xe0e4e8, emissive: 0xfff6ed, emissiveIntensity: intensity,
      roughness: 0.12, metalness: 0.06, clearcoat: 1,
      side: THREE.DoubleSide, toneMapped: false,
    });
    surfaces.forEach((surface, index) => {
      const mesh = new THREE.Mesh(copyLensSurface(geometry, surface), material);
      mesh.name = `${label} ${index + 1}`;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.userData.component = 'authored headlight lens insert';
      group.add(mesh);
    });
    return surfaces.length;
  };
  return {
    projectors: addPair(primary, 2.7, 'DXT white projector'),
    pilotLamps: addPair(secondary, 1.4, 'DXT white pilot lamp'),
  };
}

/** Offline preparation recipe. Kept out of the browser startup path. */
export function prepareShowroomCar(gltf) {
  gltf.scene.updateMatrixWorld(true);
  const group = new THREE.Group();
  group.name = 'DXT Nissan S15 LBWK';
  const materials = new Map();
  const entries = [];
  const sourceGeometries = new Set();
  gltf.scene.traverse(source => {
    if (!source.isMesh) return;
    const originals = Array.isArray(source.material) ? source.material : [source.material];
    const clones = originals.map(original => {
      if (!materials.has(original)) materials.set(original, showroomMaterial(original));
      return materials.get(original);
    });
    const geometry = source.geometry.clone().applyMatrix4(source.matrixWorld);
    const mesh = new THREE.Mesh(geometry, Array.isArray(source.material) ? clones : clones[0]);
    const materialNames = originals.map(material => material.name);
    mesh.name = source.name;
    mesh.visible = !materialNames.every(name => name === 'Body_int') && !clones.every(material => material.transparent && material.opacity <= 0);
    mesh.castShadow = mesh.visible && clones.every(material => !material.transparent);
    mesh.receiveShadow = mesh.visible && clones.every(material => !material.transparent);
    mesh.userData.sourceMaterialNames = materialNames;
    group.add(mesh);
    entries.push({mesh, materialNames});
    sourceGeometries.add(source.geometry);
  });

  const wheelPivots = steerFrontWheels(entries);
  const lamps = addProjectorInserts(group, entries);
  const bounds = new THREE.Box3();
  for (const {mesh} of entries) {
    if (!mesh.visible) continue;
    mesh.geometry.computeBoundingBox();
    bounds.union(mesh.geometry.boundingBox);
  }
  const size = bounds.getSize(new THREE.Vector3());
  if (bounds.isEmpty() || !Number.isFinite(size.z) || size.z <= 0) throw new Error('The S15 asset has no usable vehicle geometry.');
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = CAR_LENGTH / size.z;
  // Rotate 180 degrees around Y, center across X/Z and put the tires at Y .06.
  // Baking this once leaves an identity-transform Group for the room to place.
  const normalization = new THREE.Matrix4().set(
    -scale, 0, 0, center.x * scale,
    0, scale, 0, GROUND_Y - bounds.min.y * scale,
    0, 0, -scale, center.z * scale,
    0, 0, 0, 1,
  );
  let triangleCount = 0;
  for (const mesh of group.children) {
    mesh.geometry.applyMatrix4(normalization);
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
    if (mesh.visible) triangleCount += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
  }
  sourceGeometries.forEach(geometry => geometry.dispose());
  group.userData = {
    ...ASSET, assetUrl: MODEL_URL, triangleCount,
    readiness: 'ready', ready: true, geometryMode: 'gltf-mesh',
    normalized: true, lengthMeters: CAR_LENGTH, groundY: GROUND_Y,
    frontDirection: [0, 0, -1],
    frontWheelSteeringRadians: wheelPivots ? STEERING_ANGLE : 0,
    frontWheelPivots: wheelPivots?.map(pivot => pivot.clone().applyMatrix4(normalization).toArray()) ?? [],
    ...lamps,
  };
  return group;
}
