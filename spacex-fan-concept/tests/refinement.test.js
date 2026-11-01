import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {getQuality} from '../src/state.js';
import * as T from 'three';
test('graphics has three bounded explicit tiers',()=>{
 const tiers=['low','medium','high'].map(mode=>getQuality({mode,dpr:3,width:1600,memory:8}));
 assert.deepEqual(tiers.map(t=>t.tier),['low','medium','high']);
 assert.ok(tiers[0].dpr<tiers[1].dpr&&tiers[1].dpr<tiers[2].dpr);
 assert.equal(tiers[0].bloom,false);assert.equal(tiers[2].bloom,true);
 assert.ok(tiers[2].reflectionSize<=1024);
});
test('automatic quality limits weak devices regardless of screen width',()=>{
 assert.equal(getQuality({width:1920,memory:2,cores:2}).tier,'low');
 assert.equal(getQuality({width:390,memory:8,cores:8}).tier,'medium');
});
const path=new URL('../src/inspection.js',import.meta.url);
test('isolated component inspection exists',()=>assert.ok(existsSync(path)));
if(existsSync(path)){
 const {createInspection,inspectionCamera}=await import('../src/inspection.js');
 const makeModel=()=>{const group=new T.Group();for(const part of ['engines','tanks','interstage','fairing']){const mesh=new T.Mesh(new T.CylinderGeometry(.37,.37,part==='tanks'?6:2,24),new T.MeshStandardMaterial());mesh.position.y={engines:1,tanks:5,interstage:9,fairing:12}[part];mesh.userData={part,variant:part==='fairing'?'fairing':'main'};group.add(mesh);}return {group};};
 for(const part of ['engines','tanks','interstage','fairing'])test(`inspection isolates ${part} and restores without disposing source geometry`,()=>{
  const model=makeModel();let disposed=0;model.group.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));
  const view=createInspection(model,1,part,'fairing');
  assert.equal(view.group.name,`inspection-${part}`);assert.ok(view.bounds.getSize(new T.Vector3()).length()>0);
  assert.equal(view.supportsInterior,false);assert.ok(view.exterior.children.every(o=>o.userData.part===part));
  assert.equal(view.setCutaway(false),false);assert.equal(view.setCutaway(true),false);
  view.dispose();assert.equal(disposed,0);assert.equal(model.group.children.length,4);
 });
 test('portrait camera accounts for wide engine bays',()=>{
  const box=new T.Box3(new T.Vector3(-2,0,-1),new T.Vector3(2,2,1));
  const a=inspectionCamera(box,390,844),b=inspectionCamera(box,1440,900);
  assert.ok(a.distance>b.distance);assert.ok(a.position.every(Number.isFinite));
 });
}

const {createInspection}=await import('../src/inspection.js');
const {FrameBudget}=await import('../src/quality.js');
test('Falcon 9 interstage excludes authored upper-stage context',()=>{
 const group=new T.Group();
 for(const [stage,cap,y] of [['booster',false,9],['upper',false,11],['booster',true,10]]){
  const m=new T.Mesh(new T.CylinderGeometry(.36,.36,1,16),new T.MeshStandardMaterial());m.position.y=y;m.userData={part:'interstage',stage,boosterCap:cap};group.add(m);
 }
 const view=createInspection({group,family:'falcon'},1,'interstage');assert.equal(view.exterior.children.length,2);view.dispose();
});
test('automatic downgrade waits for sustained overruns and respects cooldown',()=>{
 const b=new FrameBudget();for(let i=0;i<89;i++)assert.equal(b.sample(42,'high',1000),null);
 assert.equal(b.sample(42,'high',1000),'medium');assert.equal(b.sample(42,'medium',1001),null);
 b.reset();for(let i=0;i<100;i++)assert.equal(b.sample(16,'high',20000),null);
});
test('inspection can rebuild while the original group is hidden',()=>{
 const group=new T.Group(),mesh=new T.Mesh(new T.CylinderGeometry(.4,.4,2,16),new T.MeshStandardMaterial());mesh.userData.part='tanks';group.add(mesh);group.visible=false;
 const view=createInspection({group},1,'tanks');assert.equal(view.exterior.children.length,1);assert.equal(group.visible,false);view.dispose();
});
