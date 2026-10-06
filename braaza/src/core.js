export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=(v,n)=>((v%n)+n)%n;
export const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*Math.max(0,dt)));
export const slotY=(i,position,count=4)=>1.7+wrap(i+position,count)*2.40;
export const chainOffset=(position,side)=>position===0?0:position*2.55*(side<0?1:-1);
export const dragGesture=(x,y)=>Math.hypot(x,y)>7;
export class Motion{
 constructor(count){this.count=count;this.value=0;this.target=0;this.velocity=0;}
 reset(){this.value=0;this.target=0;this.velocity=0;}
 advance(delta){if(Number.isFinite(delta))this.target+=clamp(delta,-3,3);}
 step(dt,reduced=false){
  if(reduced){this.value=this.target;this.velocity=0;return;}
  dt=clamp(dt,0,.05);const old=this.value;this.value=damp(this.value,this.target,9,dt);
  this.velocity=dt>0?clamp((this.value-old)/dt,-25,25):0;
  if(Math.abs(this.target-this.value)<1e-5){this.value=this.target;this.velocity=0;}
  if(Math.abs(this.value)>1000){const shift=Math.floor(this.value/this.count)*this.count;this.value-=shift;this.target-=shift;}
 }
}
export function random(seed=7){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function viewMatrix(eye,target){
 const norm=v=>{const d=Math.hypot(...v);return v.map(x=>x/d);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
