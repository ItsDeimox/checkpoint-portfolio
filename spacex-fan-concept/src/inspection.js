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
   // The interior lining is physically the reverse side of the licensed fairing wall.
   // Rendering only outward-facing triangles incorrectly hides it in open mode.
   c.side=T.DoubleSide;
   // The source shell shares its painted UV atlas front and back. The reverse
   // face is the actual existing wall, not a generated liner. Give that reverse
   // a neutral unpainted composite response without touching exterior artwork.
   c.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
    '#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb=vec3(.18,.19,.21);');};
   c.customProgramCacheKey=()=>'falcon-fairing-lining-v2';
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
 const ghostShell=sourceModel.family==='starship'&&['tanks','fairing'].includes(part);
 const fade=createAssemblyFade(group,internalMeshes,{coverOpacity:ghostShell?.10:0}),fullBounds=bounds.clone(),innerBounds=new T.Box3();
 // Translate the real second fairing half outward during inspection rather
 // than keeping its painted convex face over the payload adapter. This is
 // exclusively motion of the existing authored mesh, never new interior geometry.
 const openHalf=[...internalMeshes].find(m=>m.userData.assemblyFeature==='fairing-inner-wall');
 const payloadDeck=[...internalMeshes].find(m=>m.userData.assemblyFeature==='payload-adapter');
 const halfPose=openHalf?{position:openHalf.position.clone(),yaw:openHalf.rotation.y}:null;
 const openingAxis=new T.Vector3();
 let openingTravel=0,openingYaw=0;
 if(openHalf&&payloadDeck){
  const wallBox=new T.Box3().setFromObject(openHalf),deckBox=new T.Box3().setFromObject(payloadDeck);
  openingAxis.copy(wallBox.getCenter(new T.Vector3())).sub(deckBox.getCenter(new T.Vector3())).setY(0);
  if(openingAxis.lengthSq()<1e-6)openingAxis.set(1,0,0);
  openingAxis.normalize();
  openingTravel=Math.max(fullBounds.getSize(new T.Vector3()).x,fullBounds.getSize(new T.Vector3()).z)*.42;
  openingYaw=(openingAxis.x>=0?1:-1)*.22;
 }
 // In the Falcon tank cutaway the original front shell is hidden rather than
 // displaced as a detached tube. No missing bulkhead/plumbing is synthesized.
 // Lift only the artist-authored Starship cage clear of its mounting sleeve.
 const frames=[...internalMeshes].filter(m=>m.userData.assemblyFeature==='hotstage-frame')
  .map(mesh=>({mesh,y:mesh.position.y}));
 const frameLift=frames.length?(fullBounds.max.y-fullBounds.min.y)*.55:0;
 function poseSection(t){
  for(const {mesh,y} of frames){
   mesh.position.y=y+frameLift*t;
   mesh.updateMatrixWorld(true);
  }
  if(openHalf&&halfPose){
   openHalf.position.copy(halfPose.position).addScaledVector(openingAxis,openingTravel*t);
   openHalf.rotation.y=halfPose.yaw+openingYaw*t;
   openHalf.updateMatrixWorld(true);
  }
  // Tank covers are handled by the fade; original end decks stay registered.
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
