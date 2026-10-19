import {yieldToBrowser} from './room-startup.js';

/** A two-draw pipeline, not an input gate. The CPU may update the latest pose
 * while the GPU is busy; only redundant render submissions are held back.
 * Two slots preserve CPU/GPU overlap. Poll only when full, with zero timeout;
 * RAF's frame boundary flushes commands, so never explicitly flush here. */
export class GpuDrawQueue {
 constructor(gl){this.gl=gl;this.fences=[];this.skipped=0;this.peak=0;}
 get pending(){return this.fences.length;}
 canSubmit(){
  if(this.fences.length<2)return true;
  const gl=this.gl,status=gl.clientWaitSync(this.fences[0],0,0);
  if(status===gl.TIMEOUT_EXPIRED){this.skipped++;return false;}
  gl.deleteSync(this.fences.shift());
  if(status===gl.WAIT_FAILED){this.reset();throw Error('GPU draw completion check failed.');}
  return true;
 }
 submitted(){
  if(!this.gl?.fenceSync)return;
  if(this.fences.length>=2)throw Error('GPU draw queue capacity exceeded.');
  const fence=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);
  if(fence){this.fences.push(fence);this.peak=Math.max(this.peak,this.fences.length);}
 }
 reset(){for(const fence of this.fences)this.gl.deleteSync(fence);this.fences.length=0;}
 dispose(){this.reset();}
}


/** Explicit preparation barrier, never a per-frame animation throttle.
 * Polling yields to the browser and never waits inside an input/RAF task. */
export class GpuFrameGate {
 constructor(gl){this.gl=gl;this.fence=null;this.skipped=0;}
 available(){
  if(!this.fence)return true;
  const gl=this.gl,status=gl.clientWaitSync(this.fence,0,0);
  if(status===gl.TIMEOUT_EXPIRED){this.skipped++;return false;}
  this.reset();
  if(status===gl.WAIT_FAILED)throw Error('GPU completion check failed.');
  return true;
 }
 submit(){
  if(this.fence||!this.gl?.fenceSync)return;
  this.fence=this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);this.gl.flush();
 }
 async wait(signal,timeout=30000){
  const start=performance.now();
  while(!this.available()){
   signal?.throwIfAborted();
   if(performance.now()-start>timeout)throw Error('Graphics preparation exceeded the GPU completion deadline.');
   await yieldToBrowser(signal);
  }
  signal?.throwIfAborted();
 }
 reset(){if(this.fence){this.gl.deleteSync(this.fence);this.fence=null;}}
 dispose(){this.reset();}
}
/** Preparation is complete only when the driver signals it, never after an
 * arbitrary number of polls. Cancellation still releases the sync object. */
export async function waitForGpu(renderer,signal){
 const gate=new GpuFrameGate(renderer.getContext());
 try{gate.submit();await gate.wait(signal);}finally{gate.dispose();}
}

/** Shader failure must reject preparation instead of publishing a false ready
 * state with a broken material. Diagnostics run only on a driver-reported error. */
export function installShaderChecks(renderer){
 if(!renderer.debug)return;
 renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{
  const detail=[gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].filter(Boolean).join('\n');
  throw new Error('Graphics shader preparation failed: '+detail.slice(0,1800));
 };
}
