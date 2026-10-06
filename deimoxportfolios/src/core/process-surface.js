/** Process cards are rigid surfaces. All dimensions below are CSS pixels. */
export const PROCESS_MATERIAL=Object.freeze({radius:9,cut:23,gridPitch:18,maxScale:1.028,maxLift:8});
export function makeProcessSurface(index){return {index,hover:0,target:0,scale:1,lift:0,pointer:[.5,.72],pointerTarget:[.5,.72],rect:[0,0,0,0],cssSize:[1,1],dim:0};}
export function advanceProcessSurface(surface,dt,reduced=false){
 const delta=Number.isFinite(dt)?Math.min(.25,Math.max(0,dt)):0;
 const target=surface.target?1:0,rate=target?11:7;
 surface.hover+=(target-surface.hover)*(1-Math.exp(-rate*delta));
 if(Math.abs(surface.hover-target)<.0001)surface.hover=target;
 for(let i=0;i<2;i++)surface.pointer[i]+=(surface.pointerTarget[i]-surface.pointer[i])*(1-Math.exp(-18*delta));
 surface.scale=reduced?1:1+(PROCESS_MATERIAL.maxScale-1)*surface.hover;
 surface.lift=reduced||surface.hover===0?0:-PROCESS_MATERIAL.maxLift*surface.hover;
 return surface;
}
/** Rounded convex hexagon: chamfers at upper-right/lower-left, tangent arcs at every join.
 * Origin is the lower-left, matching the GLSL surface coordinates. */
export function processShapeDistance(point,size,radius=PROCESS_MATERIAL.radius,cut=PROCESS_MATERIAL.cut){
 const [w,h]=size,r=Math.min(radius,w*.1,h*.1),hx=w*.5-r,hy=h*.5-r,c=Math.max(0,cut-r*(2-Math.SQRT2));
 const vertices=[[-hx,hy],[hx-c,hy],[hx,hy-c],[hx,-hy],[-hx+c,-hy],[-hx,-hy+c]];
 const p=[point[0]-w*.5,point[1]-h*.5];let distance=Infinity,inside=true;
 for(let i=0;i<6;i++){
  const a=vertices[i],b=vertices[(i+1)%6],e=[b[0]-a[0],b[1]-a[1]],v=[p[0]-a[0],p[1]-a[1]];
  const t=Math.min(1,Math.max(0,(v[0]*e[0]+v[1]*e[1])/(e[0]*e[0]+e[1]*e[1])));
  distance=Math.min(distance,Math.hypot(v[0]-e[0]*t,v[1]-e[1]*t));
  if(e[0]*v[1]-e[1]*v[0]>0)inside=false;
 }
 return (inside?-distance:distance)-r;
}
