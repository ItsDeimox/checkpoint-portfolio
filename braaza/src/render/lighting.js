export function buildLightRig(){return [
{id:'lower',position:[0,.5,1.3],color:[31,4.25,.20],phase:0,target:[0,5,-2]},
{id:'upper',position:[0,12.9,-1],color:[25,3.15,.11],phase:3,target:[0,5,1]},
{id:'fall-left',position:[-9,3,-6],color:[21,2.55,.09],phase:7},
{id:'fall-right',position:[9,5,-7],color:[19,2.35,.085],phase:12},
{id:'arch-rim',position:[7,12,-12],color:[10.5,1.75,.23],phase:17},
{id:'cold-fill',position:[-3,10,9],color:[.58,.74,1.0],phase:23}];}
export function sourcePulse(time,phase=0){return .96+.025*Math.sin(time*2.2+phase)+.018*Math.sin(time*5.7+phase*2.6);}
export function updateLightRig(lights,time){return {positions:lights.flatMap(l=>l.position),colors:lights.flatMap(l=>l.color.map(c=>c*sourcePulse(time,l.phase)))};}
