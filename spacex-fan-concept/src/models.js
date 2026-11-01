import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {surfaceMaterial,decalTexture,installHighlight} from './materials.js';
import {vehicles,partOrder} from './data.js';

const TAU=Math.PI*2;
/** Original visual models. Detailed pieces are merged by material AND semantic part. */
export function buildRocket(index,{textures=true}={}) {
  const vehicle=vehicles[index],group=new T.Group(),bins=new Map(),materials=new Map(),uniforms={};
  group.name=vehicle.id;
  for(const part of partOrder)uniforms[part]={highlight:{value:0},brightness:{value:1}};
  const transformation=new T.Object3D();
  function add(geometry,material,part,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1],variant='main') {
    transformation.position.set(...position);transformation.rotation.set(...rotation);transformation.scale.set(...scale);transformation.updateMatrix();
    let g=geometry.index?geometry.toNonIndexed():geometry;g.applyMatrix4(transformation.matrix);if(g!==geometry)geometry.dispose();
    const key=`${part}|${material}|${variant}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(g);
  }
  const cyl=(rt,rb,h,pos,mat,part,seg=40,variant='main',start=0,length=TAU)=>add(new T.CylinderGeometry(rt,rb,h,seg,1,false,start,length),mat,part,pos,[0,0,0],[1,1,1],variant);
  const torus=(r,t,pos,mat,part,rot=[Math.PI/2,0,0],variant='main',seg=40)=>add(new T.TorusGeometry(r,t,5,seg),mat,part,pos,rot,[1,1,1],variant);
  const box=(size,pos,mat,part,rot=[0,0,0],variant='main')=>add(new T.BoxGeometry(...size),mat,part,pos,rot,[1,1,1],variant);
  function lathe(points,pos,mat,part,variant='main',segments=48,start=0,length=TAU){add(new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),segments,start,length),mat,part,pos,[0,0,0],[1,1,1],variant);}
  function rod(a,b,r,mat,part,variant='main',segments=8){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),g=new T.CylinderGeometry(r,r,delta.length(),segments);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());add(g,mat,part,[0,0,0],[0,0,0],[1,1,1],variant);
  }
  function pipe(points,r,mat,part,variant='main') {const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));add(new T.TubeGeometry(curve,16,r,6,false),mat,part,[0,0,0],[0,0,0],[1,1,1],variant);}
  function prism(points,depth,pos,mat,part,rotation=[0,0,0],variant='main') {
    const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geometry.translate(0,0,-depth/2);add(geometry,mat,part,pos,rotation,[1,1,1],variant);
  }
  function decal(kind,y,height,radius,arc,part,variant='main',offset=0){
    if(!textures)return;
    const texture=decalTexture(kind),mat=new T.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.4,metalness:.12,side:T.FrontSide,polygonOffset:true,polygonOffsetFactor:-1});
    installHighlight(mat,uniforms[part]);materials.set(`decal-${materials.size}`,mat);
    const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,height,32,1,true,-arc/2+offset,arc),mat);mesh.position.y=y;mesh.userData={part,variant};mesh.renderOrder=2;group.add(mesh);
  }
  function engine(x,z,size=1,y=0,raptor=false) {
    const S=size,part='engines',points=[[.102,.06],[.1,.08],[.094,.12],[.08,.17],[.06,.23],[.041,.30],[.038,.37],[.047,.4],[.048,.44]];
    lathe(points.map(([r,h])=>[r*S,h*S]),[x,y,z],raptor?'steel':'bronze',part,'main',28);
    lathe([[.1*S,.062*S],[.084*S,.12*S],[.05*S,.24*S],[.035*S,.35*S]],[x,y,z],'black',part,'main',24);
    torus(.1*S,.005*S,[x,y+.065*S,z],'silver',part);
    for(let k=0;k<11;k++){const h=.09+k*.026,r=.102*Math.pow((.4-h)/.31,.72);if(r>.04)torus(r*S,.0019*S,[x,y+h*S,z],'steel',part,[Math.PI/2,0,0],'main',24);}
    cyl(.047*S,.047*S,.15*S,[x,y+.46*S,z],'steel',part,20);
    cyl(.065*S,.065*S,.045*S,[x,y+.55*S,z],'silver',part,18);
    box([.065*S,.08*S,.06*S],[x+.07*S,y+.49*S,z],'steel',part);
    torus(.036*S,.013*S,[x+.073*S,y+.56*S,z],'silver',part,[0,Math.PI/2,0],'main',18);
    for(let i=0;i<3;i++){
      const a=i*TAU/3,dx=Math.cos(a)*S,dz=Math.sin(a)*S;
      pipe([[x+.085*dx,y+.13*S,z+.085*dz],[x+.11*dx,y+.32*S,z+.11*dz],[x+.09*dx,y+.49*S,z+.09*dz],[x+.02*dx,y+.62*S,z+.02*dz]],.006*S,'silver',part);
    }
    rod([x-.065*S,y+.35*S,z],[x-.12*S,y+.66*S,z],.012*S,'dark',part);
  }
  function gridFin(x,y,z,angle,size=.33,part='interstage') {
    const g=new T.Group(),w=size,h=size*.60;
    const local=(sx,sy,sz)=>{const v=new T.Vector3(sx,sy,sz).applyAxisAngle(new T.Vector3(0,1,0),angle);return [v.x+x,v.y+y,v.z+z];};
    for(let n=-4;n<=4;n++)box([.012,h,.055],local(n*w/8,0,0),'steel',part,[0,angle,0]);
    for(let n=-2;n<=2;n++)box([w,.012,.055],local(0,n*h/4,0),'steel',part,[0,angle,0]);
    box([w+.025,.025,.07],local(0,h/2,0),'dark',part,[0,angle,0]);box([w+.025,.025,.07],local(0,-h/2,0),'dark',part,[0,angle,0]);
    rod(local(0,-h*.8,0),local(0,-h*.55,0),.038,'steel',part);
  }
  function leg(x,z,angle,folded=false){
    const s=Math.sin(angle),c=Math.cos(angle),r=folded?.43:1.03;
    const p=(rr,y,side=0)=>[x+s*rr+c*side,y,z+c*rr-s*side];
    prism([[.35,2.58],[r,.13],[r-.18,.10],[.35,1.25]],.085,[x,0,z],'carbon','engines',[0,angle-Math.PI/2,0]);
    rod(p(.38,2.4),p(r,.14),.027,'steel','engines');rod(p(.39,1.65),p(r-.08,.12),.019,'silver','engines');
    rod(p(.39,1.63),p(.62,.95),.034,'dark','engines');
    box([.22,.065,.16],p(r,.045),'dark','engines',[0,-angle,0]);
    cyl(.045,.045,.07,p(.40,2.3),'silver','engines',12);
  }
  function falconCore(cx=0,side=false){
    cyl(.367,.367,6.83,[cx,5.0,0],'paint','tanks',64);
    cyl(.37,.37,1.04,[cx,1.10,0],'carbon','engines',64);
    cyl(.368,.368,1.0,[cx,8.90,0],'carbon','interstage',64);
    for(const y of [.60,.83,1.18,1.63,2.95,5.05,7.15,8.40,9.39])torus(.371,.008,[cx,y,0],y<1.64?'steel':'paint',y<1.64?'engines':y>8.3?'interstage':'tanks');
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+.45,s=Math.sin(a),c=Math.cos(a);
      rod([cx+.37*s,1.5,.37*c],[cx+.37*s,8.35,.37*c],.018,'pale','tanks');
      for(const y of [2.3,3.6,4.9,6.2,7.5])box([.05,.055,.04],[cx+.376*s,y,.376*c],'steel','tanks',[0,a,0]);
      gridFin(cx+s*.44,8.55,c*.44,a,.31);
      leg(cx,0,a,side);
    }
    cyl(.347,.347,.045,[cx,.65,0],'steel','engines',48);
    for(let i=0;i<8;i++){const a=i*TAU/8;engine(cx+Math.sin(a)*.24,Math.cos(a)*.24,.98);}
    engine(cx,0,.98);
    for(let i=0;i<16;i++){const a=i*TAU/16;
      cyl(.011,.011,.025,[cx+Math.sin(a)*.369,.86,Math.cos(a)*.369],'silver','engines',6);
      pipe([[cx+Math.sin(a)*.34,.55,Math.cos(a)*.34],[cx+Math.sin(a)*.39,.70,Math.cos(a)*.39],[cx+Math.sin(a)*.375,.95,Math.cos(a)*.375]],.007,'steel','engines');
    }
    for(const y of [1.03,1.60,8.5,9.35])for(let i=0;i<28;i++){const a=i*TAU/28;
      add(new T.SphereGeometry(.007,5,3),'steel',y<2?'engines':'interstage',[cx+Math.sin(a)*.374,y,Math.cos(a)*.374]);
    }
    if(side){lathe([[.368,0],[.367,.13],[.33,.4],[.23,.78],[.08,1.13],[.003,1.26]],[cx,9.4,0],'pale','interstage');}
  }
  function upperFalcon() {
    cyl(.365,.365,1.75,[0,10.27,0],'pale','interstage',64);
    for(const y of [9.42,9.53,10.96,11.15])torus(.37,.008,[0,y,0],'steel','interstage');
    const fairing=[[.367,0],[.38,.1],[.48,.24],[.52,.36],[.52,1.26],[.507,1.47],[.465,1.7],[.397,1.94],[.309,2.17],[.207,2.38],[.105,2.57],[.028,2.7],[.001,2.73]];
    lathe(fairing,[0,11.27,0],'pale','fairing','fairing',64);
    for(const y of [11.62,12.40,12.60])torus(.521,.0035,[0,y,0],'paint','fairing',[Math.PI/2,0,0],'fairing');
    for(const sign of [-1,1]){
      pipe([[sign*.52,11.6,0],[sign*.52,12.52,0],[sign*.46,13.02,0],[sign*.28,13.48,0],[sign*.02,13.97,0]],.0035,'paint','fairing','fairing');
    }
    for(let i=0;i<32;i++){const a=i*TAU/32;add(new T.SphereGeometry(.004,4,3),'steel','fairing',[Math.sin(a)*.522,11.68,Math.cos(a)*.522],[0,0,0],[1,1,1],'fairing');}
    for(const a of [0,Math.PI]){
      box([.065,.12,.025],[0,11.54,Math.cos(a)*.505],'steel','fairing',[0,a,0],'fairing');
      box([.105,.20,.007],[.25,12.09,Math.cos(a)*.453],'paint','fairing',[0,a+.5,0],'fairing');
    }
    decal('x',12.45,.42,.524,1.1,'fairing','fairing');
  }
  function dragon(){
    cyl(.39,.39,.7,[0,11.5,0],'pale','fairing',48,'dragon');
    cyl(.393,.393,.58,[0,11.48,0],'glass','fairing',32,'dragon',Math.PI*.55,Math.PI*.9);
    lathe([[.39,0],[.42,.08],[.41,.25],[.34,.62],[.25,.95],[.17,1.12],[.06,1.21],[.001,1.24]],[0,11.85,0],'pale','fairing','dragon');
    torus(.405,.017,[0,11.94,0],'dark','fairing',[Math.PI/2,0,0],'dragon');
    for(const x of [-.18,.18]){
      box([.13,.19,.025],[x,12.46,.263],'glass','fairing',[-.34,x>0?.45:-.45,0],'dragon');
      box([.14,.08,.03],[x,12.08,.358],'dark','fairing',[-.14,x>0?.37:-.37,0],'dragon');
    }
    for(const a of [.9,-.9,2.2,-2.2])cyl(.027,.027,.055,[Math.sin(a)*.41,12.05,Math.cos(a)*.41],'dark','fairing',10,'dragon');
    decal('x',12.18,.18,.393,.6,'fairing','dragon');
  }
  if(index===0){
    cyl(.167,.167,2.45,[0,1.58,0],'paint','tanks',48);cyl(.168,.168,.28,[0,.39,0],'carbon','engines',40);engine(0,0,.81);
    cyl(.166,.166,.42,[0,3.01,0],'carbon','interstage',48);cyl(.152,.152,.50,[0,3.47,0],'pale','interstage',48);
    lathe([[.152,0],[.18,.06],[.18,.25],[.16,.40],[.10,.58],[.001,.69]],[0,3.57,0],'pale','fairing');
    for(const y of [.55,1.2,2.4,2.8,3.22])torus(.169,.004,[0,y,0],'steel',y<.6?'engines':y>2.8?'interstage':'tanks');
    for(const a of [0,Math.PI])rod([Math.sin(a)*.168,.55,Math.cos(a)*.168],[Math.sin(a)*.168,2.8,Math.cos(a)*.168],.007,'pale','tanks');
    decal('wordmark',1.35,1.05,.169,.7,'tanks');decal('flag',2.05,.14,.17,.9,'tanks');decal('x',3.9,.13,.18,.8,'fairing');
  }else if(index===1||index===2){
    falconCore();if(index===2){falconCore(-.82,true);falconCore(.82,true);
      for(const x of [-.41,.41])for(const y of [1.2,8.45])box([.17,.14,.16],[x,y,0],'steel',y>8?'interstage':'engines');
    }
    upperFalcon();if(index===1)dragon();decal('wordmark',4.0,2.75,.372,.63,'tanks');decal('flag',6.5,.23,.373,.92,'tanks');
  }else{
    cyl(.899,.899,12.9,[0,7.2,0],'silver','tanks',80);cyl(.90,.90,.75,[0,.69,0],'steel','engines',64);
    for(let i=0;i<20;i++){const a=i*TAU/20;engine(Math.sin(a)*.69,Math.cos(a)*.69,1.35,.04,true);}
    for(let i=0;i<10;i++){const a=i*TAU/10;engine(Math.sin(a)*.40,Math.cos(a)*.40,1.35,.04,true);}
    for(let i=0;i<3;i++){const a=i*TAU/3;engine(Math.sin(a)*.16,Math.cos(a)*.16,1.25,.04,true);}
    for(let y=1.35;y<13.7;y+=.37)torus(.901,.006,[0,y,0],'steel','tanks',[Math.PI/2,0,0],'main',64);
    for(let i=0;i<8;i++){const a=i*TAU/8;rod([Math.sin(a)*.905,1.1,Math.cos(a)*.905],[Math.sin(a)*.905,13.25,Math.cos(a)*.905],.013,'steel','tanks');}
    cyl(.9,.9,.65,[0,14.0,0],'dark','interstage',64);
    for(let i=0;i<40;i++){const a=i*TAU/40;box([.025,.62,.04],[Math.sin(a)*.90,14,Math.cos(a)*.90],'silver','interstage',[0,a,0]);}
    for(const y of [13.65,14.34])torus(.907,.03,[0,y,0],'steel','interstage');
    for(let i=0;i<4;i++){const a=i*TAU/4+.4;gridFin(Math.sin(a)*1.12,13.0,Math.cos(a)*1.12,a,.9);}
    cyl(.90,.90,6.55,[0,17.63,0],'silver','fairing',80);
    lathe([[.9,0],[.898,.3],[.86,.7],[.77,1.15],[.62,1.7],[.44,2.2],[.22,2.65],[.055,3.02],[.001,3.1]],[0,20.9,0],'silver','fairing','main',80);
    cyl(.905,.905,6.53,[0,17.63,0],'tiles','fairing',40,'main',Math.PI*.55,Math.PI);
    lathe([[.905,0],[.90,.3],[.865,.7],[.775,1.15],[.625,1.7],[.445,2.2],[.225,2.65],[.058,3.02],[.002,3.1]],[0,20.9,0],'tiles','fairing','main',48,Math.PI*.55,Math.PI);
    for(let y=14.5;y<21;y+=.37)torus(.904,.006,[0,y,0],'steel','fairing',[Math.PI/2,0,0],'main',64);
    for(const sign of [-1,1]){
      prism([[.85,0],[1.75,.12],[1.66,1.8],[.88,2.7]],.075,[0,14.6,-.15],sign<0?'carbon':'steel','fairing',[0,sign<0?Math.PI:0,0]);
      prism([[.68,0],[1.36,-.20],[1.25,.85],[.48,1.70]],.065,[0,21.15,-.05],sign<0?'carbon':'steel','fairing',[0,sign<0?Math.PI:0,0]);
      rod([sign*.86,14.65,-.15],[sign*.86,17.1,-.15],.05,'dark','fairing');
    }
    decal('flag',11.8,.42,.908,.85,'tanks');
    decal('x',19.6,.65,.91,1.0,'fairing');
  }
  for(const [key,geometries] of bins){
    const [part,kind,variant]=key.split('|');let material;
    if(kind==='tiles'){
      material=surfaceMaterial('carbon',uniforms[part],textures);
      if(textures){material.map=decalTexture('tiles');material.color.set(0x999999);}
    }else material=surfaceMaterial(kind,uniforms[part],textures);
    const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material);mesh.name=key;mesh.userData={part,variant};mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);materials.set(key,material);
  }
  function payload(value){group.traverse(mesh=>{if(mesh.isMesh&&['fairing','dragon'].includes(mesh.userData.variant))mesh.visible=mesh.userData.variant===value;});}
  payload('fairing');
  return {group,uniforms,payload,dispose(){group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const material of materials.values())material.dispose();}};
}
