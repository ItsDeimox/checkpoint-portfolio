import { HeroScene as ShowroomScene } from './room-scene.js';
import { configurePanelHologram, updateHologramView, HOLOGRAM_LAYERS } from './room-hologram.js';
import { RoomBrandLogo, loadBrandModel, disposeBrandModel } from './room-brand-logo.js';
import { waitForAsset } from './room-startup.js';

/** Additive presentation extension: the approved r5 room/controller stays intact. */
export class HeroScene extends ShowroomScene {
  async initialize(){
    this.brandModelTask=loadBrandModel(this.workController.signal).then(model=>{
      this.brandModel=model;return model;
    }).catch(error=>{this.brandError=error.message;return null;});
    return super.initialize();
  }
  buildLights(){
    super.buildLights();
    this.panels.forEach(configurePanelHologram);
  }
  async prepareEnvironment(signal){
    await super.prepareEnvironment(signal);
    const model=await waitForAsset(this.brandModelTask,signal);
    signal.throwIfAborted();
    if(!model)return;
    try{
      if(!this.brandLogo)this.brandLogo=new RoomBrandLogo(this.renderer,model,()=>document.querySelector('.room-brand-logo'));
      await this.brandLogo.prepare(this.scene.environment);
    }catch(error){signal.throwIfAborted();this.disableBrand(error);}
  }
  bind(){
    super.bind();
    const header=document.querySelector('#header');
    if(header && typeof MutationObserver!=='undefined'){
      this.brandObserver=new MutationObserver(()=>{this.brandLogo?.invalidateLayout();this.wake();});
      this.brandObserver.observe(header,{childList:true,subtree:true});
    }
  }
  bindContext(){
    super.bindContext();
    this.canvas.addEventListener('webglcontextlost',()=>this.brandLogo?.restoreFallback(),{signal:this.controller.signal});
  }
  updatePanels(dt){
    this.panels.forEach(panel=>updateHologramView(panel,this.camera.position));
    const moving=super.updatePanels(dt);
    // Extra spill is restricted to the hovered display, never general room fill.
    if(this.hoverPanel>=0 && this.contentPanel===null){
      const alpha=this.reduced.matches?1:1-Math.exp(-Math.min(dt,.1)*10);
      this.screenLight.intensity+=1.1*alpha;
    }
    return moving;
  }
  resize(){super.resize();this.brandLogo?.invalidateLayout();}
  render(dt,motion){
    super.render(dt,motion);
    if(!this.brandLogo?.ready)return;
    const reduce=this.reduced.matches||this.settings.paused;
    try{this.brandLogo.render(this.canvas,{yaw:reduce?0:this.cameraRig.yaw*1.6,pitch:reduce?0:this.cameraRig.pitch*1.2});}
    catch(error){this.disableBrand(error);}
  }
  disableBrand(error){
    this.brandError=error.message;
    if(this.brandLogo){this.brandLogo.ready=false;this.brandLogo.restoreFallback();}
  }
  inspect(){
    return {...super.inspect(),hologramLayers:HOLOGRAM_LAYERS.length,hologramTime:this.time,brandLogo3D:Boolean(this.brandLogo?.ready),brandLogoError:this.brandError??null};
  }
  async dispose(){
    this.brandObserver?.disconnect();this.brandLogo?.restoreFallback();
    await super.dispose();
    if(this.brandLogo)this.brandLogo.dispose();
    else if(this.brandModel){disposeBrandModel(this.brandModel);this.brandModel=null;}
  }
}
