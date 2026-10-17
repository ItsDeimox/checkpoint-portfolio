/** Camera-driven blend, with zero velocity/acceleration at both endpoints.
 * This is not a second timer: dropped/paused frames keep the page and corridor in sync.
 */
export function arrivalVisual(progress){
 const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 const t=Math.max(0,Math.min(1,(p-.34)/.62));
 const blend=t*t*t*(t*(t*6-15)+10);
 return {opacity:blend,scale:.72+.28*blend};
}
/** Reserve the same classic-scrollbar width the destination will use at commit.
 * Overlay-scrollbar browsers naturally return 0. No global scrollbar/style change.
 */
export function destinationGutter(document){
 if(!document.createElement||!document.body?.append)return 0;
 const probe=document.createElement('div');
 probe.style.cssText='position:absolute;left:-10000px;top:0;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none;border:0;padding:0;';
 document.body.append(probe);
 const width=Math.max(0,(probe.offsetWidth||0)-(probe.clientWidth||0));probe.remove();return width;
}
