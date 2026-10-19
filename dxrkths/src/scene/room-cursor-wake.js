export const WAKE_POINTS=16;
export const WAKE_LIFETIME=.72;

/** A bounded path in physical mesh UVs. Old samples never move with the cursor.
 * Only the newest tip coalesces between 30 Hz history samples. No frame owner,
 * textures or per-event allocations; the showroom's existing loop ages it. */
export class CursorWake {
 constructor(){this.data=new Float32Array(WAKE_POINTS*4);this.count=0;this.stroke=0;this.sinceSample=1;this.lastX=NaN;this.lastY=NaN;this.connected=false;}
 point(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  x=Math.max(0,Math.min(1,x));y=Math.max(0,Math.min(1,y));
  if(this.connected&&Math.hypot(x-this.lastX,y-this.lastY)<.001)return false;
  const continuing=this.connected;this.lastX=x;this.lastY=y;
  if(!continuing){this.stroke=this.stroke%65535+1;this.connected=true;}
  const replace=continuing&&this.count>1&&this.sinceSample<1/30&&this.data[(this.count-2)*4+3]===this.stroke;
  if(!replace){
   if(this.count===WAKE_POINTS){this.data.copyWithin(0,4);this.count--;}
   this.count++;this.sinceSample=0;
  }
  const i=(this.count-1)*4;this.data[i]=x;this.data[i+1]=y;this.data[i+2]=0;this.data[i+3]=this.stroke;
  return true;
 }
 step(delta){
  const dt=Number.isFinite(delta)?Math.max(0,Math.min(delta,1)):0;this.sinceSample+=dt;
  let expired=0;
  for(let i=0;i<this.count;i++){this.data[i*4+2]+=dt;if(this.data[i*4+2]>=WAKE_LIFETIME)expired++;}
  if(expired){this.data.copyWithin(0,expired*4,this.count*4);this.count-=expired;this.data.fill(0,this.count*4);}
  return this.count>0;
 }
 release(){this.connected=false;}
 clear(){this.data.fill(0);this.count=0;this.sinceSample=1;this.release();}
}
