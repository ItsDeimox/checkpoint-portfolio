import * as T from 'three';
import {PORTAL_UNIFORMS,PORTAL_FUNCTIONS} from './room-portal-shader.js';
const UP=new T.Vector3(0,1,0);
export const PORTAL_APPROACH_SECONDS=1.2,PORTAL_FLIGHT_SECONDS=1.65;
const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};

export function portalBasis(panel){
 const points=panel.screen?Array.from({length:4},(_,i)=>panel.screen.localToWorld(new T.Vector3().fromBufferAttribute(panel.screen.geometry.attributes.position,i))):panel.corners.map(p=>p.clone());
 const center=points.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(.25);
 const right=points[1].clone().sub(points[0]).normalize(),up=points[0].clone().sub(points[3]).normalize();
 const normal=right.clone().cross(up).normalize(),forward=normal.clone().negate();
 const half=new T.Vector2(points[0].distanceTo(points[1])*.5,points[0].distanceTo(points[3])*.5);
 return {center,right,up,normal,forward,half,toLocal(point){const v=point.clone().sub(center);return new T.Vector3(v.dot(right),v.dot(up),v.dot(forward));}};
}
export function portalTravelPose(basis,progress){
 const distance=T.MathUtils.lerp(-3.2,23,smooth(progress));
 const position=basis.center.clone().addScaledVector(basis.forward,distance);
 const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(position,position.clone().add(basis.forward),basis.up));
 return {position,rotation,fov:48};
}
function portalUniforms(panel){
 const b=portalBasis(panel);
 return {portalMix:{value:0},portalAge:{value:0},portalProgress:{value:0},portalLayerCount:{value:18},
  portalOrigin:{value:b.center},portalRight:{value:b.right},portalUp:{value:b.up},portalForward:{value:b.forward},portalHalf:{value:b.half}};
}
export function configurePortal(panel){
 if(panel.portalUniforms)return;
 const u=portalUniforms(panel),m=panel.material;
 Object.assign(m.uniforms,u);panel.portalUniforms=u;
 m.fragmentShader=PORTAL_UNIFORMS+'\nvarying vec3 vWorld;\n'+m.fragmentShader.replace('void main(){',PORTAL_FUNCTIONS+'\nvoid main(){');
 m.fragmentShader=m.fragmentShader.replace('vec3 h=projection*vec3(artUv,1.);',`artUv+=vec2(sin(artUv.y*35.-portalAge*9.),cos(artUv.x*22.+portalAge*6.))*portalMix*(1.-portalMix)*.065;artUv=clamp(artUv,vec2(.001),vec2(.999));vec3 h=projection*vec3(artUv,1.);`);
 m.fragmentShader=m.fragmentShader.replace('gl_FragColor=vec4(c,1.);',`if(portalMix>0.){
  float radius=portalMix*1.22;float aperture=1.-smoothstep(radius-.09,radius,max(abs(p.x-.5),abs(p.y-.5))*2.);
  c=mix(c,portalRadiance(cameraPosition,normalize(vWorld-cameraPosition)),aperture);
 }gl_FragColor=vec4(c,1.);`);
 m.needsUpdate=true;
}

