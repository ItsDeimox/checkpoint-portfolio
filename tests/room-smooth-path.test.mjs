import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {BannerPortal,portalTravelPose,PORTAL_APPROACH_SECONDS as A,PORTAL_FLIGHT_SECONDS as F} from '../src/scene/room-portal.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {RoomCamera} from '../src/scene/room-camera.js';
function fixture(index=2,width=1672,height=941){
 const camera=new T.PerspectiveCamera(42,width/height,.08,100),rig=new RoomCamera(camera,width);
 const panels=createFixedPanelLayout().map(p=>({...p,material:new T.ShaderMaterial({uniforms:{artwork:{value:null},projection:{value:new T.Matrix3()}},fragmentShader:'void main(){vec2 p=vec2(0.);vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}'})}));
 const portal=new BannerPortal({camera,cameraRig:rig,panels,scene:new T.Scene(),ready:true,settings:{quality:'low'},reduced:{matches:false},optics:{resetHistory(){}},release(){},clearHover(){},hidePanelContent(){},wake(){}});
 portal.enter(index,()=>{});
 return {camera,rig,portal,advance(t){for(let remaining=t;remaining>1e-10;remaining-=.01)rig.update(Math.min(remaining,.01));},dispose(){portal.dispose();panels.forEach(p=>p.material.dispose());}};
}
const accel=(a,b,c,h)=>c.clone().add(a).addScaledVector(b,-2).divideScalar(h*h);
const jerk=(a,b,c,d,h)=>d.clone().addScaledVector(c,-3).addScaledVector(b,3).sub(a).divideScalar(h*h*h);
test('approach and tunnel match acceleration and jerk, not only velocity, in both directions',()=>{
 for(const [w,h] of [[1672,941],[390,844],[5120,1440]])for(let index=0;index<5;index++)for(const reverse of [false,true]){
  const f=fixture(index,w,h),dt=.001;
  if(reverse){f.advance(A+F+.02);f.portal.returnToShowroom(index,()=>{});}
  f.advance((reverse?F:A)-6*dt);const points=[];
  for(let n=0;n<13;n++){points.push(f.camera.position.clone());f.rig.update(dt);}
  // Fourth-order one-sided derivative estimates at the same boundary avoid
  // confusing smooth variation nearby with a discontinuity at the join.
  for(const [order,weights,tolerance]of [[2,[203/45,-87/5,117/4,-254/9,33/2,-27/5,137/180],.02],[3,[-49/8,29,-461/8,62,-307/8,13,-15/8],1]]){
   const left=new T.Vector3(),right=new T.Vector3();
   weights.forEach((weight,k)=>{left.addScaledVector(points[6-k],weight*(-1)**order);right.addScaledVector(points[6+k],weight);});
   left.divideScalar(dt**order);right.divideScalar(dt**order);
   assert.ok(left.distanceTo(right)<tolerance,`panel ${index}, width ${w}, reverse ${reverse}, derivative ${order} jump ${left.distanceTo(right)}`);
  }f.dispose();
 }
});
test('camera starts and finishes with zero acceleration instead of a hard kick or sudden stop',()=>{
 const dt=.0005,f=fixture();const start=[];for(let i=0;i<4;i++){start.push(f.camera.position.clone());f.rig.update(dt);}
 assert.ok(accel(start[0],start[1],start[2],dt).length()<.2,'soft departure');
 const p=[3,2,1,0].map(i=>portalTravelPose(f.portal.basis,1-i*dt/F).position);
 assert.ok(accel(p[1],p[2],p[3],dt).length()<.2,'soft arrival');
 assert.ok(jerk(...p,dt).length()<15,'arrival jerk eases to zero');f.dispose();
});
test('finite clamped time and low/high refresh steps leave both directions on the same path',()=>{
 for(const fps of [30,60,90,144]){
  const f=fixture(1);for(let n=0;n<Math.ceil((A+F)*fps)+2;n++)f.rig.update(1/fps);
  assert.equal(f.portal.active,false);f.portal.returnToShowroom(1,()=>{});
  for(let n=0;n<Math.ceil((A+F)*fps)+2;n++)f.rig.update(1/fps);
  assert.equal(f.portal.active,false);assert.equal(f.rig.mode,'overview');f.dispose();
 }
});

