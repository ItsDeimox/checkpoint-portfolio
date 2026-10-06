/** Adaptado do Checkpoint Portfolio de ItsDeimox. Impulsos locais na malha. */
const VERTEX_ENERGY_DEFAULTS = Object.freeze({
 waveSpeed:2.65, damping:6.8, returnSpring:20,
 impulseStrength:5.8, entryImpulse:.95, impulseRadius:2.4,
 glowDecay:4.8, displacementLimit:.20, speedLimit:14,
 fixedStep:1/120,
});

function energyNoise(index, seed) {
 let h=(index ^ Math.imul(seed+1,0x9e3779b9))>>>0;
 h=Math.imul(h^(h>>>16),0x7feb352d);
 h=Math.imul(h^(h>>>15),0x846ca68b);
 return ((h^(h>>>16))>>>0)/4294967296;
}
function energyClamp(value,min,max){return Math.min(max,Math.max(min,value));}

class VertexEnergyField {
 constructor({columns=44,rows=72,width=2.42,height=4.4,seed=1,...options}={}) {
  if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<2||rows<2||width<=0||height<=0)throw new RangeError('Invalid vertex lattice.');
  this.columns=columns;this.rows=rows;this.width=width;this.height=height;this.seed=seed;
  this.options={...VERTEX_ENERGY_DEFAULTS,...options};
  this.textureWidth=columns+1;this.textureHeight=rows+1;
  this.count=this.textureWidth*this.textureHeight;this.dx=width/columns;this.dy=height/rows;
  this.displacement=new Float32Array(this.count);this.velocity=new Float32Array(this.count);
  this.glow=new Float32Array(this.count);this.acceleration=new Float32Array(this.count);
  this.nodeGain=new Float32Array(this.count);this.boundary=new Uint8Array(this.count);
  this.data=new Float32Array(this.count*4);
  this.awake=false;this.version=0;this.impulses=0;this.accumulator=0;this.idleTime=0;
  const edgesA=[],edgesB=[],weights=[];
  const addEdge=(a,b,conductance,distanceSquared)=>{
   edgesA.push(a);edgesB.push(b);weights.push(this.options.waveSpeed**2*conductance/distanceSquared);
  };
  for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++) {
   const i=y*this.textureWidth+x;
   const horizontal=.28+1.32*energyNoise(i*3,seed);
   const vertical=.28+1.32*energyNoise(i*3+1,seed);
   const diagonal=.14+.30*energyNoise(i*3+2,seed);
   this.nodeGain[i]=.7+.6*energyNoise(i,seed+17);
   this.boundary[i]=+(x===0||y===0||x===columns||y===rows);
   this.data[i*4+2]=horizontal;this.data[i*4+3]=vertical;
   if(x<columns)addEdge(i,i+1,horizontal,this.dx*this.dx);
   if(y<rows)addEdge(i,i+this.textureWidth,vertical,this.dy*this.dy);
   // Same a-to-d diagonal used by cardGeometry's actual triangle indices.
   if(x<columns&&y<rows)addEdge(i,i+this.textureWidth+1,diagonal,this.dx*this.dx+this.dy*this.dy);
  }
  this.edgeA=new Uint16Array(edgesA);this.edgeB=new Uint16Array(edgesB);this.edgeWeights=new Float32Array(weights);
  // Conservative CFL guard also keeps edited grid resolutions stable.
  const rowSum=new Float32Array(this.count);
  for(let e=0;e<weights.length;e++){rowSum[edgesA[e]]+=weights[e];rowSum[edgesB[e]]+=weights[e];}
  let maxSum=0;for(const sum of rowSum)maxSum=Math.max(maxSum,sum);
  this.fixedStep=Math.min(this.options.fixedStep,1.5/Math.sqrt(2*maxSum+this.options.returnSpring));
  this.stats={peakDisplacement:0,peakGlow:0,activeNodes:0,totalGlow:0};
 }

 /** Resample along the whole local-space path so quick swipes leave no gaps. */
 addStroke({from,to,velocity,distance,entered}) {
  if(![...from,...to,...velocity,distance].every(Number.isFinite))return;
  const speed=Math.min(this.options.speedLimit,Math.hypot(...velocity));
  if(!entered&&(distance<=1e-6||speed<=1e-5))return;
  const spacing=Math.min(this.dx,this.dy)*1.25;
  const samples=entered?1:Math.min(32,Math.max(1,Math.ceil(distance/spacing)));
  const response=1-Math.exp(-speed/3.2);
  // Budget is proportional to path length, not pointer-event frequency.
  const strength=entered?this.options.entryImpulse:
   this.options.impulseStrength*(.10+.90*response)*Math.min(distance,.9)/(samples*.065);
  const length=Math.hypot(...velocity);
  const direction=length>1e-6?[velocity[0]/length,velocity[1]/length]:[0,0];
  for(let s=1;s<=samples;s++) {
   const t=s/samples,u=from[0]+(to[0]-from[0])*t,v=from[1]+(to[1]-from[1])*t;
   this.injectAt(u,v,strength,direction,entered);
  }
  this.impulses++;this.idleTime=0;this.awake=true;this.pack();
 }

 injectAt(u,v,strength,direction,entered) {
  const cx=Math.round(energyClamp(u,0,1)*this.columns),cy=Math.round(energyClamp(v,0,1)*this.rows);
  const r=this.options.impulseRadius,rr=r*r,extent=Math.ceil(r);
  for(let y=Math.max(1,cy-extent);y<=Math.min(this.rows-1,cy+extent);y++) {
   for(let x=Math.max(1,cx-extent);x<=Math.min(this.columns-1,cx+extent);x++) {
    const gx=x-cx,gy=(y-cy)*this.dy/this.dx,d2=gx*gx+gy*gy;
    if(d2>rr)continue;
    const i=y*this.textureWidth+x;
    const along=(gx*direction[0]+gy*direction[1])/r;
    // A directional crest/trough pushes ahead of a swipe and pulls behind it.
    const dipole=entered?1:.56+1.30*along;
    const kick=strength*Math.exp(-d2/(rr*.42))*dipole*this.nodeGain[i];
    this.velocity[i]=energyClamp(this.velocity[i]+kick,-24,24);
    this.glow[i]=Math.max(this.glow[i],Math.min(4,Math.abs(kick)*.25));
   }
  }
 }

 step(dt) {
  if(!this.awake||!Number.isFinite(dt)||dt<=0)return false;
  this.accumulator+=Math.min(dt,.1);
  let changed=false;
  while(this.accumulator+1e-10>=this.fixedStep) {
   this.integrate(this.fixedStep);this.accumulator-=this.fixedStep;this.idleTime+=this.fixedStep;changed=true;
  }
  if(changed) {
   this.pack();
   let maxVelocity=0;for(const v of this.velocity)maxVelocity=Math.max(maxVelocity,Math.abs(v));
   if(this.idleTime>1.5&&this.stats.peakDisplacement<.00008&&maxVelocity<.0015&&this.stats.peakGlow<.003)this.reset();
  }
  return changed;
 }

 integrate(dt) {
  const h=this.displacement,v=this.velocity,a=this.acceleration,g=this.glow,o=this.options;
  a.fill(0);
  for(let edge=0;edge<this.edgeWeights.length;edge++) {
   const i=this.edgeA[edge],j=this.edgeB[edge],force=(h[j]-h[i])*this.edgeWeights[edge];
   a[i]+=force;a[j]-=force;
  }
  const damping=Math.exp(-o.damping*dt),afterglow=Math.exp(-o.glowDecay*dt);
  for(let i=0;i<this.count;i++) {
   if(this.boundary[i]){h[i]=0;v[i]=0;g[i]*=afterglow;continue;}
   v[i]=(v[i]+(a[i]-o.returnSpring*h[i])*dt)*damping;
   const next=h[i]+v[i]*dt;
   h[i]=energyClamp(next,-o.displacementLimit,o.displacementLimit);
   if(Math.abs(next)>o.displacementLimit)v[i]*=.35;
   const energy=Math.min(4,(Math.abs(v[i])*.65+Math.abs(h[i])*18)*this.nodeGain[i]);
   g[i]=Math.max(g[i]*afterglow,energy);
  }
 }

 pack() {
  let peakDisplacement=0,peakGlow=0,activeNodes=0,totalGlow=0;
  for(let i=0;i<this.count;i++) {
   this.data[i*4]=this.displacement[i];this.data[i*4+1]=this.glow[i];
   peakDisplacement=Math.max(peakDisplacement,Math.abs(this.displacement[i]));peakGlow=Math.max(peakGlow,this.glow[i]);
   if(this.glow[i]>.012)activeNodes++;totalGlow+=this.glow[i];
  }
  this.stats={peakDisplacement,peakGlow,activeNodes,totalGlow};this.version++;
 }
 reset() {
  if(!this.awake)return;
  this.displacement.fill(0);this.velocity.fill(0);this.glow.fill(0);this.acceleration.fill(0);
  this.awake=false;this.accumulator=0;this.idleTime=0;this.pack();
 }
 inspect(){return {...this.stats,awake:this.awake,impulses:this.impulses,vertices:this.count};}
}

