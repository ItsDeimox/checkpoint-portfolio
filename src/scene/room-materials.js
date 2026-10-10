/** Refine the baked materials in place; meshes, textures and shader features stay authored. */
export function refineCarMaterials(car) {
  const seen = new Set();
  car.traverse(mesh => {
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (!material?.isMeshStandardMaterial || seen.has(material)) continue;
      seen.add(material);
      switch (material.name) {
        case 'Body':
        case 'Hood':
          // A colored base under the existing clearcoat keeps the red paint
          // readable while softening the smallest moving light reflections.
          material.metalness = .42;
          material.roughness = .24;
          material.envMapIntensity = 1.35;
          if (material.isMeshPhysicalMaterial) material.clearcoatRoughness = .10;
          break;
        case 'XHROME__env_4_spec':
          material.roughness = Math.max(material.roughness, .12);
          break;
        case 'mirrors':
          material.roughness = Math.max(material.roughness, .09);
          break;
        case 'Front_rims':
        case 'Rear_rims':
          material.roughness = Math.max(material.roughness, .26);
          material.envMapIntensity = 1.10;
          if (material.isMeshPhysicalMaterial) material.clearcoatRoughness = Math.max(material.clearcoatRoughness, .12);
          break;
        case 'Ext_Glass':
          // Keep the existing alpha glass: no refraction target or transmission
          // pass. The separately named rear_glass is an authored tail lamp.
          material.roughness = .075;
          material.envMapIntensity = 1.10;
          material.depthWrite = false;
          if (material.isMeshPhysicalMaterial) material.clearcoatRoughness = .07;
          break;
      }
    }
  });
  return car;
}
