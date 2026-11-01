import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {classifyPart,normalization} from './asset-parts.js';
import {installHighlight,surfaceMaterial} from './materials.js';
import {partOrder,vehicles} from './data.js';

export function isEffectivelyVisible(object){for(let n=object;n;n=n.parent)if(!n.visible)return false;return true;}
function chainName(node){let name=node.name;for(let n=node.parent,depth=0;n&&depth<2;n=n.parent,depth++)name+=' '+n.name;return name;}
/** Bake exporter transforms once, then merge by semantic part and material. */
export function prepareTemplate(source,family,height){
 source.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(source),bounds={min:box.min.toArray(),max:box.max.toArray()};
 const norm=normalization(bounds,height),span=box.max.y-box.min.y;
 // Grid fins are asymmetric. Derive the longitudinal axis from the tallest shell.
 if(family==='starship'){
  let tallest=0;source.traverse(o=>{if(!o.isMesh)return;const b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3());if(size.y>tallest&&size.x<span*.12){tallest=size.y;norm.offset[0]=-(b.min.x+b.max.x)/2;norm.offset[2]=-(b.min.z+b.max.z)/2;}});
 }
 const transform=new T.Matrix4().makeScale(norm.scale,norm.scale,norm.scale).multiply(new T.Matrix4().makeTranslation(...norm.offset));
 const bins=new Map(),sourceMaterials=new Set(),textures=new Set();
 source.traverse(o=>{
  if(!o.isMesh||!isEffectivelyVisible(o))return;
  const original=Array.isArray(o.material)?o.material[0]:o.material;
  sourceMaterials.add(original);for(const value of Object.values(original))if(value?.isTexture)textures.add(value);
  const world=new T.Box3().setFromObject(o),y=((world.min.y+world.max.y)/2-box.min.y)/span;
  const name=chainName(o),part=classifyPart(family,name,y);
  const stage=family==='falcon'&&(/second.?stage|engine.?holder/i.test(name)||world.min.y>box.min.y+span*.65)?'upper':'booster';
  const key=`${part}|${original.uuid}|${stage}`;
  const g=o.geometry;
  // Exporters may mix quantized/interleaved attributes; normalize the layout before merging.
  const plain=new T.BufferGeometry();
  for(const attrName of ['position','normal','uv']){
   const a=g.getAttribute(attrName);if(!a){if(attrName==='uv')plain.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));continue;}
   const values=new Float32Array(a.count*a.itemSize);
   for(let i=0;i<a.count;i++){values[i*a.itemSize]=a.getX(i);values[i*a.itemSize+1]=a.getY(i);if(a.itemSize>2)values[i*a.itemSize+2]=a.getZ(i);}
   plain.setAttribute(attrName,new T.BufferAttribute(values,a.itemSize));
  }
  if(g.index)plain.setIndex(g.index.clone());if(!plain.getAttribute('normal'))plain.computeVertexNormals();
  plain.applyMatrix4(transform.clone().multiply(o.matrixWorld));
  const expanded=plain.index?plain.toNonIndexed():plain;if(expanded!==plain)plain.dispose();
  if(!bins.has(key))bins.set(key,{part,stage,material:original,geometries:[]});bins.get(key).geometries.push(expanded);
 });
 const entries=[];
 for(const bin of bins.values()){
  const geometry=mergeGeometries(bin.geometries,false);bin.geometries.forEach(g=>g.dispose());if(!geometry)throw Error('Incompatible licensed mesh attributes');geometry.computeBoundingBox();geometry.computeBoundingSphere();
  entries.push({geometry,material:bin.material,part:bin.part,stage:bin.stage});
 }
 source.traverse(o=>o.geometry?.dispose());
 return {family,height,entries,sourceMaterials,textures};
}
export function calibrate(material){
 const m=material.clone(),n=(m.name||'').toLowerCase();m.dithering=true;
 if(/engine|merlin|raptor|steel|metal|silver/.test(n)&&!/cloth/.test(n)){m.metalness=Math.max(m.metalness??0,.75);m.roughness=T.MathUtils.clamp(m.roughness??.30,.19,.46);m.envMapIntensity=1.25;if(/engine|merlin|raptor/.test(n))m.color.multiplyScalar(.88);}
 else if(/black|cloth|tile|carbon/.test(n)){m.metalness=.04;m.roughness=/cloth|tile/.test(n)?.82:.43;m.envMapIntensity=.70;}
 else if(/stage|fairing|white/.test(n)){m.metalness=.02;m.roughness=T.MathUtils.clamp(m.roughness??.35,.30,.55);m.envMapIntensity=.85;}
 else {m.roughness=T.MathUtils.clamp(m.roughness??.38,.24,.58);}
 if(m.map)m.map.anisotropy=8;
 return m;
}
export function createModel(template,index,{dragon=null}={}){
 const group=new T.Group();group.name=vehicles[index].id;
 const uniforms=Object.fromEntries(partOrder.map(p=>[p,{highlight:{value:0},brightness:{value:1}}]));
 const materials=new Set(),ownedGeometries=new Set();
 function put(entry){
  const material=calibrate(entry.material);installHighlight(material,uniforms[entry.part]);materials.add(material);
  const instanced=index===2&&entry.stage!=='upper'&&entry.part!=='fairing';
  const mesh=instanced?new T.InstancedMesh(entry.geometry,material,3):new T.Mesh(entry.geometry,material);
  if(instanced){[0,-.82,.82].forEach((x,i)=>mesh.setMatrixAt(i,new T.Matrix4().makeTranslation(x,0,0)));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();}
  mesh.name=`licensed-${entry.part}`;mesh.userData={part:entry.part,stage:entry.stage,variant:entry.part==='fairing'?'fairing':'main',licensed:true};group.add(mesh);
 }
 template.entries.forEach(e=>put(e));
 if(index===2){
  for(const x of [-.82,.82]){
   const points=[[.369,-.10],[.369,.06],[.366,.10],[.342,.35],[.285,.67],[.19,.96],[.085,1.16],[.002,1.30]].map(p=>new T.Vector2(...p));
   const geo=new T.LatheGeometry(points,48),mat=surfaceMaterial('pale',uniforms.interstage,false);ownedGeometries.add(geo);materials.add(mat);const cap=new T.Mesh(geo,mat);cap.position.set(x,9.38,0);cap.userData={boosterCap:true,stage:'booster',part:'interstage',variant:'main'};group.add(cap);
  }
 }
 if(dragon)dragon.traverse(o=>{
  if(!o.isMesh||o.userData.variant!=='dragon')return;
  const mesh=o.clone();mesh.geometry=o.geometry.clone();mesh.material=o.material.clone();installHighlight(mesh.material,uniforms.fairing);ownedGeometries.add(mesh.geometry);materials.add(mesh.material);group.add(mesh);
 });
 function payload(value){group.traverse(o=>{if(o.isMesh&&['fairing','dragon'].includes(o.userData.variant))o.visible=o.userData.variant===value;});}
 payload('fairing');
 return {group,uniforms,payload,source:'licensed',dispose(){for(const m of materials)m.dispose();for(const g of ownedGeometries)g.dispose();}};
}
export function disposeTemplate(template){for(const e of template.entries)e.geometry.dispose();for(const m of template.sourceMaterials)m.dispose();for(const t of template.textures){t.dispose();t.image?.close?.();}}
export class AssetLibrary{
 constructor(){this.templates=new Map();this.disposed=false;this.abort=new AbortController();}
 async manifest(){
  if(!this.manifestPromise)this.manifestPromise=fetch('/assets/manifest.json',{cache:'no-cache',signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(12000)])}).then(r=>{if(!r.ok)throw Error('Asset manifest unavailable');return r.json();}).catch(e=>{this.manifestPromise=null;throw e;});
  return this.manifestPromise;
 }
 async template(family,quality){
  const key=`${family==='falcon'?'falcon9':family}-${quality}`;
  if(!this.templates.has(key)){
   const promise=(async()=>{
    const manifest=await this.manifest(),url=manifest.files[key]?.url;if(!url)throw Error(`Missing model ${key}`);
    const response=await fetch(url,{signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(20000)])});if(!response.ok)throw Error(`Model unavailable: ${response.status}`);
    const buffer=await response.arrayBuffer();if(this.disposed)throw Error('Viewer disposed');
    const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,'/assets/');
    const prepared=prepareTemplate(gltf.scene,family,family==='falcon'?14:24);
    if(this.disposed){disposeTemplate(prepared);throw Error('Viewer disposed');}return prepared;
   })().catch(e=>{this.templates.delete(key);throw e;});this.templates.set(key,promise);
  }
  return this.templates.get(key);
 }
 dispose(){this.disposed=true;this.abort.abort();for(const p of this.templates.values())p.then(disposeTemplate).catch(()=>{});this.templates.clear();}
}
