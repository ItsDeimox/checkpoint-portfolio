/** Surface coordinates have identical endpoints on adjacent faces. */
export function cubePoint(face,u,v){
 const x=u*2-1,y=v*2-1;
 return [[1,y,-x],[-1,y,x],[x,1,-y],[x,-1,y],[x,y,1],[-x,y,-1]][face];
}
export const CUBE_NORMALS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
function cubeHash(n){return ((Math.imul(n+11,1664525)+1013904223)>>>0)/4294967296;}

/** A closed, shared-vertex graph. Emission crosses seams; geometry stays rigid. */
export class CubeEnergyField{
 constructor(segments=24){
  this.segments=segments;this.size=segments+1;this.textureWidth=this.size*3;this.textureHeight=this.size*2;
  this.vertices=[];this.faces=[];const ids=new Map(),edgeIds=new Set(),edges=[];
  for(let face=0;face<6;face++){
   const map=[];
   for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++){
    const p=cubePoint(face,x/segments,y/segments),key=p.map(v=>Math.round(v*segments)).join(',');
    if(!ids.has(key)){ids.set(key,this.vertices.length);this.vertices.push(p);}
    map.push(ids.get(key));
   }
   this.faces.push(map);
   for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++){
    const a=map[y*this.size+x];
    for(const b of [x<segments?map[y*this.size+x+1]:-1,y<segments?map[(y+1)*this.size+x]:-1]){
     if(b<0)continue;const key=[Math.min(a,b),Math.max(a,b)].join(':');
     if(!edgeIds.has(key)){edgeIds.add(key);edges.push([a,b,.5+.9*cubeHash(a*331+b*91)]);}
    }
   }
  }
  this.edges=edges;this.count=this.vertices.length;this.height=new Float32Array(this.count);this.velocity=new Float32Array(this.count);this.glow=new Float32Array(this.count);this.force=new Float32Array(this.count);
  this.data=new Float32Array(this.textureWidth*this.textureHeight*4);this.version=0;this.awake=false;this.age=0;this.accumulator=0;this.impulses=0;
  this.fixedStep=Math.min(1/120,.23/segments/1.8);this.pack();
 }
 inject(point,strength=.7){
  if(!point?.every(Number.isFinite)||!Number.isFinite(strength))return;
  let nearest=0,best=Infinity;
  for(let i=0;i<this.count;i++){const p=this.vertices[i],d=p.reduce((sum,v,j)=>sum+(v-point[j])**2,0);if(d<best){best=d;nearest=i;}if(d<.045)this.velocity[i]+=Math.exp(-d/.009)*Math.min(strength,2)*3;}
  this.velocity[nearest]+=Math.min(strength,2)*2;this.awake=true;this.age=0;this.impulses++;
 }
 step(dt){
  if(!this.awake||!Number.isFinite(dt)||dt<=0)return;
  this.accumulator+=Math.min(dt,.06);
  while(this.accumulator>=this.fixedStep){
   const h=this.fixedStep,spring=(1.8*this.segments/2)**2;this.force.fill(0);
   for(const [a,b,w] of this.edges){const f=(this.height[b]-this.height[a])*spring*w;this.force[a]+=f;this.force[b]-=f;}
   const decay=Math.exp(-4.4*h),afterglow=Math.exp(-3.6*h);
   for(let i=0;i<this.count;i++){
    this.velocity[i]=(this.velocity[i]+(this.force[i]-this.height[i]*12)*h)*decay;
    this.height[i]+=this.velocity[i]*h;
    this.glow[i]=Math.max(this.glow[i]*afterglow,Math.min(2.5,Math.abs(this.height[i])*18+Math.abs(this.velocity[i])*.55));
   }
   this.accumulator-=h;this.age+=h;
  }
  this.pack();
  if(this.age>5&&this.peak<.002){this.reset();}
 }
 pack(){
  this.peak=0;
  for(let face=0;face<6;face++){
   const ox=(face%3)*this.size,oy=Math.floor(face/3)*this.size;
   for(let y=0;y<this.size;y++)for(let x=0;x<this.size;x++){
    const node=this.faces[face][y*this.size+x],i=((oy+y)*this.textureWidth+ox+x)*4,g=this.glow[node];
    this.data[i]=g;this.data[i+1]=cubeHash(node*731);this.data[i+2]=cubeHash(node*937);this.data[i+3]=1;this.peak=Math.max(this.peak,g);
   }
  }
  this.version++;
 }
 reset(){this.height.fill(0);this.velocity.fill(0);this.glow.fill(0);this.awake=false;this.accumulator=0;this.pack();}
 energyOnFace(face){return this.faces[face].reduce((m,i)=>Math.max(m,this.glow[i]),0);}
 inspect(){return {vertices:this.count,edges:this.edges.length,peak:this.peak,awake:this.awake,impulses:this.impulses};}
}
