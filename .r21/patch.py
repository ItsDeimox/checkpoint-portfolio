from pathlib import Path
root=Path('dxrkths'); sources=Path('.r21/sources')
def edit(p,fn):
 f=root/p; s=f.read_text(); f.write_text(fn(s))
def once(s,a,b):
 if s.count(a)!=1: raise RuntimeError('Expected one anchor: '+a[:100])
 return s.replace(a,b)
for p in ['src/scene/room-portal-exit.js','src/scene/room-portal-shader.js','src/ui/room-section-routes.js']:
 (root/p).write_text((sources/Path(p).name).read_text())

def portal(s):
 s="import {yieldToBrowser} from './room-startup.js';\n"+s
 s=once(s,'PORTAL_FLIGHT_SECONDS=1.15','PORTAL_FLIGHT_SECONDS=2.05')
 s=once(s,'portalExitDepth:{value:28}', 'portalTunnelEnd:{value:18},portalExitDepth:{value:28}')
 a=s.index(' async prepare(){');b=s.index(' attachOptics(',a)
 s=s[:a]+''' async prepare(signal){
  const {renderer,camera,optics}=this.view;
  if(!optics?.sceneTarget)return;
  signal?.throwIfAborted();this.attachOptics(optics);
  const warm=camera.clone(),basis=portalBasis(this.view.panels[0]),pose=portalTravelPose(basis,.5);
  warm.position.copy(pose.position);warm.quaternion.copy(pose.rotation);warm.fov=pose.fov;
  warm.updateProjectionMatrix();warm.updateMatrixWorld(true);
  const f=projectPortalExit(warm,basis,portalTravelPose(basis,1),{width:900,height:600,contentWidth:900});
  const u=this.fullMaterial.uniforms;u.portalTunnelEnd.value=f.tunnelEndDepth;u.portalExitDepth.value=f.exitDepth;
  u.portalExitHalf.value.fromArray(f.exitHalf);u.portalInverseProjection.value.copy(warm.projectionMatrixInverse);u.portalCameraWorld.value.copy(warm.matrixWorld);
  const old=renderer.getRenderTarget(),viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4()),test=renderer.getScissorTest();
  try{
   renderer.setRenderTarget(optics.sceneTarget);
   await renderer.compileAsync(this.fullScene,warm,this.fullScene);signal?.throwIfAborted();
   // Upload the actual fullscreen geometry and exercise the HDR program before
   // the site unlocks interaction, not on the first click in the tunnel.
   renderer.setViewport(0,0,4,4);renderer.setScissor(0,0,4,4);renderer.setScissorTest(true);
   renderer.render(this.fullScene,warm);
  }finally{renderer.setRenderTarget(old);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(test);}
  const gl=renderer.getContext(),fence=gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
  if(fence){
   gl.flush();try{for(let i=0;i<180;i++){signal?.throwIfAborted();const status=gl.clientWaitSync(fence,0,0);if(status!==gl.TIMEOUT_EXPIRED)break;await yieldToBrowser(signal);}}
   finally{gl.deleteSync(fence);}
  }
  this.prepared=true;await yieldToBrowser(signal);
 }
''' + s[b:]
 s=once(s,'u.portalExitOffset.value=frame.exitOffset;', 'u.portalExitOffset.value=frame.exitOffset;u.portalTunnelEnd.value=frame.tunnelEndDepth;')
 s=once(s,' returnToShowroom(index,onComplete){', ' returnToShowroom(index,onComplete,onProgress=null,getArrivalViewport=null){')
 s=once(s,'this.onComplete=onComplete;this.onProgress=null;panel.portalUniforms.portalReturn.value=1;', 'this.onComplete=onComplete;this.onProgress=onProgress;this.getArrivalViewport=getArrivalViewport;panel.portalUniforms.portalReturn.value=1;')
 s=once(s,'  this.syncReturnEffects();v.optics.resetHistory();v.wake();return true;', '  this.syncReturnEffects();this.onProgress?.(1,this.sampleExit());v.optics.resetHistory();v.wake();return true;')
 s=once(s,'  v.camera.updateMatrixWorld(true);this.syncReturnEffects();return true;', '  v.camera.updateMatrixWorld(true);this.syncReturnEffects();this.onProgress?.(u.portalProgress.value,this.sampleExit());return true;')
 s=s.replace('this.view.cameraRig.transition=null;this.onComplete=null;this.effects.dispose();','this.view.cameraRig.transition=null;this.onComplete=null;this.onProgress=null;this.getArrivalViewport=null;this.effects.dispose();')
 return s
