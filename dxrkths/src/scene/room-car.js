import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = '/assets/models/nissan-s15-showroom.glb';

/** Load the finished, licensed car. Vertex preparation happens in the bake tool. */
export async function loadShowroomCar() {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const group = gltf.scene;
  if (!group.userData.preparedOffline || group.userData.preparationVersion !== 1) {
    throw new Error('The prepared S15 asset is missing its showroom metadata.');
  }
  group.name = 'DXT Nissan S15 LBWK';
  const materials = new Set();
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    // glTF has no standard shadow/visibility or tone-mapping fields. These
    // small metadata assignments preserve the authored look without cloning,
    // transforming, steering or scanning the geometry on the main thread.
    const settings = mesh.userData.dxtRuntime;
    if (!settings) throw new Error('The prepared S15 mesh is missing its render settings.');
    mesh.name = settings.name;
    mesh.visible = settings.visible;
    mesh.castShadow = settings.castShadow;
    mesh.receiveShadow = settings.receiveShadow;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
  });
  for (const material of materials) {
    const settings = material.userData.dxtRuntime;
    if (!settings) throw new Error('The prepared S15 material is missing its render settings.');
    material.depthWrite = settings.depthWrite;
    material.envMapIntensity = settings.envMapIntensity;
    material.toneMapped = settings.toneMapped;
    material.forceSinglePass = settings.forceSinglePass;
    if (settings.normalScale) material.normalScale.fromArray(settings.normalScale);
    if (settings.clearcoatNormalScale) material.clearcoatNormalScale.fromArray(settings.clearcoatNormalScale);
  }
  group.userData.assetUrl = MODEL_URL;
  return group;
}
