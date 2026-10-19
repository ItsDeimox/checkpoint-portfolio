import {DataTexture,FloatType,RGBAFormat,NearestFilter,Vector2} from 'three';
import {CubeSurface} from '../ui/cube-surface.js';
import {PANEL_FLOW_GLSL} from '../shaders/panel-flow.js';
import {CursorWake} from './room-cursor-wake.js';

/** The existing wave solver shades a continuous cursor wake on each card.
 * Input history stays on the physical surface; rendering ownership is unchanged. */
export class RoomPanelEnergy {
 constructor(view){
  this.view=view;this.entries=view.panels.map(panel=>{
   const field=new CubeSurface(),wake=new CursorWake(),texture=new DataTexture(field.data,field.textureWidth,field.textureHeight,RGBAFormat,FloatType);
   texture.name=`DXT.CubeEnergy.${panel.index}`;texture.minFilter=texture.magFilter=NearestFilter;texture.needsUpdate=true;
   field.setAspect(panel.corners[0].distanceTo(panel.corners[1])/panel.corners[0].distanceTo(panel.corners[3]));
   const m=panel.material;
   Object.assign(m.uniforms,{uEnergyMap:{value:texture},uEnergySize:{value:field.size},uEnergyActive:{value:0},uReduced:{value:0},uSurfaceSpan:{value:new Vector2(...field.span)},uWakePoints:{value:wake.data},uWakeCount:{value:0}});
   m.fragmentShader='varying vec2 vUv;uniform vec2 uSurfaceSpan;\n'+PANEL_FLOW_GLSL+'\n'+m.fragmentShader.replace('varying vec2 vUv;','');
   m.fragmentShader=m.fragmentShader.replace('p+holoWarp(p)','p');
   m.fragmentShader=m.fragmentShader.replace('c += holoLight(p);',`vec2 flow=flowTrail(vUv,uSurfaceSpan);
    vec3 flowTint=mix(vec3(.78,.91,1.),cardAccent,.85);
    c+=flowTint*(flow.x+flow.y)*(1.-portalMix);`);
   m.needsUpdate=true;return{panel,field,wake,texture,version:field.version};
  });
  this.selected=-1;
 }
 point(index,uv,time){
  if(this.view.cameraRig?.mode!=='overview'||this.view.bannerPortal?.active||this.view.reduced?.matches){this.release();return;}
  if(index!==this.selected){this.release();this.selected=index;}
  if(index<0||!uv)return;
  if(!Number.isFinite(time))return;
  const entry=this.entries[index];if(!entry)return;
  entry.field.point(uv.x,uv.y,time);entry.wake.point(uv.x,uv.y);
 }
 update(dt){
  // Once navigation owns the surface, no hover is visible. Stop the five
  // closed wave graphs instead of simulating/uploading them inside the tunnel.
  if(this.view.bannerPortal?.active||this.view.bannerPortal?.interior){
   this.release();
   for(const {panel,field,wake,texture}of this.entries){
    if(field.awake){field.clear();texture.needsUpdate=true;}
    wake.clear();panel.material.uniforms.uWakeCount.value=0;
    panel.material.uniforms.uEnergyActive.value=0;
   }
   return false;
  }
  let moving=false;
  for(const {panel,field,wake,texture} of this.entries){
   const u=panel.material.uniforms;
   u.uReduced.value=this.view.reduced?.matches?1:0;
   const version=field.version;
   if(this.view.reduced?.matches){if(field.awake)field.clear();wake.clear();}
   field.step(dt);
   if(version!==field.version)texture.needsUpdate=true;
   wake.step(dt);u.uWakeCount.value=wake.count;
   u.uEnergyActive.value=field.awake||wake.count?1:0;moving ||= field.awake||wake.count>0;
  }
  return moving;
 }
 release(){const e=this.entries[this.selected];e?.field.release();e?.wake.release();this.selected=-1;}
 prime(){for(const e of this.entries){e.wake.point(.5,.5);e.panel.material.uniforms.uWakeCount.value=e.wake.count;e.field.inject(.5,.5,.4);e.field.step(1/30);e.texture.needsUpdate=true;e.panel.material.uniforms.uEnergyActive.value=1;}}
 clear(){this.release();for(const e of this.entries){e.wake.clear();e.panel.material.uniforms.uWakeCount.value=0;e.field.clear();e.texture.needsUpdate=true;e.panel.material.uniforms.uEnergyActive.value=0;}}
 dispose(){for(const e of this.entries)e.texture.dispose();this.entries.length=0;}
}
