import {Vector3,MathUtils} from 'three';

/** The tunnel finishes BEFORE a larger, separate destination wall.
 * Final camera framing matches the native viewport. Only ray/plane perspective
 * determines magnification and how much of the wall the tunnel opening hides.
 */
export const WALL_SCALE=3.2;
export function projectPortalExit(camera,basis,finalPose,viewport={}){
 const width=Number(viewport.width),height=Number(viewport.height);
 if(!(width>0&&height>0))return {visible:false,quad:[]};
 const aspect=width/height,ratio=MathUtils.clamp((viewport.contentWidth??width)/width,.1,1);
 const halfHeight=Math.min(basis.half.y,basis.half.x/aspect)*.92*WALL_SCALE;
 const halfWidth=halfHeight*aspect;
 const distance=halfHeight/Math.tan(MathUtils.degToRad(finalPose.fov)*.5);
 const finalDepth=basis.toLocal(finalPose.position).z;
 const exitDepth=finalDepth+distance;
 // Leave breathing room in front of the destination: the camera exits the
 // corridor before it finishes approaching the wall.
 const tunnelEndDepth=Math.max(5,finalDepth-distance*.48);
 const exitOffset=-halfWidth*(1-ratio),exitHalf=[halfWidth*ratio,halfHeight];
 const center=basis.center.clone().addScaledVector(basis.forward,exitDepth).addScaledVector(basis.right,exitOffset);
 camera.updateMatrixWorld(true);
 let visible=true;
 const quad=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>{
  const point=center.clone().addScaledVector(basis.right,x*exitHalf[0]).addScaledVector(basis.up,y*exitHalf[1]);
  const eye=point.clone().applyMatrix4(camera.matrixWorldInverse);
  if(eye.z>=-camera.near)visible=false;
  point.project(camera);
  const xy=[point.x*.5+.5,.5-point.y*.5];
  if(!xy.every(Number.isFinite))visible=false;
  return xy;
 });
 // Project the physical mouth of the tunnel onto the wall along camera rays.
 // Returned in SOURCE-page coordinates, not screen coordinates, so clipping
 // stays registered to the CSS matrix even on an oblique view or a resize.
 const eye=basis.toLocal(camera.position);
 let clip=[0,0,1,1];
 if(eye.z<tunnelEndDepth-camera.near){
  const k=(exitDepth-eye.z)/(tunnelEndDepth-eye.z);
  const lx=eye.x+(-basis.half.x-eye.x)*k,rx=eye.x+(basis.half.x-eye.x)*k;
  const by=eye.y+(-basis.half.y-eye.y)*k,ty=eye.y+(basis.half.y-eye.y)*k;
  const bound=v=>MathUtils.clamp(v,0,1);
  clip=[bound((lx-exitOffset+exitHalf[0])/(2*exitHalf[0])),bound((halfHeight-ty)/(2*halfHeight)),
   bound((rx-exitOffset+exitHalf[0])/(2*exitHalf[0])),bound((halfHeight-by)/(2*halfHeight))];
 }
 return {visible,quad,clip,width,height,contentWidth:width*ratio,exitDepth,exitHalf,exitOffset,tunnelEndDepth,
  distance:center.clone().sub(camera.position).dot(basis.forward)};
}
