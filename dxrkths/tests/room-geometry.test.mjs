import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {buildRoomArchitecture,createFixedPanelLayout,createReferenceCamera} from '../src/scene/room-environment.js';
import {ROOM_PANELS,ROOM_SHELL} from '../src/scene/room-core.js';
import {RoomCamera,panelApproachPose} from '../src/scene/room-camera.js';
import {parseCarOnCpu} from '../tools/car/glb-utils.mjs';

const homeEye=new T.Vector3(0,1.48,-12),homeTarget=new T.Vector3(0,2.20,0);
const focusViewports=[[1672,941],[390,844],[320,960]];
const view={scene:new T.Scene()};buildRoomArchitecture(view);view.scene.updateMatrixWorld(true);
const carPoints=[];
// Conservative samples spanning the car's front, cabin, flanks and rear. These
// test architecture occlusion, independently of the asynchronous model loader.
for(const x of [-4.37,-2.1,-.6,1.2,3.04])for(const y of [.04,.9,1.6,2.52])for(const z of [-3.71,1.3,6.25]){
 carPoints.push(new T.Vector3(x,y,z));
}
const raycaster=new T.Raycaster();
function blockers(eye,point,objects=view.scene.children){
 const direction=point.clone().sub(eye);raycaster.set(eye,direction.clone().normalize());
 raycaster.near=.02;raycaster.far=direction.length()-.03;
 return raycaster.intersectObjects(objects,true);
}
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
after(()=>dispose(view.scene));

test('car sightline regression detects the old front post and clears the open architecture',()=>{
 const legacy=new T.Group(),post=new T.Mesh(new T.BoxGeometry(.20,8.25,.20),new T.MeshBasicMaterial());
 post.position.set(0,4.12,2-12.01);legacy.add(post);legacy.updateMatrixWorld(true);
 assert.ok(carPoints.some(point=>blockers(homeEye,point,[legacy]).length>0),'coverage must detect the reported front post');
 for(const point of carPoints){const hits=blockers(homeEye,point);assert.equal(hits.length,0,`blocked car point ${point.toArray()}: ${hits[0]?.object.name}`);}
 dispose(legacy);
});

test('fixed-eye drag views leave every visible car sightline clear across the allowed look range',()=>{
 const camera=new T.PerspectiveCamera(42,1672/941,.08,100);let checked=0;
 for(const yaw of [-.48,-.24,0,.24,.48])for(const pitch of [-.15,0,.18]){
  camera.position.copy(homeEye);camera.lookAt(homeTarget);camera.rotateY(yaw);camera.rotateX(pitch);camera.updateMatrixWorld(true);
  for(const point of carPoints){const ndc=point.clone().project(camera);if(Math.abs(ndc.x)>1||Math.abs(ndc.y)>1||ndc.z<-1||ndc.z>1)continue;
   raycaster.setFromCamera(new T.Vector2(ndc.x,ndc.y),camera);raycaster.near=.02;raycaster.far=camera.position.distanceTo(point)-.03;
   const hits=raycaster.intersectObjects(view.scene.children,true);assert.equal(hits.length,0,`yaw ${yaw}, pitch ${pitch}: ${hits[0]?.object.name}`);checked++;
  }
 }
 assert.ok(checked>250,`insufficient visible-ray coverage: ${checked}`);
});