/** One journey owns only the camera while active. No second RAF or WebGL target. */
export class BannerPortal {
 constructor(view){
  this.view=view;this.active=false;this.interior=false;this.elapsed=0;this.stage='idle';
  view.panels.forEach(configurePortal);
  const first=view.panels[0];
  this.fullMaterial=new T.ShaderMaterial({name:'DXT.PortalInterior',depthWrite:false,depthTest:false,
   uniforms:{...first.portalUniforms,artwork:first.material.uniforms.artwork,projection:first.material.uniforms.projection,
    portalInverseProjection:{value:new T.Matrix4()},portalCameraWorld:{value:new T.Matrix4()}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
   fragmentShader:`uniform sampler2D artwork;uniform mat3 projection;uniform mat4 portalInverseProjection;uniform mat4 portalCameraWorld;varying vec2 vUv;${PORTAL_UNIFORMS}${PORTAL_FUNCTIONS}
   void main(){vec4 p=portalInverseProjection*vec4(vUv*2.-1.,1.,1.);vec3 ray=normalize((portalCameraWorld*vec4(p.xyz/p.w,0.)).xyz);gl_FragColor=vec4(portalRadiance(cameraPosition,ray),1.);}`});
  this.fullScene=new T.Scene();this.fullScene.background=new T.Color(0x050204);
  this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.fullMaterial);this.quad.frustumCulled=false;this.fullScene.add(this.quad);
  const resize=view.cameraRig.resize.bind(view.cameraRig);
  view.cameraRig.resize=width=>{if(this.active){view.cameraRig.width=width;return;}resize(width);};
  this.originalUpdate=view.cameraRig.update.bind(view.cameraRig);
  view.cameraRig.update=dt=>this.active?this.update(dt):this.originalUpdate(dt);
 }
 async prepare(){await this.view.renderer.compileAsync(this.fullScene,this.view.camera);}
 enter(index,onComplete){
  if(this.active||!this.view.ready)return false;
  const v=this.view,panel=v.panels[index];if(!panel)return false;
  this.panel=panel;this.basis=portalBasis(panel);this.saved={position:v.camera.position.clone(),rotation:v.camera.quaternion.clone(),focus:v.cameraRig.focusTarget.clone(),fov:v.camera.fov};
  this.active=true;this.interior=false;this.stage='approach';this.elapsed=0;this.age=0;this.onComplete=onComplete;
  v.turntable?.end(false);v.release();v.clearHover();v.hidePanelContent();v.pendingPick=v.lastPointer=null;
  Object.assign(this.fullMaterial.uniforms,panel.portalUniforms,{artwork:panel.material.uniforms.artwork,projection:panel.material.uniforms.projection});
  v.cameraRig.panel=null;
  const pose=portalTravelPose(this.basis,0);
  v.cameraRig.moveTo({position:pose.position,target:this.basis.center,fov:pose.fov},'portal',PORTAL_APPROACH_SECONDS,()=>{this.stage='flight';this.elapsed=0;});
  v.optics.resetHistory();v.wake();return true;
 }
 update(delta){
  if(!this.active)return false;
  const dt=Number.isFinite(delta)?Math.max(0,Math.min(delta,.1)):0;
  const v=this.view,u=this.panel.portalUniforms;
  this.age+=dt;u.portalAge.value=this.age;u.portalMix.value=smooth(this.age/.75);
  u.portalLayerCount.value=v.settings.quality==='low'?12:v.settings.quality==='high'?24:18;
  if(v.reduced.matches){this.finish();return false;}
  if(this.stage==='approach')this.originalUpdate(dt);
  else{
   this.elapsed+=dt;const t=Math.min(1,this.elapsed/PORTAL_FLIGHT_SECONDS),pose=portalTravelPose(this.basis,t);
   v.camera.position.copy(pose.position);v.camera.quaternion.copy(pose.rotation);v.cameraRig.setFov(pose.fov);
   v.cameraRig.focusTarget.copy(pose.position).addScaledVector(this.basis.forward,8);v.camera.updateMatrixWorld(true);
   u.portalProgress.value=t;
   // Identical world-ray shading takes over only as the doorway reaches near clipping.
   this.interior=this.basis.toLocal(v.camera.position).z>=-v.camera.near*1.5;
   if(t===1)this.finish();
  }
  this.fullMaterial.uniforms.portalInverseProjection.value.copy(v.camera.projectionMatrixInverse);
  this.fullMaterial.uniforms.portalCameraWorld.value.copy(v.camera.matrixWorld);
  return true;
 }
 finish(){
  if(!this.active)return;this.active=false;this.stage='arrived';
  const callback=this.onComplete;this.onComplete=null;callback?.();
 }
 cancel(){
  const v=this.view;this.active=false;this.interior=false;this.stage='idle';this.onComplete=null;
  v.panels.forEach(p=>{p.portalUniforms.portalMix.value=0;p.portalUniforms.portalProgress.value=0;});
  v.cameraRig.transition=null;v.cameraRig.panel=null;v.cameraRig.mode='overview';
  if(this.saved){v.cameraRig.focusTarget.copy(this.saved.focus);v.camera.position.copy(this.saved.position);v.camera.quaternion.copy(this.saved.rotation);v.cameraRig.setFov(this.saved.fov);v.camera.updateMatrixWorld(true);}
  v.optics?.resetHistory();v.reflectionBudget?.invalidate();
 }
 dispose(){this.active=false;this.onComplete=null;this.quad.geometry.dispose();this.fullMaterial.dispose();}
 inspect(){return {active:this.active,stage:this.stage,interior:this.interior,panel:this.panel?.index,depth:this.basis?this.basis.toLocal(this.view.camera.position).z:null,age:this.age??0};}
}
