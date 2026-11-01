/** Fetch only pinned, licensed assets at build time. Browsers load self-hosted outputs. */
import {mkdir,readFile,writeFile,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplify,textureCompress,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
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
const authors={
 falcon9:{title:'Falcon 9 - SpaceX',author:'Stanley Creative',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08',mirror:'codeLabs-summer2021/3D-Model-World'},
 starship:{title:'SpaceX Starship Block 3',author:'Clarence365',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2',mirror:'haskaomni/blueprint (initial optimization)'},
 studio:{title:'Studio Small 03',author:'Greg Zaal / Poly Haven',license:'CC0-1.0',source:'https://polyhaven.com/a/studio_small_03',mirror:'pmndrs/drei-assets'},
};
await mkdir(out,{recursive:true});await mkdir(cache,{recursive:true});
const fingerprint=sha(Buffer.concat([await readFile(new URL(import.meta.url)),await readFile('package.json')]));
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
for(const family of ['falcon9','starship'])for(const quality of ['high','eco']){
 const doc=await io.read(path.join(cache,family==='falcon9'?'falcon9/scene.gltf':'starship.glb'));
 const eco=quality==='eco';
 await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:family==='falcon9'?(eco?.46:.86):(eco?.10:.23),error:family==='starship'?(eco?.035:.012):(eco?.004:.0008),lockBorder:false}),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:eco?[512,512]:[1024,1024],quality:eco?80:92}),meshopt({encoder:MeshoptEncoder,level:'high'}));
 let triangles=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
 const b=await io.writeBinary(doc),hash=sha(b),filename=`${family}-${quality}-${hash.slice(0,12)}.glb`;await writeFile(path.join(out,filename),b);
 files[`${family}-${quality}`]={url:`/assets/${filename}`,bytes:b.byteLength,triangles,sha256:hash};console.log(family,quality,Math.round(b.byteLength/1024)+'KB',triangles+' triangles');
}
const hdrName='studio-small-03-29267a4aa8c1.hdr';await copyFile(path.join(cache,'studio.hdr'),path.join(out,hdrName));files.studio={url:'/assets/'+hdrName,bytes:1680234,sha256:sources.at(-1)[2]};
const manifest={version:2,fingerprint,files,authors,modifications:'Deimox: mesh simplification, texture resizing/WebP, Meshopt compression, PBR calibration, part grouping. Falcon Heavy assembled from Falcon 9 cores with original side nosecones. Starship source geometry preserved, including its baked outer engine ring; not official CAD.'};
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));await writeFile(path.join(out,'ATTRIBUTION.json'),JSON.stringify({authors,modifications:manifest.modifications,inputs:sources},null,2));
