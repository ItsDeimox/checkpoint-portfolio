/** Semantic grouping is independent from exporter node naming conventions. */
export function classifyPart(family, name, normalizedY) {
  const n=String(name).toLowerCase().replace(/[_\.]/g,' '),y=Number(normalizedY);
  if(family==='starship') {
    if(y>.585||(/starship block/.test(n)&&!/superheavy/.test(n)))return 'fairing';
    if(/raptor|engine|thrust puck/.test(n)||y<.085)return 'engines';
    // The grid fins move with the booster, below its hot-staging interface.
    if(/hot.?stag|interstage/.test(n))return 'interstage';
    return 'tanks';
  }
  if(/fairing/.test(n)||y>.81)return 'fairing';
  if(/second stage|interstage|grid fin|cold gas/.test(n)||y>.59)return 'interstage';
  if(/merlin|engine|octaweb|landing leg/.test(n)||y<.12)return 'engines';
  return 'tanks';
}
export function normalization(bounds,height) {
  const span=bounds.max[1]-bounds.min[1];
  if(!Number.isFinite(span)||span<=0||!Number.isFinite(height)||height<=0)throw new Error('Invalid model height');
  return {scale:height/span,offset:[-(bounds.min[0]+bounds.max[0])/2,-bounds.min[1],-(bounds.min[2]+bounds.max[2])/2].map(x=>Object.is(x,-0)?0:x)};
}
