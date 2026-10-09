/** Projective display mapping and bounded GPU target sizes, independent of WebGL. */
export function homography(points){
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=points;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3;
 const dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 const determinant=dx1*dy2-dx2*dy1;
 const g=Math.abs(determinant)<1e-12?0:(dx3*dy2-dx2*dy3)/determinant;
 const h=Math.abs(determinant)<1e-12?0:(dx1*dy3-dx3*dy1)/determinant;
 return [x1-x0+g*x1,x3-x0+h*x3,x0,y1-y0+g*y1,y3-y0+h*y3,y0,g,h,1];
}
export function applyHomography(m,[x,y]){const w=m[6]*x+m[7]*y+m[8];return [(m[0]*x+m[1]*y+m[2])/w,(m[3]*x+m[4]*y+m[5])/w];}
export const panelIndex=i=>((Math.round(i)%5)+5)%5;
export function renderBudget(width,height,dpr=1,quality='auto'){
 const maxPixels=quality==='high'?2900000:quality==='low'?900000:1900000;
 const ratio=Math.min(dpr,quality==='high'?1.6:quality==='low'?.82:1.15,Math.sqrt(maxPixels/Math.max(1,width*height)));
 return {width:Math.max(2,Math.floor(width*ratio)),height:Math.max(2,Math.floor(height*ratio)),ratio,maxPixels,reflection:quality==='high'?1024:quality==='low'?384:768};
}
export const ROOM_PANELS=[
 {title:'Berserk Drift X',detail:'CARS × CREATIVITY × NO LIMITS',corners:[[.011,.079],[.205,.204],[.197,.592],[.006,.613]],art:[[.026,.109],[.198,.220],[.192,.573],[.016,.591]],z:1.2,yaw:.66},
 {title:'Groups & Games',detail:'COMMUNITY / EVENTS / PLAY',corners:[[.216,.203],[.391,.255],[.389,.584],[.215,.594]],art:[[.227,.232],[.382,.273],[.381,.568],[.226,.578]],z:4.5,yaw:.36},
 {title:'Future Projects',detail:'BIGGER ROADS AHEAD',corners:[[.407,.270],[.596,.270],[.600,.581],[.407,.581]],art:[[.416,.283],[.589,.283],[.592,.566],[.416,.566]],z:6.4,yaw:0},
 {title:'About DXT',detail:'PEOPLE / VISION / IMPACT',corners:[[.614,.254],[.779,.205],[.794,.593],[.614,.583]],art:[[.623,.275],[.773,.225],[.783,.576],[.623,.566]],z:4.5,yaw:-.36},
 {title:'Socials & Contact',detail:'LET’S STAY CONNECTED',corners:[[.795,.209],[.983,.079],[.999,.610],[.801,.593]],art:[[.805,.232],[.973,.116],[.986,.591],[.811,.577]],z:1.2,yaw:-.66}
];
