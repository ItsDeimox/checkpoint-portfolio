from pathlib import Path
r=Path('dxrkths')
p=r/'src/scene/room-portal.js';s=p.read_text()
if ' async prepareScene(' not in s:
 s=s.replace(' attachOptics(optics){',''' async prepareScene(signal){
  if(this.scenePrepared)return;
  const v=this.view,c=v.camera,panel=v.panels[0];
  const saved={position:c.position.clone(),rotation:c.quaternion.clone(),fov:c.fov,focus:v.cameraRig.focusTarget.clone()};
  this.panel=panel;this.basis=portalBasis(panel);
  try{
   signal?.throwIfAborted();
   this.active=true;this.returning=false;this.interior=false;this.stage='flight';this.age=PORTAL_APPROACH_SECONDS;
   const pose=portalTravelPose(this.basis,0);c.position.copy(pose.position);c.quaternion.copy(pose.rotation);v.cameraRig.setFov(pose.fov);c.updateMatrixWorld(true);
   this.sampleExit();this.syncReturnEffects();
   // Exercise the portal-enabled banner in the REAL scene pipeline while the
   // entry gate is still closed. Driver work for this path must not hit click.
   v.render(1/60,0);
  }finally{
   this.active=false;this.returning=false;this.interior=false;this.stage='idle';this.effects.reset();this.shutter.reset();
   panel.portalUniforms.portalMix.value=0;panel.portalUniforms.portalProgress.value=0;panel.portalUniforms.portalSpeed.value=0;panel.portalUniforms.portalOpening.value=0;
   c.position.copy(saved.position);c.quaternion.copy(saved.rotation);v.cameraRig.setFov(saved.fov);v.cameraRig.focusTarget.copy(saved.focus);c.updateMatrixWorld(true);
   v.optics.resetHistory();v.renderer.shadowMap.needsUpdate=true;
   if(!signal?.aborted)v.render(1/60,0);
  }
  const gl=v.renderer.getContext(),fence=gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
  if(fence){gl.flush();try{for(let i=0;i<180;i++){signal?.throwIfAborted();if(gl.clientWaitSync(fence,0,0)!==gl.TIMEOUT_EXPIRED)break;await yieldToBrowser(signal);}}finally{gl.deleteSync(fence);}}
  this.panel=null;this.basis=null;this.exitFrame=null;this.scenePrepared=true;await yieldToBrowser(signal);
 }
 attachOptics(optics){''')
 p.write_text(s)
p=r/'src/scene/room-scene.js';s=p.read_text();s=s.replace('    // First geometry upload and shadow draw stay behind the loading state.','    await this.bannerPortal?.prepareScene(signal);\n    // First geometry upload and shadow draw stay behind the loading state.');p.write_text(s)
