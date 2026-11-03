import * as T from 'three';
const axis=new T.Vector3(),delta=new T.Quaternion(),inverse=new T.Quaternion();
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
/** Camera-space incremental rotation: no Euler accumulation, poles or orientation-dependent inversion. */
export function rotateInView(q,dx,dy,cameraQ,extent,parentQ=null){
 const length=Math.hypot(dx,dy);if(!length)return q;
 axis.set(dy,dx,0).normalize().applyQuaternion(cameraQ);
 if(parentQ)axis.applyQuaternion(inverse.copy(parentQ).invert());
 delta.setFromAxisAngle(axis,length*Math.PI*1.25/Math.max(160,extent));return q.premultiply(delta).normalize();
}
export function componentPose(part,coverage){
 if(part==='fairing'&&coverage?.features.includes('fairing-inner-wall'))return new T.Quaternion().setFromEuler(new T.Euler(.22,1.36,0));
 if(part==='interstage'&&coverage?.features.includes('hotstage-base-sleeve'))return new T.Quaternion().setFromEuler(new T.Euler(.43,.28,0));
 if(part==='tanks'&&coverage?.features.some(id=>id==='first-stage-open-panel'||id==='heavy-core-cover'))return new T.Quaternion().setFromEuler(new T.Euler(.12,1.07,0));
 if(part==='tanks'&&coverage?.features.includes('booster-dome-downcomer'))return new T.Quaternion().setFromEuler(new T.Euler(.20,.30,0));
 if(part==='engines')return new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),new T.Vector3(.30,-.45,1).normalize());
 return new T.Quaternion().setFromEuler(new T.Euler(-.08,.24,0));
}
/** Bound the closest depth while keeping a useful depth-buffer distribution for tiny source details. */
export function depthRange(distance,radius){
 const clearance=Math.max(.004,distance-radius);
 const near=Math.max(.002,Math.min(clearance*.22,distance*.12));
 return {near,far:Math.max(20,distance+radius*6),clearance};
}
/** A centered bounding sphere remains safe under arbitrary XY inspection rotation. */
export function inspectionFit(bounds,width,height,zoom=1){
 const radius=bounds.getSize(new T.Vector3()).length()/2,aspect=Math.max(.25,width/Math.max(height,1)),mobile=width<760,tan=Math.tan(16*Math.PI/180);
 const top=mobile?Math.min(92,height*.18):90,bottom=mobile?height*.54-18:height-110;
 const usableY=Math.max(.22,(bottom-top)/height),usableX=mobile?.84:.47;
 const half=Math.atan(tan*Math.min(usableY,aspect*usableX));
 const distance=Math.max(radius*1.55,radius/Math.sin(half)*clamp(zoom,.7,1.8));
 const centerY=radius+.08,targetX=mobile?0:distance*tan*aspect*.31;
 const targetY=mobile?centerY+distance*tan*((top+bottom)/height-1):centerY;
 return {radius,distance,centerY,position:[targetX,targetY,distance],target:[targetX,targetY,0],...depthRange(distance,radius)};
}
export function dragCarousel(start,dx,stride,min,max){
 const p=start-dx/Math.max(1,stride);
 return p<min?min-.22*(1-Math.exp((p-min)*3)):p>max?max+.22*(1-Math.exp((max-p)*3)):p;
}
export function settleCarousel(position,velocity,start,min,max,cancelled=false){
 if(cancelled)return clamp(Math.round(start),min,max);
 const projected=position+clamp(velocity,-3,3)*.18;
 let result=Math.round(projected);
 if(Math.abs(position-start)>.12&&Math.abs(velocity)>.8)result=Math.round(start)+Math.sign(velocity);
 return clamp(result,Math.max(min,Math.round(start)-1),Math.min(max,Math.round(start)+1));
}
/** Smooth, velocity-continuous scalar settling without allocating per-frame objects. */
export class CarouselMotion{
 constructor(position=1){this.position=position;this.velocity=0;this.target=position;this.dragging=false;}
 snap(position){this.position=this.target=position;this.velocity=0;this.dragging=false;}
 step(dt){
  if(this.dragging)return false;
  const x=this.position-this.target,v=this.velocity,w=15,t=Math.min(.05,dt),e=Math.exp(-w*t),c=v+w*x;
  this.position=this.target+(x+c*t)*e;this.velocity=(v-w*c*t)*e;
  if(Math.abs(this.position-this.target)<.00015&&Math.abs(this.velocity)<.002){this.position=this.target;this.velocity=0;return false;}return true;
 }
}
/** Material state is cached once. Only fade endpoints change shader/render flags. */
const surfaceStates=new WeakMap();
export function cloneSurface(source){const material=source.clone(),base=surfaceStates.get(source);if(base)Object.assign(material,base);return material;}
export function createFade(group){
 const unique=new Map();group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!unique.has(m))unique.set(m,{opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,forceSinglePass:m.forceSinglePass});});
 for(const [m,base]of unique)surfaceStates.set(m,base);
 let value=1,partial=false;
 function set(alpha){
  alpha=clamp(alpha,0,1);group.visible=alpha>.0001;if(alpha===value)return;value=alpha;const next=alpha>0.0001&&alpha<.9999;
  for(const [m,base]of unique){if(next!==partial){m.transparent=next?true:base.transparent;m.depthWrite=next?false:base.depthWrite;m.forceSinglePass=next?true:base.forceSinglePass;m.needsUpdate=true;}m.opacity=base.opacity*alpha;}
  partial=next;group.visible=alpha>.0001;
 }
 return {group,get value(){return value;},set,restore(){set(1);}};
}
