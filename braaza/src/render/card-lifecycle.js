/** One scroll coordinate for the whole conveyor. No per-card catch-up or teleport animation. */
export const CARD_FLOW=Object.freeze({first:1.7,spacing:2.4,lowerBuffer:-4.2,upperBuffer:14.2,lowerGate:0,upperGate:10.35,feather:.18,axisScale:1.02});
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const modulo=(i,n)=>((i%n)+n)%n;
/** Buffered occurrences share the original media resources; keys survive crossing an integer. */
export function galleryInstances(position,count=4){
 if(!Number.isFinite(position)||!Number.isInteger(count)||count<1)throw new RangeError('Invalid gallery position/count');
 const whole=Math.floor(position),phase=position-whole,instances=[];
 const first=Math.ceil((CARD_FLOW.lowerBuffer-CARD_FLOW.first)/CARD_FLOW.spacing-phase);
 const last=Math.floor((CARD_FLOW.upperBuffer-CARD_FLOW.first)/CARD_FLOW.spacing-phase);
 for(let slot=first;slot<=last;slot++){
  const key=slot-whole,y=CARD_FLOW.first+(slot+phase)*CARD_FLOW.spacing;
  instances.push({key,index:modulo(key,count),y,visible:y> -1.45&&y<11.8});
 }
 return instances;
}
/** Keep this analytic field paired with glsl/glass/lifecycle.glsl. It is time independent. */
export function cardCoverage(y,local,index=0){
 const [x,v]=local;
 const irregular=Math.sin(x*7.1+index*1.7)*.045+Math.sin(x*15.3+v*2.4+index*3.1)*.025;
 const axis=y+v*CARD_FLOW.axisScale;
 return smooth(-CARD_FLOW.feather,CARD_FLOW.feather,axis-CARD_FLOW.lowerGate-irregular)*smooth(-CARD_FLOW.feather,CARD_FLOW.feather,CARD_FLOW.upperGate-axis+irregular);
}
export function cardLifecycle(y){
 // Conservative visibility for culling. The shader/picker evaluate actual fragment coverage.
 return {visible:y> -1.45&&y<11.8,visibility:cardCoverage(y,[0,0]),reveal:smooth(-1.4,1.4,y),exitBurn:smooth(8.95,11.75,y)};
}
