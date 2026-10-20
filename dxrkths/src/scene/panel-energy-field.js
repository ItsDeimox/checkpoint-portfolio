/** The card lattice has zigzag rails and alternating cross-ribs. Every
 * interior junction has three neighbours; adjacent chevrons split and rejoin
 * the same wave. The shader reads these exact connections from the texture. */
export const PANEL_LATTICE = Object.freeze({segments:26,rowRatio:.8,bend:.5});

function hash(n){return ((Math.imul(n+11,1664525)+1013904223)>>>0)/4294967296;}
const clamp01=n=>Math.max(0,Math.min(1,n));

/** A single physical plane, with one guard cell beyond each visible edge.
 * Frame-time state is preallocated. Pointer injection touches a small local
 * neighbourhood; the solver and uploads only run while a wave is alive. */
export class PanelEnergyField {
 constructor(aspect=1){
  this._pointer={p:new Float32Array(3),time:0};this.previous=null;
  this.version=0;this.impulses=0;this.fixedStep=1/120;this.maxSubsteps=8;
  this.setAspect(aspect);
 }
 setAspect(aspect){
  if(!Number.isFinite(aspect)||aspect<=0)aspect=1;
  if(aspect===this.aspect)return;
  this.aspect=aspect;this.span=aspect>=1?[1,1/aspect]:[aspect,1];
  const {segments,rowRatio,bend}=PANEL_LATTICE;
  this.segments=segments;this.pitchX=1/segments;this.pitchY=rowRatio/segments;
  this.grid=[this.span[0]/this.pitchX,this.span[1]/this.pitchY];
  this.textureWidth=Math.ceil(this.grid[0])+3;this.textureHeight=Math.ceil(this.grid[1])+3;
  this.size=this.textureWidth;this.count=this.textureWidth*this.textureHeight;
  this.vertices=new Array(this.count);this.edges=[];
  this.height=new Float32Array(this.count);this.velocity=new Float32Array(this.count);
  this.glow=new Float32Array(this.count);this.force=new Float32Array(this.count);
  this.data=new Float32Array(this.count*4);
  const width=this.textureWidth,rows=this.textureHeight;
  for(let r=0;r<rows;r++)for(let c=0;c<width;c++){
   const id=r*width+c;
   this.vertices[id]=[2*((c-1)*this.pitchX-this.span[0]*.5),2*((r-1+(c%2)*bend)*this.pitchY-this.span[1]*.5),1];
   if(c<width-1){
    const conductance=.86+.14*hash(r*197+c*73);
    this.edges.push([id,id+1,conductance]);this.data[id*4+1]=conductance;
   }
   if(r<rows-1&&(c+r)%2===0){
    const conductance=.40+.22*hash(r*97+c*211);
    this.edges.push([id,id+width,conductance]);this.data[id*4+2]=conductance;
   }
  }
  this.edgeA=new Uint16Array(this.edges.length);this.edgeB=new Uint16Array(this.edges.length);
  this.edgeSpring=new Float32Array(this.edges.length);
  for(let i=0;i<this.edges.length;i++){
   const [a,b,w]=this.edges[i],p=this.vertices[a],q=this.vertices[b];
   const dx=p[0]-q[0],dy=p[1]-q[1];
   this.edgeA[i]=a;this.edgeB[i]=b;this.edgeSpring[i]=1.8*1.8*w/(dx*dx+dy*dy);
  }
  this.awake=false;this.peak=0;this.age=0;this.accumulator=0;this.lastSubsteps=0;
  this.release();this.version++;
 }
 point(x,y,time){
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(time))return false;
  x=clamp01(x);y=clamp01(y);
  const px=(x-.5)*this.span[0]*2,py=(y-.5)*this.span[1]*2,last=this.previous;
  let strength=.40;
  if(last){
   if(time<=last.time)return false;
   const distance=Math.hypot(px-last.p[0],py-last.p[1]);
   const speed=distance/Math.max(.008,(time-last.time)/1000);
   last.p[0]=px;last.p[1]=py;last.time=time;
   if(distance<=.003)return false;
   strength=Math.min(1.65,.20+speed*.14);
  }else{
   this.previous=this._pointer;this._pointer.p[0]=px;this._pointer.p[1]=py;this._pointer.p[2]=1;this._pointer.time=time;
  }
  return this.inject(x,y,strength);
 }
 inject(x,y,strength=.40){
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(strength)||strength<=0)return false;
  x=clamp01(x);y=clamp01(y);strength=Math.min(2,strength);
  const px=(x-.5)*this.span[0]*2,py=(y-.5)*this.span[1]*2;
  const gx=x*this.grid[0]+1,gy=y*this.grid[1]+1,width=this.textureWidth;
  // The .045 physical footprint is the previous material's input size. A
  // bounded neighbourhood replaces a search across six entire cube faces.
  const rx=Math.ceil(Math.sqrt(.045)/(2*this.pitchX))+1,ry=Math.ceil(Math.sqrt(.045)/(2*this.pitchY))+1;
  const minX=Math.max(0,Math.floor(gx)-rx),maxX=Math.min(width-1,Math.floor(gx)+rx);
  const minY=Math.max(0,Math.floor(gy)-ry),maxY=Math.min(this.textureHeight-1,Math.floor(gy)+ry);
  let nearest=0,best=Infinity;
  for(let r=minY;r<=maxY;r++)for(let c=minX;c<=maxX;c++){
   const id=r*width+c,p=this.vertices[id],dx=p[0]-px,dy=p[1]-py,d=dx*dx+dy*dy;
   if(d<best){best=d;nearest=id;}
   if(d<.045)this.velocity[id]=Math.min(28,this.velocity[id]+Math.exp(-d/.009)*strength*3);
  }
  this.velocity[nearest]=Math.min(28,this.velocity[nearest]+strength*2);
  this.awake=true;this.age=0;this.impulses++;return true;
 }
 step(dt){
  this.lastSubsteps=0;
  if(!this.awake||!Number.isFinite(dt)||dt<=0)return false;
  const h=this.fixedStep;
  this.accumulator=Math.min(this.accumulator+dt,h*this.maxSubsteps);
  const steps=Math.min(this.maxSubsteps,Math.floor((this.accumulator+1e-10)/h));
  if(steps===0)return false;
  const decay=Math.exp(-4.4*h),afterglow=Math.exp(-3.6*h);
  const height=this.height,velocity=this.velocity,glow=this.glow,force=this.force;
  for(let s=0;s<steps;s++){
   force.fill(0);
   for(let e=0;e<this.edgeA.length;e++){
    const a=this.edgeA[e],b=this.edgeB[e],f=(height[b]-height[a])*this.edgeSpring[e];
    force[a]+=f;force[b]-=f;
   }
   for(let i=0;i<this.count;i++){
    velocity[i]=(velocity[i]+(force[i]-height[i]*12)*h)*decay;
    height[i]+=velocity[i]*h;
    glow[i]=Math.max(glow[i]*afterglow,Math.min(2.5,Math.abs(height[i])*18+Math.abs(velocity[i])*.55));
   }
  }
  this.accumulator=Math.max(0,this.accumulator-steps*h);this.age+=steps*h;this.lastSubsteps=steps;
  this.pack();
  if(this.age>3&&this.peak<.002)this.clear();
  return true;
 }
 pack(){
  let peak=0;
  for(let i=0;i<this.count;i++){
   const g=this.glow[i];this.data[i*4]=g;
   this.data[i*4+3]=Math.min(2.5,Math.abs(this.height[i])*18+Math.abs(this.velocity[i])*.55);
   if(g>peak)peak=g;
  }
  this.peak=peak;this.version++;
 }
 release(){this.previous=null;}
 clear(){
  this.release();
  if(!this.awake&&this.peak===0&&this.accumulator===0)return false;
  this.height.fill(0);this.velocity.fill(0);this.glow.fill(0);this.force.fill(0);
  for(let i=0;i<this.count;i++){this.data[i*4]=0;this.data[i*4+3]=0;}
  this.awake=false;this.peak=0;this.age=0;this.accumulator=0;this.version++;return true;
 }
 reset(){return this.clear();}
 total(){let sum=0;for(let i=0;i<this.count;i++)sum+=this.glow[i];return sum;}
 activeCount(){let count=0;for(let i=0;i<this.count;i++)if(this.glow[i]>.001)count++;return count;}
 inspect(){return {vertices:this.count,edges:this.edgeA.length,faces:1,topology:'chevron',peak:this.peak,awake:this.awake,impulses:this.impulses,substeps:this.lastSubsteps};}
}
