/** One intentional full rotation, no idle motion and no click-queue acceleration. */
export class LogoSpin {
 constructor(){this.angle=0;this.elapsed=0;this.active=false;this.duration=1.35;}
 request(reduced=false){if(reduced||this.active)return false;this.active=true;this.elapsed=0;return true;}
 update(delta,reduced=false){
  if(reduced){this.reset();return false;}
  if(!this.active||!Number.isFinite(delta)||delta<=0)return this.active;
  this.elapsed+=Math.min(delta,.1);const t=Math.min(1,this.elapsed/this.duration);
  const eased=t*t*t*(t*(t*6-15)+10);
  this.angle=Math.PI*2*eased;
  if(t===1)this.reset();
  return this.active;
 }
 reset(){this.angle=0;this.elapsed=0;this.active=false;}
}
