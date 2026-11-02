/** These identities belong to the pinned source assets, not generic guesses about rocket internals. */
const clean=s=>String(s??'').replace(/[_.]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
export function assemblyFeature(family,name,material,y){
 const n=clean(name),m=clean(material);
 if(family==='falcon'){
  if(/interstage engine holder/.test(n))return 'separation-pusher';
  if(/second stage detacher/.test(n))return 'separation-attachments';
  if(/merlin/.test(n)&&y>.5)return 'vacuum-engine';
  if(/merlin/.test(n)&&y<.25)return 'merlin-assemblies';
  if(/^octaweb\b/.test(n)||/engine holder detail/.test(n))return 'octaweb';
 }
 // Material.462 is also used on the flaps. Match the original node AND parent AND material.
 if(family==='starship'&&/^object (15|16)\b/.test(n)&&/starship block 3 v4 13/.test(n)&&/^material 46[23]$/.test(m))return 'cargo-rack';
 return null;
}
const catalog={
 'falcon:interstage':{required:['separation-pusher','vacuum-engine'],features:['separation-pusher','separation-attachments','vacuum-engine'],label:'INTERSTAGE HARDWARE',summary:'Original-model vacuum engine, separation pusher and attachment hardware. Partial source assembly, not manufacturer CAD.',author:'Stanley Creative',url:'https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08'},
 'falcon:engines':{required:['merlin-assemblies','octaweb'],features:['merlin-assemblies','octaweb'],label:'ENGINE ASSEMBLY',summary:'Original-model Merlin assemblies and Octaweb structure. No invented plumbing or combustion-chamber cutaway.',author:'Stanley Creative',url:'https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08'},
 'starship:fairing':{required:['cargo-rack'],features:['cargo-rack'],label:'CARGO STRUCTURE',summary:'Cargo rack supplied in the Block 3 artist model. Tank internals are not included or reconstructed; this is not flight-certified CAD.',author:'Clarence365',url:'https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2'}
};
export function assemblyCoverage(family,part,features){
 const entry=catalog[`${family}:${part}`],supported=Boolean(entry&&entry.required.every(id=>features.has(id)));
 return supported?{...entry,supported:true,complete:false}:{supported:false,complete:false,features:[],label:'EXTERIOR ONLY',summary:'This source does not provide a validated internal assembly for this module. Missing parts have not been generated.'};
}
/** Compose cover visibility and whole-module transitions without changing source geometry or sidedness. */
export function createAssemblyFade(group,internalMeshes){
 const records=[];group.traverse(mesh=>{if(!mesh.isMesh)return;const inside=internalMeshes.has(mesh);for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])records.push({mesh,m,inside,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,forceSinglePass:m.forceSinglePass,partial:false});});
 let alpha=1,progress=0,target=0;
 function apply(){
  group.visible=alpha>.0001;
  for(const r of records){const fade=Math.min(1,progress*2),cover=1-fade*fade*(3-2*fade);const factor=alpha*(r.inside?1:cover),partial=factor>.0001&&factor<.9999;
   if(partial!==r.partial){r.m.transparent=partial?true:r.transparent;r.m.depthWrite=partial?false:r.depthWrite;r.m.forceSinglePass=partial?true:r.forceSinglePass;r.m.needsUpdate=true;r.partial=partial;}
   r.m.opacity=r.opacity*factor;r.mesh.visible=factor>.0001;
  }
 }
 return {group,get value(){return alpha;},get interior(){return target===1;},get progress(){return progress;},set(value){alpha=Math.max(0,Math.min(1,value));apply();},restore(){alpha=1;target=progress=0;apply();},setInterior(enabled){target=enabled?1:0;},step(dt,reduced=false){
  if(progress===target)return false;
  progress=reduced?target:progress+(target-progress)*(1-Math.exp(-Math.min(.05,dt)*11));if(Math.abs(progress-target)<.002)progress=target;apply();return progress!==target;
 }};
}
