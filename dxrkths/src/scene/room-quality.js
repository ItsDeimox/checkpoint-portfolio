import {Vector2} from 'three';
import {yieldToBrowser} from './room-startup.js';
import {waitForGpu} from './room-gpu-gate.js';

/** Allocate one attachment at a time only after submitted frames have finished.
 * This is not a second renderer and it does not recreate the scene or camera. */
export async function prepareQualityTargets(view,signal){
 const {renderer,optics}=view;
 if(!renderer?.initRenderTarget)return;
 const targets=new Set([optics?.sceneTarget,optics?.composer?.readBuffer,optics?.composer?.writeBuffer,
  ...(optics?.bloomPass?.targets??[]),optics?.turntableMotion?.target,view.ground?.getRenderTarget?.()]);
 for(const target of targets){
  if(!target)continue;signal?.throwIfAborted();renderer.initRenderTarget(target);await yieldToBrowser(signal);
 }
 await waitForGpu(renderer,signal);
}

/** One in-flight quality request, with newer clicks replacing an unstarted one.
 * UI can paint the status before allocation. No synchronous GPU wait on click. */
export class QualityTransition {
 constructor(view){this.view=view;this.task=null;this.requested=null;}
 request(value){
  const v=this.view;this.requested=value;
  if(this.task)return this.task;
  v.qualityChanging=true;v.sleep();v.callbacks.onQualityState?.(true);
  this.task=this.run().catch(async error=>{
   if(!v.disposed&&!v.lost&&!v.workController.signal.aborted){
    if(this.mutated){
     try{await v.applyQuality(v.appliedQuality);await prepareQualityTargets(v,v.workController.signal);
      if(!v.pageActive){v.render(1/60,0);await waitForGpu(v.renderer,v.workController.signal);}
     }catch(recovery){v.ready=false;v.callbacks.onUnavailable?.(recovery);}
    }
    v.settings.quality=v.appliedQuality;v.qualityError=error.message;
    v.callbacks.onQualityError?.(error);
   }
  }).finally(()=>{
   this.task=null;this.mutated=false;v.qualityChanging=false;v.framePacer?.reset();v.optics?.resetHistory();
   if(!v.disposed&&!v.lost){v.callbacks.onQualityState?.(false);v.wake();}
  });
  v.qualityTask=this.task;return this.task;
 }
 async run(){
  const v=this.view,signal=v.workController.signal;
  await yieldToBrowser(signal);
  while(this.requested!==v.appliedQuality){
   signal.throwIfAborted();if(v.disposed)return;
   // A programmatic request during travel waits for its camera owner to finish.
   // UI requests cannot enter here during a journey (the quality control is disabled).
   if(v.bannerPortal?.active){v.qualityChanging=false;v.wake();
    while(v.bannerPortal.active){signal.throwIfAborted();await yieldToBrowser(signal);}
    v.qualityChanging=true;v.sleep();
   }
   // Drain the bounded draw pipeline after sleep(), before changing storage.
   // This explicit barrier also covers direct draws outside the RAF queue.
   if(v.gpuFrameGate){v.gpuFrameGate.submit?.();await v.gpuFrameGate.wait(signal);}
   else await waitForGpu(v.renderer,signal);
   v.drawQueue?.reset();
   signal.throwIfAborted();
   const requested=this.requested;
   this.mutated=true;await v.applyQuality(requested);await prepareQualityTargets(v,signal);
   signal.throwIfAborted();
   // Keep a parked HTML page asleep. Otherwise finish its first draw here,
   // before publishing the new profile to the regular animation scheduler.
   if(!v.pageActive){v.render(1/60,0);await waitForGpu(v.renderer,signal);}
   v.appliedQuality=requested;v.qualityError=null;
  }
 }
}

/** Exercise actual viewport/MSAA storage while the intro still covers the scene.
 * Tiny raster warm-ups miss driver work on the first full-size portal draw. */
export async function warmInteractivePaths(view,signal){
 const {renderer,optics}=view;
 if(!renderer?.getSize||!optics?.sceneTarget)return false;
 const size=renderer.getSize(new Vector2()),ratio=renderer.getPixelRatio();
 const shadows=renderer.shadowMap.enabled,pageActive=view.pageActive;
 const smokeState=(view.smokes??[]).map(s=>[s,s.visible]);
 const dustCount=view.dust?.geometry.drawRange.count;
 try{
  view.pageActive=false;
  view.panelEnergy?.prime();for(const [s]of smokeState)s.visible=true;
  view.dust?.geometry.setDrawRange(0,160);
  for(const shadowed of [true,false]){
   signal.throwIfAborted();renderer.shadowMap.enabled=shadowed;renderer.shadowMap.needsUpdate=true;
   view.render(1/60,0);await waitForGpu(renderer,signal);await yieldToBrowser(signal);
  }
  renderer.shadowMap.enabled=shadows;
  view.panelEnergy?.clear();
  await view.bannerPortal?.prepareScene(signal);
 }finally{
  view.pageActive=pageActive;
  renderer.shadowMap.enabled=shadows;renderer.shadowMap.needsUpdate=true;
  for(const [s,visible]of smokeState)s.visible=visible;
  if(dustCount!==undefined)view.dust.geometry.setDrawRange(0,dustCount);
  view.panelEnergy?.clear();
  renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);
  optics.resize(size.x,size.y,ratio);optics.resetHistory();
 }
 return true;
}