test('swept camera volume clears the full rotating car, other panels, walls, ceiling and foreground tires',async()=>{
 const {parseCarOnCpu}=await import('../tools/car/glb-utils.mjs');
 const {readFile}=await import('node:fs/promises');const {ROOM_SHELL,ROOM_FOREGROUND_TIRES}=await import('../src/scene/room-core.js');
 const car=await parseCarOnCpu(await readFile(new URL('../assets/models/nissan-s15-showroom.glb',import.meta.url)));
 const pivot=new T.Group();pivot.position.set(-.67248,-.084365,1.28199);pivot.rotation.y=-.460715;pivot.scale.setScalar(1.922749);pivot.add(car.scene);pivot.updateMatrixWorld(true);
 const turnZ=1.458534911;let radius=0,top=0;const world=new T.Vector3();
 car.scene.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){world.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);radius=Math.max(radius,Math.hypot(world.x,world.z-turnZ));top=Math.max(top,world.y);}});
 const layouts=createFixedPanelLayout(),margin=.24;let samples=0,minCar=Infinity,minWall=Infinity;
 try{
  for(const [width,height]of [[320,960],[390,844],[740,320],[800,530],[1672,941],[2560,1440],[5120,1440]])for(let index=0;index<5;index++){
   const f=fixture(index,width,height);let previous=f.camera.position.clone();
   for(let n=0;n<380;n++){
    f.rig.update(1/240);if(f.portal.interior)break;
    const pos=f.camera.position,step=pos.distanceTo(previous),safety=margin+step/2;
    const center=pos.clone().add(previous).multiplyScalar(.5);
    assert.ok(center.y-safety>.9&&center.y+safety<7.1,`floor/ceiling ${index} ${width}`);
    // A cylinder enclosing the original GLB at every turntable angle, expanded
    // by the swept camera radius and half the integration chord.
    const vertical=center.y-top,horizontal=Math.hypot(center.x,center.z-turnZ)-radius;
    const carClear=Math.max(vertical,horizontal)-safety;minCar=Math.min(minCar,carClear);
    assert.ok(carClear>0,`car ${index} ${width} at ${center.toArray()}: ${carClear}`);
    const angle=Math.atan2(center.x,center.z-ROOM_SHELL.centerZ);
    if(angle>=ROOM_SHELL.thetaStart-.015&&angle<=ROOM_SHELL.thetaStart+ROOM_SHELL.thetaLength+.015){
     const clear=11.84-Math.hypot(center.x,center.z-ROOM_SHELL.centerZ)-safety;minWall=Math.min(minWall,clear);assert.ok(clear>0,'inside structural wall/rails');
    }
    for(const panel of layouts){if(panel.index===index)continue;
     const right=panel.corners[1].clone().sub(panel.corners[0]).normalize(),d=center.clone().sub(panel.center);
     const dx=Math.max(0,Math.abs(d.dot(right))-panel.corners[0].distanceTo(panel.corners[1])/2-.03);
     const dy=Math.max(0,Math.abs(d.y)-panel.corners[0].distanceTo(panel.corners[3])/2-.03);
     const dz=Math.max(0,Math.abs(d.dot(panel.normal)+.11)-.16);
     assert.ok(Math.hypot(dx,dy,dz)>safety,`neighbor panel ${panel.index} on path ${index}`);
    }
    for(const x of ROOM_FOREGROUND_TIRES.x){const horizontal=Math.hypot(center.x-x,center.z-ROOM_FOREGROUND_TIRES.z)-.87;assert.ok(Math.max(horizontal,center.y-1.02)>safety,'foreground tire');}
    previous.copy(pos);samples++;
   }f.dispose();
  }
  assert.ok(samples>9000);console.log('CLEARANCE',JSON.stringify({samples,rotatingCarRadius:radius,carMargin:minCar,wallMargin:minWall}));
 }finally{car.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [o.material].flat())m?.dispose();}});}
});

test('the camera footprint crosses only the open center of its selected physical screen',()=>{
 let checked=0;
 for(const [width,height]of [[390,844],[1672,941],[5120,1440]])for(let index=0;index<5;index++){
  const f=fixture(index,width,height),basis=f.portal.basis;
  for(let n=0;n<380;n++){
   f.rig.update(1/240);const local=basis.toLocal(f.camera.position);
   if(local.z<-.5)continue;if(f.portal.interior)break;
   const footprint=f.camera.near*Math.hypot(1,Math.tan(T.MathUtils.degToRad(f.camera.fov/2))*Math.hypot(1,f.camera.aspect));
   assert.ok(Math.abs(local.x)+footprint+.08<basis.half.x*.924);
   assert.ok(Math.abs(local.y)+footprint+.08<basis.half.y*.924);checked++;
  }f.dispose();
 }assert.ok(checked>50);
});
test('orientation and lens settle smoothly at the corridor junction',()=>{
 const h=.001,weights=[-49/8,29,-461/8,62,-307/8,13,-15/8];
 for(let index=0;index<5;index++){
  const f=fixture(index),samples=[];f.advance(A-6*h);
  for(let n=0;n<13;n++){samples.push({direction:new T.Vector3(0,0,-1).applyQuaternion(f.camera.quaternion),fov:f.camera.fov});f.rig.update(h);}
  const left=new T.Vector3(),right=new T.Vector3();let lensLeft=0,lensRight=0;
  weights.forEach((w,k)=>{left.addScaledVector(samples[6-k].direction,-w);right.addScaledVector(samples[6+k].direction,w);lensLeft-=samples[6-k].fov*w;lensRight+=samples[6+k].fov*w;});
  assert.ok(left.distanceTo(right)/h**3<.05,'rotation jerk at join');
  assert.ok(Math.abs(lensLeft-lensRight)/h**3<.1,'lens jerk at join');f.dispose();
 }
});
