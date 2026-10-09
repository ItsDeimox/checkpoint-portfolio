import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';import {buildCar} from '../src/scene/car.js';
for(const variant of ['coupe','track']){
 test(`${variant} has closed-volume scale and noncoplanar surfaces`,()=>{
  const c=buildCar({variant});const b=new THREE.Box3().setFromObject(c),s=b.getSize(new THREE.Vector3());assert.ok(s.x>2&&s.x<3);assert.ok(s.y>1&&s.y<1.6);assert.ok(s.z>4&&s.z<5);
  let triangles=0,nonPlanar=0;c.traverse(m=>{if(!m.isMesh)return;const a=m.geometry.attributes.position;triangles+=(m.geometry.index?.count??a.count)/3;for(let i=0;i<a.count;i++){assert.ok(Number.isFinite(a.getX(i))&&Number.isFinite(a.getY(i))&&Number.isFinite(a.getZ(i)));}const box=new THREE.Box3().setFromBufferAttribute(a);if(box.max.z-box.min.z>1)nonPlanar++;});assert.ok(triangles>20000&&triangles<300000);assert.ok(nonPlanar>5);assert.ok(c.children.length<40);assert.equal(c.userData.paint.clearcoat,1);assert.equal(c.userData.authored,true);
 });
}
