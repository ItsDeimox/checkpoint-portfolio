/** Resolution presets favor controlled supersampling plus post AA over brute-force DPR. */
export function qualityProfile(name,mobile=false,dpr=1,pressure=0){
 const low=name==='low'||(name==='auto'&&pressure>=2),high=name==='high',ultra=name==='ultra';
 const scale=low?.78:mobile?1.0:ultra?Math.min(Math.max(dpr,1.38),1.50):high?Math.min(Math.max(dpr,1.20),1.32):pressure===1?.92:Math.min(Math.max(dpr,1.08),1.14);
 const memoryBudget=(mobile?72:ultra?384:high?288:224)*1024**2;
 const aaStrength=low?.68:mobile?.78:ultra?1:high?.96:.90;
 return {name,mobile,scale,shadow:low?512:ultra?2048:high?1536:1024,reflection:low?.25:ultra?.55:high?.48:.5,volume:low?.25:ultra?.50:high?.46:.5,steps:low?10:ultra?24:high?21:20,bloomLevels:5,motion:!low&&!mobile,probe:ultra?192:128,aaStrength,low,ultra,memoryBudget};
}
export function estimateBytes(width,height,p){const pixels=Math.ceil(width*p.scale)*Math.ceil(height*p.scale);return Math.ceil(pixels*(8*4+4+8+4*2+8*p.reflection**2+16*p.volume**2+8*2/3)+p.shadow**2*8+p.probe**2*6*8*1.34+4*1440*594*8);}
export class QualityGovernor{
 constructor(){this.pressure=0;this.accumulator=0;this.samples=[];this.cooldown=0;}
 sample(ms,dt,enabled){if(!enabled)return false;this.cooldown=Math.max(0,this.cooldown-dt);this.samples.push(ms);if(this.samples.length>90)this.samples.shift();this.accumulator+=dt;if(this.accumulator<4||this.cooldown||this.samples.length<40)return false;this.accumulator=0;const sorted=[...this.samples].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length*.5)],old=this.pressure;if(median>32)this.pressure=Math.min(2,this.pressure+1);else if(median<13)this.pressure=Math.max(0,this.pressure-1);if(old!==this.pressure){this.cooldown=8;return true;}return false;}
}
