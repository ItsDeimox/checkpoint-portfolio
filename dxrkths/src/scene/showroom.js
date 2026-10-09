import {elapsedFrameTime} from '../core.js';
import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {buildCar} from './car.js';
import {skyVertex,skyFragment,smokeVertex,smokeFragment,groundVertex,groundFragment,contactFragment} from './shaders.js';
const clamp=T.MathUtils.clamp,damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
/** Native geometry, physical clearcoat, real planar reflections and procedural atmosphere. */
export class HeroScene{
 constructor(canvas,settings){
  this.canvas=canvas;this.host=canvas.closest('.hero');this.settings=settings;this.controller=new AbortController();this.disposed=false;this.frames=0;this.yaw=this.targetYaw=-.72;this.pitch=this.targetPitch=.18;this.radius=5.8;this.time=0;this.pointer=new T.Vector2();this.targetPointer=new T.Vector2();this.expanded=false;this.visible=true;this.drag=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.raf=0;
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.gl=this.renderer.getContext();this.renderer.setClearColor(0x050608);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.98;this.renderer.info.autoReset=false;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.scene=new T.Scene();this.scene.fog=new T.FogExp2(0x19131c,.012);this.camera=new T.PerspectiveCamera(28,1,.08,180);this.cameraTarget=new T.Vector3(-.1,.55,.15);
  const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.025);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.70;room.dispose();pmrem.dispose();
  this.scene.add(new T.Mesh(new T.SphereGeometry(110,24,16),new T.ShaderMaterial({vertexShader:skyVertex,fragmentShader:skyFragment,side:T.BackSide,depthWrite:false})));
  this.buildCars();this.buildTrack();this.buildLights();this.buildSmoke();
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new T.Vector2(1,1),.27,.52,1.1);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  const on=(e,n,f,options={})=>e.addEventListener(n,f,{...options,signal:this.controller.signal});
  on(canvas,'pointermove',e=>{const r=canvas.getBoundingClientRect();this.targetPointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);if(this.drag&&e.pointerId===this.drag.id){this.targetYaw-=(e.clientX-this.drag.x)*.004;this.targetPitch=clamp(this.targetPitch+(e.clientY-this.drag.y)*.003,.07,.65);this.drag.x=e.clientX;this.drag.y=e.clientY;}this.wake();},{passive:true});
  on(canvas,'pointerdown',e=>{if(e.button!==0||(e.pointerType==='touch'&&!this.expanded))return;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');canvas.focus({preventScroll:true});this.wake();});
  this.release=()=>{if(this.drag&&canvas.hasPointerCapture(this.drag.id))canvas.releasePointerCapture(this.drag.id);this.drag=null;canvas.classList.remove('dragging');};
  on(canvas,'pointerup',this.release);on(canvas,'pointercancel',this.release);on(canvas,'lostpointercapture',()=>{this.drag=null;canvas.classList.remove('dragging')});
  on(canvas,'pointerleave',()=>{this.targetPointer.set(0,0);this.wake()});
  on(canvas,'keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')this.targetYaw+=.16;if(e.key==='ArrowRight')this.targetYaw-=.16;if(e.key==='ArrowUp')this.targetPitch=clamp(this.targetPitch+.08,.07,.65);if(e.key==='ArrowDown')this.targetPitch=clamp(this.targetPitch-.08,.07,.65);if(e.key==='Home')this.reset();this.wake()});
  on(document.querySelector('#reset-view'),'click',()=>this.reset());on(document.querySelector('#expand-view'),'click',()=>this.expand());
  on(document,'keydown',e=>{if(e.key==='Escape'&&this.expanded)this.expand(false)});
  on(document,'visibilitychange',()=>document.hidden?this.sleep():this.wake());on(this.reduced,'change',()=>this.setSettings());
  on(canvas,'webglcontextlost',e=>{e.preventDefault();this.lost=true;this.sleep();this.host.classList.remove('scene-ready');});
  on(canvas,'webglcontextrestored',()=>{this.lost=false;this.host.classList.add('scene-ready');this.setSettings();});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.host);
  this.intersection=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.visible?this.wake():this.sleep()},{rootMargin:'80px'});this.intersection.observe(canvas);
  this.setSettings();this.resize();this.host.classList.add('scene-ready');this.ready=true;this.wake();
 }
 buildCars(){this.red=buildCar({color:0xa80012});this.red.position.set(.0,.02,-.25);this.red.rotation.y=-.06;this.white=buildCar({color:0xe1e6eb,variant:'track'});this.white.position.set(3.25,.04,2.2);this.white.rotation.y=.09;this.scene.add(this.red,this.white);this.cars=[this.red,this.white];}
 buildTrack(){
  this.ground=new Reflector(new T.PlaneGeometry(110,110),{clipBias:.003,textureWidth:512,textureHeight:512,color:0x15181e,shader:{uniforms:{color:{value:new T.Color(0x14181e)},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()}},vertexShader:groundVertex,fragmentShader:groundFragment}});this.ground.rotation.x=-Math.PI/2;this.ground.position.y=-.01;this.scene.add(this.ground);
  const shadow=new T.Mesh(new T.PlaneGeometry(30,30),new T.ShadowMaterial({opacity:.42}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.006;shadow.receiveShadow=true;this.scene.add(shadow);
  for(const car of this.cars){const p=new T.Mesh(new T.PlaneGeometry(3.3,5.6),new T.ShaderMaterial({vertexShader:smokeVertex,fragmentShader:contactFragment,transparent:true,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.set(car.position.x,.012,car.position.z);this.scene.add(p)}
  const random=rng(19),metal=new T.MeshStandardMaterial({color:0x14181b,roughness:.45,metalness:.7});
  const posts=new T.InstancedMesh(new T.CylinderGeometry(.022,.025,2.2,6),metal,32);for(let i=0;i<32;i++){const m=new T.Matrix4().makeTranslation(-24+i*1.7,1.1,7);posts.setMatrixAt(i,m)}this.scene.add(posts);
  const fence=new T.Mesh(new T.PlaneGeometry(60,2),new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,uniforms:{},vertexShader:smokeVertex,fragmentShader:`varying vec2 vUv;void main(){vec2 p=vUv*vec2(210.,7.);float a=abs(fract(p.x+p.y)-.5),b=abs(fract(p.x-p.y)-.5);float w=max(fwidth(a),.02);float wire=1.-smoothstep(.032,.032+w,min(a,b));gl_FragColor=vec4(vec3(.12,.11,.12),wire*.25);}`}));fence.position.set(0,1.12,7);this.scene.add(fence);
  const redMat=new T.MeshBasicMaterial({color:new T.Color(3,.005,.018)});for(const y of[.15,1.02,2.3]){const rail=new T.Mesh(new T.BoxGeometry(65,.022,.025),redMat);rail.position.set(0,y,7.05);this.scene.add(rail)}
  const treeMaterial=new T.MeshStandardMaterial({color:0x10191b,roughness:1}),trees=new T.InstancedMesh(new T.ConeGeometry(.8,3.0,7),treeMaterial,240);for(let i=0;i<240;i++){const x=(random()-.5)*100,z=15+random()*35,h=.8+random()*2.2;const m=new T.Matrix4().compose(new T.Vector3(x,h*1.25,z),new T.Quaternion().setFromEuler(new T.Euler(0,random()*6,0)),new T.Vector3(h*.7,h,h*.7));trees.setMatrixAt(i,m)}this.scene.add(trees);
  // Distant ridges are geometry rather than a flattened hero image.
  for(let layer=0;layer<3;layer++){const p=[],id=[];for(let i=0;i<=50;i++){let x=(i-25)*3,h=2+random()*3.2+layer;p.push(x,-2,38+layer*13,x,h,38+layer*13);if(i<50){let a=i*2;id.push(a,a+1,a+2,a+2,a+1,a+3)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(id);g.computeVertexNormals();this.scene.add(new T.Mesh(g,new T.MeshBasicMaterial({color:layer===0?0x15191d:layer===1?0x272329:0x413039,side:T.DoubleSide})));}
  for(let i=0;i<7;i++){const x=-12+i*4,pole=new T.Mesh(new T.CylinderGeometry(.035,.07,5,8),metal);pole.position.set(x,2.5,6.7);this.scene.add(pole);const lamp=new T.Mesh(new T.BoxGeometry(.8,.06,.23),new T.MeshBasicMaterial({color:new T.Color(4,2.2,1.9)}));lamp.position.set(x,5,6.7);this.scene.add(lamp);}
 }
 buildLights(){
  RectAreaLightUniformsLib.init();this.scene.add(new T.HemisphereLight(0xabbfdc,0x1d1012,.65));
  this.key=new T.DirectionalLight(0xffe2d6,2.25);this.key.position.set(-3,6,-5);this.key.castShadow=true;Object.assign(this.key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:24});this.key.shadow.bias=-.0007;this.key.shadow.normalBias=.035;this.scene.add(this.key);
  for(const [color,power,w,h,pos,target]of[[0xdcefff,5,7,2,[2,6,-1],[0,0,0]],[0xff102b,8,7,1,[0,3,4],[0,.6,0]],[0xff9871,3,4,3,[-5,4,0],[0,0,0]],[0xf4f7ff,4,5,2,[5,3,-5],[1,1,0]]]){const l=new T.RectAreaLight(color,power,w,h);l.position.set(...pos);l.lookAt(...target);this.scene.add(l)}
  this.cursorLight=new T.PointLight(0xff4967,0,5,2);this.cursorLight.position.set(1,1.7,-1);this.scene.add(this.cursorLight);
 }
 buildSmoke(){this.smokes=[];const random=rng(38);for(let i=0;i<15;i++){const material=new T.ShaderMaterial({vertexShader:smokeVertex,fragmentShader:smokeFragment,uniforms:{time:{value:0},seed:{value:random()*13},density:{value:.32}},transparent:true,depthWrite:false,side:T.DoubleSide});const mesh=new T.Mesh(new T.PlaneGeometry(2.7+random()*2,1.1+random()*1.5),material);mesh.position.set(-4.4+random()*9.0,.5+random()*.6,1.4+random()*3.6);mesh.userData.base=mesh.position.clone();mesh.userData.phase=random()*6;this.scene.add(mesh);this.smokes.push(mesh)}
  const p=[];for(let i=0;i<90;i++)p.push((random()-.5)*17,random()*4,random()*8);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));this.motes=new T.Points(g,new T.PointsMaterial({size:.012,color:0xff9580,transparent:true,opacity:.32,depthWrite:false}));this.scene.add(this.motes);
 }
 reset(){this.targetYaw=-.72;this.targetPitch=.18;this.targetPointer.set(0,0);this.wake();}
 expand(value=!this.expanded){this.expanded=value;this.host.classList.toggle('is-expanded',value);document.body.classList.toggle('viewing-car',value);const b=document.querySelector('#expand-view');b.setAttribute('aria-pressed',String(value));b.querySelector('span').textContent=value?'Close 3D view':'Explore in 3D';this.canvas.style.touchAction=value?'none':'pan-y';this.resize();if(value)this.canvas.focus({preventScroll:true});}
 setSettings(){if(!this.renderer)return;const mobile=this.host.clientWidth<750,low=this.settings.quality==='low';this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:this.settings.quality==='high'?1.5:low?.8:1.15));this.renderer.shadowMap.enabled=!low;const size=low?512:1024;this.key.shadow.mapSize.set(size,size);const rt=this.ground.getRenderTarget();rt.setSize(low?256:512,low?256:512);this.bloom.enabled=!low;this.resize();this.wake();}
 resize(){if(!this.renderer||this.disposed)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(w<2||h<2)return;this.width=w;this.height=h;this.renderer.setSize(w,h,false);this.composer?.setSize(w,h);this.camera.aspect=w/h;this.camera.fov=w<750?41:28;this.camera.clearViewOffset();if(w<750&&!this.expanded)this.camera.setViewOffset(w,h,0,-h*.15,w,h);if(w>=750&&!this.expanded)this.camera.setViewOffset(w,h,-w*.17,0,w,h);this.camera.updateProjectionMatrix();this.wake();}
 wake(){if(this.disposed||this.raf||document.hidden||!this.visible||this.lost)return;this.last=performance.now();this.raf=requestAnimationFrame(t=>this.frame(t));}
 sleep(){cancelAnimationFrame(this.raf);this.raf=0;}
 frame(now){this.raf=0;if(this.disposed||this.lost||document.hidden||!this.visible)return;const dt=elapsedFrameTime(now,this.last);this.last=now;const animated=!this.settings.paused&&!this.reduced.matches;
  if(animated)this.time+=Math.min(.05,dt);this.yaw=damp(this.yaw,this.targetYaw,8,dt);this.pitch=damp(this.pitch,this.targetPitch,8,dt);this.pointer.lerp(this.targetPointer,1-Math.exp(-5*dt));const yaw=this.yaw+(this.reduced.matches?0:this.pointer.x*.016),pitch=this.pitch+(this.reduced.matches?0:this.pointer.y*.009),r=this.expanded?7.4:this.width<750?8.3:this.radius;
  this.camera.position.set(Math.sin(yaw)*r,Math.sin(pitch)*r+.50,-Math.cos(yaw)*r);this.camera.lookAt(this.cameraTarget);
  this.cursorLight.position.set(this.pointer.x*2+1,1.65,-.8);this.cursorLight.intensity=damp(this.cursorLight.intensity,this.drag?7:1.2,6,dt);
  for(const m of this.smokes){m.quaternion.copy(this.camera.quaternion);m.material.uniforms.time.value=this.time;m.position.x=m.userData.base.x+Math.sin(this.time*.16+m.userData.phase)*.23;m.position.y=m.userData.base.y+Math.sin(this.time*.21+m.userData.phase)*.06;}
  this.motes.rotation.y=this.time*.006;this.renderer.info.reset();this.composer.render();this.frames++;
  if(animated||this.drag||Math.abs(this.yaw-this.targetYaw)>.0001||Math.abs(this.pitch-this.targetPitch)>.0001||this.pointer.distanceTo(this.targetPointer)>.001)this.raf=requestAnimationFrame(t=>this.frame(t));
 }
 inspect(){return{ready:!!this.ready,renderer:'Three.js / WebGL2',geometry:'real volumetric meshes',cars:this.cars.length,carTriangles:this.cars.reduce((n,c)=>{c.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3});return n},0),frames:this.frames,yaw:this.yaw,pitch:this.pitch,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,width:this.canvas.width,height:this.canvas.height,hdr:true,reflection:'planar reflection',expanded:this.expanded,glError:this.gl.getError()};}
 dispose(){if(this.disposed)return;this.disposed=true;this.sleep();this.release();this.controller.abort();this.resizeObserver.disconnect();this.intersection.disconnect();document.body.classList.remove('viewing-car');const geometries=new Set(),materials=new Set();this.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.ground.dispose();this.environment.dispose();this.composer.passes.forEach(p=>p.dispose?.());this.composer.dispose();this.renderer.dispose();}
}
