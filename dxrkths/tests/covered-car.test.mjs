import test from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../src/scene/covered-car.js').catch(()=>({}));
test('covered car is a bounded 3D cloth surface with finite normals and folds',()=>{
 assert.equal(typeof mod.createCoveredCarGeometry,'function');const g=mod.createCoveredCarGeometry();g.computeBoundingBox();
 const b=g.boundingBox;assert.ok(b.max.y>1.3);assert.ok(b.max.z-b.min.z>5);assert.ok(b.max.x-b.min.x<4);
 assert.ok(g.attributes.position.count<12000);assert.ok(g.index.count>6000);
 for(const n of g.attributes.position.array)assert.ok(Number.isFinite(n));
 for(const n of g.attributes.normal.array)assert.ok(Number.isFinite(n));
 g.dispose();
});
