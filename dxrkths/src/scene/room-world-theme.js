import {Color} from 'three';
import {PAGE_THEMES,NEUTRAL_THEME,themeFor} from '../world-themes.js';

const within=(object,root)=>{for(let node=object;node;node=node.parent)if(node===root)return true;return false;};
const intensity=color=>Math.max(color.r,color.g,color.b);
const RED_TO_ACCENT=`
uniform vec3 dxtTheme;
vec3 dxtRecolor(vec3 source){
 float red=max(source.r-max(source.g,source.b)*1.1,0.);
 return max(vec3(0.),source-vec3(red,0.,0.))+dxtTheme*red;
}
`;
/** Patch once before the existing startup compiler. Hover changes uniforms only. */
function tintMaterial(material,uniform,panel=false){
 if(material.userData.dxtWorldTint)return;
 material.userData.dxtWorldTint=true;material.uniforms.dxtTheme=uniform;
 if(panel){
  const anchor='gl_FragColor=vec4(c,1.);';
  if(!material.fragmentShader.includes(anchor))throw Error('DXT panel color anchor changed');
  material.uniforms.dxtColorMix={value:0};material.uniforms.dxtBrightness={value:.54};
  material.fragmentShader=RED_TO_ACCENT+'uniform float dxtColorMix,dxtBrightness;\n'+material.fragmentShader.replace(anchor,
   'c=mix(vec3(dot(c,vec3(.299,.587,.114))),dxtRecolor(c),dxtColorMix)*dxtBrightness;'+anchor);
 }else{
  const end=material.fragmentShader.lastIndexOf('}');
  if(end<0)throw Error('DXT portal color anchor changed');
  material.fragmentShader=RED_TO_ACCENT+material.fragmentShader.slice(0,end)+'\ngl_FragColor.rgb=dxtRecolor(gl_FragColor.rgb);\n'+material.fragmentShader.slice(end);
 }
 material.needsUpdate=true;
}

export class RoomWorldTheme {
 constructor(view){
  this.view=view;this.color=new Color(NEUTRAL_THEME.hex);this.target=this.color.clone();
  this.scratch=new Color();this.uniform={value:this.color};this.level=.035;this.selected=-2;this.keyboard=-1;
  this.practicals=[];this.lights=[];this.smokes=[];this.panelTints=[];this.signal=new AbortController();
  for(const panel of view.panels){
   const tint={value:new Color(PAGE_THEMES[panel.index].hex)};
   tintMaterial(panel.material,tint,true);
   const cloned=new Map(),strips=[];
   panel.frame.traverse(object=>{
    const original=object.material;
    if(!original?.isMeshBasicMaterial||original.map||!original.color||intensity(original.color)<.3)return;
    let material=cloned.get(original);
    if(!material){material=original.clone();cloned.set(original,material);strips.push({material,base:intensity(original.color)});}
    object.material=material;
   });
   this.panelTints.push({panel,strips,color:new Color(NEUTRAL_THEME.hex),accent:new Color(PAGE_THEMES[panel.index].hex),weight:0,brightness:.54});
  }
  const seen=new Set();
  view.scene.traverse(object=>{
   if(view.carPivot&&within(object,view.carPivot))return;
   if(view.panels.some(panel=>within(object,panel.frame)))return;
   if(object.isLight&&object!==view.screenLight&&object.color.r>object.color.g*2&&object.color.r>object.color.b*1.5)
    this.lights.push({light:object,base:object.intensity});
   const material=object.material;
   if(!material?.isMeshBasicMaterial||material.map||!material.color||seen.has(material)||intensity(material.color)<.35)return;
   seen.add(material);this.practicals.push({material,base:Math.min(8,intensity(material.color))});
  });
  const portal=view.bannerPortal;
  tintMaterial(portal.fullMaterial,this.uniform);
  for(const object of portal.effects.group.children)tintMaterial(object.material,this.uniform);
  view.canvas?.addEventListener?.('pointermove',()=>{this.keyboard=-1;},{passive:true,signal:this.signal.signal});
  view.canvas?.addEventListener?.('pointerleave',()=>{this.keyboard=-1;},{passive:true,signal:this.signal.signal});
  this.update(1,true);
 }
 attachAtmosphere(){
  // Keep the real studio sources that define the car. Only the obstructing
  // volumetric cone is disabled, with no light-count/program churn on hover.
  for(const beam of this.view.beams??[])beam.visible=false;
  this.smokes=(this.view.smokes??[]).map(mesh=>mesh.material.uniforms.tint);
 }
 update(delta,snap=false){
  const view=this.view,portal=view.bannerPortal;
  const locked=portal?.active||portal?.interior;
  const index=locked?(portal.panel?.index??-1):view.hoverPanel>=0?view.hoverPanel:this.keyboard;
  const active=Number.isInteger(index)&&index>=0&&index<5;
  if(index!==this.selected){
   this.selected=index;this.target.set(themeFor(index).hex);
   view.host?.style?.setProperty?.('--room-accent',themeFor(index).hex);
   view.canvas?.ownerDocument?.body?.style?.setProperty?.('--room-accent',themeFor(index).hex);
   if(view.host?.dataset)view.host.dataset.world=themeFor(index).key;
  }
  const alpha=snap||view.reduced?.matches?1:1-Math.exp(-7*Math.max(0,Math.min(.1,Number.isFinite(delta)?delta:0)));
  const remaining=Math.abs(this.color.r-this.target.r)+Math.abs(this.color.g-this.target.g)+Math.abs(this.color.b-this.target.b);
  this.color.lerp(this.target,alpha);
  const goal=active?.65:.035,previous=this.level;this.level+=(goal-this.level)*alpha;
  let moving=remaining>.001||Math.abs(goal-this.level)>.001;
  for(const entry of this.practicals)entry.material.color.copy(this.color).multiplyScalar(entry.base*this.level);
  for(const entry of this.lights){entry.light.color.copy(this.color);entry.light.intensity=entry.base*(active?this.level:Math.max(.012,this.level*.5));}
  if(view.screenLight)view.screenLight.color.copy(this.color);
  for(const tint of this.smokes)if(tint?.value)tint.value.copy(this.color).multiplyScalar(.38);
  for(const entry of this.panelTints){
   const chosen=active&&entry.panel.index===index,target=chosen?1:0,brightness=active?(chosen?1.05:.10):.54;
   entry.weight+=(target-entry.weight)*alpha;entry.brightness+=(brightness-entry.brightness)*alpha;
   moving ||= Math.abs(target-entry.weight)>.001||Math.abs(brightness-entry.brightness)>.001;
   const uniforms=entry.panel.material.uniforms;uniforms.dxtColorMix.value=entry.weight;uniforms.dxtBrightness.value=entry.brightness;
   entry.color.set(NEUTRAL_THEME.hex).lerp(entry.accent,entry.weight);
   const power=active?(chosen?.76:.008):.025;
   for(const strip of entry.strips){const next=this.scratch.copy(entry.color).multiplyScalar(strip.base*power);strip.material.color.lerp(next,alpha);}
  }
  if(moving||Math.abs(previous-this.level)>.001)view.reflectionBudget?.invalidate();
  return moving;
 }
 focus(index){this.keyboard=Number.isInteger(index)&&index>=0&&index<5?index:-1;this.view.wake();}
 inspect(){return {selected:this.selected,color:this.color.getHexString(),intensity:this.level,overheadVolume:false};}
 dispose(){this.signal.abort();}
}
