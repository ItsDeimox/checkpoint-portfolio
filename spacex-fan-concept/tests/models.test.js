import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const ready=existsSync(new URL('../src/models.js',import.meta.url));
test('part-segmented rocket geometry exists',()=>assert.ok(ready,'Implement actual geometry, not image planes'));
if(ready) {
  const T=await import('three');
  const {buildRocket}=await import('../src/models.js');
  const {vehicles,partOrder}=await import('../src/data.js');
  for(const [i,v] of vehicles.entries()) test(`${v.name}: finite bounds, distinct parts, merged mesh budget`,()=>{
    const model=buildRocket(i,{textures:false});
    const bounds=new T.Box3().setFromObject(model.group); const size=bounds.getSize(new T.Vector3());
    assert.ok(size.y>v.height*.85&&size.y<v.height*1.1,`height ${size.y}`);
    assert.ok(size.x>0&&size.x<8); let triangles=0,meshes=0;
    const parts=new Set();model.group.traverse(o=>{if(o.isMesh){meshes++;parts.add(o.userData.part);triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});
    for(const p of partOrder)assert.ok(parts.has(p),`missing ${p}`);
    assert.ok(meshes<110,`merge repetitive details (${meshes} meshes)`);
    assert.ok(triangles<300000,`geometry budget (${triangles} triangles)`);
    model.dispose();
  });
}
