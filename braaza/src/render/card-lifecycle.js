const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*Math.max(0,dt)));
/** Both forges own the lifecycle. A card is fully hidden before any logical recycle. */
export function cardLifecycle(y){
  const reveal=clamp((y-.35)/1.20);
  const exitBurn=clamp((y-9.70)/1.35);
  return {reveal,exitBurn,visibility:Math.min(reveal,1-exitBurn)};
}
export function createCardWrapState(){return {mode:'track'};}
/**
 * Logical slots wrap immediately, but the rendered card finishes travelling into the
 * active forge first. Only once fully occluded does it teleport to the opposite forge.
 */
export function wrapCardVisualY(rawY,previousRawY,visualY,dt,reduced=false,state=createCardWrapState()){
  if(!Number.isFinite(previousRawY)||!Number.isFinite(visualY)){state.mode='track';return {rawY,visualY:rawY,wrapped:false,state};}
  if(reduced){state.mode='track';return {rawY,visualY:rawY,wrapped:false,state};}
  const jump=rawY-previousRawY,h=Math.min(Math.max(dt,0),.05);
  if(jump<-6)state.mode='exitTop';
  else if(jump>6)state.mode='exitBottom';
  let y=visualY,wrapped=false;
  if(state.mode==='exitTop'){
    y=damp(y,11.65,14,h);
    if(y>11.52){y=-1.30;state.mode='enterBottom';wrapped=true;}
  }else if(state.mode==='enterBottom'){
    y=damp(y,rawY,6.5,h);
    if(Math.abs(y-rawY)<.025)state.mode='track';
  }else if(state.mode==='exitBottom'){
    y=damp(y,-1.30,14,h);
    if(y<-1.17){y=12.55;state.mode='enterTop';wrapped=true;}
  }else if(state.mode==='enterTop'){
    y=damp(y,rawY,6.5,h);
    if(Math.abs(y-rawY)<.025)state.mode='track';
  }else y=damp(y,rawY,10,h);
  return {rawY,visualY:y,wrapped,state};
}
