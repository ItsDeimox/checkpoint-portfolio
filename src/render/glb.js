/** Small GLB reader for the supplied, self-contained DXT mark. No remote resources. */
export function parseLogoGLB(buffer){
 const view=new DataView(buffer);if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2)throw Error('Unsupported GLB');let json=null,binary=0;
 for(let at=12;at<buffer.byteLength;){const size=view.getUint32(at,true),type=view.getUint32(at+4,true);if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,at+8,size)));if(type===0x004e4942)binary=at+8;at+=size+8;}
 if(!json||!binary)throw Error('Incomplete GLB');const read=index=>{const a=json.accessors[index],b=json.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5126:4,5125:4,5123:2,5121:1}[a.componentType];if(!components||!bytes||a.sparse)throw Error('Unsupported accessor');const result=a.componentType===5126?new Float32Array(a.count*components):new Uint32Array(a.count*components);const start=binary+(b.byteOffset||0)+(a.byteOffset||0),stride=b.byteStride||bytes*components;for(let i=0;i<a.count;i++)for(let k=0;k<components;k++){const offset=start+i*stride+k*bytes;result[i*components+k]=a.componentType===5126?view.getFloat32(offset,true):bytes===4?view.getUint32(offset,true):bytes===2?view.getUint16(offset,true):view.getUint8(offset);}return result;};
 const meshes=json.meshes.flatMap(m=>m.primitives.map(p=>({positions:read(p.attributes.POSITION),normals:read(p.attributes.NORMAL),indices:read(p.indices),material:p.material??0})));
 let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const m of meshes)for(let i=0;i<m.positions.length;i++) {let a=i%3;min[a]=Math.min(min[a],m.positions[i]);max[a]=Math.max(max[a],m.positions[i]);}
 const center=min.map((v,i)=>(v+max[i])*.5),scale=2.5/(max[0]-min[0]);
 // Presentation intentionally uses mesh-local XY instead of Blender's ground-plane node.
 for(const m of meshes)for(let i=0;i<m.positions.length;i++)m.positions[i]=(m.positions[i]-center[i%3])*scale;
 return {meshes,triangles:meshes.reduce((n,m)=>n+m.indices.length/3,0),source:'DXTlogoPrinted.glb'};
}
