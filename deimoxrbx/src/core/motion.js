export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export const smoother=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export const lerp=(a,b,t)=>a+(b-a)*t;
export const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*Math.max(0,dt)));
export const wrap=(n,c)=>(n%c+c)%c;
function backOut(t){const c=1.16;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);}
/** Finite transitions: no overlapping wheel, focus or close animations. */
export class GalleryMotion {
 constructor(count,reduced=false){if(count<1)throw new RangeError('A galeria precisa de um par.');this.count=count;this.reduced=reduced;this.index=0;this.phase='idle';this.elapsed=0;this.rotation=0;this.turns=0;this.cardOffset=0;this.focusAmount=0;this.selected=-1;this.changed=false;this.generation=0;}
 advance(direction){if(this.phase!=='idle')return false;this.direction=direction<0?-1:1;this.phase='transition';this.elapsed=0;this.changed=false;this.fromRotation=this.rotation;this.turns+=this.direction;return true;}
 focus(side){if(this.phase!=='idle'||![0,1].includes(side))return false;this.selected=side;this.phase='focusing';this.elapsed=0;return true;}
 close(){if(!['focused','focusing'].includes(this.phase))return false;this.fromFocus=this.focusAmount;this.phase='closing';this.elapsed=0;return true;}
 update(dt){this.elapsed+=Math.max(0,Math.min(dt,.1));
  if(this.phase==='transition'){
   const t=this.reduced?1:clamp(this.elapsed/1.45);
   this.rotation=lerp(this.fromRotation,this.turns*Math.PI/2,backOut(t));
   if(t<.5)this.cardOffset=-5*smoother(t*2);else{if(!this.changed){this.index=wrap(this.index+this.direction,this.count);this.changed=true;this.generation++;}this.cardOffset=-5*(1-smoother((t-.5)*2));}
   if(t===1){this.phase='idle';this.cardOffset=0;this.rotation=this.turns*Math.PI/2;}
  } else if(this.phase==='focusing'){
   const t=this.reduced?1:clamp(this.elapsed/1.05);this.focusAmount=smoother(t);if(t===1)this.phase='focused';
  } else if(this.phase==='closing'){
   const t=this.reduced?1:clamp(this.elapsed/.95);this.focusAmount=this.fromFocus*(1-smoother(t));if(t===1){this.phase='idle';this.selected=-1;}
  }
 }
}
