import {DataTexture,FloatType,RGBAFormat,NearestFilter,Vector2} from 'three';
import {CubeSurface} from '../ui/cube-surface.js';
import {CUBE_NETWORK_GLSL} from '../shaders/cube-network.js';

/** Change transport only. The original nodes, wires, glow, damping and input
 * remain intact. Static conductance makes the wave favour branching routes
 * instead of expanding evenly. Bounds only decrease existing spring weights,
 * preserving the solver's timestep and stability; no per-frame extra work. */
function configureCardPropagation(field){
 for(const edge of field.edges){
  const a=field.vertices[edge[0]],b=field.vertices[edge[1]];
  if(a[2]!==1||b[2]!==1)continue;
  const x=(a[0]+b[0])*.5,y=(a[1]+b[1])*.5;
  const angle=.82*Math.sin(2.4*x+1.9*y)+.58*Math.cos(2.7*y-.6*x);
  const alignment=a[0]!==b[0]?Math.cos(angle):Math.sin(angle);
  edge[2]*=.08+.92*alignment*alignment;
 }
}

/** Original cube network rendering. Only the card's propagation weights vary;
 * the shared CubeSurface and Play Now retain their exact original behaviour. */
export class RoomPanelEnergy {
 constructor(view){
  this.view=view;this.entries=view.panels.map(panel=>{
   const field=new CubeSurface(),texture=new DataTexture(field.data,field.textureWidth,field.textureHeight,RGBAFormat,FloatType);
   texture.name=`DXT.CubeEnergy.${panel.index}`;texture.minFilter=texture.magFilter=NearestFilter;texture.needsUpdate=true;
   field.setAspect(panel.corners[0].distanceTo(panel.corners[1])/panel.corners[0].distanceTo(panel.corners[3]));
   configureCardPropagation(field);
   const m=panel.material;
   Object.assign(m.uniforms,{uEnergyMap:{value:texture},uEnergySize:{value:field.size},uEnergyActive:{value:0},uReduced:{value:0},uSurfaceSpan:{value:new Vector2(...field.span)}});
   m.fragmentShader='varying vec2 vUv;uniform vec2 uSurfaceSpan;\n'+CUBE_NETWORK_GLSL+'\n'+m.fragmentShader.replace('varying vec2 vUv;','');
   m.fragmentShader=m.fragmentShader.replace('p+holoWarp(p)','p');
   m.fragmentShader=m.fragmentShader.replace('c += holoLight(p);',`vec2 cubeWave=network(4,(vUv-.5)*uSurfaceSpan+.5);
    vec3 cubeTint=mix(vec3(.80,.92,1.),cardAccent,.60);
    c+=mix(cubeTint,cardAccent,.70)*(cubeWave.x*.42+cubeWave.y*.46)*(1.-portalMix);`);
   m.needsUpdate=true;return{panel,field,texture,version:field.version};
  });
  this.selected=-1;
 }
 point(index,uv,time){
  if(this.view.cameraRig?.mode!=='overview'||this.view.bannerPortal?.active||this.view.reduced?.matches){this.release();return;}
  if(index!==this.selected){this.entries[this.selected]?.field.release();this.selected=index;}
  if(index<0||!uv||!Number.isFinite(time))return;
  this.entries[index]?.field.point(uv.x,uv.y,time);
 }
 update(dt){
  // Once navigation owns the surface, no hover is visible. Stop the five
  // closed wave graphs instead of simulating/uploading them inside the tunnel.
  if(this.view.bannerPortal?.active||this.view.bannerPortal?.interior){
   this.release();
   for(const {panel,field,texture}of this.entries){
    if(field.awake){field.clear();texture.needsUpdate=true;}
    panel.material.uniforms.uEnergyActive.value=0;
   }
   return false;
  }
  let moving=false;
  for(const {panel,field,texture} of this.entries){
   const u=panel.material.uniforms;
   u.uReduced.value=this.view.reduced?.matches?1:0;
   const version=field.version;
   if(this.view.reduced?.matches&&field.awake)field.clear();
   field.step(dt);
   if(version!==field.version)texture.needsUpdate=true;
   u.uEnergyActive.value=field.awake?1:0;moving ||= field.awake;
  }
  return moving;
 }
 release(){this.entries[this.selected]?.field.release();this.selected=-1;}
 prime(){for(const e of this.entries){e.field.inject(.5,.5,.4);e.field.step(1/30);e.texture.needsUpdate=true;e.panel.material.uniforms.uEnergyActive.value=1;}}
 clear(){this.release();for(const e of this.entries){e.field.clear();e.texture.needsUpdate=true;e.panel.material.uniforms.uEnergyActive.value=0;}}
 dispose(){for(const e of this.entries)e.texture.dispose();this.entries.length=0;}
}
