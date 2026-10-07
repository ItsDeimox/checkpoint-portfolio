export function buildLightRig(){return [
{id:'lower',position:[0,.5,1.3],color:[34,4.8,.25],phase:0,target:[0,5,-2]},
{id:'upper',position:[0,12.9,-1],color:[27,3.5,.13],phase:3,target:[0,5,1]},
{id:'fall-left',position:[-9,3,-6],color:[25,3.1,.11],phase:7},
{id:'fall-right',position:[9,5,-7],color:[21,2.7,.10],phase:12},
{id:'arch-rim',position:[7,12,-12],color:[12,2.1,.27],phase:17},
{id:'cold-fill',position:[-3,10,9],color:[.85,1.02,1.3],phase:23}];}
export function sourcePulse(time,phase=0){return .96+.025*Math.sin(time*2.2+phase)+.018*Math.sin(time*5.7+phase*2.6);}
export function updateLightRig(lights,time){return {positions:lights.flatMap(l=>l.position),colors:lights.flatMap(l=>l.color.map(c=>c*sourcePulse(time,l.phase)))};}