/** Real pointer timestamps only. A frame's re-pick must never become an emitter. */
class SurfaceImpulseTracker {
 constructor(width,height){this.width=width;this.height=height;this.previous=null;}
 reset(){this.previous=null;}
 sample(index,uv,timeStamp,screen) {
  if(!Number.isFinite(timeStamp)||!uv.every(Number.isFinite)||!screen.every(Number.isFinite))return null;
  const previous=this.previous;
  if(previous&&timeStamp<=previous.timeStamp)return null;
  const current={index,uv:[...uv],timeStamp,screen:[...screen]};
  this.previous=current;
  if(!previous||previous.index!==index)return {from:[...uv],to:[...uv],velocity:[0,0],distance:0,entered:true};
  if(Math.hypot(screen[0]-previous.screen[0],screen[1]-previous.screen[1])<.01)return null;
  const dx=(uv[0]-previous.uv[0])*this.width,dy=(uv[1]-previous.uv[1])*this.height;
  const distance=Math.hypot(dx,dy);
  if(distance<.0001)return null;
  const seconds=Math.max(.004,(timeStamp-previous.timeStamp)/1000);
  return {from:previous.uv,to:[...uv],velocity:[dx/seconds,dy/seconds],distance,entered:false};
 }
}


export { VertexEnergyField, SurfaceImpulseTracker };
