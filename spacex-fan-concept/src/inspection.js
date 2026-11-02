import * as T from 'three';
import {inspectionFit,cloneSurface} from './viewer-motion.js';
import {assemblyCoverage,createAssemblyFade} from './source-assemblies.js';
export const inspectionCamera=inspectionFit;

function visibleWithin(o,root){for(let n=o;n&&n!==root;n=n.parent)if(!n.visible)return false;return true;}
export function createInspection(model,index,part,payload='fairing'){
 const group=new T.Group(),exterior=new T.Group();group.name='inspection-'+part;group.add(exterior);const materials=new Set(),sourceMeshes=[];model.group.updateMatrixWorld(true);const inverse=model.group.matrixWorld.clone().invert();
 model.group.traverse(o=>{
  if(!o.isMesh||!(o.userData.inspectionParts??[o.userData.part]).includes(part)||!visibleWithin(o,model.group))return;
  if(model.family==='dragon'&&o.userData.role==='cargo-trunk')return;
  if(part==='engines'&&o.userData.role==='landing-gear')return;
  if(part==='interstage'&&model.family==='falcon'&&o.userData.stage==='upper'&&!o.userData.assemblyFeature)return;
  sourceMeshes.push(o);const mesh=o.clone();mesh.children=[];mesh.geometry=o.geometry;
  const source=Array.isArray(o.material)?o.material:[o.material],copies=source.map(m=>{const c=cloneSurface(m);c.onBeforeCompile=()=>{};c.customProgramCacheKey=()=> 'authored-inspection';c.dithering=true;materials.add(c);return c;});mesh.material=Array.isArray(o.material)?copies:copies[0];inverse.clone().multiply(o.matrixWorld).decompose(mesh.position,mesh.quaternion,mesh.scale);exterior.add(mesh);
 });
 const raw=new T.Box3().setFromObject(exterior);if(raw.isEmpty()){materials.forEach(m=>m.dispose());throw Error('No authored geometry for '+part);}
 const sourceCenter=raw.getCenter(new T.Vector3());exterior.position.copy(sourceCenter).negate();group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(exterior);
 const sphere=bounds.getBoundingSphere(new T.Sphere()),features=new Set(exterior.children.map(m=>m.userData.assemblyFeature).filter(Boolean));
 const coverage=assemblyCoverage(model.family,part,features),internalMeshes=new Set(exterior.children.filter(m=>coverage.features.includes(m.userData.assemblyFeature)));
 const fade=createAssemblyFade(group,internalMeshes),fullBounds=bounds.clone(),innerBounds=new T.Box3();
 for(const mesh of internalMeshes)innerBounds.union(new T.Box3().setFromObject(mesh));
 const innerCenter=coverage.supported?innerBounds.getCenter(new T.Vector3()):new T.Vector3();
 if(coverage.supported)innerBounds.translate(innerCenter.clone().negate());
 let lastFocus=-1;
 const view={group,exterior,bounds,sphere,sourceCenter,sourceMeshes,contextual:sourceMeshes.some(m=>m.userData.assemblyContext),radius:bounds.getSize(new T.Vector3()).length()/2,fade,coverage,internalMeshes,originY:raw.min.y,supportsInterior:coverage.supported,
  setCutaway(enabled){if(!coverage.supported)return false;fade.setInterior(enabled);return true;},
  step(dt,reduced){
   const active=fade.step(dt,reduced),x=Math.max(0,(fade.progress-.5)*2),t=x*x*(3-2*x);
   if(coverage.supported&&t!==lastFocus){
    lastFocus=t;exterior.position.copy(sourceCenter).negate().addScaledVector(innerCenter,-t);
    bounds.min.lerpVectors(fullBounds.min,innerBounds.min,t);bounds.max.lerpVectors(fullBounds.max,innerBounds.max,t);
    bounds.getBoundingSphere(sphere);view.radius=sphere.radius;
   }
   return active;
  },
  update(){group.updateMatrixWorld(true);},dispose(){materials.forEach(m=>m.dispose());group.removeFromParent();}
 };
 return view;
}
