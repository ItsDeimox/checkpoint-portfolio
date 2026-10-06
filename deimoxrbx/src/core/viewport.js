/** Extend the camera below the approved hero; never stretch its composition. */
export function sceneViewport(width,heroHeight,footerHeight=0){
 const valid=(value,min)=>Number.isFinite(value)?Math.max(min,value):min;
 const w=valid(width,1),h=valid(heroHeight,1),footer=valid(footerHeight,0);
 return {width:w,heroHeight:h,height:h+footer,aspect:w/h};
}
