// Reviewed half-open triangle ranges in the pinned Clarence365 Block 3 GLB.
// Objects 8 and 99 combine disconnected exterior and interior pieces by material.
// Object 98's dome meets the cylindrical wall at a pre-existing circular edge loop.
const selections = [
  {
    node: 'Object_8', material: 'Material.003', triangles: 27636, feature: 'ship-tank-hardware', part:'fairing',
    ranges: [[1180,1654],[4496,5352],[5582,6734],[9266,12198],[13468,14970],
      [15930,26366],[26942,27006],[27336,27366],[27576,27636]],
  },
  {
    node: 'Object_98', material: 'Cryo_Section3', triangles: 2278, feature: 'booster-forward-dome', part:'tanks', inspectionParts:['tanks','interstage'],
    ranges: [[308,324],[336,344],[370,386],[387,398],[410,411],[422,430],[431,438],
      [450,451],[462,470],[471,478],[505,518],[519,530],[585,1049],[1093,1097],
      [1159,1180],[1192,1227],[1253,1262],[1263,1270],[1319,1327],[1335,1343],
      [1367,1374],[1377,1391],[1392,1399],[1414,1422],[1615,1616],[1621,1630],[1634,1642],[1645,1652]],
  },
  {
    node: 'Object_99', material: 'Material.003', triangles: 30824, feature: 'booster-dome-downcomer', part:'tanks',
    ranges: [[0,660],[5830,6982],[9330,21946],[24270,24334]],
  },
  {
    node: 'Object_99', material: 'Material.003', triangles: 30824, feature: 'hotstage-frame', part:'interstage',
    ranges: [[3126,5830],[25148,27188]],
  },
  {
    node: 'Object_100', material: 'Material.055', triangles: 9572, feature: 'hotstage-attachments', part:'interstage',
    ranges: [[2872,4368]],
  },
];

// Partition the index stream before either tier's compression. The second primitive
// shares every original attribute accessor and material. Its child node inherits the
// complete original transform. No face is clipped, duplicated, flipped or generated.
export function partitionStarshipInteriors(doc) {
  const nodes=doc.getRoot().listNodes();
  for (const node of new Set(selections.map(s=>s.node))) {
    const groups=selections.filter(s=>s.node===node);
    const {material,triangles}=groups[0];
    const owner=nodes.find(n=>n.getName()===node);
    const primitive=owner?.getMesh()?.listPrimitives()[0], indices=primitive?.getIndices();
    if (primitive?.getMaterial()?.getName() !== material || indices?.getCount() !== triangles * 3)
      throw Error('Unexpected Starship source geometry: ' + node);

    const original=indices.getArray(), labels=new Uint8Array(triangles);
    const partitions=[[],...groups.map(()=>[])];
    for (const [i,group] of groups.entries()) {
      for (const [start,end] of group.ranges) labels.fill(i+1,start,end);
    }
    for (let face=0;face<triangles;face++) {
      partitions[labels[face]].push(original[face*3],original[face*3+1],original[face*3+2]);
    }
    for (const [i,{feature,part,inspectionParts}] of groups.entries()) {
      const inside=indices.clone().setArray(new original.constructor(partitions[i+1]));
      const internal=primitive.clone().setIndices(inside);
      const extras={sourceAssembly:feature,sourcePart:part,...(inspectionParts?{inspectionParts}:{})};
      owner.addChild(doc.createNode(feature).setExtras(extras).setMesh(doc.createMesh(feature).addPrimitive(internal)));
    }
    indices.setArray(new original.constructor(partitions[0]));
  }
}