edit('src/scene/room-portal.js',portal)
def scene(s):
 s=once(s,' async prepareEnvironment(signal){await super.prepareEnvironment(signal);signal.throwIfAborted();await this.bannerPortal.prepare();}', '')
 s=once(s,' returnPortal(index,onComplete){', ' returnPortal(index,onComplete,onProgress,getArrivalViewport){')
 s=once(s,'this.bannerPortal.returnToShowroom(index,onComplete)', 'this.bannerPortal.returnToShowroom(index,onComplete,onProgress,getArrivalViewport)')
 s=s.replace('  // Paint the dark end of the corridor before the outgoing HTML page fades away.', '  // The page remains on the world wall as the camera retreats into the tunnel.')
 s=s.replace(' resize(){super.resize();', ''' updatePanels(dt){if(this.bannerPortal?.active&&this.bannerPortal.interior)return false;return super.updatePanels(dt);}
 updateAtmosphere(){if(!this.bannerPortal?.active||!this.bannerPortal.interior)super.updateAtmosphere();}
 updateLinkProjection(){if(!this.bannerPortal?.active)super.updateLinkProjection();}
 resize(){super.resize();''')
 return s
edit('src/scene/room-portal-scene.js',scene)
edit('src/scene/room-scene.js',lambda s:once(s,'    this.startup.preparation = await this.preparation;', '    this.startup.preparation = await this.preparation;\n    await this.bannerPortal?.prepare(signal);'))
edit('src/ui/portal-arrival.js',lambda s:s+'''
/** Tunnel occlusion in the same source coordinate system as arrivalTransform. */
export function arrivalClip(frame){
 if(!frame?.clip)return 'none';
 const [left,top,right,bottom]=frame.clip;
 if(left===0&&top===0&&right===1&&bottom===1)return 'none';
 return `inset(${top*100}% ${(1-right)*100}% ${(1-bottom)*100}% ${left*100}%)`;
}
''')
edit('src/styles-sections.css',lambda s:s+'''

/* A single page surface recedes onto the far wall on return. No independent
 * depart fade/scale and no opacity animation covering the illuminated corridor. */
body.section-arriving .section-page,
body.section-returning.section-arriving .section-page,
body.section-return-pending.section-arriving .section-page {
 animation: none;
 top: 0;
 transform-origin: 0 0;
 will-change: transform,clip-path;
}
body.section-arriving .section-page { opacity: 0; }
body.section-retreating .section-page { opacity: 1; }
body.section-arriving .section-layout { animation: none; }
''')
def test_end(s):
 s=s.replace("corridor ends at the same physical plane instead of continuing behind the page", "corridor and larger page wall expose separate physical depth planes")
 s=s.replace("assert.ok(extent(shot(i,0))<.14);assert.ok(extent(shot(i,.5))<.35);assert.ok(extent(shot(i,.8))>.6);", "assert.ok(extent(shot(i,0))<.55);assert.ok(extent(shot(i,.5))>.3);assert.ok(extent(shot(i,.8))>.6);")
 a=s.index(" test('world exit fits inside the corridor opening")
 b=s.index(" test('invalid viewport",a)
 s=s[:a]+" test('wall is behind the finite tunnel, not fitted inside its aperture',()=>{for(let i=0;i<5;i++)for(const [w,h]of[[1440,900],[390,844],[1920,600]]){const f=shot(i,.5,w,h,w-15);assert.ok(f.exitDepth>f.tunnelEndDepth);assert.ok(f.clip);}});\n"+s[b:]
 return s
edit('tests/portal-end-plane.test.mjs',test_end)
for f in (root/'tests').glob('*.test.mjs'):
 s=f.read_text()
 if 'portal' in f.name or 'journey' in s:
  s=s.replace('i<160;i++','i<260;i++')
  f.write_text(s)
edit('tests/portal-arrival.test.mjs',lambda s:s.replace('shader darkness is isolated to the preserved reverse path, never the incoming path','portal direction state resets when returning and starting another journey'))
edit('tools/build.mjs',lambda s:s.replace("'dxt-showroom-r20-exit-plane'","'dxt-showroom-r21-wall'"))
edit('tests/entrypoints.test.mjs',lambda s:s.replace("'dxt-showroom-r20-exit-plane'","'dxt-showroom-r21-wall'"))
print('R21 physical wall, symmetric return, cached DOM projection and prewarm applied')
