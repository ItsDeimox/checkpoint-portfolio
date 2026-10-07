const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
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