test('the physical ceiling closes the upper overview frustum at every aspect and look limit',()=>{
 const wall=view.structure.getObjectByName('Side and back wall'),ceiling=view.structure.getObjectByName('Full room ceiling');
 assert.ok(wall&&ceiling,'the real shell needs both its curved wall and a full ceiling');
 const ray=new T.Raycaster();ray.near=.08;ray.far=100;
 let checked=0;
 for(const [width,height]of [[1920,1080],[2560,1080],[3840,1080],[390,844],[320,960],[740,320]]){
  let formerlyOpen=0;
  for(const x of [-1,0,1])for(const y of [-1,0,1]){
   const camera=new T.PerspectiveCamera(42,width/height,.08,100),rig=new RoomCamera(camera,width);
   rig.pointLook(x,y);rig.update(3);
   for(const u of [-1,-.5,0,.5,1])for(const v of [0,.25,.5,.75,1]){
    // Use full 3D camera rays. Flattening these onto the horizontal plane
    // conceals the opening above the wall, even at the approved neutral view.
    ray.setFromCamera(new T.Vector2(u,v),camera);
    const wallHits=ray.intersectObject(wall),ceilingHits=ray.intersectObject(ceiling);
    assert.ok(wallHits.length||ceilingHits.length,`${width}x${height}, pointer ${x},${y}, frustum ${u},${v}: open upper boundary`);
    if(!wallHits.length){
     formerlyOpen++;
     assert.ok(Math.abs(ceilingHits[0].point.y-ROOM_SHELL.height)<1e-8,'a physical roof must close the sightline at room height');
    }
    checked++;
   }
  }
  assert.ok(formerlyOpen>0,`${width}x${height}: coverage must detect the previous uncapped shell`);
 }
 assert.equal(checked,1350);
});

test('rays toward the car remain clear along approach paths to all five fixed panels',()=>{
 let checked=0;
 for(const [index,panel]of createFixedPanelLayout().entries()){
  const camera=new T.PerspectiveCamera(42,1672/941,.08,100),rig=new RoomCamera(camera,1672);rig.approach(panel);
  const interval=rig.transition.duration/5;
  for(let step=1;step<=5;step++){
   rig.update(interval);
   for(const point of carPoints){const hits=blockers(camera.position,point);assert.equal(hits.length,0,`panel ${index}, approach ${step}/5, car ${point.toArray()}: ${hits[0]?.object.name}`);checked++;}
  }
 }
 assert.equal(checked,1500);
});

test('physical display rectangles retain the reference composition and face into the room',()=>{
 const camera=createReferenceCamera(),layout=createFixedPanelLayout();
 for(const [index,panel]of layout.entries()){
  for(const [i,corner]of panel.corners.entries()){
   const projected=corner.clone().project(camera),expected=ROOM_PANELS[index].corners[i];
   // The drawing is not a physically exact perspective rectangle. Fitting an
   // upright screen may move a reference corner by at most ten source pixels;
   // reproducing the irregular outline exactly was the deformation regression.
   const dx=(projected.x*.5+.5-expected[0])*1672,dy=(.5-projected.y*.5-expected[1])*941;
   assert.ok(Math.hypot(dx,dy)<10,`panel ${index}, corner ${i}: ${Math.hypot(dx,dy)}px composition drift`);
   assert.ok(Math.abs(corner.clone().sub(panel.center).dot(panel.normal))<1e-8,'screen must be one fixed plane');
  }
  const inward=new T.Vector3(0,panel.center.y,-1).sub(panel.center).normalize();
  assert.ok(panel.normal.dot(inward)>.99,`panel ${index} must face the room's viewing area`);
 }
 // The live home view uses a different eye/lens; screen vertices stay authored
 // in the room instead of being recomputed to match camera-facing rectangles.
 const live=new T.PerspectiveCamera(42,1672/941,.08,100);live.position.copy(homeEye);live.lookAt(homeTarget);live.updateMatrixWorld(true);
 const shifted=layout[2].corners[0].clone().project(live),original=ROOM_PANELS[2].corners[0];
 assert.ok(Math.abs(shifted.x*.5+.5-original[0])+Math.abs(.5-shifted.y*.5-original[1])>.001);
});

