/** Fetch only pinned, licensed assets at build time. Browsers load self-hosted outputs. */
import {mkdir,readFile,writeFile,copyFile,stat,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplify,textureCompress,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {addHeavyCenterCore,packHeavyMaps} from './heavy-center-core.mjs';
import {partitionStarshipInteriors} from './starship-interiors.mjs';
import {applyDragonSourcePose} from './dragon-pose.mjs';
import {enableLosslessGeometry,sourceDetail,assertSourceDetail} from './high-detail.mjs';
const cache=path.resolve('.cache/3d'),out=path.resolve('public/assets');
const sha=b=>createHash('sha256').update(b).digest('hex');
const f9='https://raw.githubusercontent.com/codeLabs-summer2021/3D-Model-World/b0e1bec349a2f603da3c76ce12d09094596285e3/res/falcon9/';
const sources=[
 ['falcon9/scene.gltf',f9+'scene.gltf','a6d595474bc6fa69d8eebc404f3fb4518284fe1e81d3351b4a6066da9966e6f2'],
 ['falcon9/scene.bin',f9+'scene.bin','642e7ec5481d5f79a53c134574c076cc88bab6026aeafdc8984dec355fa17981'],
 ['falcon9/textures/Engine_Cloth_Black_baseColor.png',f9+'textures/Engine_Cloth_Black_baseColor.png','d393b70c0882cd52a91490a5ad5504d536e2af8dc1c3d593eb944690c57489c1'],
 ['falcon9/textures/F9_Fairing_baseColor.png',f9+'textures/F9_Fairing_baseColor.png','b7fb094937cc94a48c70d6dc9af57ca4885a44e8e91e6e3adba7daa70013509a'],
 ['falcon9/textures/F9_First_Stage_baseColor.png',f9+'textures/F9_First_Stage_baseColor.png','86838cad565ce8c6d0804a16a821f1480244ff3a7179c0cc470a23ccc647b1d5'],
 ['starship.glb','https://raw.githubusercontent.com/haskaomni/blueprint/be8d70ff87131139b06b6c2eeae114418f7cb77c/public/models/starship-block3.glb','bedec98d3b8ef2ba9b2fba1aae4bfc2a8e4258c6677cb7a317aeb122ed358e93'],
 ['studio.hdr','https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/studio_small_03_1k.hdr','29267a4aa8c10de26cae758e4e3c4daadde88673798666ad657724bab7224a35'],
];
sources.push(...JSON.parse(await readFile(new URL('./authored-assets.json',import.meta.url),'utf8')));
const authors={
 heavycore:{title:'Falcon Heavy – center-core inspection geometry',author:'Giroo',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/falcon-heavy-60030e62373547fa9364171e6095f31e',mirror:'allenai/objaverse'},
 merlin:{title:'Merlin 1D',author:'MartianDays',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/merlin-1d-088a207cae57488f876bbc16daf2148d',mirror:'allenai/objaverse',reference:'Individual artist-authored exterior engine; no certified internals'},
 merlinvac:{title:'Merlin 1D Vacuum',author:'MartianDays',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/merlin-1d-vacuum-f20ebb6e857b405cbdc66568d48d2fcb',mirror:'allenai/objaverse',reference:'Minimalist exterior interpretation; no certified internals'},
 falconheavy:{title:'SpaceX Falcon Heavy (Low Poly)',author:'Antonio_Adams',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/spacex-falcon-heavylow-poly-0dc068a462e34258b3872085a7f592c8',mirror:'DominicwalterLOF/singularity',reference:'Authored visual model; not official engineering CAD'},
 dragon:{title:'SpaceX - Dragon 2',author:'KUBAHA',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/spacex-dragon-2-1b125e30a2cb442288580290536fbe5d',mirror:'crgonzales/docking-sim',reference:'Source-authored capsule, heat shield and docking hardware; cabin not supplied'},
 falcon9:{title:'Falcon 9 - SpaceX',author:'Stanley Creative',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08',mirror:'codeLabs-summer2021/3D-Model-World'},
 starship:{title:'SpaceX Starship Block 3',author:'Clarence365',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2',mirror:'haskaomni/blueprint (initial optimization)'},
 studio:{title:'Studio Small 03',author:'Greg Zaal / Poly Haven',license:'CC0-1.0',source:'https://polyhaven.com/a/studio_small_03',mirror:'pmndrs/drei-assets'},
};
await mkdir(out,{recursive:true});await mkdir(cache,{recursive:true});
const fingerprint=sha(Buffer.concat([await readFile(new URL(import.meta.url)),await readFile('package.json'),await readFile(new URL('./authored-assets.json',import.meta.url)),await readFile(new URL('./dragon-pose.mjs',import.meta.url)),await readFile(new URL('./starship-interiors.mjs',import.meta.url)),await readFile(new URL('./heavy-center-core.mjs',import.meta.url)),await readFile(new URL('./high-detail.mjs',import.meta.url))]));
try{const old=JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8'));if(old.fingerprint===fingerprint){await Promise.all(Object.values(old.files).map(f=>stat(path.join('public',f.url))));console.log('Verified asset build already exists.');process.exit(0);}}catch{}
async function acquire([name,url,expected]) {
 const dest=path.join(cache,name);await mkdir(path.dirname(dest),{recursive:true});
 try{const b=await readFile(dest);if(sha(b)===expected)return;}catch{}
 let last;
 for(let attempt=0;attempt<3;attempt++)try{const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(`HTTP ${response.status}: ${name}`);const b=Buffer.from(await response.arrayBuffer());if(sha(b)!==expected)throw Error(`SHA-256 mismatch: ${name}`);await writeFile(dest,b);return;}catch(e){last=e;await new Promise(r=>setTimeout(r,500*(attempt+1)));}
 throw last;
}
await Promise.all(sources.map(acquire));
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const files={};
for(const family of ['falcon9','falconheavy','dragon','starship','merlin','merlinvac'])for(const quality of ['high','eco']){
 const doc=await io.read(path.join(cache,['starship','dragon','merlin','merlinvac'].includes(family)?`${family}.glb`:`${family}/scene.gltf`));
 if(family==='falconheavy'){
  addHeavyCenterCore(doc,await io.read(path.join(cache,'heavy-reference.glb')));
  await packHeavyMaps(doc,quality);
 }
 if(family==='dragon')applyDragonSourcePose(doc);
 if(family==='starship')partitionStarshipInteriors(doc);
 const eco=quality==='eco',source=eco?null:sourceDetail(doc);
 if(eco){
  const steps=[dedup(),weld()];
  if(!['falconheavy','merlin','merlinvac'].includes(family))steps.push(simplify({simplifier:MeshoptSimplifier,ratio:family==='starship'?.10:.62,error:family==='starship'?.008:.002,lockBorder:family!=='starship'}));
  steps.push(prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:88}),meshopt({encoder:MeshoptEncoder,level:'high'}));
  await doc.transform(...steps);
 }else enableLosslessGeometry(doc);
 let triangles=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
 const b=await io.writeBinary(doc);let preserved=null;if(source){const roundtrip=sourceDetail(await io.readBinary(b));assertSourceDetail(source,roundtrip);preserved={geometry:true,textures:true,triangles:source.triangles,geometrySha256:source.geometrySha256,textureSha256:source.textureSha256};}
 const hash=sha(b),filename=`${family}-${quality}-${hash.slice(0,12)}.glb`;await writeFile(path.join(out,filename),b);
 files[`${family}-${quality}`]={url:`/assets/${filename}`,bytes:b.byteLength,triangles,sha256:hash,...(preserved?{sourceDetail:preserved}:{})};console.log(family,quality,Math.round(b.byteLength/1024)+'KB',triangles+' triangles');
}
const hdrName='studio-small-03-29267a4aa8c1.hdr';await copyFile(path.join(cache,'studio.hdr'),path.join(out,hdrName));files.studio={url:'/assets/'+hdrName,bytes:1680234,sha256:sources.find(s=>s[0]==='studio.hdr')[2]};
const manifest={version:3,fingerprint,files,authors,modifications:'Deimox: high quality preserves source vertex attributes, images, triangles and winding through lossless Meshopt (triangle indices may rotate cyclically); eco uses geometry simplification, texture resizing/WebP and Meshopt compression, source PBR preservation and grouping of existing source triangles for selection. No generated spacecraft or invented internals. Falcon Heavy retains its complete original overview. Its inspected first stage includes the original side cores and a separate center core extracted from Giroo’s Falcon Heavy model. The reference core is scaled uniformly and partitioned along existing face edges for sectioning. Some Heavy maps are stored in lossless WebP after verifying identical decoded RGBA pixels. Dragon by KUBAHA uses the original authored open-nose keyframe at the original 100/24-second keyframe; capsule inspection omits the separate cargo trunk while retaining the supplied heat shield. No cabin is supplied. Falcon 1 is unavailable pending a verified reusable source.'};
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));await writeFile(path.join(out,'ATTRIBUTION.json'),JSON.stringify({authors,modifications:manifest.modifications,inputs:sources},null,2));

const keep=new Set(Object.values(files).map(f=>path.basename(f.url)));
for(const file of await readdir(out))if(/^(falcon9|falconheavy|dragon|starship|merlin|merlinvac)-(high|eco)-[a-f0-9]+\.glb$/.test(file)&&!keep.has(file))await unlink(path.join(out,file));
