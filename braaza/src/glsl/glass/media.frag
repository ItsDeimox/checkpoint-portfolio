#version 300 es
precision highp float;
in vec3 vWorld,vLocal;in vec2 vUv;in vec4 vCurrent,vPrevious;
uniform float uMediaAspect;uniform sampler2D uArt,uLabel;uniform float uBurn,uReveal,uIndex,uTime;out vec4 outColor;
#include "common/noise.glsl"
vec3 readMedia(vec2 uv){float aspect=max(uMediaAspect,.01),panelAspect=4.8/(2.25*.88);vec2 q=uv-.5;if(aspect>panelAspect)q.y*=aspect/panelAspect;else q.x*=panelAspect/aspect;q+=.5;if(min(q.x,q.y)<0.||max(q.x,q.y)>1.)return vec3(.001);return texture(uArt,q).rgb;}
void main(){vec2 p=(vUv-.5)*vec2(4.8,2.25);if(sdRoundBox(p,vec2(2.4,1.125)-.055,.1)>.0)discard;
 float reveal=clamp(uReveal,0.,1.),burn=clamp(uBurn,0.,1.);
 float lifeNoise=fbm(vUv*vec2(8.5,5.2)+vec2(uIndex*2.7,uTime*.055))+flow(vUv*vec2(17.,8.)+vec2(-uTime*.08,uIndex))*.22;
 float exitField=vUv.y+lifeNoise*.14,revealField=vUv.y+lifeNoise*.11;
 float burnFront=1.08-burn*1.16,revealFront=mix(-.06,1.08,reveal);
 float exitCoverage=burn<.001?1.:1.-smoothstep(burnFront-.028,burnFront+.028,exitField);
 float revealCoverage=reveal>.999?1.:1.-smoothstep(revealFront-.028,revealFront+.028,revealField);
 float coverage=min(exitCoverage,revealCoverage);if(coverage<.012)discard;
 float burnBand=exp(-abs(exitField-burnFront)*60.)*smoothstep(.001,.12,burn);
 float revealBand=exp(-abs(revealField-revealFront)*56.)*(1.-smoothstep(.92,1.,reveal));
 vec3 col=readMedia(vUv);float mediaLuma=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(mediaLuma),col,1.10)*1.025;vec4 label=texture(uLabel,vUv);col=mix(col,label.rgb,label.a);
 col+=hotColor(.96)*(burnBand*3.2+revealBand*2.8);
 outColor=vec4(max(col,0.),coverage);
}
