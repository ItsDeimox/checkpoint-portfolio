import * as T from 'three';
/** Copy existing source triangles without losing material boundaries or vertex attributes. */
export function bakeSourceRange(source,start,count,matrix){
 const index=source.index,total=index?.count??source.getAttribute('position').count,length=Math.min(total,start+count)-start;
 if(length<=0||length%3)throw Error('Invalid authored triangle range');
 const mirrored=matrix.determinant()<0,result=new T.BufferGeometry();
 for(const [name,a] of Object.entries(source.attributes)){
  const values=new Float32Array(length*a.itemSize);
  for(let i=0;i<length;i++){
   const local=mirrored?i-i%3+[0,2,1][i%3]:i,vertex=index?index.getX(start+local):start+local;
   for(let c=0;c<a.itemSize;c++)values[i*a.itemSize+c]=a.getComponent(vertex,c);
   if(mirrored&&name==='tangent')values[i*a.itemSize+3]*=-1;
  }
  result.setAttribute(name,new T.BufferAttribute(values,a.itemSize));
 }
 result.applyMatrix4(matrix);if(!result.getAttribute('normal'))result.computeVertexNormals();return result;
}
/** Single-mesh region selection uses original triangles only; it does not generate caps or internals. */
export function partitionAuthoredRegions(geometry,height){
 const a=geometry.getAttribute('position'),bins=new Map();
 for(let i=0;i<a.count;i+=3){const y=(a.getY(i)+a.getY(i+1)+a.getY(i+2))/(3*height),part=y>.805?'fairing':y>.60?'interstage':y<.095?'engines':'tanks';if(!bins.has(part))bins.set(part,[]);bins.get(part).push(i,i+1,i+2);}
 return [...bins].map(([part,indices])=>{const result=new T.BufferGeometry();for(const [name,a] of Object.entries(geometry.attributes)){const values=new Float32Array(indices.length*a.itemSize);indices.forEach((v,i)=>{for(let c=0;c<a.itemSize;c++)values[i*a.itemSize+c]=a.getComponent(v,c);});result.setAttribute(name,new T.BufferAttribute(values,a.itemSize));}return {part,geometry:result};});
}
