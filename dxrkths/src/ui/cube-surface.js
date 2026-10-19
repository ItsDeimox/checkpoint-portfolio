import {CubeEnergyField,cubePoint} from './cube-energy.js';
/** A face of the portfolio's unchanged closed wave graph. Keeping all six
 * faces preserves the edge transport and damping of the original effect. */
export class CubeSurface extends CubeEnergyField {
 constructor(){super(24);this.previous=null;this.face=4;this.span=[1,1];}
 setAspect(aspect){if(!Number.isFinite(aspect)||aspect<=0)aspect=1;this.span=aspect>=1?[1,1/aspect]:[Math.max(.1,aspect),1];}
 surfacePoint(x,y){return cubePoint(this.face,.5+(x-.5)*this.span[0],.5+(y-.5)*this.span[1]);}
 point(x,y,time){
  if(![x,y,time].every(Number.isFinite))return false;
  const p=this.surfacePoint(Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y))),last=this.previous;
  this.previous={p,time};
  if(!last){super.inject(p,.40);return true;}
  const distance=Math.hypot(...p.map((v,i)=>v-last.p[i]));
  if(distance>.003&&time>last.time){const speed=distance/Math.max(.008,(time-last.time)/1000);super.inject(p,Math.min(1.65,.20+speed*.14));return true;}
  return false;
 }
 release(){this.previous=null;}
 inject(x,y,strength=.40){super.inject(this.surfacePoint(x,y),strength);}
 clear(){this.release();this.reset();}
 total(){return this.glow.reduce((sum,n)=>sum+n,0);}
 activeCount(){return this.glow.reduce((sum,n)=>sum+Number(n>.001),0);}
}
