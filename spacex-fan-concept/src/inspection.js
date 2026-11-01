import * as T from 'three';
import {buildInterior} from './interiors.js';

/** Frame the actual selected bounds, including horizontal and UI-safe-area constraints. */
export function inspectionCamera(bounds,width,height){
 const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const aspect=Math.max(.25,width/Math.max(1,height)),mobile=width<760;
 const usableX=mobile?.80:.48,usableY=mobile?.48:.68,tan=Math.tan(16*Math.PI/180);
 const diameter=Math.hypot(size.x,size.z);
 const distance=Math.max(size.y/(2*tan*usableY),diameter/(2*tan*aspect*usableX))+size.z*.6;
 const targetX=mobile?center.x:center.x+distance*tan*aspect*.31;
 const targetY=mobile?center.y-distance*tan*.32:center.y;
 return {distance,position:[targetX,targetY+distance*.025,distance],target:[targetX,targetY,center.z]};
}

function visibleWithin(object,root){for(let n=object;n&&n!==root;n=n.parent)if(!n.visible)return false;return true;}

export function createInspection(model,index,part,payload='fairing'){
 const group=new T.Group(),exterior=new T.Group();group.name=`inspection-${part}`;group.add(exterior);
 const materials=new Set();model.group.updateMatrixWorld(true);
 const inverse=model.group.matrixWorld.clone().invert();
 model.group.traverse(original=>{
  if(!original.isMesh||original.userData.part!==part||!visibleWithin(original,model.group))return;
  if(part==='interstage'&&index!==3&&(original.userData.stage==='upper'||original.userData.boosterCap))return;
  const mesh=original.clone();mesh.children=[];mesh.geometry=original.geometry;
  const source=Array.isArray(original.material)?original.material:[original.material];
  const cloned=source.map(m=>{const material=m.clone();material.onBeforeCompile=()=>{};material.customProgramCacheKey=()=> 'inspection-surface';material.dithering=true;materials.add(material);return material;});
  mesh.material=Array.isArray(original.material)?cloned:cloned[0];
  inverse.clone().multiply(original.matrixWorld).decompose(mesh.position,mesh.quaternion,mesh.scale);
  exterior.add(mesh);
 });
 // Payload visibility is applied before calling this builder. A missing part is an explicit failure.
 const raw=new T.Box3().setFromObject(exterior);if(raw.isEmpty()){materials.forEach(m=>m.dispose());throw Error(`No geometry for ${part}`);}
 exterior.position.y=-raw.min.y+.08;group.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(exterior),inside=buildInterior(index,part,bounds,payload);
 const interior=inside.group;group.add(interior);
 const plane=new T.Plane(new T.Vector3(0,0,-1),0),originalPlane=plane.clone();
 // Remove the camera-facing shell half, but retain the authored engine bells/plumbing.
 function setCutaway(enabled){
  interior.visible=enabled;
  exterior.traverse(mesh=>{
   if(!mesh.isMesh)return;const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   for(const m of mats){
    const nozzles=part==='engines'&&/merlin|engine|raptor|metal|nozzle/i.test(m.name)&&!/cloth/.test(m.name);
    m.clippingPlanes=enabled&&!nozzles?[plane]:null;m.side=enabled?T.DoubleSide:T.FrontSide;m.needsUpdate=true;
   }
  });
 }
 function update(){group.updateMatrixWorld(true);plane.copy(originalPlane).applyMatrix4(group.matrixWorld);}
 setCutaway(true);update();
 return {group,exterior,interior,bounds,originY:raw.min.y,setCutaway,update,dispose(){materials.forEach(m=>m.dispose());inside.dispose();group.removeFromParent();}};
}
