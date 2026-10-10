export {PersistentBrand} from './room-persistent-brand.js';
import {HeroScene as ShowroomScene} from './room-hologram-scene.js';
import {BannerPortal} from './room-portal.js';
import {portalImpactEnvelope} from './room-portal-effects.js';
export class HeroScene extends ShowroomScene {
 buildLights(){super.buildLights();this.bannerPortal=new BannerPortal(this);}
 async prepareEnvironment(signal){await super.prepareEnvironment(signal);signal.throwIfAborted();await this.bannerPortal.prepare();}
 enterPortal(index,onComplete){return this.bannerPortal.enter(index,onComplete);}
 returnPortal(index,onComplete){
  if(!this.ready||this.disposed||this.lost||this.reduced.matches)return false;
  const parked=this.pageActive;this.sleep();this.pageActive=true;this.resize();
  if(!this.bannerPortal.returnToShowroom(index,onComplete)){this.pageActive=parked;return false;}
  this.pageActive=false;
  // Paint the dark end of the corridor before the outgoing HTML page fades away.
  this.render(1/60,0);this.wake();return true;
 }
 parkSection(){this.pageActive=true;this.sleep();this.brandLogo?.restoreFallback();}
 resumeShowroom(){this.pageActive=false;this.bannerPortal?.cancel();this.cameraRig.applyOverview();this.wake();}
 cancelPortal(){this.bannerPortal?.cancel();}
 wake(){if(!this.pageActive)super.wake();}
 frame(now){
  if(this.pageActive){this.sleep();return;}
  super.frame(now);
  if(this.pageActive)this.sleep();
 }
 resize(){super.resize();this.bannerPortal?.attachOptics(this.optics);if(this.bannerPortal?.active)this.bannerPortal.update(0);}
 render(dt,motion){
  if(this.pageActive)return;
  const portal=this.bannerPortal,optics=this.optics;
  if(!portal?.active&&!portal?.interior){super.render(dt,motion);return;}
  portal.prepareFrame(dt);
  const state=portalImpactEnvelope(portal.age,portal.panel.portalUniforms.portalProgress.value,portal.active,this.reduced.matches);
  const scene=optics.renderPass.scene,visual=optics.visualSettings;
  const light=this.screenLight,position=light.position.clone(),intensity=light.intensity;
  const bloom=optics.gradePass.uniforms.uBloomStrength,baseBloom=bloom.value;
  try{
   // Use the existing panel spill light. Restore every change even on a failed draw.
   if(!portal.interior){light.position.copy(portal.basis.center).addScaledVector(portal.basis.normal,.85);light.intensity=2+state.opening*13;}
   bloom.value=baseBloom*(1+state.opening*.38+state.speed*.18);
   if(portal.interior)optics.renderPass.scene=portal.fullScene;
   if(portal.stage!=='approach')optics.visualSettings={...visual,depthOfField:0,motionBlur:portal.interior?0:visual.motionBlur};
   super.render(dt,motion);
  }finally{
   optics.renderPass.scene=scene;optics.visualSettings=visual;
   bloom.value=baseBloom;light.position.copy(position);light.intensity=intensity;
  }
 }
 inspect(){return {...super.inspect(),portal:this.bannerPortal?.inspect(),sectionSleeping:Boolean(this.pageActive)};}
 async dispose(){await super.dispose();this.bannerPortal?.dispose();}
}
