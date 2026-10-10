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
// The camera enters through an open front bay. Every structural layer uses the
// same 240-degree side/back arc, so a hidden wall cannot leave rails across it.
export const ROOM_SHELL=Object.freeze({radius:12.2,centerZ:2,height:8.4,thetaStart:-Math.PI*2/3,thetaLength:Math.PI*4/3});
export function roomShellAngles(segments=32){
 const count=Math.max(3,Math.floor(segments)),end=ROOM_SHELL.thetaStart+ROOM_SHELL.thetaLength;
 return Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count;return Math.atan2(Math.sin(a),Math.cos(a));})
  .filter(a=>a>=ROOM_SHELL.thetaStart-1e-9&&a<=end+1e-9);
}
export const ROOM_FOREGROUND_TIRES=Object.freeze({x:Object.freeze([3.48,-3.35]),z:-7.75,levels:3});
export function renderBudget(width,height,dpr=1,quality='auto'){
 const maxPixels=quality==='high'?2900000:quality==='low'?900000:1900000;
 const compact=Math.min(width,height)<=740&&Math.max(width,height)<=1280&&dpr>1;
 const lowRatio=compact?1.25:.82;
 const ratio=Math.min(dpr,quality==='high'?1.6:quality==='low'?lowRatio:1.15,Math.sqrt(maxPixels/Math.max(1,width*height)));
 return {width:Math.max(2,Math.floor(width*ratio)),height:Math.max(2,Math.floor(height*ratio)),ratio,maxPixels,reflection:quality==='high'?1024:quality==='low'?384:768};
}
// Physical, upright rectangles facing into the room. Position/dimensions/yaw
// were fitted offline to the reference at its original camera and fixed depth.
// Keep the image outlines only as composition references: their imperfect
// perspective must never become a trapezoidal mesh or a live camera transform.
export const ROOM_PANELS=[
 {title:'Berserk Drift X',detail:'CARS × CREATIVITY × NO LIMITS',corners:[[.011,.079],[.205,.204],[.197,.592],[.006,.613]],art:[[.026,.109],[.198,.220],[.192,.573],[.016,.591]],position:[6.959897,3.672058,1.2],width:4.474449,height:4.682116,yaw:1.236135},
 {title:'Groups & Games',detail:'COMMUNITY / EVENTS / PLAY',corners:[[.216,.203],[.391,.255],[.389,.584],[.215,.594]],art:[[.227,.232],[.382,.273],[.381,.568],[.226,.578]],position:[4.251762,3.730512,4.5],width:4.193786,height:4.518478,yaw:.685378},
 {title:'Future Projects',detail:'BIGGER ROADS AHEAD',corners:[[.407,.270],[.596,.270],[.600,.581],[.407,.581]],art:[[.416,.283],[.589,.283],[.592,.566],[.416,.566]],position:[-.061554,3.747925,6.4],width:4.697771,height:4.326768,yaw:-.000336},
 {title:'About DXT',detail:'PEOPLE / VISION / IMPACT',corners:[[.614,.254],[.779,.205],[.794,.593],[.614,.583]],art:[[.623,.275],[.773,.225],[.783,.576],[.623,.566]],position:[-4.328008,3.734785,4.5],width:4.092976,height:4.505286,yaw:-.662359},
 {title:'Socials & Contact',detail:'LET’S STAY CONNECTED',corners:[[.795,.209],[.983,.079],[.999,.610],[.801,.593]],art:[[.805,.232],[.973,.116],[.986,.591],[.811,.577]],position:[-6.933881,3.660907,1.2],width:4.638287,height:4.638472,yaw:-1.267039}
];
