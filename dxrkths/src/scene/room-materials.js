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
          // A metallic red base under polished varnish separates reflections.
          // Nonzero roughness keeps the smallest moving highlights stable.
          material.metalness = .78;
          material.roughness = .16;
          material.envMapIntensity = 1.85;
          if (material.isMeshPhysicalMaterial) material.clearcoatRoughness = .065;
          break;
        case 'XHROME__env_4_spec':
          material.roughness = Math.max(material.roughness, .09);
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
          material.roughness = .06;
          material.envMapIntensity = 1.10;
          material.depthWrite = false;
          if (material.isMeshPhysicalMaterial) material.clearcoatRoughness = .06;
          break;
      }
    }
  });
  return car;
}
