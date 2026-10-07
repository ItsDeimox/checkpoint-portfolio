/** Presets bound framebuffer cost while keeping the same authored scene. */
export function qualityProfile(name,mobile=false,dpr=1,pressure=0){
 const low=name==='low'||(name==='auto'&&pressure>=2),high=name==='high',ultra=name==='ultra';
 const scale=low?.75:mobile?1:ultra?Math.min(Math.max(dpr,2),2):high?Math.min(Math.max(dpr,1.45),1.6):pressure===1?.90:Math.min(dpr,1);
 const memoryBudget=(mobile?72:ultra?512:high?256:192)*1024**2;
 return {name,mobile,scale,shadow:low?512:ultra?3072:high?2048:1024,reflection:low?.25:ultra?.65:.5,volume:low?.25:ultra?.6:.5,steps:low?10:ultra?28:24,bloomLevels:5,motion:!low&&!mobile,probe:ultra?256:128,low,ultra,memoryBudget};
}
export function estimateBytes(width,height,p){const pixels=Math.ceil(width*p.scale)*Math.ceil(height*p.scale);return Math.ceil(pixels*(8*4+4+8+4*2+8*p.reflection**2+16*p.volume**2+8*2/3)+p.shadow**2*8+p.probe**2*6*8*1.34+4*1200*495*8);}
export class QualityGovernor{
 constructor(){this.pressure=0;this.accumulator=0;this.samples=[];this.cooldown=0;}
 sample(ms,dt,enabled){if(!enabled)return false;this.cooldown=Math.max(0,this.cooldown-dt);this.samples.push(ms);if(this.samples.length>90)this.samples.shift();this.accumulator+=dt;if(this.accumulator<4||this.cooldown||this.samples.length<40)return false;this.accumulator=0;const sorted=[...this.samples].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length*.5)],old=this.pressure;if(median>32)this.pressure=Math.min(2,this.pressure+1);else if(median<13)this.pressure=Math.max(0,this.pressure-1);if(old!==this.pressure){this.cooldown=8;return true;}return false;}
}
