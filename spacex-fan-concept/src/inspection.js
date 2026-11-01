import * as T from 'three';
/** Frame the actual selected bounds, including horizontal and UI-safe-area constraints. */
export function inspectionCamera(bounds,width,height){
 const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const aspect=Math.max(.25,width/Math.max(1,height)),mobile=width<760;
 const areaTop=90,areaBottom=height*.54-20;
 const usableX=mobile?.80:.48,usableY=mobile?Math.max(.20,(areaBottom-areaTop)/height):.68,tan=Math.tan(16*Math.PI/180);
 const diameter=Math.hypot(size.x,size.z);
 const distance=Math.max(size.y/(2*tan*usableY),diameter/(2*tan*aspect*usableX))+size.z*.6;
 const targetX=mobile?center.x:center.x+distance*tan*aspect*.31;
 const targetY=mobile?center.y+distance*tan*((areaTop+areaBottom)/height-1):center.y;
 return {distance,position:[targetX,targetY+distance*.025,distance],target:[targetX,targetY,center.z]};
}

function visibleWithin(o,root){for(let n=o;n&&n!==root;n=n.parent)if(!n.visible)return false;return true;}
export function createInspection(model,index,part,payload='fairing'){
 const group=new T.Group(),exterior=new T.Group();group.name='inspection-'+part;group.add(exterior);const materials=new Set();model.group.updateMatrixWorld(true);const inverse=model.group.matrixWorld.clone().invert();
 model.group.traverse(o=>{
  if(!o.isMesh||o.userData.part!==part||!visibleWithin(o,model.group))return;
  if(part==='engines'&&o.userData.role==='landing-gear')return;
  if(part==='interstage'&&model.family==='falcon'&&o.userData.stage==='upper')return;
  const mesh=o.clone();mesh.children=[];mesh.geometry=o.geometry;
  const source=Array.isArray(o.material)?o.material:[o.material],copies=source.map(m=>{const c=m.clone();c.onBeforeCompile=()=>{};c.customProgramCacheKey=()=> 'authored-inspection';c.dithering=true;materials.add(c);return c;});mesh.material=Array.isArray(o.material)?copies:copies[0];inverse.clone().multiply(o.matrixWorld).decompose(mesh.position,mesh.quaternion,mesh.scale);exterior.add(mesh);
 });
 const raw=new T.Box3().setFromObject(exterior);if(raw.isEmpty()){materials.forEach(m=>m.dispose());throw Error('No authored geometry for '+part);}
 exterior.position.set(-(raw.min.x+raw.max.x)/2,-raw.min.y+.08,-(raw.min.z+raw.max.z)/2);group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(exterior);
 // Current sources do not contain verified internal assemblies. Never fabricate a cutaway.
 return {group,exterior,bounds,originY:raw.min.y,supportsInterior:false,setCutaway(){return false;},update(){group.updateMatrixWorld(true);},dispose(){materials.forEach(m=>m.dispose());group.removeFromParent();}};
}
