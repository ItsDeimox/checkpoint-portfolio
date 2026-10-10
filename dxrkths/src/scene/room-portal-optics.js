import * as T from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {PORTAL_FX_PROFILES,portalImpactEnvelope} from './room-portal-effects.js';

const FRAGMENT=/*glsl*/`
uniform sampler2D tDiffuse;
uniform vec2 uResolution,uCenter,uScope,uHalf;
uniform mat4 uInverseProjection,uCameraWorld,uPreviousVP;
uniform vec3 uOrigin,uRight,uUp,uForward;
uniform float uShutter,uMaxBlur,uSamples,uChromaticPixels,uShock,uAge,uSpeed,uInterior,uExit;
varying vec2 vUv;
vec2 bounded(vec2 p){return clamp(p,.5/uResolution,1.-.5/uResolution);}
vec3 local(vec3 p){return vec3(dot(p,uRight),dot(p,uUp),dot(p,uForward));}
void main(){
 vec2 d=vUv-uCenter,scaled=d/max(uScope,vec2(.05));float radius=length(scaled);
 float shockRing=exp(-pow((radius-(.35+uAge*.8))*9.,2.))*uShock;
 vec2 radial=d/max(length(d),.0001);
 vec2 uv=bounded(vUv-radial*shockRing*3.2/uResolution);
 float edges=smoothstep(.05,.75,length((vUv-.5)*vec2(uResolution.x/uResolution.y,1.)));
 float locality=mix(exp(-radius*radius*.32),1.,uInterior);
 vec2 separation=radial*uChromaticPixels*(.22+edges*.78)*locality/uResolution;
 vec2 velocity=vec2(0.);
 if(uInterior>.5 && uShutter>0.){
   // Reconstruct a wall point of the procedural corridor, then project it with
   // the previous camera. No velocity target and no repeated corridor renders.
   vec4 p=uInverseProjection*vec4(uv*2.-1.,1.,1.);
   vec3 ray=normalize((uCameraWorld*vec4(p.xyz/p.w,0.)).xyz);
   vec3 eye=uCameraWorld[3].xyz,ro=local(eye-uOrigin),rd=local(ray);
   float tx=abs(rd.x)>.00001?(sign(rd.x)*uHalf.x-ro.x)/rd.x:1000.;
   float ty=abs(rd.y)>.00001?(sign(rd.y)*uHalf.y-ro.y)/rd.y:1000.;
   float hit=clamp(min(tx,ty),.12,90.);
   vec4 previous=uPreviousVP*vec4(eye+ray*hit,1.);
   if(previous.w>0.)velocity=(uv-(previous.xy/previous.w*.5+.5))*uShutter;
   vec2 pixels=velocity*uResolution;
   velocity*=min(1.,uMaxBlur/max(length(pixels),.0001));
 }
 vec3 color=texture2D(tDiffuse,uv).rgb;
 float weight=1.;
 if(length(velocity*uResolution)>.35){
   for(int i=0;i<12;i++){
     if(float(i)>=uSamples)break;
     float t=(float(i)+.5)/uSamples-.5;
     float w=1.-abs(t)*.6;
     color+=texture2D(tDiffuse,bounded(uv+velocity*t)).rgb*w;weight+=w;
   }
 }
 color/=weight;
 // Channel separation is restrained at the focal point and stronger at speed.
 if(uChromaticPixels>0.){
   vec3 red=texture2D(tDiffuse,bounded(uv+separation)).rgb;
   vec3 blue=texture2D(tDiffuse,bounded(uv-separation)).rgb;
   vec3 center=texture2D(tDiffuse,uv).rgb;
   color.r+=red.r-center.r;color.b+=blue.b-center.b;
 }
 if(uInterior>.5){
   float angle=atan(d.y*uResolution.y,d.x*uResolution.x)/6.2831853+.5;
   float lane=floor(angle*88.),seed=fract(sin(lane*127.1+19.)*43758.5453);
   float line=1.-smoothstep(.018,.08,abs(fract(angle*88.)-.5));
   float train=fract(length(d)*1.8-uAge*(.6+uSpeed*.6)+seed);
   float streak=pow(max(0.,1.-train),5.)*line*step(.68,seed)*edges;
   color+=vec3(1.1,.006,.025)*streak*uSpeed*uExit;
   color*=1.-edges*.14*uSpeed;
 }
 gl_FragColor=vec4(max(color,vec3(0.)),1.);
}`;

