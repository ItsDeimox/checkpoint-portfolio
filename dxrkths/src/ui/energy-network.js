/** Damped discrete energy transport, adapted to a single face from the portfolio
 * cube network. No allocations in the integration loop and no background timer. */
export class EnergyNetwork {
 constructor(width=40,height=12){
  this.width=Math.max(3,Math.floor(width));this.height=Math.max(3,Math.floor(height));
  this.values=new Float32Array(this.width*this.height);this.next=new Float32Array(this.values.length);
 }
 inject(x,y,strength=1){
  if(![x,y,strength].every(Number.isFinite))return;
  const cx=Math.max(0,Math.min(this.width-1,x*(this.width-1))),cy=Math.max(0,Math.min(this.height-1,y*(this.height-1)));
  for(let j=Math.max(0,Math.floor(cy)-1);j<=Math.min(this.height-1,Math.ceil(cy)+1);j++)for(let i=Math.max(0,Math.floor(cx)-1);i<=Math.min(this.width-1,Math.ceil(cx)+1);i++){
   const amount=Math.exp(-((i-cx)**2+(j-cy)**2)*1.7)*Math.max(0,strength);
   this.values[j*this.width+i]=Math.min(2,this.values[j*this.width+i]+amount);
  }
 }
 step(dt){
  const t=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0)),decay=Math.exp(-t*3.3),diff=Math.min(.23,t*8.5),{width:w,height:h,values:a,next:b}=this;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x,v=a[i],sum=a[y*w+Math.max(0,x-1)]+a[y*w+Math.min(w-1,x+1)]+a[Math.max(0,y-1)*w+x]+a[Math.min(h-1,y+1)*w+x];
   b[i]=Math.max(0,(v+diff*(sum-4*v))*decay);
  }
  this.values=b;this.next=a;
 }
 total(){return this.values.reduce((sum,n)=>sum+n,0);}
 activeCount(){return this.values.reduce((sum,n)=>sum+Number(n>.001),0);}
 clear(){this.values.fill(0);this.next.fill(0);}
}
