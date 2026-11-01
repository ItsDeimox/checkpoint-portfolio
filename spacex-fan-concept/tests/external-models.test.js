import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
const mod=await import('../src/external-models.js').catch(()=>null);
function fixture(){const root=new T.Group();for(const [name,y,mat]of [['First Stage',5,0],['First Stage Raceway',5,0],['Fairing Half',9.5,1],['Merlin Engine',.5,2]]){const mesh=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:mat?0xcccccc:0xffffff}));mesh.name=name;mesh.position.y=y;root.add(mesh);}return root;}
test('external model adapter is available',()=>assert.ok(mod));
test('bakes and grounds licensed scene at requested height',()=>{const t=mod?.prepareTemplate(fixture(),'falcon',14);assert.ok(t);const model=mod.createModel(t,1);const b=new T.Box3().setFromObject(model.group);assert.ok(Math.abs(b.min.y)<1e-5);assert.ok(Math.abs(b.max.y-14)<1e-5);model.dispose();mod.disposeTemplate(t);});
test('every imported mesh retains semantic picking and independent highlight uniforms',()=>{const t=mod?.prepareTemplate(fixture(),'falcon',14);assert.ok(t);const a=mod.createModel(t,1),b=mod.createModel(t,2);a.group.traverse(o=>{if(o.isMesh)assert.ok(a.uniforms[o.userData.part]);});assert.notEqual(a.uniforms.engines,b.uniforms.engines);a.uniforms.engines.highlight.value=1;assert.equal(b.uniforms.engines.highlight.value,0);a.dispose();b.dispose();mod.disposeTemplate(t);});
test('fairing is hidden for Dragon and restored without hiding tanks',()=>{const t=mod?.prepareTemplate(fixture(),'falcon',14);assert.ok(t);const m=mod.createModel(t,1);m.payload('dragon');assert.ok(m.group.children.filter(n=>n.userData.variant==='fairing').every(n=>!n.visible));assert.ok(m.group.children.some(n=>n.userData.part==='tanks'&&n.visible));m.payload('fairing');assert.ok(m.group.children.filter(n=>n.userData.variant==='fairing').every(n=>n.visible));m.dispose();mod.disposeTemplate(t);});
test('raycast visibility respects all ancestor groups',()=>{const root=new T.Group(),m=new T.Mesh();root.add(m);root.visible=false;assert.equal(mod?.isEffectivelyVisible(m),false);root.visible=true;assert.equal(mod?.isEffectivelyVisible(m),true);});
test('quantized GLB positions are expanded before world transforms',()=>{
 const geometry=new T.BoxGeometry(1,2,1),p=geometry.getAttribute('position');
 const ints=new Int16Array(p.array.length);for(let i=0;i<ints.length;i++)ints[i]=Math.round(p.array[i]*32767);
 geometry.setAttribute('position',new T.BufferAttribute(ints,3,true));
 const root=new T.Group(),mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());mesh.name='First Stage';root.add(mesh);root.scale.setScalar(100);root.position.y=300;
 const template=mod.prepareTemplate(root,'falcon',14),model=mod.createModel(template,1),b=new T.Box3().setFromObject(model.group);
 assert.ok(Math.abs(b.max.y-14)<.001,`normalized height is ${b.max.y}`);assert.ok(Math.abs(b.min.y)<.001);model.dispose();mod.disposeTemplate(template);
});
test('authored models are not replicated into invented vehicles',()=>{const t=mod.prepareTemplate(fixture(),'heavy',14),m=mod.createModel(t,2);assert.ok(m.group.children.every(o=>!o.isInstancedMesh));assert.equal(m.group.children.length,t.entries.length);m.dispose();mod.disposeTemplate(t);});
