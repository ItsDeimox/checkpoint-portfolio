import test from'node:test';import assert from'node:assert/strict';import{existsSync}from'node:fs';import * as T from'three';import{createInspection}from'../src/inspection.js';import{prepareTemplate,createModel}from'../src/external-models.js';
const url=new URL('../src/source-assemblies.js',import.meta.url);
test('source-specific assembly metadata exists',()=>assert.ok(existsSync(url)));
test('interstage retains the original vacuum engine and pusher, not upper tank context',()=>{
 const group=new T.Group();for(const [name,feature]of[['vacuum','vacuum-engine'],['pusher','separation-pusher'],['upper tank',null]]){const mesh=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial());mesh.name=name;mesh.userData={part:'interstage',stage:'upper',assemblyFeature:feature};group.add(mesh);}
 const view=createInspection({group,family:'falcon'},1,'interstage');assert.deepEqual(view.exterior.children.map(o=>o.name).sort(),['pusher','vacuum']);assert.equal(view.supportsInterior,true);view.dispose();
});
if(existsSync(url)){
 const {assemblyFeature,assemblyCoverage,createAssemblyFade}=await import(url);
 test('F9 source engine holder is recognized inside the interstage',()=>{assert.equal(assemblyFeature('falcon','Interstage_Engine_holder_F9_Second_Stage_0 Interstage_Engine_holder','F9_Second_Stage',.65),'separation-pusher');assert.equal(assemblyFeature('falcon','Merlin_1D_Engine_Center001_Merlin_Engine_3_0 Second_Stage','Merlin_Engine_3',.68),'vacuum-engine');});
 test('cargo rack selection does not admit flaps sharing the same material',()=>{assert.equal(assemblyFeature('starship','Object_16 Starship_Block_3_V4_13','Material.462',.88),'cargo-rack');assert.equal(assemblyFeature('starship','Object_21 Aft_Flaps002_2 Starship_Block_3_V4_13','Material.462',.62),null);});
 test('incomplete source sets never advertise complete or unsupported interiors',()=>{assert.equal(assemblyCoverage('falcon','interstage',new Set(['separation-pusher'])).supported,false);for(const [family,part]of[['falcon','tanks'],['heavy','engines'],['dragon','fairing']])assert.equal(assemblyCoverage(family,part,new Set(['cargo-rack','vacuum-engine','separation-pusher'])).supported,false);});
 test('assembly fade composes inner visibility with outgoing transition opacity',()=>{const group=new T.Group(),outer=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),inner=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({opacity:.8,transparent:true}));group.add(outer,inner);const f=createAssemblyFade(group,new Set([inner]));f.setInterior(true);f.step(1,true);f.set(.5);assert.equal(inner.material.opacity,.4);assert.equal(outer.material.opacity,0);assert.equal(outer.visible,false);f.setInterior(false);f.step(1,true);assert.equal(outer.material.opacity,.5);f.set(1);assert.equal(outer.material.transparent,false);assert.equal(outer.material.depthWrite,true);assert.equal(inner.material.transparent,true);assert.equal(inner.material.opacity,.8);});
 test('inspection never copies in a generated internal geometry',()=>{const group=new T.Group(),geometries=new Set();for(const feature of['separation-pusher','vacuum-engine',null]){const m=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());m.userData={part:'interstage',stage:feature?'upper':'booster',assemblyFeature:feature};group.add(m);geometries.add(m.geometry);}const v=createInspection({group,family:'falcon'},1,'interstage');assert.equal(v.supportsInterior,true);assert.ok(v.exterior.children.every(m=>geometries.has(m.geometry)));v.setCutaway(true);for(let i=0;i<100;i++)v.step(1/60);assert.equal(group.children.length,3);v.dispose();});
}
test('inner focus recenters actual hardware rather than leaving it tiny at the tip',()=>{
 const group=new T.Group(),shell=new T.Mesh(new T.BoxGeometry(2,10,2),new T.MeshStandardMaterial()),rack=new T.Mesh(new T.BoxGeometry(.8,2,.8),new T.MeshStandardMaterial());shell.userData={part:'fairing'};rack.position.y=3;rack.userData={part:'fairing',assemblyFeature:'cargo-rack'};const fittings=rack.clone();fittings.userData.assemblyFeature='ship-tank-hardware';group.add(shell,rack,fittings);
 const v=createInspection({group,family:'starship'},3,'fairing'),originalRadius=v.radius;v.setCutaway(true);v.step(1,true);assert.ok(v.radius<originalRadius*.5);v.group.updateMatrixWorld(true);const b=new T.Box3().setFromObject([...v.internalMeshes][0]);assert.ok(Math.abs(b.getCenter(new T.Vector3()).y)<1e-5);v.setCutaway(false);v.step(1,true);assert.equal(v.radius,originalRadius);v.dispose();
});

