/** Authored, volumetric drift coupes. Every exterior panel, wheel and cabin is geometry.
 * This is an original reference-inspired mesh, not a licensed Nissan game asset.
 * Coordinates: X across, Y up, -Z toward the front. */
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function surface(fn,nu=30,nv=12){
 const p=[],uv=[],idx=[];for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){p.push(...fn(i/nu,j/nv));uv.push(i/nu,j/nv)}
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){let a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;idx.push(a,c,b,b,c,d)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function poly(points){const g=new T.BufferGeometry(),p=[],uv=[];for(const a of points){p.push(...a);uv.push(a[0],a[1])}const id=[];for(let i=1;i<points.length-1;i++)id.push(0,i,i+1);g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(id);g.computeVertexNormals();return g;}
export function buildCar({color=0xc50019,variant='coupe'}={}){
 const root=new T.Group();root.name=variant==='coupe'?'DXT red drift coupe':'DXT pearl track coupe';
 const grand=variant!=='coupe';
 const paint=new T.MeshPhysicalMaterial({color,metalness:.76,roughness:.115,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.45,side:T.DoubleSide});paint.name='clearcoat body';
 const carbon=new T.MeshStandardMaterial({color:0x08090a,metalness:.35,roughness:.28,side:T.DoubleSide});
 const rubber=new T.MeshStandardMaterial({color:0x090a0c,roughness:.81,metalness:.01});
 const chrome=new T.MeshStandardMaterial({color:0xd3d8df,metalness:1,roughness:.20});
 const gun=new T.MeshStandardMaterial({color:0x242832,metalness:.92,roughness:.24});
 const black=new T.MeshStandardMaterial({color:0x030509,roughness:.40,metalness:.2,side:T.DoubleSide});
 const glass=new T.MeshPhysicalMaterial({color:0x15232c,roughness:.09,metalness:.30,transparent:true,opacity:.64,side:T.DoubleSide,depthWrite:false,clearcoat:1});
 const white=new T.MeshStandardMaterial({color:0xeaffff,emissive:0xd4efff,emissiveIntensity:4,roughness:.1});
 const amber=new T.MeshStandardMaterial({color:0xff7e1f,emissive:0xff5511,emissiveIntensity:1.3});
 const red=new T.MeshStandardMaterial({color:0xff0718,emissive:0xff0015,emissiveIntensity:2.5});
 const caliper=new T.MeshStandardMaterial({color:0xda1808,metalness:.3,roughness:.32});
 const blue=new T.MeshStandardMaterial({color:0x227d9e,metalness:.65,roughness:.25});
 const darkGlass=new T.MeshPhysicalMaterial({color:0x10161a,metalness:.4,roughness:.14,clearcoat:1,side:T.DoubleSide});
 const add=(g,m,pos=[0,0,0],rot=[0,0,0],parent=root)=>{const o=new T.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
 const box=(size,pos,m=paint,rot=[0,0,0],parent=root)=>add(m===paint?new RoundedBoxGeometry(...size,2,Math.min(.025,Math.min(...size)*.22)):new T.BoxGeometry(...size),m,pos,rot,parent);
 const tube=(points,r,m,seg=40,parent=root)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),seg,r,6,false),m,[0,0,0],[0,0,0],parent);
 const roofH=grand?1.29:1.22,front=-2.17,tail=2.13,wheelZ=[-1.37,1.34];
 const width=z=>.87+.14*Math.exp(-Math.pow((z+1.37)/.49,2))+.15*Math.exp(-Math.pow((z-1.35)/.50,2))-.055*smooth(1.85,2.2,Math.abs(z));
 const deck=z=>.70+.115*smooth(-2.15,-.60,z)-.05*smooth(.8,2.2,z);
 const top=(z,x)=>deck(z)+.032*(1-x*x)+.06*Math.exp(-Math.pow((Math.abs(z)-1.36)/.5,2))*Math.pow(Math.abs(x),4);
 // Continuous curved hood, deck and fenders. The windshield and roof cover the cabin cutout.
 for(const [za,zb]of[[front,-.62],[1.23,tail]])add(surface((u,v)=>{let z=za+(zb-za)*u,x=v*2-1;return [x*width(z),top(z,x),z]},48,30),paint);
 // Cabin shoulders and sill skin, with physically open wheel arches.
 for(const side of[-1,1]){
  add(surface((u,v)=>{const z=-.65+1.91*u,w=width(z);return [side*(.76+(w-.76)*v),top(z,.85)-v*.045,z]},35,5),paint);
  add(surface((u,v)=>{const z=front+(tail-front)*u,w=width(z);let low=.145;for(const center of wheelZ){const dz=z-center;if(Math.abs(dz)<.43)low=Math.max(low,.36+Math.sqrt(Math.max(0,.43*.43-dz*dz)));}const upper=top(z,1);const y=T.MathUtils.lerp(low,Math.max(low+.016,upper),v);return[side*(w-.028*Math.sin(v*Math.PI)),y,z]},160,10),paint);
  // Widebody arch lips and exposed fasteners.
  for(const zc of wheelZ){const points=[];for(let i=0;i<=32;i++){const a=Math.PI*(i/32);points.push([side*1.025,.36+.435*Math.sin(a),zc+.435*Math.cos(a)])}tube(points,.022,paint,48);
   for(let i=1;i<12;i++){const a=Math.PI*i/12;add(new T.SphereGeometry(.010,6,4),gun,[side*1.047,.36+.447*Math.sin(a),zc+.447*Math.cos(a)])}}
  box([.085,.095,1.82],[side*.93,.155,0],paint);box([.10,.027,1.86],[side*.963,.11,0],carbon);
  // Door shut-lines and handles are physical fine tubes.
  tube([[side*.873,.80,-.62],[side*.901,.66,-.58],[side*.904,.20,-.58],[side*.907,.20,.89],[side*.90,.72,.94],[side*.857,.82,1.00]],.006,black,40);
  box([.024,.025,.13],[side*.915,.70,.68],gun);
 }
 // Sculpted front bumper, large open radiator throat and side intakes.
 box([1.94,.092,.16],[0,.135,front-.045]);box([1.35,.080,.17],[0,.52,front-.05]);
 box([.11,.35,.16],[-.66,.325,front-.045]);box([.11,.35,.16],[.66,.325,front-.045]);
 for(const s of[-1,1]){
  box([.10,.43,.25],[s*.947,.35,front+.055]);box([.26,.075,.20],[s*.815,.552,front]);
  box([.17,.07,.23],[s*.83,.165,front-.015]);box([.28,.31,.08],[s*.80,.345,front+.18],black);
  for(let k=0;k<3;k++)box([.235,.012,.018],[s*.80,.26+k*.075,front+.11],carbon);
 }
 box([1.16,.30,.18],[0,.335,front+.115],gun);for(let i=0;i<19;i++)box([1.14,.004,.022],[0,.197+i*.015,front+.085],gun);
 for(const s of[-1,1]){tube([[s*.51,.26,front+.16],[s*.61,.24,front+.20],[s*.68,.25,front+.37]],.05,blue,10);}
 box([1.99,.025,.32],[0,.073,front-.04],carbon);
 // Fine upper grill and a central bonnet shut-line.
 box([grand?.71:.83,.076,.085],[0,.634,front-.047],black);
 for(let i=0;i<4;i++)box([grand?.65:.78,.005,.015],[0,.607+i*.017,front-.094],gun);
 tube([[-.83,.726,-2.12],[-.60,.77,-1.43],[-.55,.812,-.74],[.55,.812,-.74],[.60,.77,-1.43],[.83,.726,-2.12]],.005,black,50);
 // Angular lamp housings; actual projectors sit behind a smoked lens.
 for(const s of[-1,1]){
  const pts=grand?[[s*.47,.56,-2.218],[s*.89,.61,-2.19],[s*.83,.91,-1.78],[s*.57,.83,-1.82]]:[[s*.46,.603,-2.222],[s*.91,.64,-2.18],[s*.91,.744,-2.08],[s*.51,.732,-2.145]];
  add(poly(pts),black);for(let i=0;i<3;i++){const x=s*(.56+i*.115),y=grand?.66+i*.07:.673,z=grand?-2.20+i*.12:-2.231+i*.023;
   add(new T.CylinderGeometry(.043,.047,.022,20),chrome,[x,y,z],[Math.PI/2,0,0]);add(new T.SphereGeometry(i===0?.027:.022,14,10),grand?amber:white,[x,y,z-.018]);}
  add(poly(pts.map(([x,y,z])=>[x,y,z-.012])),glass);
  box([.055,.018,.012],[s*.89,.659,-2.205],amber);
 }
 // Vented bonnet and character creases.
 for(const s of[-1,1])for(let i=0;i<3;i++)box([.24,.008,.055],[s*.42,.782,-1.65+i*.13],black,[-.05,0,0]);
 for(const s of[-1,1])tube([[s*.4,.75,-2.04],[s*.45,.791,-1.2],[s*.48,.82,-.67]],.004,paint,25);
 // Roof and glass openings with normal-aware light response.
 const roofStart=-.04,roofEnd=.77;
 add(surface((u,v)=>{const z=roofStart+(roofEnd-roofStart)*u,x=(v*2-1)*.668;return[x,roofH+.025*Math.sin(u*Math.PI)-.055*(x/.67)**2,z]},28,22),paint);
 const windshield=[[-.79,.819,-.65],[.79,.819,-.65],[.665,roofH-.045,roofStart],[-.665,roofH-.045,roofStart]];
 add(poly(windshield),glass);tube([...windshield,windshield[0]],.018,black,50);
 const rearGlass=[[-.665,roofH-.04,.79],[.665,roofH-.04,.79],[.79,.82,1.27],[-.79,.82,1.27]];add(poly(rearGlass),darkGlass);tube([...rearGlass,rearGlass[0]],.020,paint,50);
 for(const s of[-1,1]){
  const sideWindow=[[s*.807,.82,-.59],[s*.674,roofH-.05,.0],[s*.674,roofH-.05,.745],[s*.802,.828,1.16]];
  add(poly(sideWindow),glass);tube([...sideWindow,sideWindow[0]],.022,paint,45);tube([[s*.68,roofH-.055,.50],[s*.806,.823,.58]],.028,black,4);
  // Wing mirrors, housing and stalk.
  tube([[s*.812,.82,-.47],[s*1.005,.9,-.52]],.018,carbon,8);
  const mirror=add(new T.SphereGeometry(1,20,10),carbon,[s*1.055,.913,-.535]);mirror.scale.set(.135,.052,.085);
  box([.011,.066,.125],[s*1.16,.913,-.528],chrome);
 }
 // Interior remains spatially separate and can be seen from changed camera angles.
 box([1.64,.12,1.45],[0,.4,.2],black);box([1.47,.19,.27],[0,.77,-.51],black,[-.15,0,0]);
 for(const s of[-1,1]){box([.43,.13,.43],[s*.4,.54,.32],carbon);box([.43,.56,.14],[s*.4,.82,.59],carbon,[-.12,0,0]);box([.22,.13,.13],[s*.4,1.11,.63],black);tube([[s*.74,.65,.7],[s*.59,1.12,.68],[-s*.59,1.12,.68],[-s*.74,.65,.7]],.019,paint,22);}
 add(new T.TorusGeometry(.128,.015,8,32),rubber,[.39,.86,-.17],[.43,0,0]);box([.028,.04,.25],[.39,.80,-.26],carbon,[.43,0,0]);
 // Wipers at the base of the windscreen.
 for(const s of[-1,1])tube([[s*.60,.838,-.632],[s*.40,.89,-.51],[s*.12,.897,-.50]],.005,carbon,8);
 // Raised carbon aero wing and sculpted rear lights.
 for(const s of[-1,1])box([.045,.29,.07],[s*.61,.925,1.90],gun,[.20,0,0]);
 box([2.00,.045,.27],[0,1.075,1.88],carbon,[-.07,0,0]);
 for(const s of[-1,1])box([.018,.16,.38],[s*1.00,1.08,1.89],carbon);box([1.80,.36,.14],[0,.48,tail],paint);box([1.87,.035,.24],[0,.17,tail],carbon);
 for(const s of[-1,1]){if(grand){for(let i=0;i<2;i++)add(new T.TorusGeometry(.071,.014,8,24),red,[s*(.52+.19*i),.64,tail+.074])}else box([.59,.057,.03],[s*.565,.687,tail+.080],red);add(new T.CylinderGeometry(.057,.057,.20,20,1,true),chrome,[s*.74,.235,2.22],[Math.PI/2,0,0]);}
 box([.27,.088,.014],[0,.489,tail+.078],black);
 // Wheels with open spokes, visible brake rotors, tire shoulders, tread grooves.
 const wheels=[];for(const side of[-1,1])for(const z of wheelZ){
  const wheel=new T.Group();wheel.position.set(side*.99,.355,z);if(z<0)wheel.rotation.y=-.27;root.add(wheel);wheels.push(wheel);
  const local=(g,m,pos=[0,0,0],rot=[0,0,0])=>add(g,m,pos,rot,wheel);
  local(new T.CylinderGeometry(.337,.337,.245,48,1),rubber,[0,0,0],[0,0,Math.PI/2]);
  for(const x of[-.103,.103])local(new T.TorusGeometry(.304,.033,10,48),rubber,[x,0,0],[0,Math.PI/2,0]);
  for(const x of[-.065,0,.065])local(new T.TorusGeometry(.338,.0035,5,48),black,[x,0,0],[0,Math.PI/2,0]);
  const outside=side*.132;
  local(new T.CylinderGeometry(.246,.246,.037,48),black,[outside-side*.018,0,0],[0,0,Math.PI/2]);
  local(new T.TorusGeometry(.234,.015,8,48),chrome,[outside,0,0],[0,Math.PI/2,0]);
  local(new T.TorusGeometry(.252,.008,6,48),chrome,[outside,0,0],[0,Math.PI/2,0]);
  local(new T.CylinderGeometry(.187,.187,.015,48),gun,[outside-side*.057,0,0],[0,0,Math.PI/2]);
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3;const spoke=box([.035,.177,.045],[outside,Math.cos(a)*.138,Math.sin(a)*.138],gun,[a,0,0],wheel);spoke.rotation.x=a;
  }
  local(new T.CylinderGeometry(.060,.060,.046,24),chrome,[outside,0,0],[0,0,Math.PI/2]);
  for(let i=0;i<5;i++){const a=i*2*Math.PI/5;local(new T.SphereGeometry(.008,6,4),gun,[outside+side*.025,Math.cos(a)*.041,Math.sin(a)*.041]);}
  box([.075,.11,.067],[outside-side*.055,.075,.146],caliper,[.4,0,0],wheel);
 }
 root.userData={paint,wheels,authored:true,variant,geometryMode:'volumetric'};
 // Merge compatible opaque parts to keep reflection and shadow passes affordable.
 root.updateMatrixWorld(true);const buckets=new Map(),transparent=[];
 root.traverse(o=>{if(!o.isMesh)return;if(o.material.transparent){transparent.push(o);return;}let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();const key=o.material;const list=buckets.get(key)||[];list.push(g);buckets.set(key,list)});
 const result=new T.Group();result.name=root.name;result.userData=root.userData;
 for(const [material,geometries]of buckets){const g=mergeGeometries(geometries,false);const mesh=new T.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=material.name||'body component';result.add(mesh);geometries.forEach(g=>g.dispose());}
 for(const o of transparent){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);const m=new T.Mesh(g,o.material);m.name='real glass panel';result.add(m)}
 root.traverse(o=>{if(o.isMesh)o.geometry.dispose()});result.userData.wheels=[];
 return result;
}
