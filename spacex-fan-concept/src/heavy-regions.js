// The central source shell spans the whole stack. In its original 242-unit
// frame the fairing shoulder is at y=192.2, above the -6.21 engine datum.
// The inspected common Falcon sleeve ends at 4865 / 7100 of the stack height.
export const HEAVY_ENGINE_TOP=.046, HEAVY_INTERSTAGE_START=.59, HEAVY_UPPER_STAGE_START=.685, HEAVY_FAIRING_START=.819;
export function heavyCorePart(fraction,side=false){
 if(fraction<=HEAVY_ENGINE_TOP)return 'engines';
 if(side)return 'tanks';
 return fraction>=HEAVY_FAIRING_START?'fairing':fraction>=HEAVY_UPPER_STAGE_START?'upperstage':fraction>=HEAVY_INTERSTAGE_START?'interstage':'tanks';
}
