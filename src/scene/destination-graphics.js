import * as T from 'three';
import {CubeSurface} from '../ui/cube-surface.js';
import {CUBE_NETWORK_GLSL} from '../shaders/cube-network.js';
import {waitForGpu,installShaderChecks} from './room-gpu-gate.js';
import {createCoveredCarGeometry} from './covered-car.js';
import {yieldToBrowser} from './room-startup.js';

/** One reusable page renderer, separate from the sleeping showroom. Both shader
 * paths are prepared during the intro. Never one renderer per cached page. */
export class DestinationGraphics {
 constructor(document){
  this.document=document;this.ready=false;this.mode=null;
  this.canvas=document.createElement('canvas');this.canvas.className='destination-graphics';this.canvas.setAttribute('aria-hidden','true');
  this.renderer=new T.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  installShaderChecks(this.renderer);
  this.renderer.setPixelRatio(1);this.renderer.setSize(900,660,false);this.renderer.setClearColor(0x000000,0);
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.buildCar();this.buildEnergy();
 }
 buildCar(){
  this.carScene=new T.Scene();this.carCamera=new T.PerspectiveCamera(35,900/660,.1,35);
  this.carCamera.position.set(5.6,3.4,6.8);this.carCamera.lookAt(0,.7,0);
  const cloth=new T.MeshStandardMaterial({color:0x514957,roughness:.84,metalness:.025,side:T.DoubleSide});
  // Analytic fiber-scale roughness avoids loading another bitmap during entry.
  cloth.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec2 clothUv;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nclothUv=uv;');
   shader.fragmentShader='varying vec2 clothUv;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    vec2 q=clothUv*vec2(850.,1500.);
    float footprint=max(fwidth(q.x),fwidth(q.y));
    float fibers=sin(q.x*6.283)*sin(q.y*6.283)*exp(-footprint*footprint);
    roughnessFactor=clamp(roughnessFactor+fibers*.055,.65,1.);
   `);
  };
  this.cloth=new T.Mesh(createCoveredCarGeometry(),cloth);this.cloth.name='Draped coupe cover';this.carScene.add(this.cloth);
  this.carScene.add(new T.HemisphereLight(0xc6b5e4,0x08050c,.18));
  const top=new T.SpotLight(0xeee5ff,155,14,.66,.92,2);top.position.set(-.4,6.5,.7);top.target.position.set(0,0,0);this.carScene.add(top,top.target);
  // A soft contact shadow grounds the cloth without a floor disc clipping at the canvas edges.
  const contact=new T.Mesh(new T.PlaneGeometry(4.8,7.7),new T.ShaderMaterial({transparent:true,depthWrite:false,
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec2 vUv;void main(){vec2 q=(vUv-.5)*2.;float a=exp(-dot(q,q)*3.2)*.8;gl_FragColor=vec4(0.,0.,0.,a);}'}));
  contact.rotation.x=-Math.PI/2;contact.position.y=.02;this.carScene.add(contact);
 }
 buildEnergy(){
  this.energyScene=new T.Scene();this.energyCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const blank=new CubeSurface();
  this.energyTexture=new T.DataTexture(blank.data,blank.textureWidth,blank.textureHeight,T.RGBAFormat,T.FloatType);
  this.energyTexture.minFilter=this.energyTexture.magFilter=T.NearestFilter;this.energyTexture.needsUpdate=true;
  this.energyMaterial=new T.ShaderMaterial({depthTest:false,depthWrite:false,
   uniforms:{uEnergyMap:{value:this.energyTexture},uEnergySize:{value:blank.size},uEnergyActive:{value:0},uEnergyStrength:{value:.20},uReduced:{value:0},uSurfaceSpan:{value:new T.Vector2(1,1)},uTheme:{value:new T.Color('#ff2348')}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
   fragmentShader:`varying vec2 vUv;uniform vec3 uTheme;uniform vec2 uSurfaceSpan;uniform float uEnergyStrength;${CUBE_NETWORK_GLSL}
   void main(){vec2 wave=network(4,(vUv-.5)*uSurfaceSpan+.5);vec3 tint=mix(vec3(.80,.92,1.),uTheme,.60);
    gl_FragColor=vec4(mix(tint,uTheme,.70)*(wave.x*.42+wave.y*.46)*uEnergyStrength,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  this.energyScene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.energyMaterial));
 }
 async prepare(signal){
  signal?.throwIfAborted();
  await this.renderer.compileAsync(this.carScene,this.carCamera);signal?.throwIfAborted();
  this.renderer.render(this.carScene,this.carCamera);await yieldToBrowser(signal);
  // Nonzero data also exercises the network draw, not just an empty program.
  const warm=new CubeSurface();warm.inject(.5,.5,.8);warm.step(1/30);this.uploadEnergy(warm);
  await this.renderer.compileAsync(this.energyScene,this.energyCamera);signal?.throwIfAborted();
  this.renderer.render(this.energyScene,this.energyCamera);await yieldToBrowser(signal);
  warm.clear();this.uploadEnergy(warm);await waitForGpu(this.renderer,signal);this.ready=true;
 }
 attach(host,mode){
  if(!this.ready||this.disposed)return;
  if(this.host!==host){this.host?.parentElement?.removeAttribute('data-graphics-ready');this.host=host;host.append(this.canvas);}
  this.mode=mode;this.resize();this.draw(0,0,true);
  if(mode==='car')host.parentElement?.setAttribute('data-graphics-ready','true');
 }
 resize(){
  if(!this.host)return;
  const cssWidth=Math.max(1,this.host.clientWidth),cssHeight=Math.max(1,this.host.clientHeight),limit=this.mode==='car'?1.25:1.5;
  const ratio=Math.min(limit,this.document.defaultView?.devicePixelRatio||1,960/cssWidth,660/cssHeight);
  const w=Math.round(cssWidth*ratio),h=Math.round(cssHeight*ratio);
  if(this.canvas.width!==w||this.canvas.height!==h)this.renderer.setSize(w,h,false);
  this.energyMaterial.uniforms.uSurfaceSpan.value.set(...(cssWidth>=cssHeight?[1,cssHeight/cssWidth]:[cssWidth/cssHeight,1]));
  this.carCamera.aspect=cssWidth/cssHeight;this.carCamera.updateProjectionMatrix();
 }
 uploadEnergy(grid){
  const u=this.energyMaterial.uniforms;
  u.uEnergyActive.value=grid.awake?1:0;
  if(this.uploadedField===grid&&this.uploadedVersion===grid.version)return;
  this.energyTexture.image.data=grid.data;this.energyTexture.needsUpdate=true;
  this.uploadedField=grid;this.uploadedVersion=grid.version;
 }
 async prepareSurface(host,signal){
  this.attach(host,host.dataset.destinationSurface);this.draw(0,0,true);
  await waitForGpu(this.renderer,signal);
  if(this.mode==='car'){
   const image=this.document.createElement('img');image.className='destination-preview';image.alt='';image.setAttribute('aria-hidden','true');
   // Synchronous readback is confined to the loading cover.
   this.draw(0,0,true);image.src=this.canvas.toDataURL('image/png');
   await image.decode();host.append(image);
  }
  this.detach();
 }
 draw(dt,time,reduced=false){
  if(this.disposed||!this.ready)return;
  if(this.mode==='car'){
   const angle=reduced?0:Math.sin(time*.19)*.026;
   this.carCamera.position.set(5.6+angle*5,3.4+(reduced?0:Math.sin(time*.14)*.04),6.8-angle*4);this.carCamera.lookAt(0,.7,0);
   this.renderer.render(this.carScene,this.carCamera);
  }else if(this.mode==='energy')this.renderer.render(this.energyScene,this.energyCamera);
 }
 detach(){if(!this.host?.querySelector('.destination-preview'))this.host?.parentElement?.removeAttribute('data-graphics-ready');this.canvas.remove();this.host=null;this.mode=null;}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.detach();
  for(const scene of [this.carScene,this.energyScene])scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  this.energyTexture.dispose();this.renderer.dispose();
 }
}
