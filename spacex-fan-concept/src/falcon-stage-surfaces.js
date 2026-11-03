import {BufferGeometry, BufferAttribute} from 'three';

// Triangle ranges of the two distributed copies of Stanley Creative's upper stage.
// The dome ends at its outer weld ring. The adapter begins at its base ring.
// Bind each selection to the audited file; an asset replacement requires a new review.
const layouts = {
  '1dcd39fcba7ea75ccb62acdd320a0f4a5e2b5747ad266977da48b0814b975694': {
    count: 1404, barrel: 280, interstage: 700,
    dome: [[960,256], [1374,30]],
    adapter: [[58,2], [64,62], [258,58], [380,68], [574,386], [1344,30]],
  },
  '96d28d896548e2a4cd7c5223313a6712d395721a1a791551d8991288197e6bdd': {
    count: 870, barrel: 172, interstage: 434,
    dome: [[567,218]],
    adapter: [[0,55], [247,192], [849,21]],
  },
};

export function falconStageSurfaces(name, baked, assetHash) {
  const layout = layouts[assetHash];
  if (!layout) return null;
  if (/^(First_Stage_F9_First_Stage_0|Interstage_F9_Black_0)\b/.test(name)) {
    const barrel = name.startsWith('First_Stage_');
    if (baked.getAttribute('position').count !== (barrel ? layout.barrel : layout.interstage) * 3) return null;
    if (!baked.boundingBox) baked.computeBoundingBox();
    const position = baked.getAttribute('position');
    const box = baked.boundingBox;
    const membership = new Uint8Array(position.count / 3);
    const centerZ = (box.min.z + box.max.z) / 2;
    const centerX = (box.min.x + box.max.x) / 2;
    // Both rows of faces across the lower interstage deck sit in the first
    // 1.6% of its height. The long side-wall triangles extend far above it.
    const deckTop = box.min.y + (box.max.y - box.min.y) * .02;
    for (let face = 0; face < membership.length; face++) {
      const i = face * 3;
      if (barrel) {
        // Retain the rear half of the original circumferential panels. Whole
        // triangles follow the authored axial seams; no cut caps are created.
        const x = (position.getX(i) + position.getX(i+1) + position.getX(i+2)) / 3 - centerX;
        const z = (position.getZ(i) + position.getZ(i+1) + position.getZ(i+2)) / 3 - centerZ;
        membership[face] = z + x * .2 <= 0 ? 1 : 0;
      } else {
        membership[face] = Math.max(position.getY(i), position.getY(i+1), position.getY(i+2)) <= deckTop ? 1 : 0;
      }
    }
    if (!membership.includes(1) || !membership.includes(0)) return null;
    return partitionFaces(baked, membership, barrel ? [
      {part:'tanks', feature:'first-stage-open-panel'}, {part:'tanks', feature:'first-stage-barrel-section'}
    ] : [
      {part:'interstage'}, {part:'interstage', feature:'first-stage-forward-deck', inspectionParts:['interstage','tanks']}
    ]);
  }
  if (!/^Second_Stage_F9_Second_Stage_0\b/.test(name) ||
      baked.getAttribute('position').count !== layout.count * 3) return null;

  const groups = [
    {part: 'interstage', feature: null},
    {part: 'interstage', feature: 'upper-stage-aft-dome'},
    {part: 'fairing', feature: 'payload-adapter'},
  ];
  const membership = new Uint8Array(layout.count);
  for (const [first, count] of layout.dome) membership.fill(1, first, first + count);
  for (const [first, count] of layout.adapter) membership.fill(2, first, first + count);

  return partitionFaces(baked, membership, groups);
}

function partitionFaces(baked, membership, groups) {
  return groups.map((group, id) => {
    const faces = [];
    for (let i = 0; i < membership.length; i++) if (membership[i] === id) faces.push(i);
    const geometry = new BufferGeometry();
    for (const [name, attribute] of Object.entries(baked.attributes)) {
      const stride = 3 * attribute.itemSize;
      const values = new Float32Array(faces.length * stride);
      for (const [i, face] of faces.entries()) {
        values.set(attribute.array.subarray(face * stride, (face + 1) * stride), i * stride);
      }
      geometry.setAttribute(name, new BufferAttribute(values, attribute.itemSize));
    }
    return {...group, geometry};
  });
}
