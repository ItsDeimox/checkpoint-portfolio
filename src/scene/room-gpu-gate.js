import {yieldToBrowser} from './room-startup.js';

/** At most one submitted frame. Polling never waits inside the input/RAF task. */
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
