const clamp=value=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
/** Temporary per-frame modulation of existing sources, restored even on render failure. */
export class MusicLights {
 constructor(view){
  this.view=view;this.lights=[];this.materials=[];this.active=false;
  const seen=new Set();
  view.scene.traverse(object=>{
   const color=object.color;
   if(object.isLight&&object!==view.screenLight&&color?.r>color.g*3&&color.r>color.b*2)this.lights.push({light:object,base:object.intensity});
   if(!object.isMesh)return;
   for(const material of [object.material].flat()){
    if(!material?.isMeshBasicMaterial||seen.has(material))continue;seen.add(material);
    const c=material.color;if(c.r>.5&&c.r>c.g*4&&c.r>c.b*3)this.materials.push({material,base:c.clone()});
   }
  });
 }
 apply(levels,strength){
  if(this.active)this.restore();
  const amount=clamp(strength),bass=clamp(levels?.bass)*amount,high=clamp(levels?.treble)*amount;
  if(bass===0&&high===0)return;
  this.active=true;
  for(const entry of this.lights){entry.base=entry.light.intensity;entry.light.intensity=entry.base*(1+bass*.65);}
  for(const entry of this.materials){entry.base.copy(entry.material.color);entry.material.color.multiplyScalar(1+bass*.48+high*.08);}
  this.bloom=this.view.optics.gradePass.uniforms.uBloomStrength;this.baseBloom=this.bloom.value;
  this.bloom.value=this.baseBloom*(1+bass*.24+high*.05);
  for(const panel of this.view.panels)if(panel.material.uniforms.musicTreble)panel.material.uniforms.musicTreble.value=high;
 }
 restore(){
  if(!this.active)return;
  for(const entry of this.lights)entry.light.intensity=entry.base;
  for(const entry of this.materials)entry.material.color.copy(entry.base);
  this.bloom.value=this.baseBloom;
  for(const panel of this.view.panels)if(panel.material.uniforms.musicTreble)panel.material.uniforms.musicTreble.value=0;
  this.active=false;
 }
}
