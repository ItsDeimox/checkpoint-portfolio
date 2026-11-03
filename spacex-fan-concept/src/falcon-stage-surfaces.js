import {BufferGeometry, BufferAttribute} from 'three';

// Triangle ranges of the two distributed copies of Stanley Creative's upper stage.
// The dome ends at its outer weld ring. The adapter begins at its base ring.
// Bind each selection to the audited file; an asset replacement requires a new review.
const layouts = {
  '1dcd39fcba7ea75ccb62acdd320a0f4a5e2b5747ad266977da48b0814b975694': {
    count: 1404,
    dome: [[960,256], [1374,30]],
    adapter: [[58,2], [64,62], [258,58], [380,68], [574,386], [1344,30]],
  },
  '96d28d896548e2a4cd7c5223313a6712d395721a1a791551d8991288197e6bdd': {
    count: 870,
    dome: [[567,218]],
    adapter: [[0,55], [247,192], [849,21]],
  },
};

export function falconStageSurfaces(name, baked, assetHash) {
  const layout = layouts[assetHash];
  if (!layout || !/^Second_Stage_F9_Second_Stage_0\b/.test(name) ||
      baked.getAttribute('position').count !== layout.count * 3) return null;

  const groups = [
    {part: 'interstage', feature: null},
    {part: 'interstage', feature: 'upper-stage-aft-dome'},
    {part: 'fairing', feature: 'payload-adapter'},
  ];
  const membership = new Uint8Array(layout.count);
  for (const [first, count] of layout.dome) membership.fill(1, first, first + count);
  for (const [first, count] of layout.adapter) membership.fill(2, first, first + count);

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
