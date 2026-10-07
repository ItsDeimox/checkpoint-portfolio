#version 300 es
precision highp float;
in vec3 vWorld,vLocal;in vec2 vUv;in vec4 vCurrent,vPrevious;
uniform float uMediaAspect;uniform sampler2D uArt,uLabel;uniform float uBurn,uReveal,uIndex,uTime;out vec4 outColor;
#include "common/noise.glsl"
vec3 readMedia(vec2 uv){float aspect=max(uMediaAspect,.01),panelAspect=4.8/(2.25*.88);vec2 q=uv-.5;if(aspect>panelAspect)q.y*=aspect/panelAspect;else q.x*=panelAspect/aspect;q+=.5;if(min(q.x,q.y)<0.||max(q.x,q.y)>1.)return vec3(.001);return texture(uArt,q).rgb;}
void main(){vec2 p=(vUv-.5)*vec2(4.8,2.25);if(sdRoundBox(p,vec2(2.4,1.125)-.055,.1)>.0)discard;
 float centerY=vWorld.y-(vUv.y-.5)*2.35;
 float reveal=clamp((centerY-1.45)/1.15+uReveal*0.,0.,1.);
 float burn=clamp((centerY-10.35)/1.55,0.,1.);
 float lifeNoise=fbm(vUv*vec2(8.5,5.2)+vec2(uIndex*2.7,uTime*.055))+flow(vUv*vec2(17.,8.)+vec2(-uTime*.08,uIndex))*.22;
 float exitField=vUv.y+lifeNoise*.14,revealField=vUv.y+lifeNoise*.11;
 float burnFront=1.06-burn*1.10,revealFront=mix(.025,1.08,reveal);
 if(burn>.001&&exitField>burnFront)discard;
 if(reveal<.999&&revealField>revealFront)discard;
 float burnBand=exp(-abs(exitField-burnFront)*64.)*smoothstep(.001,.08,burn);
 float revealBand=exp(-abs(revealField-revealFront)*58.)*(1.-smoothstep(.94,1.,reveal));
 vec3 col=readMedia(vUv);vec4 label=texture(uLabel,vUv);col=mix(col,label.rgb,label.a);
 col+=hotColor(.96)*(burnBand*2.8+revealBand*2.4);
 outColor=vec4(max(col,0.),1.);
}
