import * as T from 'three';
import {createCoveredCarGeometry} from './covered-car.js';
import {yieldToBrowser} from './room-startup.js';

/** One reusable page renderer, separate from the sleeping showroom. Both shader
 * paths are prepared during the intro. Never one renderer per cached page. */
export class DestinationGraphics {
 constructor(document){
  this.document=document;this.ready=false;this.mode=null;
  this.canvas=document.createElement('canvas');this.canvas.className='destination-graphics';this.canvas.setAttribute('aria-hidden','true');
  this.renderer=new T.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'low-power'});
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
  this.energyBytes=new Uint8Array(40*12*4);this.energyTexture=new T.DataTexture(this.energyBytes,40,12,T.RGBAFormat);this.energyTexture.minFilter=this.energyTexture.magFilter=T.NearestFilter;this.energyTexture.needsUpdate=true;
  this.energyMaterial=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
   uniforms:{uEnergyMap:{value:this.energyTexture},uGrid:{value:new T.Vector2(40,12)},uTheme:{value:new T.Color('#ff2348')}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
   fragmentShader:`varying vec2 vUv;uniform sampler2D uEnergyMap;uniform vec2 uGrid;uniform vec3 uTheme;
    float line(float d,float w){return 1.-smoothstep(w,w+max(fwidth(d),.00035),abs(d));}
    vec4 cell(vec2 p){return texture2D(uEnergyMap,(p+.5)/uGrid);}
    void main(){
     vec2 g=clamp(vUv,0.,.99999)*(uGrid-1.),f=fract(g),c=floor(g);
     vec4 a=cell(c),b=cell(c+vec2(1,0)),d=cell(c+vec2(1,1)),c0=cell(c+vec2(0,1));
     float e=mix(mix(a.r,b.r,f.x),mix(c0.r,d.r,f.x),f.y)*2.;
     float wires=max(max(line(f.x,.016)*step(.26,a.g),line(f.y,.016)*step(.28,a.b)),line((f.x-f.y)*.707,.012)*step(.76,a.g));
     float radiance=pow(max(e-.02,0.),.92)*(1.+3.7*smoothstep(.18,1.1,e));
     float signal=radiance*wires*.98;
     float dotNode=exp(-dot(min(f,1.-f),min(f,1.-f))*280.)*radiance;
     float glow=signal*.40+dotNode*.24+radiance*.025;
     vec3 color=mix(uTheme,vec3(1.,.75,.77),clamp(signal*.09,0.,.4));
     gl_FragColor=vec4(color*min(glow*2.,2.),clamp(glow,0.,.94));
    }`});
  this.energyScene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.energyMaterial));
 }
 async prepare(signal){
  signal?.throwIfAborted();
  await this.renderer.compileAsync(this.carScene,this.carCamera);signal?.throwIfAborted();
  this.renderer.render(this.carScene,this.carCamera);await yieldToBrowser(signal);
  // Nonzero data also exercises the network draw, not just an empty program.
  this.energyBytes.fill(127);this.energyTexture.needsUpdate=true;
  await this.renderer.compileAsync(this.energyScene,this.energyCamera);signal?.throwIfAborted();
  this.renderer.render(this.energyScene,this.energyCamera);await yieldToBrowser(signal);
  this.energyBytes.fill(0);this.energyTexture.needsUpdate=true;this.ready=true;
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
  this.carCamera.aspect=cssWidth/cssHeight;this.carCamera.updateProjectionMatrix();
 }
 uploadEnergy(grid){
  const a=grid.values;
  for(let i=0;i<a.length;i++){
   this.energyBytes[i*4]=Math.min(255,a[i]*127.5);
   this.energyBytes[i*4+1]=(Math.imul(i+7,1103515245)>>>16)&255;
   this.energyBytes[i*4+2]=(Math.imul(i+29,1664525)>>>8)&255;this.energyBytes[i*4+3]=255;
  }
  this.energyTexture.needsUpdate=true;
 }
 draw(dt,time,reduced=false){
  if(this.disposed||!this.ready)return;
  if(this.mode==='car'){
   const angle=reduced?0:Math.sin(time*.19)*.026;
   this.carCamera.position.set(5.6+angle*5,3.4+(reduced?0:Math.sin(time*.14)*.04),6.8-angle*4);this.carCamera.lookAt(0,.7,0);
   this.renderer.render(this.carScene,this.carCamera);
  }else if(this.mode==='energy')this.renderer.render(this.energyScene,this.energyCamera);
 }
 detach(){this.host?.parentElement?.removeAttribute('data-graphics-ready');this.canvas.remove();this.host=null;this.mode=null;}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.detach();
  for(const scene of [this.carScene,this.energyScene])scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  this.energyTexture.dispose();this.renderer.dispose();
 }
}
