import * as T from 'three';
import {heavyCorePart} from './heavy-regions.js';
/** Copy existing source triangles without losing material boundaries or vertex attributes. */
export function bakeSourceRange(source,start,count,matrix,keepIndex=false){
 const index=source.index,total=index?.count??source.getAttribute('position').count,length=Math.min(total,start+count)-start;
 if(length<=0||length%3)throw Error('Invalid authored triangle range');
 const mirrored=matrix.determinant()<0,result=new T.BufferGeometry();
 // Keep only vertices referenced by this material range. Source IDs (including
 // UV and normal seams) stay distinct even when adjacent positions coincide.
 const compact=keepIndex&&index&&source.hasAttribute('normal');
 const maxVertices=compact?Math.min(length,source.attributes.position.count):length;
 const vertices=new Uint32Array(maxVertices);
 let vertexCount=0;
 const remap=compact?new Uint32Array(source.attributes.position.count):null;
 const IndexArray=maxVertices<65535?Uint16Array:Uint32Array;
 const corners=compact?new IndexArray(length):null;
 const winding=mirrored?[0,2,1]:[0,1,2];
 for(let i=0;i<length;i++){
  const corner=i-i%3+winding[i%3];
  const sourceId=index?index.getX(start+corner):start+corner;
  if(compact){
   if(!remap[sourceId]){vertices[vertexCount]=sourceId;remap[sourceId]=++vertexCount;}
   corners[i]=remap[sourceId]-1;
  }else vertices[vertexCount++]=sourceId;
 }
 if(compact)result.setIndex(new T.BufferAttribute(corners,1));
 for(const [name,a] of Object.entries(source.attributes)){
  const values=new Float32Array(vertexCount*a.itemSize);
  for(let i=0;i<vertexCount;i++){
   for(let c=0;c<a.itemSize;c++)values[i*a.itemSize+c]=a.getComponent(vertices[i],c);
   if(mirrored&&name==='tangent')values[i*a.itemSize+3]*=-1;
  }
  result.setAttribute(name,new T.BufferAttribute(values,a.itemSize));
 }
 result.applyMatrix4(matrix);if(!result.getAttribute('normal'))result.computeVertexNormals();return result;
}
/** Recover whole connected surfaces from a flattened source. UV seams are not physical seams.
 * The position map is adjacency-only: every original attribute/triangle is copied unchanged.
 */
export function partitionAuthoredRegions(geometry,height){
 const a=geometry.getAttribute('position');
 if(!a||geometry.index||a.count%3||!(height>0))throw Error('Expected baked source triangles and positive height');
 const count=a.count/3,parent=new Uint32Array(count),rank=new Uint8Array(count),ids=new Uint32Array(a.count),vertices=new Map(),edges=new Map();
 for(let i=0;i<count;i++)parent[i]=i;
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(x,y)=>{x=root(x);y=root(y);if(x===y)return;if(rank[x]<rank[y])[x,y]=[y,x];parent[y]=x;if(rank[x]===rank[y])rank[x]++;};
 const epsilon=height*1e-7;
 for(let i=0;i<a.count;i++){
  const key=[a.getX(i),a.getY(i),a.getZ(i)].map(x=>Math.round(x/epsilon)).join(',');
  if(!vertices.has(key))vertices.set(key,vertices.size);ids[i]=vertices.get(key);
 }
 for(let t=0;t<count;t++)for(let e=0;e<3;e++){
  const x=ids[t*3+e],y=ids[t*3+(e+1)%3];if(x===y)continue;
  const key=x<y?x+':'+y:y+':'+x;
  if(edges.has(key))join(t,edges.get(key));else edges.set(key,t);
 }
 const components=new Map();
 for(let i=0;i<a.count;i+=3){
  const key=root(i/3);if(!components.has(key))components.set(key,{indices:[],min:Infinity,max:-Infinity});const c=components.get(key);
  for(let j=0;j<3;j++){c.indices.push(i+j);c.min=Math.min(c.min,a.getY(i+j));c.max=Math.max(c.max,a.getY(i+j));}
 }
 return [...components.values()].map(c=>{
  // Only the central body spans nearly the whole vehicle. Side booster noses
  // remain part of their own cores, even at the center interstage's height.
  const length=(c.max-c.min)/height;
  const assemblyContext=length>.85;
  const sideBody=length>.55&&!assemblyContext;
  const engine=c.max/height<.04;
  let minX=Infinity,maxX=-Infinity;
  for(const i of c.indices){minX=Math.min(minX,a.getX(i));maxX=Math.max(maxX,a.getX(i));}
  const central=Math.abs((minX+maxX)/2)<height*.035;
  const part=engine?'engines':sideBody||assemblyContext||!central?'tanks':heavyCorePart((c.max+c.min)/(2*height));
  const inspectionParts=engine||sideBody?[part]:[];
  const result=new T.BufferGeometry();
  for(const [name,a]of Object.entries(geometry.attributes)){
   const values=new Float32Array(c.indices.length*a.itemSize);
   for(let i=0;i<c.indices.length;i++)for(let k=0;k<a.itemSize;k++)values[i*a.itemSize+k]=a.getComponent(c.indices[i],k);
   result.setAttribute(name,new T.BufferAttribute(values,a.itemSize));
  }
  return {part,geometry:result,inspectionParts,assemblyContext,role:sideBody?'booster-shell':undefined};
 });
}
