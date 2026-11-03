import {createHash} from'node:crypto';
import {EXTMeshoptCompression}from'@gltf-transform/extensions';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Compress existing accessor bytes only. Deliberately do NOT call quantize, simplify, weld or lossy filters. */
export function enableLosslessGeometry(doc){
 doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
}
function accessor(a){if(!a)return null;const v=a.getArray();return {type:a.getType(),normalized:a.getNormalized(),componentType:a.getComponentType(),count:a.getCount(),bytes:digest(Buffer.from(v.buffer,v.byteOffset,v.byteLength))};}
function triangleIndices(a){
 if(!a)return null;const src=a.getArray(),dst=new src.constructor(src.length);
 // The lossless triangle codec may cyclically rotate a face. Preserve its winding, order and vertex references.
 for(let i=0;i<src.length;i+=3){const v=[src[i],src[i+1],src[i+2]];let k=0;for(let j=1;j<3;j++)if(v[j]<v[k]||(v[j]===v[k]&&v[(j+1)%3]<v[(k+1)%3]))k=j;dst[i]=v[k];dst[i+1]=v[(k+1)%3];dst[i+2]=v[(k+2)%3];}
 return {...accessor(a),bytes:digest(Buffer.from(dst.buffer,dst.byteOffset,dst.byteLength))};
}
/** Unordered primitive signatures survive I/O accessor ordering while preserving all supplied surfaces and channels. */
export function sourceDetail(doc){
 const primitives=[];let triangles=0;
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  const attributes=Object.fromEntries(p.listSemantics().sort().map(s=>[s,accessor(p.getAttribute(s))]));
  primitives.push(JSON.stringify({mode:p.getMode(),indices:p.getMode()===4?triangleIndices(p.getIndices()):accessor(p.getIndices()),attributes}));
  if(p.getMode()===4)triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
 }
 const textures=doc.getRoot().listTextures().map(t=>digest(t.getImage()??new Uint8Array())).sort();
 return {triangles,primitives:primitives.length,geometrySha256:digest(primitives.sort().join('\n')),textureSha256:digest(textures.join('\n')),textureCount:textures.length};
}
export function assertSourceDetail(source,output){
 for(const key of ['triangles','geometrySha256','textureSha256'])if(source[key]!==output[key])throw Error('High detail differs from source: '+key);
 return true;
}
