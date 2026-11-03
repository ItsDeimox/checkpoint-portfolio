import {copyToDocument} from '@gltf-transform/functions';
import {EXTTextureWebP} from '@gltf-transform/extensions';
import sharp from 'sharp';

// The rigid center core in Giroo's Heavy has a closed thrust deck and forward
// deck. The two aerodynamic side caps belong to the other artist's overview.
export function addHeavyCenterCore(doc, source) {
  const parent=source.getRoot().listNodes().find(n=>n.getName()==='Stage_1_Engine');
  const mesh=parent?.listChildren()[0]?.getMesh();
  const primitive=mesh?.listPrimitives()[0];
  if(primitive?.getIndices()?.getCount()!==412*3||primitive.getMaterial().getName()!=='Stage_1_engine')
    throw Error('Unexpected Giroo center-core layout');
  const copy=copyToDocument(doc,source,[mesh]).get(mesh);
  const p=copy.listPrimitives()[0],a=p.getIndices(),indices=a.getArray(),v=p.getAttribute('POSITION').getArray();
  const front=[],section=[],decks=[];
  for(let i=0;i<indices.length;i+=3){
    const face=Array.from(indices.subarray(i,i+3));
    const zs=face.map(k=>v[k*3+2]);
    // Horizontal closing faces occupy a single Z level. Split the wall at
    // existing longitudinal edges. All three indices of a face stay together.
    const flat=Math.max(...zs)-Math.min(...zs)<1e-5;
    const bin=flat?decks:face.reduce((sum,k)=>sum+v[k*3+1],0)>=0?section:front;
    bin.push(...face);
  }
  if(!decks.length||!section.length||!front.length)throw Error('Unexpected Heavy center-core section');
  const scene=doc.getRoot().listScenes()[0];
  for(const [name,faces] of [['cover',front],['shell',section],['ends',decks]]){
    const part=name==='cover'?p:p.clone();
    part.setIndices(a.clone().setArray(new indices.constructor(faces)));
    const shape=name==='cover'?copy:doc.createMesh('center-core-'+name).addPrimitive(part);
    // Register this inspection-only reference to the existing Heavy core axis.
    // Uniform scaling leaves all original proportions, normals and UVs intact.
    scene.addChild(doc.createNode('center-core-'+name).setMesh(shape)
      .setExtras({heavyCore:name}).setTranslation([-116.5115,35.84,-2.1247])
      .setRotation([-Math.SQRT1_2,0,0,Math.SQRT1_2]).setScale([20.25,20.25,20.25]));
  }
  a.dispose();
  for(const accessor of doc.getRoot().listAccessors())accessor.setBuffer(doc.getRoot().listBuffers()[0]);
  for(const buffer of doc.getRoot().listBuffers().slice(1))buffer.dispose();
  const extras=source.getRoot().getAsset().extras;
  if(!extras?.author?.startsWith('Giroo (')||!extras.license.startsWith('CC-BY-4.0')||
     !extras.source.endsWith('60030e62373547fa9364171e6095f31e'))throw Error('Heavy center core attribution mismatch');
  doc.getRoot().setExtras({...doc.getRoot().getExtras(),centerCoreSource:extras});
}

// Optimize the combined high-tier images without downsampling or quantization.
// Switch containers only when every decoded RGBA value matches the input.
export async function packHeavyMaps(doc,quality){
  if(quality==='eco'){
    const m=doc.getRoot().listMaterials().find(material=>material.getName()==='Stage_1_engine');
    for(const t of new Set([m.getBaseColorTexture(),m.getMetallicRoughnessTexture(),m.getNormalTexture()].filter(Boolean))){
      const smaller=await sharp(t.getImage()).resize(512,512,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
      t.setImage(smaller).setMimeType('image/png');
    }
    return;
  }
  for(const t of doc.getRoot().listTextures()){
    const original=t.getImage();
    const candidate=await sharp(original).webp({lossless:true,effort:3}).toBuffer();
    if(candidate.length>=original.length)continue;
    const rgba=image=>sharp(image).ensureAlpha().raw().toBuffer();
    if(!(await rgba(original)).equals(await rgba(candidate)))throw Error('Heavy texture pixels changed');
    t.setImage(candidate).setMimeType('image/webp');
    doc.createExtension(EXTTextureWebP).setRequired(true);
  }
}
