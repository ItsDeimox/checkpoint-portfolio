import {HeroScene as ShowroomScene} from './room-hologram-scene.js';
import {BannerPortal} from './room-portal.js';
export class HeroScene extends ShowroomScene {
 buildLights(){super.buildLights();this.bannerPortal=new BannerPortal(this);}
 async prepareEnvironment(signal){await super.prepareEnvironment(signal);signal.throwIfAborted();await this.bannerPortal.prepare();}
 enterPortal(index,onComplete){return this.bannerPortal.enter(index,onComplete);}
 parkSection(){this.pageActive=true;this.sleep();this.brandLogo?.restoreFallback();}
 resumeShowroom(){this.pageActive=false;this.bannerPortal?.cancel();this.cameraRig.applyOverview();this.wake();}
 cancelPortal(){this.bannerPortal?.cancel();}
 wake(){if(!this.pageActive)super.wake();}
 frame(now){
  if(this.pageActive){this.sleep();return;}
  super.frame(now);
  // Arrival can happen inside the parent frame, before it queues its successor.
  if(this.pageActive)this.sleep();
 }
 resize(){super.resize();if(this.bannerPortal?.active)this.bannerPortal.update(0);}
 render(dt,motion){
  if(this.pageActive)return;
  const portal=this.bannerPortal,optics=this.optics;
  if(!portal?.active&&!portal?.interior){super.render(dt,motion);return;}
  if(portal.stage==='approach'){super.render(dt,motion);return;}
  const scene=optics.renderPass.scene,visual=optics.visualSettings;
  if(portal.interior)optics.renderPass.scene=portal.fullScene;
  optics.visualSettings={...visual,depthOfField:0,motionBlur:portal.interior?0:visual.motionBlur};
  try{super.render(dt,0);}finally{optics.renderPass.scene=scene;optics.visualSettings=visual;}
 }
 inspect(){return {...super.inspect(),portal:this.bannerPortal?.inspect(),sectionSleeping:Boolean(this.pageActive)};}
 async dispose(){await super.dispose();this.bannerPortal?.dispose();}
}
