/** Bounded budgets, not a device-name allowlist. No FPS inference from idle frames. */
export function qualityProfile({width=1280,dpr=1,memory=8,cores=8,mode='auto'}={}) {
  const requested=mode==='eco'?'low':mode;
  const automatic=memory<=4||cores<=4?'low':width<900?'medium':'high';
  const tier=['low','medium','high'].includes(requested)?requested:automatic;
  const presets={
    low:{dpr:1.0,reflectionSize:256,bloom:false,bloomScale:0,bloomStrength:0,anisotropy:2},
    medium:{dpr:1.25,reflectionSize:512,bloom:true,bloomScale:.75,bloomStrength:.28,anisotropy:8},
    high:{dpr:1.75,reflectionSize:768,bloom:true,bloomScale:1,bloomStrength:.34,anisotropy:16},
  };
  return {...presets[tier],tier,low:tier==='low',dpr:Math.max(.5,Math.min(Number(dpr)||1,presets[tier].dpr))};
}
/** Hysteresis: only sustained active-frame overruns may lower automatic quality. */
export class FrameBudget {
  constructor(){this.samples=[];this.cooldown=0;}
  sample(ms,tier,now){
    if(now<this.cooldown||!Number.isFinite(ms)||ms<1||ms>250)return null;
    this.samples.push(ms);if(this.samples.length<90)return null;
    const ordered=this.samples.sort((a,b)=>a-b),p75=ordered[Math.floor(ordered.length*.75)];this.samples=[];
    if(p75>38&&tier!=='low'){this.cooldown=now+15000;return tier==='high'?'medium':'low';}return null;
  }
  reset(){this.samples=[];this.cooldown=0;}
}
