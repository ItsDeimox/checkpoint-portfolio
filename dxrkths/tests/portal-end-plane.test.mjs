import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {portalBasis,portalTravelPose} from '../src/scene/room-portal.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
const moduleURL=new URL('../src/scene/room-portal-exit.js',import.meta.url);
test('destination has a world-space exit-plane projection, not a fullscreen fade',()=>assert.ok(fs.existsSync(moduleURL),'missing world-space destination plane'));
test('corridor ends at the same physical plane instead of continuing behind the page',()=>{const s=fs.readFileSync(new URL('../src/scene/room-portal-shader.js',import.meta.url),'utf8');assert.match(s,/portalExitDepth/);assert.match(s,/portalExitHalf/);});
if(fs.existsSync(moduleURL)){
 const {projectPortalExit}=await import(moduleURL);
 const plane=index=>portalBasis(createFixedPanelLayout()[index]);
 function shot(index,t,w=900,h=600,contentWidth=w,offset=0){const basis=plane(index),pose=portalTravelPose(basis,t),camera=new T.PerspectiveCamera(pose.fov,w/h,.08,100);camera.position.copy(pose.position).addScaledVector(basis.right,offset);camera.quaternion.copy(pose.rotation);camera.updateMatrixWorld(true);return projectPortalExit(camera,basis,portalTravelPose(basis,1),{width:w,height:h,contentWidth});}
 const extent=f=>f.quad[1][0]-f.quad[0][0];
 test('each page starts small at the vanishing point and grows as camera distance closes',()=>{for(let i=0;i<5;i++){let last=0;for(let n=0;n<=100;n++){const f=shot(i,n/100),width=extent(f);assert.ok(f.visible);assert.ok(width>=last-1e-8);assert.ok(width<=1+1e-7);last=width;}assert.ok(extent(shot(i,0))<.14);assert.ok(extent(shot(i,.5))<.35);assert.ok(extent(shot(i,.8))>.6);}});
 test('projection is caused by camera position, not just animation progress',()=>{const a=shot(0,.5),b=shot(0,.5,900,600,900,.3);assert.ok(Math.abs(a.quad[0][0]-b.quad[0][0])>.005);assert.equal(a.exitDepth,b.exitDepth);});
 test('all five destinations finish exactly aligned with the native page, including scrollbars',()=>{for(let i=0;i<5;i++)for(const [w,h]of[[1440,900],[900,600],[390,844],[320,640],[1920,600]])for(const gutter of[0,15]){const f=shot(i,1,w,h,w-gutter),expected=[[0,0],[(w-gutter)/w,0],[(w-gutter)/w,1],[0,1]];f.quad.forEach((p,j)=>p.forEach((v,k)=>assert.ok(Math.abs(v-expected[j][k])<1e-7)));}});
 test('world exit fits inside the corridor opening at all tested aspects',()=>{for(let i=0;i<5;i++)for(const [w,h]of[[1440,900],[390,844],[1920,600]]){const f=shot(i,.5,w,h,w-15),b=plane(i);assert.ok(f.exitHalf[0]+Math.abs(f.exitOffset)<=b.half.x);assert.ok(f.exitHalf[1]<=b.half.y);assert.ok(f.exitDepth>23);}});
 test('invalid viewport input has a safe finite projection',()=>{const f=shot(0,.4);assert.ok(f.quad.flat().every(Number.isFinite));const basis=plane(0),pose=portalTravelPose(basis,1),camera=new T.PerspectiveCamera(59,1,.08,100);camera.position.copy(pose.position).addScaledVector(basis.forward,30);camera.quaternion.copy(pose.rotation);camera.updateMatrixWorld(true);assert.equal(projectPortalExit(camera,basis,pose,{width:0,height:0}).visible,false);});
}
