import {compose,multiply,perspective,invert,unproject,project,mat4} from '../math.js';
import {viewMatrix} from '../core.js';
import {distortUv,undistortUv} from './lens.js';
export const FLOOR=-1.12;
export function reflectPoint(p,height=FLOOR){return [p[0],2*height-p[1],p[2]];}
export function reflectionMatrix(height=FLOOR){const m=mat4();m[5]=-1;m[13]=2*height;return m;}
export function canonicalCamera(width,height,pointer=[0,0]){
 const mobile=width<height*.88,aspect=width/height;
 const position=mobile?[pointer[0]*.08,3.6,18.4]:[pointer[0]*.16,2.2+pointer[1]*.07,14.4];
 const target=mobile?[0,5.1,0]:[0,5.25,0],fov=mobile?2*Math.atan(3.8/(18.4*aspect)):.9;
 const view=viewMatrix(position,target),projection=perspective(fov,aspect,.1,140),viewProjection=multiply(projection,view);
 return {width,height,aspect,mobile,position,target,fov,view,projection,viewProjection,inverseViewProjection:invert(viewProjection),lens:{k:mobile?-.003:-.0045,aspect}};
}
const knots=[.716,.542,.374,.214];
function targetY(y,mobile){const q=(y-1.7)/2.4,i=Math.floor(q),fraction=q-i;const values=mobile?[.716,.566,.416,.266]:knots;const a=i<0?values[0]-i*.174:i>3?values[3]-(i-3)*.16:values[i];const b=i+1<0?values[0]-(i+1)*.174:i+1>3?values[3]-(i-2)*.16:values[i+1];return a+(b-a)*fraction;}
export function cardPosition(y,cam){const neutral=canonicalCamera(cam.width,cam.height,[0,0]),uv=undistortUv([.5,targetY(y,cam.mobile)],neutral.lens);const a=unproject(neutral.inverseViewProjection,uv[0]*2-1,1-uv[1]*2,-1),b=unproject(neutral.inverseViewProjection,uv[0]*2-1,1-uv[1]*2,1),z=-.025*y,t=(z-a[2])/(b[2]-a[2]);return [a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),z];}
export function cardModel(y,cam,hover=0,pointer=[.5,.5]){const pos=cardPosition(y,cam);pos[2]+=hover*.09;const m=compose(pos,[.012+(pointer[1]-.5)*hover*.022,.070+(pointer[0]-.5)*hover*.05,-.074],(cam.mobile?1.08:1.18)*(1+hover*.015));for(let i=4;i<8;i++)m[i]*=.88;return m;}
export function cardCenter(y,cam){const pos=project(multiply(cam.viewProjection,cardModel(y,cam)),[0,0,0]);return distortUv([pos[0]*.5+.5,.5-pos[1]*.5],cam.lens);}
