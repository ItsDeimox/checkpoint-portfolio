import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {classifyPart,normalization} from './asset-parts.js';
import {installHighlight} from './materials.js';
import {bakeSourceRange,partitionAuthoredRegions} from './source-geometry.js';
import {partOrder,vehicles} from './data.js';
export const sourceFamilies={1:'falcon',2:'heavy',3:'starship'};
const sourceKeys={falcon:'falcon9',heavy:'falconheavy',starship:'starship',dragon:'dragon'},sourceHeights={falcon:14,heavy:14,starship:24,dragon:1.62};
export function isEffectivelyVisible(o){for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;}
function chainName(o){let name=o.name;for(let n=o.parent,d=0;n&&d<3;n=n.parent,d++)name+=' '+n.name;return name;}
function uniforms(){return Object.fromEntries(partOrder.map(p=>[p,{highlight:{value:0},brightness:{value:1}}]));}
export function createEmptyModel(index){const group=new T.Group();group.name=vehicles[index]?.id??'pending';return {group,uniforms:uniforms(),source:'unavailable',payload(){},dispose(){}};}
export function prepareTemplate(source,family,height){
 source.updateMatrixWorld(true);
 const objects=[],sourceMaterials=new Set(),textures=new Set(),sourceGeometry=new Set();
 source.traverse(o=>{if(!o.isMesh)return;sourceGeometry.add(o.geometry);const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){sourceMaterials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}if(!isEffectivelyVisible(o)||family==='dragon'&&materials.every(m=>/^ground$/i.test(m.name)))return;objects.push(o);});
 const box=new T.Box3();for(const o of objects)box.union(new T.Box3().setFromObject(o));
 const norm=normalization({min:box.min.toArray(),max:box.max.toArray()},height),span=box.max.y-box.min.y;
 if(family==='starship'){let tallest=0;for(const o of objects){const b=new T.Box3().setFromObject(o),s=b.getSize(new T.Vector3());if(s.y>tallest&&s.x<span*.12){tallest=s.y;norm.offset[0]=-(b.min.x+b.max.x)/2;norm.offset[2]=-(b.min.z+b.max.z)/2;}}}
 const transform=new T.Matrix4().makeScale(norm.scale,norm.scale,norm.scale).multiply(new T.Matrix4().makeTranslation(...norm.offset)),bins=new Map();
 if(family==='falcon')transform.premultiply(new T.Matrix4().makeRotationY(-Math.PI/2));
 for(const o of objects){
  const materials=Array.isArray(o.material)?o.material:[o.material],g=o.geometry,ranges=g.groups.length?g.groups:[{start:0,count:g.index?.count??g.getAttribute('position').count,materialIndex:0}];
  for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){
   const matrix=transform.clone().multiply(o.matrixWorld);if(o.isInstancedMesh){const pose=new T.Matrix4();o.getMatrixAt(instance,pose);matrix.multiply(pose);}
   for(const range of ranges){
    const material=materials[range.materialIndex]??materials[0];if(family==='dragon'&&/^ground$/i.test(material.name))continue;
    const geometry=bakeSourceRange(g,range.start,range.count,matrix);geometry.computeBoundingBox();const y=geometry.boundingBox.getCenter(new T.Vector3()).y/height,name=chainName(o);
    const role=/landing.?leg/i.test(name)?'landing-gear':'component';
    const stage=family==='falcon'&&(/second.?stage|engine.?holder/i.test(name)||geometry.boundingBox.min.y>height*.65)?'upper':'booster';
    const parts=family==='heavy'?partitionAuthoredRegions(geometry,height):[{geometry,part:family==='dragon'?'fairing':classifyPart(family,name,y)}];if(family==='heavy')geometry.dispose();
    for(const item of parts){const layout=Object.keys(item.geometry.attributes).sort().map(n=>n+item.geometry.getAttribute(n).itemSize).join(','),key=`${item.part}|${material.uuid}|${stage}|${role}|${layout}`;if(!bins.has(key))bins.set(key,{part:item.part,stage,role,material,geometries:[],sourceNames:new Set()});const bin=bins.get(key);bin.geometries.push(item.geometry);bin.sourceNames.add(name);}
   }
  }
 }
 const entries=[];for(const bin of bins.values()){const geometry=mergeGeometries(bin.geometries,false);bin.geometries.forEach(g=>g.dispose());if(!geometry)throw Error('Incompatible authored attributes');geometry.computeBoundingBox();geometry.computeBoundingSphere();entries.push({geometry,material:bin.material,part:bin.part,stage:bin.stage,role:bin.role,sourceNames:[...bin.sourceNames]});}
 sourceGeometry.forEach(g=>g.dispose());return {family,height,entries,sourceMaterials,textures,supportsInterior:false};
}
/** Preserve authored paint, cloth, foil and metal responses. Never flatten source PBR maps. */
export function calibrate(material){const m=material.clone();m.dithering=true;return m;}
export function createModel(template,index){
 const group=new T.Group();group.name=template.family==='dragon'?'dragon-2':vehicles[index].id;const u=uniforms(),materials=new Set();
 for(const entry of template.entries){const material=calibrate(entry.material);installHighlight(material,u[entry.part]);materials.add(material);const mesh=new T.Mesh(entry.geometry,material);mesh.name=`authored-${entry.part}`;mesh.userData={part:entry.part,stage:entry.stage,role:entry.role,variant:entry.part==='fairing'?'fairing':'main',licensed:true,sourceNames:entry.sourceNames??[]};group.add(mesh);}
 function payload(value){group.traverse(o=>{if(o.isMesh&&o.userData.variant==='fairing')o.visible=value!=='dragon';});}
 return {group,uniforms:u,payload,source:'licensed',family:template.family,supportsInterior:template.supportsInterior,dispose(){materials.forEach(m=>m.dispose());}};
}
export function disposeTemplate(t){for(const e of t.entries)e.geometry.dispose();for(const m of t.sourceMaterials)m.dispose();const images=new Set();for(const v of t.textures){v.dispose();if(v.image)images.add(v.image);}for(const image of images)image.close?.();}
export class AssetLibrary{
 constructor(){this.templates=new Map();this.disposed=false;this.abort=new AbortController();}
 async manifest(){if(!this.manifestPromise)this.manifestPromise=fetch('/assets/manifest.json',{cache:'no-cache',signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(12000)])}).then(r=>{if(!r.ok)throw Error('Asset manifest unavailable');return r.json();}).catch(e=>{this.manifestPromise=null;throw e;});return this.manifestPromise;}
 async template(family,quality){
  if(!sourceKeys[family])throw Error('No verified authored asset for this vehicle');const key=`${sourceKeys[family]}-${quality}`;
  if(!this.templates.has(key)){const promise=(async()=>{const manifest=await this.manifest(),url=manifest.files[key]?.url;if(!url)throw Error(`Missing authored model ${key}`);const r=await fetch(url,{signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(30000)])});if(!r.ok)throw Error(`Model unavailable: ${r.status}`);const buffer=await r.arrayBuffer();if(this.disposed)throw Error('Viewer disposed');const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,'/assets/');const t=prepareTemplate(gltf.scene,family,sourceHeights[family]);t.attribution=manifest.authors?.[sourceKeys[family]];if(this.disposed){disposeTemplate(t);throw Error('Viewer disposed');}return t;})().catch(e=>{this.templates.delete(key);throw e;});this.templates.set(key,promise);return promise;}return this.templates.get(key);
 }
 dispose(){this.disposed=true;this.abort.abort();for(const p of this.templates.values())p.then(disposeTemplate).catch(()=>{});this.templates.clear();}
}
