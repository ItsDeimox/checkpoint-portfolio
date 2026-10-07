export class Dynamics{
 constructor(){this.reset();}
 reset(){this.value=0;this.velocity=0;this.accumulator=0;}
 step(dt,target){this.accumulator+=Math.min(Math.max(dt,0),5/120);let steps=0;while(this.accumulator>=1/120-1e-10&&steps++<5){this.accumulator-=1/120;const force=(Math.max(-1,Math.min(1,target))*.065-this.value)*22-this.velocity*9.4;this.velocity+=force/120;this.value+=this.velocity/120;}return this.value;}
}
export class History{
 constructor(){this.valid=false;this.reason='startup';this.position=0;}
 invalidate(reason){this.valid=false;this.reason=reason;}
 accept(position){return this.valid&&Math.abs(position-this.position)<.8;}
 commit(position){this.valid=true;this.position=position;}
}
