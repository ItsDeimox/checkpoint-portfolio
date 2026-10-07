/** Presets bound framebuffer cost while keeping the same authored scene. */
export function qualityProfile(name,mobile=false,dpr=1,pressure=0){
 const low=name==='low'||(name==='auto'&&pressure>=2),high=name==='high';
 return {name,mobile,scale:Math.min(dpr,low?.75:mobile?1:high?1.5:pressure===1?.90:1),shadow:low?512:high?2048:1024,reflection:low?.25:.5,volume:low?.25:.5,steps:low?10:24,bloomLevels:5,motion:!low&&!mobile,probe:128,low,memoryBudget:(mobile?72:192)*1024**2};
}
export function estimateBytes(width,height,p){const pixels=Math.ceil(width*p.scale)*Math.ceil(height*p.scale);return Math.ceil(pixels*(8*4+4+8+4*2+8*p.reflection**2+16*p.volume**2+8*2/3)+p.shadow**2*8+p.probe**2*6*8*1.34+4*1200*495*8);}
export class QualityGovernor{
 constructor(){this.pressure=0;this.accumulator=0;this.samples=[];this.cooldown=0;}
 sample(ms,dt,enabled){if(!enabled)return false;this.cooldown=Math.max(0,this.cooldown-dt);this.samples.push(ms);if(this.samples.length>90)this.samples.shift();this.accumulator+=dt;if(this.accumulator<4||this.cooldown||this.samples.length<40)return false;this.accumulator=0;const sorted=[...this.samples].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length*.5)],old=this.pressure;if(median>32)this.pressure=Math.min(2,this.pressure+1);else if(median<13)this.pressure=Math.max(0,this.pressure-1);if(old!==this.pressure){this.cooldown=8;return true;}return false;}
}
