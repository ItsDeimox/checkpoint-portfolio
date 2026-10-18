import {Color,MathUtils} from 'three';
import {DESTINATION_THEMES} from '../pages/destination-data.js';

const neutral=new Color('#eef4ff');
const isRed=color=>color&&color.r>color.g*3&&color.r>color.b*2;
/** Bind authored emitters once; all subsequent interaction changes uniforms.
 * Car materials are deliberately outside the set (no recoloring, no clones). */
export class RoomIdentity {
 constructor(view){
  this.view=view;this.selected=null;this.color=neutral.clone();this.strength=.035;this.emitters=[];this.lights=[];this.cards=[];this.reflectionTime=0;
  const panelObjects=new Set();
  for(const [index,panel] of view.panels.entries()){
   const tint=new Color(DESTINATION_THEMES[index].color),materials=new Map();
   panel.frame.traverse(object=>{
    panelObjects.add(object);
    if(!object.material?.isMeshBasicMaterial||!isRed(object.material.color))return;
    const original=object.material;
    if(!materials.has(original)){const copy=original.clone();copy.userData.destinationEmitter=true;materials.set(original,copy);}
    object.material=materials.get(original);
   });
   const u=panel.material.uniforms;
   u.cardAccent={value:tint};u.cardLevel={value:.68};
   let shader=panel.material.fragmentShader;
   shader='uniform vec3 cardAccent;uniform float cardLevel;\n'+shader;
   shader=shader.replace('vec3(2.65,.018,.058)','cardAccent*2.65').replace('vec3(.34,.002,.014)','cardAccent*.34');
   shader=shader.replace('gl_FragColor=vec4(c,1.);',`float cardGray=dot(c,vec3(.2126,.7152,.0722));
    c=mix(vec3(cardGray),c,.16+.84*hover)*cardLevel;
    gl_FragColor=vec4(c,1.);`);
   panel.material.fragmentShader=shader;panel.material.needsUpdate=true;
   this.cards.push({panel,tint,materials:[...materials.values()],level:.68,glow:.08});
  }
  const seen=new Set();
  view.scene.traverse(object=>{
   if(panelObjects.has(object))return;
   if(object.isLight&&object!==view.screenLight&&isRed(object.color)){
    object.userData.destinationEmitter=true;this.lights.push({object,intensity:object.intensity});
   }
   for(const material of [object.material].flat().filter(Boolean)){
    if(!material.isMeshBasicMaterial||seen.has(material)||!isRed(material.color))continue;
    seen.add(material);material.userData.destinationEmitter=true;
    this.emitters.push({material,intensity:Math.max(material.color.r,material.color.g,material.color.b)});
   }
  });
  this.update(0,true);
 }
 update(delta,reduced=this.view.reduced?.matches){
  const v=this.view,portal=v.bannerPortal;
  const selected=portal?.active?portal.panel?.index:Number.isInteger(v.hoverPanel)&&v.hoverPanel>=0?v.hoverPanel:null;
  this.selected=selected;
  const target=selected===null?neutral:this.cards[selected]?.tint??neutral;
  const dt=MathUtils.clamp(Number.isFinite(delta)?delta:0,0,.1),alpha=reduced?1:1-Math.exp(-dt*8);
  this.color.lerp(target,alpha);this.strength=MathUtils.lerp(this.strength,selected===null?.035:.62,alpha);
  for(const {material,intensity} of this.emitters)material.color.copy(this.color).multiplyScalar(intensity*this.strength);
  for(const {object,intensity} of this.lights){object.color.copy(this.color);object.intensity=intensity*this.strength;}
  v.screenLight?.color.copy(this.color);
  for(const entry of this.cards){
   const active=entry.panel.index===selected;
   entry.level=MathUtils.lerp(entry.level,selected===null?.68:active?1:.12,alpha);
   entry.glow=MathUtils.lerp(entry.glow,selected===null?.08:active?3.9:.015,alpha);
   entry.panel.material.uniforms.cardLevel.value=entry.level;
   for(const [i,m] of entry.materials.entries())m.color.copy(active?entry.tint:neutral).multiplyScalar(entry.glow*(i===0?.22:1));
  }
  if(portal){
   if(portal.effects?.uniforms?.burstTint)portal.effects?.uniforms?.burstTint.value.copy(target);
   if(portal.shutter?.uniforms?.uAccent)portal.shutter?.uniforms?.uAccent.value.copy(target);
  }
  const moving=this.color.distanceTo?.(target)??Math.abs(this.color.r-target.r)+Math.abs(this.color.g-target.g)+Math.abs(this.color.b-target.b);
  this.reflectionTime+=dt;
  if(this.reflectionTime>.12&&moving>.002){v.reflectionBudget?.invalidate();this.reflectionTime=0;}
  const theme=selected===null?'238 244 255':DESTINATION_THEMES[selected].rgb;
  if(theme!==this.lastTheme){v.host?.style?.setProperty('--showroom-accent-rgb',theme);v.host?.ownerDocument?.body?.style.setProperty('--scene-ui-accent-rgb',theme);this.lastTheme=theme;}
  return moving>.002||Math.abs(this.strength-(selected===null?.035:.62))>.002;
 }
}
