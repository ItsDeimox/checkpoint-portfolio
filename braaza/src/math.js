/** Deterministic carousel/camera mathematics. Matrices are column-major. */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a,b,t) => a+(b-a)*t;
export const smoothstep = (a,b,x) => {const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
export const wrap = (value,count) => ((value%count)+count)%count;
export const wrapDelta = (index,position,count) => wrap(index-position+count/2,count)-count/2;
export const damp = (current,target,rate,dt) => lerp(current,target,1-Math.exp(-rate*Math.max(0,dt)));
export class CarouselMotion {
 constructor(count) {this.count=count;this.position=0;this.target=0;this.velocity=0;this.dragging=false;}
 get index(){return wrap(Math.round(this.position),this.count)}
 moveBy(step){this.target=Math.round(this.target)+step;}
 goTo(index){this.target=this.position+wrapDelta(index,this.position,this.count);}
 begin(){this.dragging=true;this.target=this.position;this.velocity=0;}
 drag(delta){this.target+=delta;}
 release(velocity=0){this.dragging=false;this.target=Math.round(this.target+clamp(velocity,-2,2)*.12);}
 update(dt,reduced=false){
  dt=clamp(dt,0,.05);
  if(reduced){this.position=this.target;this.velocity=0;return;}
  const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
  for(let i=0;i<steps;i++){
   this.velocity+=(this.target-this.position)* (this.dragging?230:105)*h;
   this.velocity*=Math.exp(-(this.dragging?28:18)*h);
   this.position+=this.velocity*h;
  }
  if(!this.dragging&&Math.abs(this.target-this.position)<.00002&&Math.abs(this.velocity)<.0001){this.position=this.target;this.velocity=0;}
  // Keep long sessions numerically stable without changing the rendered positions.
  if(Math.abs(this.position)>10000){const shift=Math.trunc(this.position/this.count)*this.count;this.position-=shift;this.target-=shift;}
 }
}
export function mat4(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
export function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
export function transform(m,p){const out=new Float32Array(4);for(let r=0;r<4;r++)out[r]=m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]*p[3];return out;}
export function translation(x,y,z){const m=mat4();m[12]=x;m[13]=y;m[14]=z;return m;}
export function scaling(x,y=x,z=x){const m=mat4();m[0]=x;m[5]=y;m[10]=z;return m;}
export function rotationX(a){const m=mat4(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
export function rotationY(a){const m=mat4(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
export function rotationZ(a){const m=mat4(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;}
export function compose(position,rotation,scale=1){return multiply(translation(...position),multiply(rotationZ(rotation[2]),multiply(rotationY(rotation[1]),multiply(rotationX(rotation[0]),scaling(scale)))));}
export function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far),m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;return m;}
export function invert(a){
 const aug=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?a[c*4+r]:(c-4===r?1:0)));
 for(let c=0;c<4;c++){
  let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(aug[r][c])>Math.abs(aug[pivot][c]))pivot=r;
  if(Math.abs(aug[pivot][c])<1e-10) return null;
  [aug[c],aug[pivot]]=[aug[pivot],aug[c]];const n=aug[c][c];for(let k=0;k<8;k++)aug[c][k]/=n;
  for(let r=0;r<4;r++)if(r!==c){const v=aug[r][c];for(let k=0;k<8;k++)aug[r][k]-=v*aug[c][k];}
 }
 const out=new Float32Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)out[c*4+r]=aug[r][c+4];return out;
}
export function unproject(inv,x,y,z){const p=transform(inv,[x,y,z,1]);return [p[0]/p[3],p[1]/p[3],p[2]/p[3]];}
export function project(m,p){const v=transform(m,[...p,1]);return [v[0]/v[3],v[1]/v[3],v[2]/v[3]];}
