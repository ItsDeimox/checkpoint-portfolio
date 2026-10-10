import * as T from 'three';
import {noiseGLSL} from './room-shaders.js';

export const PORTAL_FX_PROFILES = Object.freeze({
  low: Object.freeze({smoke:8,sparks:32,shutterSamples:6,blurPixels:32,chromaticPixels:2.0}),
  auto: Object.freeze({smoke:16,sparks:72,shutterSamples:9,blurPixels:54,chromaticPixels:3.2}),
  high: Object.freeze({smoke:24,sparks:112,shutterSamples:12,blurPixels:70,chromaticPixels:4.2}),
});
const clamp = x => Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
const smooth = (a,b,x) => {const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
/** One smooth opening impulse, then sustained acceleration. No periodic flashes. */
export function portalImpactEnvelope(age,progress,active=true,reduced=false) {
  if(!active || reduced || !Number.isFinite(age) || age<0 || progress>=1)
    return {opening:0,smoke:0,speed:0,exit:0};
  const p=clamp(progress),exit=1-smooth(.86,1,p);
  return {
    opening:smooth(.025,.18,age)*(1-smooth(.32,.85,age))*exit,
    smoke:smooth(.04,.17,age)*(1-smooth(.8,1.7,age))*exit,
    speed:smooth(.02,.6,p)*exit,
    exit,
  };
}

const PARTICLE_VERTEX = /*glsl*/`
attribute vec4 burstSeed;
uniform float burstAge;uniform vec3 burstOrigin,burstRight,burstUp,burstNormal;
uniform vec2 burstHalf;uniform float sparkMode;
varying vec2 vUv;varying float vLife,vSeed;
void main(){
  vUv=uv;vSeed=burstSeed.z;
  float rawTime=burstAge-.04-burstSeed.w*.23;float t=max(0.,rawTime);
  float life=rawTime/mix(1.25,1.8,burstSeed.z);vLife=life;
  vec2 edge=burstSeed.xy;
  vec3 local=vec3(edge*burstHalf,.045);
  local.xy+=edge*t*mix(.38,1.15,burstSeed.z);
  local.y+=t*(sparkMode>.5?.24:.48)-sparkMode*t*t*.75;
  local.z+=t*mix(.65,2.1,burstSeed.w);
  vec3 center=burstOrigin+burstRight*local.x+burstUp*local.y+burstNormal*local.z;
  vec4 eye=modelViewMatrix*vec4(center,1.);
  float size=mix(.35,1.25,burstSeed.z)+t*.65;
  vec2 offset=position.xy*size;
  if(sparkMode>.5){
    vec3 velocity=burstRight*edge.x+burstUp*(edge.y+.24-1.5*t)+burstNormal*1.2;
    vec2 axis=(viewMatrix*vec4(velocity,0.)).xy;
    axis=length(axis)>.001?normalize(axis):vec2(0.,1.);
    vec2 side=vec2(-axis.y,axis.x);
    offset=side*position.x*.018+axis*position.y*(.15+t*.42);
  }else{
    float a=burstSeed.z*6.283+t*.15;offset=mat2(cos(a),-sin(a),sin(a),cos(a))*offset;
  }
  eye.xy+=offset;
  gl_Position=projectionMatrix*eye;
}`;
const SMOKE_FRAGMENT = /*glsl*/`
uniform float burstAge;uniform float burstDensity;uniform float smokeDetail;
varying vec2 vUv;varying float vLife,vSeed;
${noiseGLSL}
void main(){
  vec2 p=(vUv-.5)*2.;float radius=dot(p,p);if(radius>1.||vLife<=0.||vLife>=1.)discard;
  vec2 q=vUv*3.5+vSeed*31.+vec2(-burstAge*.14,burstAge*.08);
  float n=noise2(q)*.62+noise2(q*2.1+noise2(q*.7))*.28;
  if(smokeDetail>2.)n+=noise2(q*4.3)*.10;
  float edge=pow(max(0.,1.-radius),1.7);
  float alpha=smoothstep(.18,.75,n)*edge*burstDensity*(1.-smoothstep(.6,1.,vLife));
  if(alpha<.002)discard;
  float inner=exp(-length(p)*1.6);
  vec3 smoke=mix(vec3(.065,.037,.049),vec3(.50,.12,.15),n);
  smoke+=vec3(.82,.018,.034)*inner*(1.-vLife)*.45;
  gl_FragColor=vec4(smoke,alpha);
}`;
const SPARK_FRAGMENT = /*glsl*/`
uniform float burstDensity;varying vec2 vUv;varying float vLife,vSeed;
void main(){
 if(vLife<=0.||vLife>=1.)discard;
 vec2 p=abs(vUv-.5)*2.;
 float a=pow(max(0.,1.-p.x),2.)*pow(max(0.,1.-p.y),.7);
 a*=burstDensity*(1.-smoothstep(.35,1.,vLife));
 vec3 color=mix(vec3(5.2,.028,.045),vec3(5.0,1.05,.40),vSeed*.6);
 gl_FragColor=vec4(color,a);
}`;
const WAVE_FRAGMENT = /*glsl*/`
uniform float burstAge;uniform float wavePower;varying vec2 vUv;
void main(){
 vec2 p=abs(vUv-.5)*2.;float d=max(p.x,p.y);
 float radius=.36+burstAge*.40;
 float edge=abs(d-radius),pixel=max(fwidth(d),.001);
 float line=1.-smoothstep(pixel,pixel*2.5,edge);
 float halo=exp(-edge*64.)*.27;
 float corner=smoothstep(.08,.34,min(p.x,p.y));
 gl_FragColor=vec4(vec3(3.2,.015,.052)*(line+halo),wavePower*(.6+corner*.4));
}`;

function makeParticles(count,uniforms,fragment,sparkMode) {
  const plane=new T.PlaneGeometry(1,1),geometry=new T.InstancedBufferGeometry();
  geometry.index=plane.index;geometry.attributes.position=plane.attributes.position;geometry.attributes.uv=plane.attributes.uv;
  const values=[];
  for(let i=0;i<count;i++){
    // Interleave all four edges, so a smaller profile never removes one side.
    const edge=i%4,u=((i*0.61803398875)%1)*2-1,seed=((i+1)*.754877666)%1;
    values.push(edge===0?-1:edge===1?1:u,edge===2?-1:edge===3?1:u,seed,((i+3)*.56984029)%1);
  }
  geometry.setAttribute('burstSeed',new T.InstancedBufferAttribute(new Float32Array(values),4));
  geometry.instanceCount=count;
  const material=new T.ShaderMaterial({name:sparkMode?'DXT.PortalSparks':'DXT.PortalVapor',uniforms:{...uniforms,sparkMode:{value:sparkMode}},
    vertexShader:PARTICLE_VERTEX,fragmentShader:fragment,transparent:true,depthWrite:false,
    blending:sparkMode?T.AdditiveBlending:T.NormalBlending,side:T.DoubleSide,toneMapped:false});
  const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=sparkMode?9:8;
  return mesh;
}
/** Three transient draws, shared by every doorway. No textures or new light. */
export class PortalEffects {
  constructor(scene) {
    this.scene=scene;this.group=new T.Group();this.group.name='Transient portal opening';this.group.visible=false;
    this.origin=new T.Vector3();this.normal=new T.Vector3();
    this.uniforms={burstAge:{value:0},burstDensity:{value:0},smokeDetail:{value:2},wavePower:{value:0},
      burstOrigin:{value:this.origin},burstRight:{value:new T.Vector3()},burstUp:{value:new T.Vector3()},
      burstNormal:{value:this.normal},burstHalf:{value:new T.Vector2()}};
    this.smoke=makeParticles(24,this.uniforms,SMOKE_FRAGMENT,0);
    this.sparks=makeParticles(112,this.uniforms,SPARK_FRAGMENT,1);
    this.wave=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({name:'DXT.PortalPressureWave',uniforms:this.uniforms,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:WAVE_FRAGMENT,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,side:T.DoubleSide}));
    this.wave.frustumCulled=false;this.wave.renderOrder=7;
    this.group.add(this.smoke,this.sparks,this.wave);scene?.add(this.group);
  }
  start(basis) {
    this.reset();this.origin.copy(basis.center);this.normal.copy(basis.normal);
    this.uniforms.burstRight.value.copy(basis.right);this.uniforms.burstUp.value.copy(basis.up);this.uniforms.burstHalf.value.copy(basis.half);
    this.wave.position.copy(basis.center).addScaledVector(basis.normal,.08);
    this.wave.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(basis.right,basis.up,basis.normal));
    this.wave.scale.set(basis.half.x*4.9,basis.half.y*4.9,1);
    this.group.updateMatrixWorld(true);
  }
  update(age,progress,quality,active,interior,reduced=false) {
    const state=portalImpactEnvelope(age,progress,active,reduced),profile=PORTAL_FX_PROFILES[quality]??PORTAL_FX_PROFILES.auto;
    this.group.visible=!interior && state.smoke>.001;
    this.uniforms.burstAge.value=Number.isFinite(age)?age:0;
    this.uniforms.burstDensity.value=state.smoke*(quality==='low'?.84:1.0);
    this.uniforms.smokeDetail.value=quality==='low'?2:3;
    this.uniforms.wavePower.value=state.opening;
    this.smoke.geometry.instanceCount=profile.smoke;this.sparks.geometry.instanceCount=profile.sparks;
    return state;
  }
  reset(){this.group.visible=false;this.uniforms.burstDensity.value=0;this.uniforms.wavePower.value=0;}
  dispose(){if(this.disposed)return;this.disposed=true;this.reset();this.scene?.remove(this.group);for(const object of this.group.children){object.geometry.dispose();object.material.dispose();}this.group.clear();}
}
