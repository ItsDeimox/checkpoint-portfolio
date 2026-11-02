import * as T from 'three';
import {inspectionFit,createFade,cloneSurface} from './viewer-motion.js';
export const inspectionCamera=inspectionFit;

function visibleWithin(o,root){for(let n=o;n&&n!==root;n=n.parent)if(!n.visible)return false;return true;}
export function createInspection(model,index,part,payload='fairing'){
 const group=new T.Group(),exterior=new T.Group();group.name='inspection-'+part;group.add(exterior);const materials=new Set(),sourceMeshes=[];model.group.updateMatrixWorld(true);const inverse=model.group.matrixWorld.clone().invert();
 model.group.traverse(o=>{
  if(!o.isMesh||o.userData.part!==part||!visibleWithin(o,model.group))return;
  if(part==='engines'&&o.userData.role==='landing-gear')return;
  if(part==='interstage'&&model.family==='falcon'&&o.userData.stage==='upper')return;
  sourceMeshes.push(o);const mesh=o.clone();mesh.children=[];mesh.geometry=o.geometry;
  const source=Array.isArray(o.material)?o.material:[o.material],copies=source.map(m=>{const c=cloneSurface(m);c.onBeforeCompile=()=>{};c.customProgramCacheKey=()=> 'authored-inspection';c.dithering=true;materials.add(c);return c;});mesh.material=Array.isArray(o.material)?copies:copies[0];inverse.clone().multiply(o.matrixWorld).decompose(mesh.position,mesh.quaternion,mesh.scale);exterior.add(mesh);
 });
 const raw=new T.Box3().setFromObject(exterior);if(raw.isEmpty()){materials.forEach(m=>m.dispose());throw Error('No authored geometry for '+part);}
 const sourceCenter=raw.getCenter(new T.Vector3());exterior.position.copy(sourceCenter).negate();group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(exterior);
 // Current sources do not contain verified internal assemblies. Never fabricate a cutaway.
 const sphere=bounds.getBoundingSphere(new T.Sphere());
 return {group,exterior,bounds,sphere,sourceCenter,sourceMeshes,radius:bounds.getSize(new T.Vector3()).length()/2,fade:createFade(group),originY:raw.min.y,supportsInterior:false,setCutaway(){return false;},update(){group.updateMatrixWorld(true);},dispose(){materials.forEach(m=>m.dispose());group.removeFromParent();}};
}