test('Heavy assembles only the common bounded stage section and uncovers its hardware',()=>{
 const asset=family=>({group:new T.Group(),family});
 const add=(model,feature,stage,sourceNames=[])=>{
  const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());
  mesh.userData={part:'interstage',assemblyFeature:feature,stage,sourceNames};
  model.group.add(mesh);return mesh;
 };
 const heavy=asset('heavy'),falcon=asset('falcon');
 const fullCore=add(heavy,null,'booster'),dome=add(falcon,'upper-stage-aft-dome','upper');
 const cover=add(falcon,null,'booster',['Interstage_F9_Black_0 Interstage']);
 add(falcon,'vacuum-engine','upper');
 const pusher=add(falcon,'separation-pusher','upper');
 const attachment=add(falcon,'separation-attachments','upper');
 const view=createInspection(heavy,2,'interstage','fairing',falcon);
 assert.equal(view.internalMeshes.size,4);
 assert.ok(view.exterior.children.every(m=>m.geometry!==fullCore.geometry));
 assert.ok([...view.internalMeshes].some(m=>m.geometry===dome.geometry));
 view.setCutaway(true);view.step(1,true);
 assert.equal(view.exterior.children.find(m=>m.geometry===cover.geometry).visible,false);
 for(const hardware of [pusher,attachment])assert.equal(view.exterior.children.find(m=>m.geometry===hardware.geometry).visible,true);
 view.setCutaway(false);view.step(1,true);
 assert.equal(view.exterior.children.find(m=>m.geometry===cover.geometry).visible,true);
 assert.equal(dome.visible,true);view.dispose();
});

test('Falcon tank cutaway hides the detached-looking front skin and keeps the original rear wall',()=>{
 const group=new T.Group(),ids=['first-stage-open-panel','first-stage-barrel-section','first-stage-forward-deck','first-stage-thrust-deck'];
 for(const [i,id] of ids.entries()){
  const mesh=new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshStandardMaterial());
  mesh.position.x=i%2;mesh.userData={part:'tanks',assemblyFeature:id};group.add(mesh);
 }
 const view=createInspection({group,family:'falcon'},1,'tanks');
 assert.equal(view.supportsInterior,true);view.setCutaway(true);view.step(1,true);
 const front=view.exterior.children.find(m=>m.userData.assemblyFeature==='first-stage-open-panel');
 const back=view.exterior.children.find(m=>m.userData.assemblyFeature==='first-stage-barrel-section');
 assert.equal(front.visible,false);assert.equal(back.visible,true);
 view.setCutaway(false);view.step(1,true);assert.equal(front.visible,true);view.dispose();
});
test('Falcon interstage retains its authored rear shell in the internal view',async()=>{
 const {assemblyCoverage}=await import('../src/source-assemblies.js');
 for(const family of ['falcon','heavy']){
  const hardware=new Set(['interstage-rear-shell','vacuum-engine','separation-pusher','upper-stage-aft-dome']);
  const coverage=assemblyCoverage(family,'interstage',hardware);
  assert.equal(coverage.supported,true);assert.ok(coverage.features.includes('interstage-rear-shell'));
 }
});
test('opening a shell progresses by elapsed time even when no intermediate frame paints',async()=>{
 const {createAssemblyFade}=await import('../src/source-assemblies.js');
 const fade=createAssemblyFade(new T.Group(),new Set());
 fade.setInterior(true);fade.step(1);
 assert.equal(fade.progress,1);
 fade.setInterior(false);fade.step(1);
 assert.equal(fade.progress,0);
});

test('licensed fairing liner renders its actual backface without changing the source material',()=>{
 const group=new T.Group(),surface=new T.MeshStandardMaterial({map:new T.Texture()});
 const far=new T.Mesh(new T.BoxGeometry(1,3,.2),surface);
 far.userData={part:'fairing',assemblyFeature:'fairing-inner-wall'};
 const adapter=new T.Mesh(new T.BoxGeometry(1,.1,1),new T.MeshStandardMaterial());
 adapter.userData={part:'fairing',assemblyFeature:'payload-adapter'};
 group.add(far,adapter);
 const view=createInspection({group,family:'falcon'},1,'fairing');
 const lining=view.exterior.children.find(m=>m.userData.assemblyFeature==='fairing-inner-wall');
 assert.equal(view.supportsInterior,true);
 assert.equal(surface.side,T.FrontSide);
 assert.equal(lining.material.side,T.DoubleSide);
 view.setCutaway(true);view.step(1,true);assert.equal(lining.visible,true);view.dispose();
});

test('default fairing inspection faces the concave opening instead of the painted hull',async()=>{
 const {componentPose}=await import('../src/viewer-motion.js');
 const {assemblyCoverage}=await import('../src/source-assemblies.js');
 const features=new Set(['fairing-inner-wall','payload-adapter']);
 const q=componentPose('fairing',assemblyCoverage('falcon','fairing',features));
 const e=new T.Euler().setFromQuaternion(q);
 assert.ok(e.y<-.6&&e.y>-.9);
});
