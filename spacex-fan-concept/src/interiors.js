import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {surfaceMaterial} from './materials.js';

/** Explanatory visualization only. Not manufacturer CAD or a flight configuration. */
export function buildInterior(index,part,box,payload='fairing'){
 const group=new T.Group();group.name='illustrative-internals';
 const geometries=new Set(),materials=new Set(),bins=new Map();
 const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const r=part==='fairing'?Math.min(size.x,size.z)*.46:index===3?.88:index===0?.165:.365;
 const h=Math.max(.2,size.y),base=box.min.y,top=box.max.y;
 const uniform={highlight:{value:0},brightness:{value:1}};
 const palette=Object.fromEntries(['steel','silver','carbon','bronze','black','paint'].map(k=>{const m=surfaceMaterial(k,uniform);materials.add(m);return [k,m];}));
 const gold=new T.MeshStandardMaterial({color:0x9d7433,metalness:.92,roughness:.32});materials.add(gold);palette.gold=gold;
 const push=(geo,kind,pos=[0,0,0],rot=null,scale=null)=>{
  const m=new T.Matrix4(),q=new T.Quaternion();if(rot)q.setFromEuler(new T.Euler(...rot));m.compose(new T.Vector3(...pos),q,new T.Vector3(...(scale||[1,1,1])));geo.applyMatrix4(m);
  // All builders share a normal+UV layout and are merged by material once.
  if(!bins.has(kind))bins.set(kind,[]);bins.get(kind).push(geo);return geo;
 };
 const ring=(x,y,rad,thick=.012,kind='silver')=>push(new T.TorusGeometry(rad,thick,6,48),kind,[x,y,0],[Math.PI/2,0,0]);
 const rod=(a,b,rad=.012,kind='steel')=>{
  const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va);
  const geo=new T.CylinderGeometry(rad,rad,delta.length(),8);geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));geo.translate(...va.add(vb).multiplyScalar(.5).toArray());
  if(!bins.has(kind))bins.set(kind,[]);bins.get(kind).push(geo);
 };
 const shell=(x,y,rad,height,kind='carbon')=>push(new T.CylinderGeometry(rad,rad,height,48,1,true,Math.PI*.54,Math.PI*.92),kind,[x,y,0]);
 const bolts=(x,y,rad)=>{for(let i=0;i<24;i++){const a=i*Math.PI/12;push(new T.CylinderGeometry(.012,.012,.018,6),'silver',[x+Math.cos(a)*rad,y,Math.sin(a)*rad]);}};
 const coreXs=index===2&&part!=='fairing'?[0,-.82,.82]:[0];
 for(const x of coreXs){
  if(part==='tanks'){
   shell(x,center.y,r*.96,h*.96,'paint');
   for(const [fraction,length] of [[.32,.46],[.76,.34]]){
    const y=base+h*fraction,hh=h*length;
    shell(x,y,r*.87,hh,'steel');
    for(const sign of [-1,1])push(new T.SphereGeometry(r*.86,32,12,0,Math.PI*2,0,Math.PI/2),'silver',[x,y+sign*hh*.5,0],sign===1?null:[Math.PI,0,0],[1,.32,1]);
    for(let i=0;i<4;i++)ring(x,y-hh*.35+i*hh*.23,r*.885,.012);
   }
   rod([x+r*.55,base+.10,r*.2],[x+r*.55,top-.1,r*.2],r*.07,'silver');
   for(let i=0;i<6;i++){const y=base+h*(i+1)/7;ring(x,y,r*.97,.009);}
  }else if(part==='interstage'){
   shell(x,center.y,r*.98,h*.96);
   for(const y of [base+.06,top-.06]){ring(x,y,r*.98,.025);bolts(x,y,r*.90);}
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4,b=a+Math.PI/4;
    rod([x+Math.cos(a)*r*.88,base+.08,Math.sin(a)*r*.88],[x+Math.cos(b)*r*.88,top-.08,Math.sin(b)*r*.88],r*.045);
   }
   for(let i=0;i<5;i++)rod([x-r*.7+i*.018,base+.1,-r*.45],[x-r*.7+i*.018,top-.1,-r*.45],.006,i%2?'bronze':'black');
   for(const sign of [-1,1])push(new T.BoxGeometry(r*.4,h*.12,r*.16),'black',[x+sign*r*.53,base+h*.25,-r*.40]);
  }else if(part==='engines'){
   // Keep the authored nozzles; add the exposed thrust structure and service plumbing.
   const y=base+h*.78;ring(x,y,r*.95,.027);bolts(x,y,r*.84);
   const count=index===0?1:index===3?12:9;
   for(let i=0;i<count;i++){
    const a=i*Math.PI*2/Math.max(1,count-1),rr=i===0?0:r*.63,px=x+Math.cos(a)*rr,pz=Math.sin(a)*rr;
    rod([px,base+h*.30,pz],[px,base+h*.86,pz],r*.035,'silver');
    rod([px,base+h*.77,pz],[x,base+h*.97,0],r*.025);
    push(new T.CylinderGeometry(r*.10,r*.12,h*.13,12),'steel',[px,base+h*.63,pz]);
   }
   shell(x,base+h*.84,r,h*.29,'carbon');
  }else if(payload==='dragon'){
   shell(x,center.y,r,h*.65,'paint');
   ring(x,base+h*.18,r*.9,.018);
   for(let i=0;i<4;i++){const a=(i-1.5)*.47;push(new T.BoxGeometry(r*.36,h*.15,r*.7),'black',[a*r,base+h*.43,0],[-.2,0,0]);rod([a*r,base+h*.25,-r*.1],[a*r,base+h*.40,-r*.1],.015);}
  }else{
   // A generic satellite bus: no claim about any actual mission's payload.
   const payloadR=index===3?r*.63:r*.72;
   const sh=h*.45,sy=base+h*.49;
   push(new T.BoxGeometry(payloadR*1.2,sh,payloadR*1.2),'gold',[x,sy,0]);
   push(new T.BoxGeometry(payloadR*1.04,sh*.94,.012),'black',[x,sy,payloadR*.61]);
   for(let i=0;i<8;i++)rod([x-payloadR*.5,sy-sh*.44+i*sh*.12,payloadR*.63],[x+payloadR*.5,sy-sh*.44+i*sh*.12,payloadR*.63],.003,'silver');
   push(new T.CylinderGeometry(payloadR*.58,r*.9,h*.15,32,1,true),'carbon',[x,base+h*.17,0]);
   ring(x,base+h*.1,r*.93,.021);ring(x,base+h*.24,payloadR*.62,.017);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;rod([x+Math.cos(a)*r*.85,base+h*.1,Math.sin(a)*r*.85],[x+Math.cos(a)*payloadR*.57,base+h*.24,Math.sin(a)*payloadR*.57],.012);}
  }
 }
 for(const [kind,parts] of bins){
  const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!g)continue;geometries.add(g);
  const mesh=new T.Mesh(g,palette[kind]);mesh.userData={internal:true,part};group.add(mesh);
 }
 return {group,dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
