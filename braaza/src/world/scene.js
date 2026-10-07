import * as G from './geometry.js';
import {random} from '../core.js';
/** Near and middle scene are authored world geometry; a tiny far vista lives behind the arch. */
export function buildScene(){
 const r=random(631),geometry={rock:G.rock(17),rock2:G.rock(83),cube:G.beveledBox(),column:G.carvedColumn(),spire:G.spire(),arch:G.arch(),archHigh:G.arch(2.2,.45,.62,28,.48),banner:G.banner(),emblem:G.emblem(),plane:G.panel(2,2),ring:G.tube('ring'),glass:G.crystal()};
 const objects=[],landmarks={},lavafalls=[],banners=[],fires=[],floaters=[];let id=0;
 const add=(mesh,pos,scale,rot=[0,0,0],kind=0,heat=0,name=null)=>{const o={id:name??'piece-'+id++,mesh,pos,scale,rot,model:G.model(pos,rot,scale),surface:[kind,heat,r()*80,1],castsShadow:kind!==5};objects.push(o);if(name)landmarks[name]=o;return o;};
 const stone=(pos,scale,heat=.02)=>add('rock',pos,scale,[r(),r()*4,r()*.4],0,heat);
 for(let i=0;i<9;i++)add('cube',[0,-.93+i*.115,1.1-i*.30],[2.8-i*.12,.08,.42],[0,0,0],3,.008,'step-'+i);
 for(const side of[-1,1])for(let i=0;i<8;i++)add('cube',[side*4.5,-.93+i*.115,.9-i*.34],[1.45,.075,.3],[0,side*.035,0],3,.003);
 for(const upper of[false,true]){
  const y=upper?13.9:.20,z=upper?-1.6:-.9;
  add('rock2',[0,y+(upper?.66:-.15),z],[upper?3.6:2.4,upper?1.7:.45,upper?2.5:1.9],[upper?Math.PI:0,.1,0],0,.18,upper?'upper-forge':'lower-forge');
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2,rad=(upper?3.05:2.3)+r()*.38;add(i%2?'rock':'rock2',[Math.cos(a)*rad,y+(r()-.5)*.38,z+Math.sin(a)*rad],[.48+r()*.26,.5+r()*.52,.56+r()*.2],[r(),r()*4,r()],0,.42);}
  for(let i=0;i<22;i++){const a=r()*6.28,rad=.4+r()*1.8;stone([Math.cos(a)*rad,y,z+Math.sin(a)*rad],[.22+r()*.4,.18+r()*.24,.3],.65);}
  for(let i=0;i<2;i++)add('ring',[0,y+.22,z],[2.05+i*.17,2.05+i*.17,1],[-Math.PI/2,0,0],2,.65);
  for(let i=0;i<11;i++){const h=1.4+r()*2.7;fires.push({id:(upper?'upper':'lower')+i,pos:[(r()-.5)*3.3,upper?13.0-h/2:.55+h/2,z+(r()-.5)*1.6],scale:[.28+r()*.45,h/2,1],rot:[0,(r()-.5)*.28,upper?Math.PI:0],seed:i+(upper?17:0),opacity:.55});}
 }
 for(const side of[-1,1]){
  for(const[x,z,h]of[[7.6,-6,20],[17.5,-12,24],[20,-24,32],[7,-19,16],[13,-30,22]]){const xx=side*x;add('column',[xx,h*.45-1,z],[.85,h*.5,1.3],[0,.1,side*-.03],3,.025);add('column',[xx-side*1.1,h*.46-1,z+.4],[.26,h*.51,.34],[0,0,side*.025],1,.018);for(let level=0;level<5;level++)add('cube',[xx,level*h/5-1,z],[1.3,.13,1.7],[0,0,0],3,.055);add('spire',[xx,h-.7,z],[1.4,3,1.5],[0,r(),0],3,.025);}
  add('archHigh',[side*14.3,10.,side>0?-11:-24],[1.60,2.0,1.5],[0,side*.16,0],3,.015,side===1?'right-arch':'left-arch');
  for(const[scale,depth]of[[1.06,.95],[.98,1.25],[1.10,.4]])add('archHigh',[side*14.3,10.,(side>0?-11:-24)+depth],[1.60*scale,2.0*scale,.18],[0,side*.16,0],3,.02);
  for(const edge of[-1,1])for(let rib=0;rib<3;rib++)add('column',[side*14.3+edge*(3.50+rib*.17),4.2,(side>0?-11:-24)+1.1],[.10,5.7,.15],[0,side*.16,0],3,.008);
  for(const offset of[-1,1])add('column',[side*14.3+offset*3.52,4.4,side>0?-11:-24],[.62,5.6,.93],[0,side*.16,0],3,.02);
  for(let tier=0;tier<2;tier++){
   const y=3.8+tier*6.2,z=-8-tier*11;add('cube',[side*10.6,y,z],[5.3,.19,.8],[0,side*-.13,0],3,.013,tier===0?(side<0?'left-bridge':'right-bridge'):null);
   for(let j=0;j<5;j++){const x=side*(6.9+j*1.8);add('arch',[x,y-1.2,z],[.35,.45,.72],[0,0,0],3,.012);add('column',[x,y-3.7,z],[.19,2.55,.45],[0,0,0],3,.02);}
   for(let j=0;j<19;j++){const x=side*(5.6+j*.55);add('spire',[x,y+.53,z+.68],[.06,.34,.055],[0,0,0],1,0);if(j%3===0){add('cube',[x,y+.23,z+.5],[.13,.21,.15],[0,0,0],3,.05);fires.push({id:'torch-'+side+tier+j,pos:[x,y+.59,z+.5],scale:[.09,.28,1],rot:[0,0,0],seed:j,opacity:.85});}}
   add('cube',[side*10.5,y+.42,z+.7],[5.3,.026,.045],[0,side*-.13,0],1,0);
  }
  const pos=[side<0?-11.6:14.4,10.5,-4.6];banners.push({id:'banner-'+side,pos,model:G.model(pos,[0,-side*.07,side*.014],[.70,3.1,1]),seed:side});add('cube',[pos[0],13.7,pos[2]],[.82,.05,.1],[0,0,0],1,.012);add('emblem',[pos[0],11.3,pos[2]+.12],[.36,.57,1],[0,-side*.07,0],5,1);
  for(const[x,y,z,h,w]of[[11.8,2,-9,11,.78],[19,5,-24,22,1.15],[8.9,15,-8,13,.35],[6.5,-2,-5,5,.3]])lavafalls.push({id:'fall-'+side+x,pos:[side*x,y,z],scale:[w,h/2,1],rot:[0,-side*.06,0],seed:r()*12});
 }
 for(const side of[-1,1]){const x=side*(side<0?17.2:18.4),z=side<0?-7:-9,top=side<0?7.0:6.8;lavafalls.push({id:'outer-cascade-'+side,pos:[x,top-3.2,z],scale:[side<0?1.55:1.35,3.3,1],rot:[0,-side*.10,0],seed:side<0?2.35:4.9});add('cube',[x,top+.22,z-.45],[3.0,.18,1.2],[0,-side*.08,-side*.055],3,.008);for(let j=0;j<18;j++)stone([x+(r()-.5)*5.8,top+.32+(r()-.5)*.45,z-.4+(r()-.5)*1.4],[.3+r()*.5,.25+r()*.5,.45+r()*.4],.12);for(let j=0;j<15;j++){const px=side*(23+r()*7);stone([px,-2+j*1.3,z-3],[2.2+r()*1.4,1.4+r()*2,1.3+r()*2],.06);}}
 for(const side of[-1,1])for(let i=0;i<31;i++){const x=side*(4.6+r()*25),z=-20-r()*38,h=2.5+r()*15;add('column',[x,h*.38-1,z],[.33+r()*.45,h*.46,.65],[0,r()*.12,0],3,.014);add('spire',[x,h*.83-.4,z],[.55+r()*.5,1.1+r()*1.5,.9],[0,r()*3,0],3,.015);for(let j=0;j<3;j++)add('cube',[x+(j-1)*.20,h*.6,z+.66],[.028,.12,.015],[0,0,0],2,.16);}
 for(const side of[-1,1])for(let i=0;i<36;i++){const x=side*(6+r()*18),z=-3-r()*37,y=-2+r()*3;stone([x,y,z],[1+r()*2,1+r()*3,1+r()*2],.04+r()*.08);}
 for(const side of[-1,1])for(let i=0;i<34;i++){const x=side*(2.8+r()*8),z=1+r()*7;stone([x,-.95+r()*.22,z],[.25+r()*.9,.10+r()*.35,.4+r()*.9],.04+r()*.14);}
 for(const[x,y,z,s]of[[-4.9,7.5,-.5,.75],[4,7,-1,.5],[-3.4,4.3,0,.34],[3.6,3.7,0,.57],[-5.9,10,-2,.34],[6.3,2,-1,.28]])floaters.push({id:'fragment-'+floaters.length,mesh:'rock2',pos:[x,y,z],scale:[s,s*1.7,s*.64],seed:r()*20,surface:[0,.55,r()*30,1]});
 return {geometry,objects,landmarks,lavafalls,banners,fires,floaters,assets:[],floorY:-1.12};
}
