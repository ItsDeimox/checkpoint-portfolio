import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RocketViewer} from '../src/scene.js';
function setup(inspection=false){
 const root=new T.Group(),camera=new T.PerspectiveCamera(32,1,.1,100);camera.position.z=5;camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const unused=new T.Group();unused.visible=false;
 const v=Object.assign(Object.create(RocketViewer.prototype),{canvas:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},camera,pointer:new T.Vector2(),raycaster:new T.Raycaster(),scratchSphere:new T.Sphere(),models:[{group:unused},{group:root}],state:{index:1,part:inspection?'engines':null},inspection:inspection?{group:root}:null});
 function mesh(name,z=0,parent=root){const m=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial());m.name=name;m.position.z=z;m.userData.part='engines';m.userData.tests=0;const raycast=m.raycast;m.raycast=function(...args){this.userData.tests++;return raycast.apply(this,args);};parent.add(m);return m;}
 function pick(){root.updateMatrixWorld(true);return v.pick(50,50);}
 return {root,v,mesh,pick};
}
test('overview does not ray-test meshes hidden by themselves or an ancestor',()=>{const s=setup(),visible=s.mesh('visible'),hidden=s.mesh('hidden',1),parent=new T.Group();hidden.visible=false;parent.visible=false;s.root.add(parent);const child=s.mesh('hidden ancestor',2,parent);assert.equal(s.pick().object,visible);assert.equal(hidden.userData.tests,0);assert.equal(child.userData.tests,0);});
test('inspection ignores removed covers before expensive triangle intersection',()=>{const s=setup(true),body=s.mesh('body'),cover=s.mesh('cover',2);cover.visible=false;assert.equal(s.pick().object,body);assert.equal(cover.userData.tests,0);});
test('nonselectable meshes do not receive ray tests in overview',()=>{const s=setup(),body=s.mesh('body'),decor=s.mesh('decor',2);delete decor.userData.part;assert.equal(s.pick().object,body);assert.equal(decor.userData.tests,0);});
test('visibility toggles take effect without stale candidate caches',()=>{const s=setup(true),body=s.mesh('body'),cover=s.mesh('cover',2);cover.visible=false;assert.equal(s.pick().object,body);cover.visible=true;assert.equal(s.pick().object,cover);cover.visible=false;assert.equal(s.pick().object,body);});
test('closest visible object wins regardless of scene insertion order',()=>{const s=setup();s.mesh('far',-1);const near=s.mesh('near',1);s.mesh('middle');const hit=s.pick();assert.equal(hit.object,near);assert.equal(hit.index,1);assert.equal(hit.part,'engines');});
test('inspection root under a hidden ancestor performs zero ray tests',()=>{const s=setup(true),parent=new T.Group(),mesh=s.mesh('body');parent.add(s.root);parent.visible=false;assert.equal(s.pick(),null);assert.equal(mesh.userData.tests,0);});
test('layers and front/backface behavior stay delegated to Three.js',()=>{const s=setup(),body=s.mesh('body');body.layers.set(2);assert.equal(s.pick(),null);s.v.raycaster.layers.set(2);assert.equal(s.pick().object,body);});
