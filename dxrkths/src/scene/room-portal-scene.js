import {RoomPanelEnergy} from './room-panel-energy.js';
import {RoomIdentity} from './room-identity.js';
export {PersistentBrand} from './room-persistent-brand.js';
import {HeroScene as ShowroomScene} from './room-hologram-scene.js';
import {BannerPortal} from './room-portal.js';
import {portalImpactEnvelope} from './room-portal-effects.js';
export class HeroScene extends ShowroomScene {
 buildLights(){super.buildLights();this.bannerPortal=new BannerPortal(this);this.identity=new RoomIdentity(this);this.panelEnergy=new RoomPanelEnergy(this);}

 buildAtmosphere(){
  super.buildAtmosphere();
  // The real neutral spotlight is retained. Its narrow, low-density shaft is
  // bounded above the roof rather than washing over the entire middle card.
 }
 enterPortal(index,onComplete,onProgress,getArrivalViewport){return this.bannerPortal.enter(index,onComplete,onProgress,getArrivalViewport);}
 returnPortal(index,onComplete,onProgress,getArrivalViewport){
  if(!this.ready||this.disposed||this.lost||this.reduced.matches)return false;
  const parked=this.pageActive;this.sleep();this.pageActive=true;this.resize();
  if(!this.bannerPortal.returnToShowroom(index,onComplete,onProgress,getArrivalViewport)){this.pageActive=parked;return false;}
  this.pageActive=false;
  // The page remains on the world wall as the camera retreats into the tunnel.
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
 updatePanels(dt){const energy=this.panelEnergy?.update(dt)||false;if(this.bannerPortal?.active&&this.bannerPortal.interior)return energy;return super.updatePanels(dt)||energy;}
 updateAtmosphere(){if(!this.bannerPortal?.active||!this.bannerPortal.interior)super.updateAtmosphere();}
 updateLinkProjection(){if(!this.bannerPortal?.active)super.updateLinkProjection();}
 resize(){super.resize();this.bannerPortal?.attachOptics(this.optics);if(this.bannerPortal?.active)this.bannerPortal.update(0);}
 render(dt,motion){
  if(this.pageActive)return;
  this.identity?.update(dt,this.reduced.matches||(!this.ready&&!this.bannerPortal?.active));
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
 inspect(){return {...super.inspect(),portal:this.bannerPortal?.inspect(),sectionSleeping:Boolean(this.pageActive),identity:this.identity?{selected:this.identity.selected,color:this.identity.color.getHexString(),strength:this.identity.strength}:null};}
 async dispose(){await super.dispose();this.panelEnergy?.dispose();this.bannerPortal?.dispose();}
}

export {DestinationGraphics} from "./destination-graphics.js";
