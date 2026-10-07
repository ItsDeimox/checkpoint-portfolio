const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*Math.max(0,dt)));
/**
 * Gallery-space lifecycle used by tests/debug. GLSL mirrors these constants so the
 * reveal/burn fronts stay spatially stable even while the card itself is moving.
 */
export function cardLifecycle(y){
  return {
    reveal: clamp((y-1.45)/1.15),
    exitBurn: clamp((y-10.35)/1.55)
  };
}
/**
 * The logical carousel wraps instantly. The rendered card must not.
 * When a card recycles from the top to the bottom it is placed below the forge and
 * springs toward the new logical slot, so the existing fire/reveal shader can expose it.
 */
export function wrapCardVisualY(rawY,previousRawY,visualY,dt,reduced=false){
  if(!Number.isFinite(previousRawY)||!Number.isFinite(visualY))return {rawY,visualY:rawY,wrapped:false};
  const jump=rawY-previousRawY;
  let y=visualY,wrapped=false;
  if(jump<-6){y=-1.05;wrapped=true;}
  else if(jump>6){y=12.70;wrapped=true;}
  if(reduced)y=rawY;
  else y=damp(y,rawY,wrapped?5.5:10,Math.min(Math.max(dt,0),.05));
  return {rawY,visualY:y,wrapped};
}
