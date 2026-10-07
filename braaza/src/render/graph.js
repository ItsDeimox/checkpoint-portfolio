export const EXTERNALS=['geometry','media','camera','lights','history','probe'];
export const PASSES=[
{id:'shadow',reads:['geometry','lights'],writes:['shadowDepth']},
{id:'reflection',reads:['geometry','media','camera','lights','shadowDepth','probe'],writes:['reflected']},
{id:'geometry-prepass',reads:['geometry','camera','history'],writes:['depth','normal','velocity']},
{id:'ambient-occlusion',reads:['depth','normal'],writes:['ao']},
{id:'opaque',reads:['geometry','camera','history','lights','shadowDepth','probe','reflected','ao'],writes:['scene','depth','normal','velocity']},
{id:'fire',reads:['geometry','lights','depth'],writes:['fireLayer']},
{id:'atmosphere',reads:['depth','lights','shadowDepth'],writes:['volume']},
{id:'heat-and-transmission',reads:['scene','fireLayer','volume','depth'],writes:['behind']},
{id:'glass',reads:['behind','media','probe','lights','geometry'],writes:['glassScene','opticalDepth','opticalVelocity','opticalNormal']},
{id:'sparks',reads:['opticalDepth','lights'],writes:['particles']},
{id:'optical-resolve',reads:['glassScene','opticalDepth','opticalVelocity','opticalNormal','particles'],writes:['resolved']},
{id:'bloom',reads:['resolved'],writes:['bloom']},
{id:'flare-visibility',reads:['depth','lights'],writes:['visibility']},
{id:'display',reads:['resolved','bloom','visibility','camera'],writes:['canvas']}];
export function validatePasses(passes,initial=[]){const available=new Set(initial),ids=new Set();for(const p of passes){if(ids.has(p.id))throw Error('duplicate pass '+p.id);ids.add(p.id);for(const r of p.reads){if(p.writes.includes(r))throw Error('feedback in '+p.id);if(!available.has(r))throw Error('uninitialized '+r+' in '+p.id);}p.writes.forEach(w=>available.add(w));}return true;}
export class RenderGraph{
 constructor(){validatePasses(PASSES,EXTERNALS);this.trace=[];this.historyReason='startup';}
 begin(){this.trace=[];}
 mark(id){this.trace.push(id);}
 invalidateHistory(reason){this.historyReason=reason;}
}
