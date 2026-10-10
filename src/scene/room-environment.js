import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {homography,ROOM_PANELS,ROOM_SHELL,roomShellAngles,ROOM_FOREGROUND_TIRES} from './room-core.js';
import {roomVertex,displayFragment,floorVertex,floorFragment,noiseGLSL,contactFragment} from './room-shaders.js';

const up=new T.Vector3(0,1,0);
function lineBetween(a,b,radius,material,parent){
 const length=a.distanceTo(b),mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,length,8),material);
 mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());parent.add(mesh);return mesh;
}
function planeGeometry(corners){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(corners.flatMap(p=>p.toArray()),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,1,1,1,1,0,0,0],2));g.setIndex([0,2,1,0,3,2]);g.computeVertexNormals();return g;
}
function ringGeometry(corners,normal,ratio=.965,depth=.13){
 const center=corners.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(.25),inner=corners.map(p=>p.clone().sub(center).multiplyScalar(ratio).add(center));
 const vertices=[...corners,...inner,...corners.map(p=>p.clone().addScaledVector(normal,-depth)),...inner.map(p=>p.clone().addScaledVector(normal,-depth))];
 const positions=[],indices=[];vertices.forEach(p=>positions.push(...p.toArray()));
 for(let i=0;i<4;i++){const j=(i+1)%4;indices.push(i,j,i+4,j,j+4,i+4,i,i+8,j,j,i+8,j+8,i+4,j+4,i+12,j+4,j+12,i+12);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return {geometry:g,inner};
}
function material({color=0x17191d,metalness=.75,roughness=.38}={}){return new T.MeshStandardMaterial({color,metalness,roughness,side:T.DoubleSide});}
function weatheredMetal(){
 const m=material({color:0x353639,metalness:.62,roughness:.69});
 m.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 vRoomWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvRoomWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  s.fragmentShader='varying vec3 vRoomWorld;\n'+noiseGLSL+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=vec2(atan(vRoomWorld.x,vRoomWorld.z-2.)*10.,vRoomWorld.y);
   float grit=noise2(p*58.);float wallPatch=fbm4(p*2.2);float runoff=noise2(p*vec2(21.,.22));
   float seam=min(abs(fract(p.x*.53)-.5),abs(fract(p.y*.58)-.5));
   diffuseColor.rgb*=mix(.16,1.45,wallPatch)*(.64+.5*grit)*(.75+.35*runoff)*smoothstep(0.,.014,seam);
   diffuseColor.rgb+=vec3(.014,.003,.001)*smoothstep(.65,.9,runoff);`);
 };
 return m;
}
export function createReferenceCamera(){
 const camera=new T.PerspectiveCamera(38,1672/941,.08,100);camera.position.set(0,1.48,-13.6);camera.lookAt(0,2.31,0);camera.updateMatrixWorld(true);return camera;
}
export function createFixedPanelLayout(){
 // Build from dimensions in metres, not four image rays. Rectangular geometry
 // makes the two triangles share one affine world-to-UV map: printed lines
 // stay straight from every camera angle without a diagonal texture crease.
 return ROOM_PANELS.map((data,index)=>{
  const center=new T.Vector3(...data.position);
  const normal=new T.Vector3(-Math.sin(data.yaw),0,-Math.cos(data.yaw));
  const right=new T.Vector3().crossVectors(up,normal);
  const corners=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>center.clone().addScaledVector(right,x*data.width*.5).addScaledVector(up,y*data.height*.5));
  return {index,center,normal,corners};
 });
}
function buildPanels(view){
 const texture=new T.TextureLoader(view.loadingManager).load('/assets/images/showroom-reference.png',()=>view.wake());texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,view.renderer.capabilities.getMaxAnisotropy());view.textures.push(texture);
 const black=material({color:0x060708,metalness:.82,roughness:.28}),edge=material({color:0x47494e,metalness:.96,roughness:.22});
 const red=new T.MeshBasicMaterial({color:new T.Color(5,.008,.017),toneMapped:false});
 const dimRed=new T.MeshBasicMaterial({color:new T.Color(.45,.001,.003)});
 view.panels=[];const layout=createFixedPanelLayout();
 for(const [index,data] of ROOM_PANELS.entries()){
  const shape=layout[index],{normal,corners}=shape;
  const frame=new T.Group();frame.name=`Portal ${index+1}: ${data.title}`;view.scene.add(frame);
  const ring=ringGeometry(corners,normal,.938,.22),outer=new T.Mesh(ring.geometry,black);outer.castShadow=true;outer.receiveShadow=true;frame.add(outer);
  const bevelCorners=ring.inner.map(p=>p.clone().addScaledVector(normal,.005)),bevel=ringGeometry(bevelCorners,normal,.986,.045);frame.add(new T.Mesh(bevel.geometry,edge));
  // Map the inset printed artwork to a real planar screen. Each frame keeps its own depth.
  const screenCorners=bevel.inner.map(p=>p.clone().addScaledVector(normal,-.008));
  const mapping=homography(data.art),mat=new T.ShaderMaterial({uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),artwork:{value:texture},contentMap:{value:texture},contentMix:{value:0},projection:{value:new T.Matrix3().set(...mapping)},hover:{value:0},hoverUv:{value:new T.Vector2(.5,.5)},eraseForeground:{value:index===2||index===3?1:0}},vertexShader:roomVertex,fragmentShader:displayFragment,side:T.DoubleSide,fog:true});
  const screen=new T.Mesh(planeGeometry(screenCorners),mat);screen.name=data.title;screen.userData.panel=index;frame.add(screen);
  const glass=new T.Mesh(planeGeometry(screenCorners.map(p=>p.clone().addScaledVector(normal,.004))),new T.MeshPhysicalMaterial({color:0xa8b5ce,metalness:.08,roughness:.21,clearcoat:1,clearcoatRoughness:.16,envMapIntensity:.85,transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide}));glass.name='Display cover glass';frame.add(glass);
  for(let k=0;k<4;k++){
   const a=screenCorners[k].clone().addScaledVector(normal,.012),b=screenCorners[(k+1)%4].clone().addScaledVector(normal,.012);lineBetween(a,b,.006,dimRed,frame);
  }
  // Sparse practical strips instead of a thick luminous outline.
  const upper=corners[0].clone().lerp(corners[1],.55),upperB=corners[0].clone().lerp(corners[1],.72);
  lineBetween(upper.addScaledVector(normal,.055),upperB.addScaledVector(normal,.055),.016,red,frame);
  const side=index<3?0:1,lower=index<3?3:2;
  lineBetween(corners[side].clone().lerp(corners[lower],.71).addScaledVector(normal,.08),corners[side].clone().lerp(corners[lower],.91).addScaledVector(normal,.08),.015,red,frame);
  const center=corners.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(.25);
  view.panels.push({index,screen,frame,center,corners,normal,material:mat,hover:0});
 }
}
function buildFloor(view){
 view.ground=new Reflector(new T.PlaneGeometry(70,70),{clipBias:.001,textureWidth:768,textureHeight:768,color:0x111216,shader:{uniforms:{color:{value:new T.Color(0x111216)},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},time:{value:0},reflectionResolution:{value:new T.Vector2(768,768)}},vertexShader:floorVertex,fragmentShader:floorFragment}});
 Object.assign(view.ground.material.uniforms,T.UniformsUtils.clone(T.UniformsLib.fog));view.ground.material.fog=true;
 view.ground.rotation.x=-Math.PI/2;view.ground.position.y=.024;view.scene.add(view.ground);
 const shadow=new T.Mesh(new T.PlaneGeometry(20,20),new T.ShadowMaterial({opacity:.47}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.027;shadow.receiveShadow=true;view.scene.add(shadow);
 const contact=new T.Mesh(new T.PlaneGeometry(4.9,9.6),new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:contactFragment,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.rotation.z=-.460715;contact.position.set(-.67248,.030,1.28199);view.scene.add(contact);
 const metal=material({color:0x08090b,roughness:.30}),red=new T.MeshBasicMaterial({color:new T.Color(8,.01,.018)}),dim=new T.MeshBasicMaterial({color:new T.Color(1.6,.008,.012)});
 const radii=[5.38,5.47,5.72];
 for(const [i,r] of radii.entries()){
  const rail=new T.Mesh(new T.TorusGeometry(r*.964340418,i===1?.018:.009,8,160),i===1?red:dim);rail.rotation.x=Math.PI/2;rail.position.set(0,.06,1.458534911);view.scene.add(rail);
 }
 for(const r of [5.26,5.59,5.83]){const ring=new T.Mesh(new T.TorusGeometry(r*.964340418,.047,8,160),metal);ring.rotation.x=Math.PI/2;ring.position.set(0,.037,1.458534911);view.scene.add(ring);}
 // Distressed real ground decals, cut from existing transparent identity assets.
 for(const [x,z,rot,key] of [[-5.65,-5.2,.16,'dxt'],[5.65,-5.3,-.18,'berserk']]){
  new T.TextureLoader(view.loadingManager).load(`/assets/icons/${key}.webp`,tex=>{if(view.disposed){tex.dispose();return;}tex.colorSpace=T.SRGBColorSpace;view.textures.push(tex);const m=new T.MeshStandardMaterial({map:tex,transparent:true,opacity:.24,depthWrite:false,roughness:.72,metalness:.25,color:0x888888,polygonOffset:true,polygonOffsetFactor:-1});const o=new T.Mesh(new T.PlaneGeometry(3.0,2.35),m);o.rotation.set(-Math.PI/2,0,rot);o.position.set(x,.04,z);view.scene.add(o);view.wake();});
 }
}
export function createRoomShell({wall=weatheredMetal(),metal=material({color:0x1c1d22,roughness:.38})}={}){
 const shell=new T.Group();shell.name='Open room structural shell';
 const {radius,centerZ,height,thetaStart,thetaLength}=ROOM_SHELL;
 const walls=new T.Mesh(new T.CylinderGeometry(radius,radius,height,68,6,true,thetaStart,thetaLength),wall);walls.name='Side and back wall';walls.position.set(0,height*.5,centerZ);walls.material.side=T.BackSide;shell.add(walls);
 // Close the real upper boundary: tall viewports can see above the cylindrical
 // wall even at the approved camera angle. This roof stays in world space.
 const roofMaterial=wall.clone();roofMaterial.side=T.FrontSide;
 roofMaterial.onBeforeCompile=wall.onBeforeCompile;
 const roof=new T.Mesh(new T.CircleGeometry(radius,96),roofMaterial);roof.name='Full room ceiling';roof.rotation.x=Math.PI/2;roof.position.set(0,height,centerZ);shell.add(roof);
 for(const y of [.48,1.0,5.15,6.05,7.1,8.15]){
  // Cylinder angle a maps to torus angle PI/2-a after its floor rotation.
  const geometry=new T.TorusGeometry(12.07,.062,8,80,thetaLength);geometry.rotateZ(Math.PI/2-thetaStart-thetaLength);
  const ring=new T.Mesh(geometry,metal);ring.name='Open wall rail';ring.rotation.x=Math.PI/2;ring.position.set(0,y,centerZ);shell.add(ring);
 }
 const angles=roomShellAngles(),ribs=new T.InstancedMesh(new T.BoxGeometry(.20,8.25,.20),metal,angles.length);ribs.name='Side and back wall ribs';
 for(const [i,a]of angles.entries()){const m=new T.Matrix4().compose(new T.Vector3(Math.sin(a)*12.01,4.12,centerZ+Math.cos(a)*12.01),new T.Quaternion().setFromAxisAngle(up,a),new T.Vector3(1,1,1));ribs.setMatrixAt(i,m);}ribs.instanceMatrix.needsUpdate=true;shell.add(ribs);
 return shell;
}
export function buildRoomArchitecture(view){
 const wall=weatheredMetal(),metal=material({color:0x1c1d22,roughness:.38}),silver=material({color:0x73767c,roughness:.25}),red=new T.MeshBasicMaterial({color:new T.Color(5.5,.008,.018)});
 view.structure=createRoomShell({wall,metal});view.scene.add(view.structure);
 const trim=new T.InstancedMesh(new T.BoxGeometry(.025,.48,.033),red,24);
 for(let i=0;i<24;i++){const a=-1.7+i*.148,m=new T.Matrix4().makeTranslation(Math.sin(a)*11.8,3.9+(i%2)*1.2,2+Math.cos(a)*11.8);trim.setMatrixAt(i,m);}view.scene.add(trim);
 // Vertical practical lights in the narrow gaps between the displays.
 for(const x of [-10,-6.8,-3.8,3.8,6.8,10]){
  const z=Math.abs(x)>8?-.25:Math.abs(x)>5?3.3:5.8;
  for(const [y,height] of [[4.3,.64],[1.15,1.05]]){const light=new T.Mesh(new T.BoxGeometry(.027,height,.035),red);light.position.set(x,y,z);view.scene.add(light);}
  const glow=new T.PointLight(0xff0a13,3.8,4.5,2);glow.position.set(x,.75,z-.1);view.scene.add(glow);
 }
 // A layered, recessed ceiling oculus: all rings share the same physical pivot.
 const center=new T.Vector3(0,7.5,1.5);
 const ceiling=weatheredMetal();ceiling.side=T.DoubleSide;
 const disk=new T.Mesh(new T.CylinderGeometry(4.75*.78,4.75*.78,.22,112),ceiling);disk.position.copy(center).add(new T.Vector3(0,.08,0));view.scene.add(disk);
 for(const [radius,tube,mat,y] of [[4.67,.075,metal,0],[4.55,.023,silver,-.12],[4.41,.018,silver,-.09],[3.45,.035,metal,-.16],[3.33,.019,silver,-.17],[4.76,.012,red,.07]]){
  const o=new T.Mesh(new T.TorusGeometry(radius*.78,tube,8,120),mat);o.rotation.x=Math.PI/2;o.position.copy(center).add(new T.Vector3(0,y,0));view.scene.add(o);
 }
 const white=new T.MeshBasicMaterial({color:new T.Color(5,5.3,5.8)}),ring=new T.Mesh(new T.TorusGeometry(4.49*.78,.013,8,120),white);ring.rotation.x=Math.PI/2;ring.position.copy(center).add(new T.Vector3(0,-.13,0));view.scene.add(ring);
 // Blurred foreground tire stacks are geometry and therefore carry real depth.
 const rubber=material({color:0x08090c,metalness:.06,roughness:.54});
 const gs=[];
 for(const x of ROOM_FOREGROUND_TIRES.x)for(let j=0;j<ROOM_FOREGROUND_TIRES.levels;j++){
  const tire=new T.TorusGeometry(.65,.185,12,44);tire.rotateX(Math.PI/2);tire.scale(1,.74,1);tire.translate(x,j*.30+.21,ROOM_FOREGROUND_TIRES.z);gs.push(tire);
  for(const band of [-.12,.12]){const tread=new T.TorusGeometry(.735,.016,5,44);tread.rotateX(Math.PI/2);tread.translate(x,j*.30+.21+band,ROOM_FOREGROUND_TIRES.z);gs.push(tread);}
 }
 const tires=new T.Mesh(mergeGeometries(gs),rubber);tires.name='Foreground tire stacks';gs.forEach(g=>g.dispose());tires.castShadow=true;view.scene.add(tires);
}
export function buildShowroom(view){
 view.textures=[];buildFloor(view);buildRoomArchitecture(view);buildPanels(view);
}
