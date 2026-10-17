import {Vector3,MathUtils} from 'three';

/** A physical end wall. Its bounds fit the corridor; at the final camera pose,
 * the aperture matches the actual page viewport (not the outer scrollbar).
 * Intermediate sizes come only from camera projection and distance.
 */
export function projectPortalExit(camera,basis,finalPose,viewport={}){
 const width=Number(viewport.width),height=Number(viewport.height);
 if(!(width>0&&height>0))return {visible:false,quad:[]};
 const aspect=camera.aspect,ratio=MathUtils.clamp((viewport.contentWidth??width)/width,.1,1);
 const halfHeight=Math.min(basis.half.y,basis.half.x/aspect)*.92;
 const halfWidth=halfHeight*aspect;
 const distance=halfHeight/Math.tan(MathUtils.degToRad(finalPose.fov)*.5);
 const exitDepth=basis.toLocal(finalPose.position).z+distance;
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
 return {visible,quad,width,height,contentWidth:width*ratio,exitDepth,exitHalf,exitOffset,
  distance:center.clone().sub(camera.position).dot(basis.forward)};
}