/** Conditional pre-bloom pass reusing the composer's existing ping-pong buffers.
 * Reprojection follows GPU Gems 3 ch.27, using analytic walls instead of depth. */
export class PortalShutterPass extends ShaderPass {
  constructor(){
    super(new T.ShaderMaterial({name:'DXT.PortalShutter',depthWrite:false,depthTest:false,toneMapped:false,blending:T.NoBlending,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:FRAGMENT,
      uniforms:{tDiffuse:{value:null},uResolution:{value:new T.Vector2(1,1)},uCenter:{value:new T.Vector2(.5,.5)},uScope:{value:new T.Vector2(.5,.5)},uHalf:{value:new T.Vector2()},
        uInverseProjection:{value:new T.Matrix4()},uCameraWorld:{value:new T.Matrix4()},uPreviousVP:{value:new T.Matrix4()},
        uOrigin:{value:new T.Vector3()},uRight:{value:new T.Vector3()},uUp:{value:new T.Vector3()},uForward:{value:new T.Vector3()},
        uShutter:{value:0},uMaxBlur:{value:32},uSamples:{value:6},uChromaticPixels:{value:0},uShock:{value:0},uAge:{value:0},uSpeed:{value:0},uInterior:{value:0},uExit:{value:0}}}));
    this.previous=new T.Matrix4();this.position=new T.Vector3();this.rotation=new T.Quaternion();this.center=new T.Vector3();this.enabled=false;this.valid=false;
  }
  setSize(w,h){this.uniforms.uResolution.value.set(Math.max(1,w),Math.max(1,h));this.valid=false;}
  update(camera,basis,{age=0,progress=0,active=false,interior=false,quality='auto',dt=1/60,reduced=false}={}){
    if(!active||reduced){this.reset();return;}
    const profile=PORTAL_FX_PROFILES[quality]??PORTAL_FX_PROFILES.auto,state=portalImpactEnvelope(age,progress,active,reduced),u=this.uniforms;
    this.enabled=true;camera.updateMatrixWorld(true);
    const distance=camera.position.distanceTo(this.position),angle=camera.quaternion.angleTo(this.rotation);
    const safe=this.valid&&interior&&this.wasInterior&&Number.isFinite(dt)&&dt>0&&dt<.15&&distance<=45*dt&&angle<=2.5*dt;
    const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    u.uPreviousVP.value.copy(safe?this.previous:vp);
    const stationary=this.previous.equals(vp);
    u.uShutter.value=safe&&!stationary?Math.min(.95,(1/55)/dt)*state.speed:0;
    u.uInverseProjection.value.copy(camera.projectionMatrixInverse);u.uCameraWorld.value.copy(camera.matrixWorld);
    u.uOrigin.value.copy(basis.center);u.uRight.value.copy(basis.right);u.uUp.value.copy(basis.up);u.uForward.value.copy(basis.forward);u.uHalf.value.copy(basis.half);
    this.center.copy(basis.center).project(camera);
    u.uCenter.value.set(interior?.5:Math.max(-1,Math.min(2,this.center.x*.5+.5)),interior?.5:Math.max(-1,Math.min(2,this.center.y*.5+.5)));
    const depth=Math.max(.2,-basis.center.clone().applyMatrix4(camera.matrixWorldInverse).z);
    u.uScope.value.set(Math.min(2,basis.half.x*Math.abs(camera.projectionMatrix.elements[0])/(depth*2)),Math.min(2,basis.half.y*Math.abs(camera.projectionMatrix.elements[5])/(depth*2)));
    u.uChromaticPixels.value=profile.chromaticPixels*(state.opening*.55+state.speed);
    u.uMaxBlur.value=profile.blurPixels;u.uSamples.value=profile.shutterSamples;u.uShock.value=state.opening;
    u.uAge.value=age;u.uSpeed.value=state.speed;u.uInterior.value=interior?1:0;u.uExit.value=state.exit;
    this.previous.copy(vp);this.position.copy(camera.position);this.rotation.copy(camera.quaternion);this.valid=true;this.wasInterior=interior;
  }
  reset(){this.enabled=false;this.valid=false;this.wasInterior=false;this.uniforms.uShutter.value=0;this.uniforms.uChromaticPixels.value=0;this.uniforms.uShock.value=0;this.uniforms.uSpeed.value=0;}
}