test('foreground tire stacks retain natural edge crops at the forward camera position',()=>{
 const tires=view.scene.getObjectByName('Foreground tire stacks');assert.ok(tires);
 const camera=new T.PerspectiveCamera(42,1672/941,.08,100);camera.position.copy(homeEye);camera.lookAt(homeTarget);camera.updateMatrixWorld(true);
 const bounds={left:[Infinity,Infinity,-Infinity,-Infinity],right:[Infinity,Infinity,-Infinity,-Infinity]},vertices=tires.geometry.attributes.position;
 for(let i=0;i<vertices.count;i++){
  const point=new T.Vector3().fromBufferAttribute(vertices,i),side=point.x>0?'left':'right';point.applyMatrix4(tires.matrixWorld).project(camera);
  const x=point.x*.5+.5,y=.5-point.y*.5,b=bounds[side];b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);
 }
 assert.ok(bounds.left[0]<0&&bounds.left[2]>.035&&bounds.left[2]<.09);
 assert.ok(bounds.right[0]>.91&&bounds.right[0]<.965&&bounds.right[2]>1);
 for(const b of Object.values(bounds)){assert.ok(b[1]>.68&&b[1]<.76);assert.ok(b[3]>1);}
});

test('focused display corners fit the actual camera on desktop and portrait screens',()=>{
 for(const [width,height]of focusViewports)for(const [index,panel]of createFixedPanelLayout().entries()){
  const pose=panelApproachPose(panel,width,width/height),camera=new T.PerspectiveCamera(pose.fov,width/height,.08,100);
  camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld(true);
  for(const corner of panel.corners){
   const p=corner.clone().project(camera);
   assert.ok(Math.abs(p.x)<=.98&&Math.abs(p.y)<=.98&&p.z>-1&&p.z<1,`panel ${index} at ${width}x${height}: clipped NDC ${p.toArray()}`);
  }
 }
});

test('focused screens and the real camera approach paths clear the baked car geometry',async()=>{
 const gltf=await parseCarOnCpu(await fs.readFile(new URL('../assets/models/nissan-s15-showroom.glb',import.meta.url)));
 const pivot=new T.Group();pivot.position.set(-.67248,-.084365,1.28199);pivot.rotation.y=-.460715;pivot.scale.setScalar(1.922749);pivot.add(gltf.scene);pivot.updateMatrixWorld(true);
 const carMeshes=[];gltf.scene.traverse(o=>{if(o.isMesh&&o.userData.dxtRuntime?.visible!==false)carMeshes.push(o);});
 const ray=new T.Raycaster(),carBounds=new T.Box3().setFromObject(pivot).expandByScalar(.15);let screenRays=0,pathSegments=0;
 try{
  for(const [width,height]of focusViewports)for(const [index,panel]of createFixedPanelLayout().entries()){
   const pose=panelApproachPose(panel,width,width/height);
   for(const u of [.08,.3,.5,.7,.92])for(const v of [.08,.3,.5,.7,.92]){
    const point=panel.corners[0].clone().lerp(panel.corners[1],u).lerp(panel.corners[3].clone().lerp(panel.corners[2],u),v).sub(panel.center).multiplyScalar(.924).add(panel.center);
    const direction=point.clone().sub(pose.position);ray.set(pose.position,direction.clone().normalize());ray.near=0;ray.far=direction.length()-.02;
    const hits=ray.intersectObjects(carMeshes,false);
    assert.equal(hits.length,0,`panel ${index}, ${width}px, screen ${u},${v}: ${hits[0]?.object.name}`);screenRays++;
   }
   const camera=new T.PerspectiveCamera(42,width/height,.08,100),rig=new RoomCamera(camera,width);
   for(const direction of ['approach','return']){
    if(direction==='approach')rig.approach(panel);else rig.reset();
    const duration=rig.transition.duration;
    for(let step=0;step<26;step++){
     const previous=camera.position.clone();rig.update(duration/25);
     assert.ok(!carBounds.containsPoint(camera.position),`panel ${index}, ${width}px: camera enters car bounds during ${direction}`);
     const segment=camera.position.clone().sub(previous);
     if(segment.lengthSq()<1e-12)continue;
     ray.set(previous,segment.clone().normalize());ray.near=0;ray.far=segment.length();
     const hits=ray.intersectObjects(carMeshes,false);
     assert.equal(hits.length,0,`panel ${index}, ${width}px: camera crosses ${hits[0]?.object.name} during ${direction}`);pathSegments++;
    }
   }
  }
  assert.equal(screenRays,375);assert.ok(pathSegments>=720);
 }finally{dispose(pivot);}
});
