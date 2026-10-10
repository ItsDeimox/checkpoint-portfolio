import {MathUtils} from 'three';

export const PORTAL_JOIN_SPEED=14;
/** C3 easing: position, velocity, acceleration and jerk settle at both ends. */
export function smoothPortalTime(t){
 t=MathUtils.clamp(Number.isFinite(t)?t:0,0,1);
 return t*t*t*t*(35+t*(-84+t*(70-20*t)));
}
/** De Casteljau in preallocated scratch storage, stable even near an endpoint. */
export function bezierSampler(points){
 const controls=points.map(p=>p.clone()),scratch=controls.map(p=>p.clone());
 return (time,out)=>{
  const t=MathUtils.clamp(Number.isFinite(time)?time:0,0,1);
  for(let i=0;i<controls.length;i++)scratch[i].copy(controls[i]);
  for(let count=controls.length-1;count>0;count--)for(let i=0;i<count;i++)scratch[i].lerp(scratch[i+1],t);
  return out.copy(scratch[0]);
 };
}
/** A bounded control hull: lift before the rotating vehicle, straighten before
 * the doorway. The four endpoint controls match three time derivatives. */
export function portalApproachSampler(start,dock,basis,duration){
 const step=PORTAL_JOIN_SPEED*duration/9;
 const controls=Array.from({length:10},()=>start.clone());
 controls[4].lerp(dock,.34);controls[5].lerp(dock,.67);
 controls[4].y=controls[5].y=5.8;
 for(let i=6;i<=9;i++)controls[i].copy(dock).addScaledVector(basis.forward,-(9-i)*step);
 return bezierSampler(controls);
}
/** Flight shares v=14, a=0, j=0 with the approach and ends with v=a=j=0. */
export function portalFlightDistance(progress,duration){
 const t=MathUtils.clamp(Number.isFinite(progress)?progress:0,0,1);
 const s=PORTAL_JOIN_SPEED*duration/26.2;
 // Degree-seven Hermite basis with derivative constraints at both boundaries.
 return -3.2+26.2*(s*t+t*t*t*t*((35-20*s)+t*((45*s-84)+t*((70-36*s)+t*(10*s-20)))));
}
