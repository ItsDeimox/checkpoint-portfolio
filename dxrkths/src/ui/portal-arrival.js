/** Compatibility for progress-only callers. The physical portal supplies its
 * opening opacity directly, including during approach. All magnification is
 * provided by the camera's projected world quad.
 */
export function arrivalVisual(progress){
 const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 const t=Math.min(1,p/.08);
 return {opacity:t*t*t*(t*(t*6-15)+10)};
}
/** Map a full-size HTML viewport onto the four actual projected exit corners.
 * CSS matrix3d uses column-major order; h is a unit-square homography.
 */
export function arrivalTransform(frame,sourceWidth=frame?.contentWidth,sourceHeight=frame?.height){
 if(!frame?.visible||frame.quad?.length!==4||!(sourceWidth>0&&sourceHeight>0))return null;
 const points=frame.quad.map(([x,y])=>[x*frame.width,y*frame.height]);
 if(!points.flat().every(Number.isFinite))return null;
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=points;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 const det=dx1*dy2-dx2*dy1;
 if(Math.abs(det)<1e-8)return null;
 const g=(dx3*dy2-dx2*dy3)/det,h=(dx1*dy3-dx3*dy1)/det;
 const m=[(x1-x0+g*x1)/sourceWidth,(y1-y0+g*y1)/sourceWidth,0,g/sourceWidth,
  (x3-x0+h*x3)/sourceHeight,(y3-y0+h*y3)/sourceHeight,0,h/sourceHeight,
  0,0,1,0,x0,y0,0,1].map(n=>Math.abs(n)<1e-10?0:n);
 return `matrix3d(${m.join(',')})`;
}
export function destinationGutter(document){
 if(!document.createElement||!document.body?.append)return 0;
 const probe=document.createElement('div');
 probe.style.cssText='position:absolute;left:-10000px;top:0;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none;border:0;padding:0;';
 document.body.append(probe);
 const width=Math.max(0,(probe.offsetWidth||0)-(probe.clientWidth||0));probe.remove();return width;
}

/** Tunnel occlusion in the same source coordinate system as arrivalTransform. */
export function arrivalClip(frame){
 if(!frame?.clip)return 'none';
 const [left,top,right,bottom]=frame.clip;
 if(left===0&&top===0&&right===1&&bottom===1)return 'none';
 return `inset(${top*100}% ${(1-right)*100}% ${(1-bottom)*100}% ${left*100}%)`;
}
