import * as T from 'three';
import {PORTAL_UNIFORMS,PORTAL_FUNCTIONS} from './room-portal-shader.js';
import {PortalEffects} from './room-portal-effects.js';
import {PortalShutterPass} from './room-portal-optics.js';
import {RoomCamera} from './room-camera.js';
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
 const t=T.MathUtils.clamp(Number.isFinite(progress)?progress:0,0,1);
 const distance=T.MathUtils.lerp(-3.2,23,t*t);
 const position=basis.center.clone().addScaledVector(basis.forward,distance);
 const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(position,position.clone().add(basis.forward),basis.up));
 return {position,rotation,fov:48+11*smooth(Math.min(1,t/.64))};
}
function portalUniforms(panel){
 const b=portalBasis(panel);
 return {portalMix:{value:0},portalAge:{value:0},portalProgress:{value:0},portalSpeed:{value:0},portalOpening:{value:0},portalLayerCount:{value:18},
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
  float rim=abs(max(abs(p.x-.5),abs(p.y-.5))*2.-radius);
  float filament=1.-smoothstep(.005,.022,rim);
  float halo=exp(-rim*38.)*.32;
  float energy=.7+.3*sin((p.x+p.y)*57.+portalAge*8.);
  c+=vec3(4.8,.025,.055)*(filament+halo)*energy*portalOpening;
 }gl_FragColor=vec4(c,1.);`);
 m.needsUpdate=true;
}

/** One journey owns only the camera while active. No second RAF or WebGL target. */
export class BannerPortal {
 constructor(view){
  this.view=view;this.active=false;this.returning=false;this.interior=false;this.elapsed=0;this.stage='idle';
  view.panels.forEach(configurePortal);
  this.effects=new PortalEffects(view.scene);this.shutter=new PortalShutterPass();
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
  view.cameraRig.resize=width=>{if(this.active){view.cameraRig.width=width;if(this.returning)this.returnViewportDirty=true;return;}resize(width);};
  this.originalUpdate=view.cameraRig.update.bind(view.cameraRig);
  view.cameraRig.update=dt=>this.active?this.update(dt):this.originalUpdate(dt);
 }
 async prepare(){
  const {renderer,camera,optics}=this.view;if(!optics?.sceneTarget)return;
  const previous=renderer.getRenderTarget();
  try{renderer.setRenderTarget(optics.sceneTarget);await renderer.compileAsync(this.fullScene,camera,this.fullScene);}
  finally{renderer.setRenderTarget(previous);}
 }
 attachOptics(optics){
  if(!optics||this.attached)return;
  this.attached=true;optics.portalPass=this.shutter;
  optics.composer.insertPass(this.shutter,optics.composer.passes.indexOf(optics.bloomPass));
 }
 prepareFrame(dt){
  this.attachOptics(this.view.optics);
  if(!this.active||!this.basis){this.shutter.reset();return;}
  this.shutter.update(this.view.camera,this.basis,{age:this.age,progress:this.panel.portalUniforms.portalProgress.value,
    active:true,interior:this.interior,quality:this.view.settings.quality,dt,reduced:this.view.reduced.matches});
 }

 enter(index,onComplete){
  if(this.active||!this.view.ready)return false;
  const v=this.view,panel=v.panels[index];if(!panel)return false;
  this.panel=panel;this.basis=portalBasis(panel);this.saved={position:v.camera.position.clone(),rotation:v.camera.quaternion.clone(),focus:v.cameraRig.focusTarget.clone(),fov:v.camera.fov,width:v.cameraRig.width,aspect:v.camera.aspect,yaw:v.cameraRig.yaw,pitch:v.cameraRig.pitch};
  this.active=true;this.returning=false;this.interior=false;this.stage='approach';this.elapsed=0;this.age=0;this.onComplete=onComplete;
  this.effects.start(this.basis);this.shutter.reset();
  v.turntable?.end(false);v.release();v.clearHover();v.hidePanelContent();v.pendingPick=v.lastPointer=null;
  Object.assign(this.fullMaterial.uniforms,panel.portalUniforms,{artwork:panel.material.uniforms.artwork,projection:panel.material.uniforms.projection});
  v.cameraRig.panel=null;
  const pose=portalTravelPose(this.basis,0);
  v.cameraRig.moveTo({position:pose.position,target:this.basis.center,fov:pose.fov},'portal',PORTAL_APPROACH_SECONDS,()=>{this.stage='flight';this.elapsed=0;});
  v.optics.resetHistory();v.wake();return true;
 }
 /** Start behind the doorway and rewind the same camera path and shader clock. */
 returnToShowroom(index,onComplete){
  const v=this.view,panel=v.panels[index];
  if(this.active||this.disposed||!v.ready||v.lost||!panel)return false;
  this.panel=panel;this.basis=portalBasis(panel);this.onComplete=onComplete;
  this.active=true;this.returning=true;this.interior=true;this.stage='flight';
  this.elapsed=0;this.age=PORTAL_APPROACH_SECONDS+PORTAL_FLIGHT_SECONDS;
  this.returnViewportDirty=false;this.returnRebased=false;
  this.prepareReturnCurve();this.saved=this.returnHome;
  this.effects.start(this.basis);this.shutter.reset();
  v.turntable?.end(false);v.release();v.clearHover();v.hidePanelContent();v.pendingPick=v.lastPointer=null;
  v.cameraRig.transition=null;v.cameraRig.panel=null;v.cameraRig.mode='portal';
  Object.assign(this.fullMaterial.uniforms,panel.portalUniforms,{artwork:panel.material.uniforms.artwork,projection:panel.material.uniforms.projection});
  const pose=portalTravelPose(this.basis,1);
  v.camera.position.copy(pose.position);v.camera.quaternion.copy(pose.rotation);v.cameraRig.setFov(pose.fov);
  panel.portalUniforms.portalProgress.value=1;v.camera.updateMatrixWorld(true);
  this.syncReturnEffects();v.optics.resetHistory();v.wake();return true;
 }
 prepareReturnCurve(){
  const v=this.view,camera=v.camera.clone(),rig=new RoomCamera(camera,v.cameraRig.width),saved=this.saved;
  // A changed viewport needs its own safe overview framing, not an old mobile lens.
  if(saved&&saved.width===rig.width&&Math.abs(saved.aspect-camera.aspect)<1e-8){
   camera.position.copy(saved.position);camera.quaternion.copy(saved.rotation);rig.setFov(saved.fov);
   rig.yaw=saved.yaw??0;rig.pitch=saved.pitch??0;rig.focusTarget.copy(saved.focus);
  }
  this.returnHome={position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov,
   focus:rig.focusTarget.clone(),width:rig.width,aspect:camera.aspect,yaw:rig.yaw,pitch:rig.pitch};
  const dock=portalTravelPose(this.basis,0);
  rig.moveTo({position:dock.position,target:this.basis.center,fov:dock.fov},'portal',PORTAL_APPROACH_SECONDS);
  this.reverseRig=rig;this.reverseCurve=rig.transition;
 }
 updateReturn(dt){
  const v=this.view,u=this.panel.portalUniforms;
  if(v.reduced.matches){this.finishReturn();return false;}
  if(this.returnViewportDirty){
   this.returnViewportDirty=false;this.prepareReturnCurve();this.saved=this.returnHome;
   if(this.stage==='approach'){
    const rig=this.reverseRig,home=this.returnHome;rig.camera.position.copy(v.camera.position);
    rig.camera.quaternion.copy(v.camera.quaternion);rig.setFov(v.camera.fov);rig.focusTarget.copy(v.cameraRig.focusTarget);
    const target=home.position.clone().add(new T.Vector3(0,0,-1).applyQuaternion(home.rotation));
    rig.moveTo({position:home.position,target,fov:home.fov},'portal',Math.max(.001,PORTAL_APPROACH_SECONDS-this.elapsed));
    rig.transition.endRotation.copy(home.rotation);rig.transition.endFocus.copy(home.focus);this.returnRebased=true;
   }
  }
  this.elapsed+=dt;
  if(this.stage==='flight'){
   const progress=Math.max(0,1-this.elapsed/PORTAL_FLIGHT_SECONDS),pose=portalTravelPose(this.basis,progress);
   v.camera.position.copy(pose.position);v.camera.quaternion.copy(pose.rotation);v.cameraRig.setFov(pose.fov);
   v.cameraRig.focusTarget.copy(pose.position).addScaledVector(this.basis.forward,8);
   this.age=PORTAL_APPROACH_SECONDS+progress*PORTAL_FLIGHT_SECONDS;u.portalProgress.value=progress;
   this.interior=this.basis.toLocal(v.camera.position).z>=-v.camera.near*1.5;
   if(progress<=1e-9){this.stage='approach';this.elapsed=0;}
  }else{
   const progress=Math.min(1,this.elapsed/PORTAL_APPROACH_SECONDS);this.age=PORTAL_APPROACH_SECONDS*(1-progress);
   if(this.returnRebased)this.reverseRig.update(dt);
   else{this.reverseCurve.elapsed=this.age;this.reverseRig.transition=this.reverseCurve;this.reverseRig.update(0);}
   v.camera.position.copy(this.reverseRig.camera.position);v.camera.quaternion.copy(this.reverseRig.camera.quaternion);
   v.cameraRig.setFov(this.reverseRig.camera.fov);v.cameraRig.focusTarget.copy(this.reverseRig.focusTarget);
   if(progress>=1-1e-9){this.finishReturn();return true;}
  }
  v.camera.updateMatrixWorld(true);this.syncReturnEffects();return true;
 }
 syncReturnEffects(){
  const v=this.view,u=this.panel.portalUniforms;u.portalAge.value=this.age;u.portalMix.value=smooth(this.age/.75);
  u.portalLayerCount.value=v.settings.quality==='low'?12:v.settings.quality==='high'?24:18;
  const state=this.effects.update(this.age,u.portalProgress.value,v.settings.quality,this.active,this.interior,v.reduced.matches);
  u.portalSpeed.value=state.speed;u.portalOpening.value=state.opening;
  this.fullMaterial.uniforms.portalInverseProjection.value.copy(v.camera.projectionMatrixInverse);
  this.fullMaterial.uniforms.portalCameraWorld.value.copy(v.camera.matrixWorld);
 }
 finishReturn(){
  if(!this.active||!this.returning)return;
  const done=this.onComplete;this.saved=this.returnHome;this.cancel();done?.();
 }
 update(delta){
  if(!this.active)return false;
  const dt=Number.isFinite(delta)?Math.max(0,Math.min(delta,.1)):0;
  if(this.returning)return this.updateReturn(dt);
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
  const state=this.effects.update(this.age,u.portalProgress.value,v.settings.quality,this.active,this.interior,v.reduced.matches);
  u.portalSpeed.value=state.speed;u.portalOpening.value=state.opening;
  this.fullMaterial.uniforms.portalInverseProjection.value.copy(v.camera.projectionMatrixInverse);
  this.fullMaterial.uniforms.portalCameraWorld.value.copy(v.camera.matrixWorld);
  return true;
 }
 finish(){
  if(!this.active)return;this.active=false;this.stage='arrived';this.effects.reset();this.shutter.reset();
  const callback=this.onComplete;this.onComplete=null;callback?.();
 }
 cancel(){
  const v=this.view;this.active=false;this.returning=false;this.interior=false;this.stage='idle';this.onComplete=null;
  this.effects.reset();this.shutter.reset();
  v.panels.forEach(p=>{p.portalUniforms.portalMix.value=0;p.portalUniforms.portalProgress.value=0;p.portalUniforms.portalSpeed.value=0;p.portalUniforms.portalOpening.value=0;});
  v.cameraRig.transition=null;v.cameraRig.panel=null;v.cameraRig.mode='overview';
  if(this.saved){v.cameraRig.yaw=v.cameraRig.targetYaw=this.saved.yaw??0;v.cameraRig.pitch=v.cameraRig.targetPitch=this.saved.pitch??0;v.cameraRig.focusTarget.copy(this.saved.focus);v.camera.position.copy(this.saved.position);v.camera.quaternion.copy(this.saved.rotation);v.cameraRig.setFov(this.saved.fov);v.camera.updateMatrixWorld(true);}
  v.optics?.resetHistory();v.reflectionBudget?.invalidate();
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.active=false;this.returning=false;this.view.cameraRig.transition=null;this.onComplete=null;this.effects.dispose();if(!this.attached)this.shutter.dispose();this.quad.geometry.dispose();this.fullMaterial.dispose();}
 inspect(){return {active:this.active,returning:this.returning,stage:this.stage,interior:this.interior,panel:this.panel?.index,depth:this.basis?this.basis.toLocal(this.view.camera.position).z:null,age:this.age??0,burstVisible:this.effects.group.visible,shutter:this.shutter.uniforms.uShutter.value,chromaticPixels:this.shutter.uniforms.uChromaticPixels.value};}
}
