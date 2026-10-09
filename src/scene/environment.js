import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {groundVertex,groundFragment,smokeVertex,contactFragment,noiseGLSL} from './shaders.js';
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
/** Layered physical scenery. Every object can enter the planar reflection. */
export function buildEnvironment(view){
 const scene=view.scene,random=seeded(417),textures=view.environmentTextures=[];
 view.ground=new Reflector(new T.PlaneGeometry(120,120),{clipBias:.002,textureWidth:768,textureHeight:512,color:0x12141a,shader:{uniforms:{color:{value:new T.Color(0x12141a)},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()}},vertexShader:groundVertex,fragmentShader:groundFragment}});
 view.ground.rotation.x=-Math.PI/2;view.ground.position.y=-.012;scene.add(view.ground);
 const shadow=new T.Mesh(new T.PlaneGeometry(35,35),new T.ShadowMaterial({opacity:.48}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.004;shadow.receiveShadow=true;scene.add(shadow);
 for(const car of view.cars){const contact=new T.Mesh(new T.PlaneGeometry(3.0,5.5),new T.ShaderMaterial({vertexShader:smokeVertex,fragmentShader:contactFragment,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.set(car.position.x,.012,car.position.z);scene.add(contact);}
 // Deep, uneven ridgelines keep their scale, unlike randomly sized triangular buildings.
 for(let layer=0;layer<4;layer++){
  const p=[],index=[],z=34+layer*13;for(let i=0;i<=130;i++){const x=(i-65)*1.7,height=3.2+Math.sin(x*.075+layer*.7)*1.8+Math.sin(x*.26+layer)*.58+random()*.55+layer*.65;p.push(x,-3,z,x,height,z);if(i<130){const a=i*2;index.push(a,a+1,a+2,a+1,a+3,a+2)}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(index);scene.add(new T.Mesh(geo,new T.MeshBasicMaterial({color:[0x141a22,0x252734,0x35333f,0x45414c][layer],side:T.DoubleSide})));
 }
 // Alpha-tested pine branches, with four deterministic variants and real parallax.
 for(let variant=0;variant<4;variant++){
  const cv=document.createElement('canvas');cv.width=256;cv.height=512;const ctx=cv.getContext('2d');ctx.fillStyle='#d7e4ee';ctx.strokeStyle='#d7e4ee';
  ctx.beginPath();ctx.moveTo(126,5);ctx.lineTo(138,510);ctx.lineTo(119,510);ctx.closePath();ctx.fill();
  for(let y=35;y<465;y+=5+random()*5){const spread=(y/512)**.85*115*(.73+random()*.27);for(const side of[-1,1]){
   const x=128+side*spread;ctx.lineWidth=1.4+(y/512)*2.2;ctx.beginPath();ctx.moveTo(128,y-12);ctx.lineTo(x,y+19);ctx.lineTo(128+side*spread*.38,y+15);ctx.stroke();
   for(let k=0;k<8;k++){const t=k/8,xx=128+side*spread*t,yy=y-12+31*t;ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+side*spread*.17,yy-13+random()*8);ctx.lineTo(xx+side*spread*.13,yy+11);ctx.closePath();ctx.fill();}
  }}
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;textures.push(tex);
  const mat=new T.MeshBasicMaterial({map:tex,color:0x121b23,alphaTest:.30,side:T.DoubleSide,depthWrite:true});
  const trees=new T.InstancedMesh(new T.PlaneGeometry(1,1),mat,70);
  for(let i=0;i<70;i++){const x=(random()-.5)*108,z=16+random()*48,h=3+random()*5.5;const m=new T.Matrix4().compose(new T.Vector3(x,h*.5-.2,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-.32+random()*.64),new T.Vector3(h*.46,h,1));trees.setMatrixAt(i,m)}scene.add(trees);
 }
 const metal=new T.MeshStandardMaterial({color:0x23272c,metalness:.65,roughness:.47});
 const posts=new T.InstancedMesh(new T.CylinderGeometry(.024,.028,2.25,8),metal,39);for(let i=0;i<39;i++)posts.setMatrixAt(i,new T.Matrix4().makeTranslation(-28+i*1.5,1.12,7));scene.add(posts);
 const fenceFrag=`varying vec2 vUv;void main(){vec2 p=vUv*vec2(228.,8.);float d=min(abs(fract(p.x+p.y)-.5),abs(fract(p.x-p.y)-.5));float a=1.-smoothstep(.025,.025+max(fwidth(d),.015),d);float reflect=.22+.48*pow(max(0.,sin(vUv.x*12.)),8.);gl_FragColor=vec4(vec3(.24,.25,.28)*reflect,a*.64);}`;
 const fence=new T.Mesh(new T.PlaneGeometry(62,2.15),new T.ShaderMaterial({vertexShader:smokeVertex,fragmentShader:fenceFrag,side:T.DoubleSide,transparent:true,depthWrite:false}));fence.position.set(0,1.15,7);scene.add(fence);
 const red=new T.MeshBasicMaterial({color:new T.Color(5.0,.025,.055)}),darkRed=new T.MeshStandardMaterial({color:0x540412,metalness:.64,roughness:.3});
 for(const y of[.22,2.25]){const rail=new T.Mesh(new T.CylinderGeometry(.016,.016,61,8),red);rail.rotation.z=Math.PI/2;rail.position.set(0,y,6.97);scene.add(rail);}
 const barriers=new T.InstancedMesh(new T.BoxGeometry(1.6,.34,.27),new T.MeshStandardMaterial({color:0x383941,roughness:.92}),36);for(let i=0;i<36;i++)barriers.setMatrixAt(i,new T.Matrix4().makeTranslation(-27+i*1.58,.17,6.7));scene.add(barriers);
 for(let i=0;i<7;i++){
  const x=-15+i*5.5,pole=new T.Mesh(new T.CylinderGeometry(.035,.055,4.5,8),metal);pole.position.set(x,2.25,7.2);scene.add(pole);
  const lamp=new T.Mesh(new T.BoxGeometry(.56,.06,.20),new T.MeshBasicMaterial({color:new T.Color(5.5,4.2,4.4)}));lamp.position.set(x,4.5,7.2);scene.add(lamp);
  const hot=new T.Mesh(new T.BoxGeometry(.055,1.3,.065),red);hot.position.set(x,.90,6.94);scene.add(hot);
  const housing=new T.Mesh(new T.BoxGeometry(.13,1.65,.1),darkRed);housing.position.set(x,.94,7.05);scene.add(housing);
 }
 // Camera-facing optical streaks belong to the lamps, not to the site UI.
 const flareCanvas=document.createElement('canvas');flareCanvas.width=256;flareCanvas.height=64;const fctx=flareCanvas.getContext('2d');
 let gradient=fctx.createRadialGradient(128,32,0,128,32,32);gradient.addColorStop(0,'rgba(255,255,255,.85)');gradient.addColorStop(.12,'rgba(255,220,235,.50)');gradient.addColorStop(.4,'rgba(255,110,130,.16)');gradient.addColorStop(1,'rgba(255,50,80,0)');fctx.fillStyle=gradient;fctx.fillRect(0,0,256,64);
 const stripe=fctx.createLinearGradient(0,0,256,0);stripe.addColorStop(0,'transparent');stripe.addColorStop(.40,'rgba(255,20,60,.0)');stripe.addColorStop(.5,'rgba(255,180,210,.6)');stripe.addColorStop(.6,'rgba(255,20,60,.0)');stripe.addColorStop(1,'transparent');fctx.fillStyle=stripe;fctx.fillRect(0,31,256,2);
 const flareTexture=new T.CanvasTexture(flareCanvas);textures.push(flareTexture);for(const x of[-9,2.5,8]){const sprite=new T.Sprite(new T.SpriteMaterial({map:flareTexture,color:new T.Color(2.1,.11,.21),transparent:true,blending:T.AdditiveBlending,depthWrite:false}));sprite.position.set(x,2.27,6.90);sprite.scale.set(3.6,.9,1);scene.add(sprite);}
 // Simple cloth banners, supported by geometry rather than baked into a full-screen image.
 const loader=new T.TextureLoader();loader.load('/assets/icons/dxt.webp',tex=>{if(view.disposed){tex.dispose();return}tex.colorSpace=T.SRGBColorSpace;textures.push(tex);for(const x of[-7.0,8.5]){
  const banner=new T.Mesh(new T.PlaneGeometry(1.1,2.0,12,22),new T.MeshStandardMaterial({map:tex,color:0xcb4144,roughness:.94,side:T.DoubleSide}));banner.position.set(x,2.6,7.4);const a=banner.geometry.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(a.getY(i)*4+a.getX(i)*3)*.07);a.needsUpdate=true;banner.geometry.computeVertexNormals();scene.add(banner);
 }view.wake();});
}
