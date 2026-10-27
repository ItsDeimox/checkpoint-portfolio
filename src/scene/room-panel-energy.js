import {DataTexture,FloatType,RGBAFormat,NearestFilter,Vector2} from 'three';
import {PanelEnergyField} from './panel-energy-field.js';
import {PANEL_NETWORK_GLSL} from '../shaders/panel-network.js';

/** The physical cards own a planar chevron material. The separate Play Now
 * cube, artwork, scene geometry and navigation keep their existing resources. */
export class RoomPanelEnergy {
 constructor(view){
  this.view=view;this.entries=view.panels.map(panel=>{
   const aspect=panel.corners[0].distanceTo(panel.corners[1])/panel.corners[0].distanceTo(panel.corners[3]);
   const field=new PanelEnergyField(aspect),texture=new DataTexture(field.data,field.textureWidth,field.textureHeight,RGBAFormat,FloatType);
   texture.name=`DXT.PanelEnergy.${panel.index}`;texture.minFilter=texture.magFilter=NearestFilter;texture.needsUpdate=true;
   const m=panel.material;
   Object.assign(m.uniforms,{uEnergyMap:{value:texture},uEnergyActive:{value:0},uReduced:{value:0},uPanelGrid:{value:new Vector2(...field.grid)}});
   m.fragmentShader='varying vec2 vUv;\n'+PANEL_NETWORK_GLSL+'\n'+m.fragmentShader.replace('varying vec2 vUv;','');
   m.fragmentShader=m.fragmentShader.replace('p+holoWarp(p)','p');
   m.fragmentShader=m.fragmentShader.replace('c += holoLight(p);',`vec2 panelWave=panelNetwork(vUv);
    vec3 panelTint=mix(vec3(.80,.92,1.),cardAccent,.60);
    c+=mix(panelTint,cardAccent,.70)*(panelWave.x*.42+panelWave.y*.46)*(1.-portalMix);`);
   m.needsUpdate=true;return{panel,field,texture,version:field.version};
  });
  this.selected=-1;
 }
 point(index,uv,time){
  if(this.view.settings?.quality==='low'||this.view.cameraRig?.mode!=='overview'||this.view.bannerPortal?.active||this.view.bannerPortal?.interior||this.view.reduced?.matches){this.release();return;}
  if(index!==this.selected){this.entries[this.selected]?.field.release();this.selected=index;}
  if(index<0||!uv||!Number.isFinite(time))return;
  this.entries[index]?.field.point(uv.x,uv.y,time);
 }
 update(dt){
  const reduced=!!this.view.reduced?.matches;
  const hidden=this.view.settings?.quality==='low'||this.view.bannerPortal?.active||this.view.bannerPortal?.interior||reduced;
  if(hidden)this.release();
  let moving=false;
  for(let i=0;i<this.entries.length;i++){
   const entry=this.entries[i],field=entry.field,u=entry.panel.material.uniforms;
   u.uReduced.value=reduced?1:0;
   if(hidden){if(field.awake)field.clear();}
   else if(field.awake)field.step(dt);
   if(entry.version!==field.version){entry.texture.needsUpdate=true;entry.version=field.version;}
   u.uEnergyActive.value=field.awake?1:0;moving ||= field.awake;
  }
  return moving;
 }
 release(){this.entries[this.selected]?.field.release();this.selected=-1;}
 prime(){
  for(let i=0;i<this.entries.length;i++){
   const e=this.entries[i];e.field.inject(.5,.5,.4);e.field.step(1/30);
   e.texture.needsUpdate=true;e.version=e.field.version;e.panel.material.uniforms.uEnergyActive.value=1;
  }
 }
 clear(){
  this.release();
  for(let i=0;i<this.entries.length;i++){
   const e=this.entries[i];e.field.clear();
   if(e.version!==e.field.version){e.texture.needsUpdate=true;e.version=e.field.version;}
   e.panel.material.uniforms.uEnergyActive.value=0;
  }
 }
 dispose(){this.release();for(let i=0;i<this.entries.length;i++)this.entries[i].texture.dispose();this.entries.length=0;}
}
