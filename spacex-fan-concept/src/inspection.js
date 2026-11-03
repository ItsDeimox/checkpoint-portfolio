import * as T from 'three';
import {inspectionFit,cloneSurface} from './viewer-motion.js';
import {assemblyCoverage,createAssemblyFade} from './source-assemblies.js';
export const inspectionCamera=inspectionFit;

function visibleWithin(o,root){for(let n=o;n&&n!==root;n=n.parent)if(!n.visible)return false;return true;}
function copySurface(mesh,materials){
 const copy=mesh.clone(false);
 const clone=m=>{
  const c=cloneSurface(m);c.onBeforeCompile=()=>{};c.customProgramCacheKey=()=>'authored-inspection';
  if(['first-stage-barrel-section','first-stage-open-panel','heavy-core-shell','heavy-core-cover'].includes(mesh.userData.assemblyFeature)){
   // This asset provides a single skin. Show the reverse of the real wall in
   // section, without mirroring the exterior paint or logos into the tank.
   c.side=T.DoubleSide;
   c.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
    'if(gl_FrontFacing){\n#include <map_fragment>\n}else{diffuseColor.rgb=vec3(.13,.145,.16);}');};
   c.customProgramCacheKey=()=>'falcon-barrel-section';
  }
  if(mesh.userData.assemblyFeature==='fairing-inner-wall'&&c.map){
   // The source reuses the painted outside UV island on the lining. Sample its
   // unmarked swatch on inward faces only, preserving the exterior and PBR map.
   c.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',
    '#include <uv_vertex>\nif (dot(normal.xz, position.xz) < 0.0) vMapUv = vec2(0.99, 0.01);');};
   c.customProgramCacheKey=()=>'falcon-fairing-lining';
  }
  c.dithering=true;materials.add(c);return c;
 };
 copy.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);
 return copy;
}

export function createInspection(model,index,part,payload='fairing',sharedFalcon=null){
 const shared=model.family==='heavy'&&sharedFalcon?.family==='falcon'&&['fairing','interstage'].includes(part);
 const sourceModel=shared?sharedFalcon:model;
 const group=new T.Group(),exterior=new T.Group();group.name='inspection-'+part;group.add(exterior);const materials=new Set(),sourceMeshes=[];sourceModel.group.updateMatrixWorld(true);const inverse=sourceModel.group.matrixWorld.clone().invert();
 sourceModel.group.traverse(o=>{
  if(!o.isMesh||!(o.userData.inspectionParts??[o.userData.part]).includes(part)||(o.userData.role!=='inspection-core'&&!visibleWithin(o,sourceModel.group)))return;
  if(sourceModel.family==='dragon'&&o.userData.role==='cargo-trunk')return;
  if(part==='engines'&&o.userData.role==='landing-gear')return;
  if(shared&&part==='interstage'&&o.userData.stage!=='upper'&&!o.userData.sourceNames?.some(n=>/^Interstage_F9_Black_0\b/i.test(n)))return;
  if(part==='interstage'&&sourceModel.family==='falcon'&&o.userData.stage==='upper'&&!o.userData.assemblyFeature)return;
  if(!shared)sourceMeshes.push(o);const mesh=copySurface(o,materials);mesh.visible=true;inverse.clone().multiply(o.matrixWorld).decompose(mesh.position,mesh.quaternion,mesh.scale);exterior.add(mesh);
 });
 const raw=new T.Box3().setFromObject(exterior);if(raw.isEmpty()){materials.forEach(m=>m.dispose());throw Error('No authored geometry for '+part);}
 const sourceCenter=raw.getCenter(new T.Vector3());exterior.position.copy(sourceCenter).negate();group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(exterior);
 const sphere=bounds.getBoundingSphere(new T.Sphere()),features=new Set(exterior.children.map(m=>m.userData.assemblyFeature).filter(Boolean));
 const coverage=assemblyCoverage(model.family,part,features),internalMeshes=new Set(exterior.children.filter(m=>coverage.features.includes(m.userData.assemblyFeature)));
 const fade=createAssemblyFade(group,internalMeshes),fullBounds=bounds.clone(),innerBounds=new T.Box3();
 // Slide and turn the front longitudinal section around its authored barrel axis.
 // Sample its final pose once for camera fitting, then restore the assembled pose.
 const panel=[...internalMeshes].find(m=>['first-stage-open-panel','heavy-core-cover'].includes(m.userData.assemblyFeature));
 const endDecks=panel?[...internalMeshes].filter(m=>['first-stage-forward-deck','first-stage-thrust-deck'].includes(m.userData.assemblyFeature)).map(mesh=>({
  mesh,y:mesh.position.y,direction:mesh.userData.assemblyFeature==='first-stage-forward-deck'?1:-1
 })):[];
 const panelX=panel?.position.x, panelYaw=panel?.rotation.y;
 const panelTravel=panel?(panel.geometry.boundingBox.max.x-panel.geometry.boundingBox.min.x)*1.35:0;
 // Lift the authored cage clear of its mounting sleeve; keep both in view.
 const frames=[...internalMeshes].filter(m=>m.userData.assemblyFeature==='hotstage-frame')
  .map(mesh=>({mesh,y:mesh.position.y}));
 const frameLift=frames.length?(fullBounds.max.y-fullBounds.min.y)*1.05:0;
 function poseSection(t){
  for(const {mesh,y} of frames){
   mesh.position.y=y+frameLift*t;
   mesh.updateMatrixWorld(true);
  }
  if(!panel)return;
  panel.position.x=panelX+panelTravel*t;
  panel.rotation.y=panelYaw+.97*t;
  panel.updateMatrixWorld(true);
  for(const deck of endDecks){
   deck.mesh.position.y=deck.y+deck.direction*panelTravel*.34*t;
   deck.mesh.updateMatrixWorld(true);
  }
 }
 poseSection(1);
 for(const mesh of internalMeshes)innerBounds.union(new T.Box3().setFromObject(mesh));
 poseSection(0);
 const innerCenter=coverage.supported?innerBounds.getCenter(new T.Vector3()):new T.Vector3();
 if(coverage.supported)innerBounds.translate(innerCenter.clone().negate());
 let lastFocus=-1;
 const view={group,exterior,bounds,sphere,sourceCenter,sourceMeshes,contextual:sourceMeshes.some(m=>m.userData.assemblyContext),radius:bounds.getSize(new T.Vector3()).length()/2,fade,coverage,internalMeshes,originY:raw.min.y,supportsInterior:coverage.supported,
  setCutaway(enabled){if(!coverage.supported)return false;fade.setInterior(enabled);return true;},
  step(dt,reduced){
   const active=fade.step(dt,reduced),x=Math.max(0,(fade.progress-.5)*2),t=x*x*(3-2*x);
   if(coverage.supported&&t!==lastFocus){
    lastFocus=t;poseSection(t);exterior.position.copy(sourceCenter).negate().addScaledVector(innerCenter,-t);
    bounds.min.lerpVectors(fullBounds.min,innerBounds.min,t);bounds.max.lerpVectors(fullBounds.max,innerBounds.max,t);
    bounds.getBoundingSphere(sphere);view.radius=sphere.radius;
   }
   return active;
  },
  update(){group.updateMatrixWorld(true);},dispose(){materials.forEach(m=>m.dispose());group.removeFromParent();}
 };
 return view;
}
