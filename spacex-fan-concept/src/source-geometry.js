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
/** Pick a region without ever cutting the source surface at that height. */
export function authoredRegion(y){return y>.805?'fairing':y>.535?'interstage':y<.095?'engines':'tanks';}
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
  const assemblyContext=(c.max-c.min)>height*.25;
  const part=assemblyContext?'tanks':authoredRegion((c.min+c.max)/(2*height));
  const inspectionParts=assemblyContext?['tanks',...(c.max>height*.535?['interstage']:[]),...(c.max>height*.805?['fairing']:[])]:[part];
  const result=new T.BufferGeometry();
  for(const [name,a]of Object.entries(geometry.attributes)){
   const values=new Float32Array(c.indices.length*a.itemSize);
   for(let i=0;i<c.indices.length;i++)for(let k=0;k<a.itemSize;k++)values[i*a.itemSize+k]=a.getComponent(c.indices[i],k);
   result.setAttribute(name,new T.BufferAttribute(values,a.itemSize));
  }
  return {part,geometry:result,inspectionParts,assemblyContext};
 });
}
