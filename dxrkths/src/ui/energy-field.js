/** A small persistent graph. Pointer input excites nodes; energy travels over
 * the same horizontal/vertical connections sampled by the cube-style shader. */
export class EnergyField {
 constructor(columns=44,rows=12){
  this.columns=columns;this.rows=rows;this.values=new Float32Array(columns*rows);
  this.next=new Float32Array(this.values.length);this.pixels=new Uint8Array(this.values.length*4);
  this.edges=new Uint8Array(this.values.length*2);
  let seed=1703;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<this.values.length;i++){
   this.edges[i*2]=random()>.22?1:0;this.edges[i*2+1]=random()>.23?1:0;
   this.pixels[i*4+1]=this.edges[i*2]*255;this.pixels[i*4+2]=this.edges[i*2+1]*255;this.pixels[i*4+3]=255;
  }
 }
 inject(u,v,power=.65){
  if(![u,v,power].every(Number.isFinite))return;
  const x=Math.max(0,Math.min(1,u))*(this.columns-1),y=Math.max(0,Math.min(1,v))*(this.rows-1);
  for(let j=Math.max(0,Math.floor(y)-2);j<=Math.min(this.rows-1,Math.ceil(y)+2);j++)
   for(let i=Math.max(0,Math.floor(x)-2);i<=Math.min(this.columns-1,Math.ceil(x)+2);i++){
    const k=j*this.columns+i,amount=Math.exp(-((i-x)**2+(j-y)**2)*1.2)*power;
    this.values[k]=Math.min(1.5,this.values[k]+Math.max(0,amount));
   }
 }
 step(delta){
  const dt=Number.isFinite(delta)?Math.max(0,Math.min(delta,1/30)):0;
  let maximum=0;
  for(let y=0;y<this.rows;y++)for(let x=0;x<this.columns;x++){
   const i=y*this.columns+x,e=this.values[i];let flow=0;
   if(x+1<this.columns&&this.edges[i*2])flow+=this.values[i+1]-e;
   if(x>0&&this.edges[(i-1)*2])flow+=this.values[i-1]-e;
   if(y+1<this.rows&&this.edges[i*2+1])flow+=this.values[i+this.columns]-e;
   if(y>0&&this.edges[(i-this.columns)*2+1])flow+=this.values[i-this.columns]-e;
   const value=Math.max(0,Math.min(1.5,e+(flow*5-e*2.4)*dt));
   this.next[i]=value;this.pixels[i*4]=Math.round(Math.min(1,value)*255);maximum=Math.max(maximum,value);
  }
  [this.values,this.next]=[this.next,this.values];return maximum;
 }
}
