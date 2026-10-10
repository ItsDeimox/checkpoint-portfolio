import { HeroScene as ShowroomScene } from './room-scene.js';
import { configurePanelHologram, updateHologramView, HOLOGRAM_LAYERS } from './room-hologram.js';
import { RoomBrandLogo, loadBrandModel, disposeBrandModel } from './room-brand-logo.js';
import { RoomMusic } from './room-music.js';
import { MusicLights } from './room-music-lights.js';
import { LogoSpin } from './room-logo-spin.js';
import { waitForAsset } from './room-startup.js';

/** Additive presentation extension: the approved r5 room/controller stays intact. */
export class HeroScene extends ShowroomScene {
  async initialize(){
    this.music=this.callbacks.music??null;
    this.logoSpin = new LogoSpin();
    this.brandModelTask=loadBrandModel(this.workController.signal).then(model=>{
      this.brandModel=model;return model;
    }).catch(error=>{this.brandError=error.message;return null;});
    return super.initialize();
  }
  progress(caption){super.progress(caption);this.callbacks.onProgress?.(caption);}
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
      this.brandObserver.observe(header,{childList:true});
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
    const spinning=this.logoSpin?.update(dt,this.reduced.matches) ?? false;
    return moving || spinning;
  }
  ensureMusic(){
    if(!this.music){
      this.music=new RoomMusic({settings:this.settings.music,onState:state=>{
        if(this.disposed)return;
        this.settings.sound=state.enabled;this.callbacks.onMusicState?.(state);if(!this.music?.suspended)this.wake();
      }});
      // Base lifecycle already suspends, resumes and closes this audio adapter.
      this.audio=this.music;
    }
    return this.music;
  }
  setSound(enabled){return this.ready?this.ensureMusic().setEnabled(enabled):Promise.resolve(false);}
  setMusicSettings(settings){this.music?.setSettings(settings);this.wake();}
  useLocalMusic(file){return this.ensureMusic().selectFile(file);}
  useDefaultMusic(){return this.ensureMusic().useDefault();}
  spinLogo(){
    if(!this.ready||!this.brandLogo?.ready)return false;
    this.logoSpin ??= new LogoSpin();
    const started=this.logoSpin.request(this.reduced.matches);
    if(started)this.wake();return started;
  }
  sleep(){super.sleep();if(!this.callbacks.music)this.music?.suspend();}
  wake(){
    if(this.callbacks?.introPending?.())return;
    super.wake();
    if(!this.callbacks.music&&this.ready&&!this.disposed&&!this.lost&&!document.hidden&&this.settings.sound&&this.music?.suspended)this.music.resume();
  }
  resize(){super.resize();this.brandLogo?.invalidateLayout();}
  render(dt,motion){
    const levels=this.music?.update(dt,!this.settings.paused&&!this.reduced.matches);
    if(levels&&this.optics&&this.scene){
      this.musicLights ??= new MusicLights(this);
      this.musicLights.apply(levels,this.music.settings.reactivity);
    }
    try{super.render(dt,motion);}finally{this.musicLights?.restore();}
    if(!this.brandLogo?.ready)return;
    try{this.brandLogo.render(this.canvas,{spinAngle:this.logoSpin?.angle??0});}
    catch(error){this.disableBrand(error);}
  }
  disableBrand(error){
    this.brandError=error.message;
    if(this.brandLogo){this.brandLogo.ready=false;this.brandLogo.restoreFallback();}
  }
  inspect(){
    return {...super.inspect(),hologramLayers:HOLOGRAM_LAYERS.length,music:this.music?.inspect()??null,logoSpinning:this.logoSpin?.active??false,logoSpinAngle:this.logoSpin?.angle??0,hologramTime:this.time,brandLogo3D:Boolean(this.brandLogo?.ready),brandLogoError:this.brandError??null};
  }
  async dispose(){
    this.brandObserver?.disconnect();this.brandLogo?.restoreFallback();
    await super.dispose();
    if(!this.callbacks.music)await this.music?.close();this.musicLights?.restore();
    if(this.brandLogo)this.brandLogo.dispose();
    else if(this.brandModel){disposeBrandModel(this.brandModel);this.brandModel=null;}
  }
}
