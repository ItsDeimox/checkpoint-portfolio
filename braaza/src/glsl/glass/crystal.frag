#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vLocal;in vec2 vUv;in vec4 vSurface,vCurrent,vPrevious;
layout(location=0) out vec4 outColor;layout(location=1) out vec4 outNormal;layout(location=2) out vec4 outVelocity;
uniform float uMediaAspect;uniform sampler2D uArt,uLabel,uBehind;uniform vec2 uResolution,uPointer;
uniform vec4 uTrail[6];uniform float uHover,uBurn,uReveal,uIndex,uHasInternalScene;
#include "common/noise.glsl"
#include "common/lighting.glsl"
vec3 readMedia(vec2 uv){float aspect=max(uMediaAspect,.01),panelAspect=4.8/(2.25*.88);vec2 q=uv-.5;if(aspect>panelAspect)q.y*=aspect/panelAspect;else q.x*=panelAspect/aspect;q+=.5;if(min(q.x,q.y)<0.||max(q.x,q.y)>1.)return vec3(.001);return texture(uArt,q).rgb;}
void main(){
 vec2 size=vec2(4.8,2.25),p=(vUv-.5)*size;float d=sdRoundBox(p,size*.5-.016,.08),aa=max(fwidth(d),.001);if(d>aa)discard;
 if(uReflection>.5&&vWorld.y< -1.10)discard;

 // Lifecycle is based on the card center, reconstructed from the fragment UV.
 // It delays the upper dissolve and lets a wrapped card grow naturally out of the lower forge.
 float centerY=vWorld.y-(vUv.y-.5)*2.35;
 float reveal=clamp((centerY-1.45)/1.15+uReveal*0.,0.,1.);
 float burn=clamp((centerY-10.35)/1.55,0.,1.);
 float lifeNoise=fbm(vUv*vec2(8.5,5.2)+vec2(uIndex*2.7,uTime*.055));
 lifeNoise+=flow(vUv*vec2(17.,8.)+vec2(-uTime*.08,uIndex))*0.22;
 float exitField=vUv.y+lifeNoise*.14;
 float revealField=vUv.y+lifeNoise*.11;
 float burnFront=1.06-burn*1.10;
 float revealFront=mix(.025,1.08,reveal);
 if(burn>.001&&exitField>burnFront)discard;
 if(reveal<.999&&revealField>revealFront)discard;
 float burnBand=exp(-abs(exitField-burnFront)*64.)*smoothstep(.001,.08,burn);
 float revealBand=exp(-abs(revealField-revealFront)*58.)*(1.-smoothstep(.94,1.,reveal));

 vec3 n=normalize(vNormal),v=normalize(uCamera-vWorld);if(!gl_FrontFacing)n=-n;
 float ndv=clamp(abs(dot(n,v)),0.,1.),fres=.04+.96*pow(1.-ndv,5.);
 float side=1.-smoothstep(.80,.99,abs(n.z));
 float edge=exp(-abs(d)*14.),path=.26/max(ndv,.18);vec3 absorption=exp(-vec3(.10,.19,.28)*path*edge);
 vec2 screen=gl_FragCoord.xy/uResolution,gradient=normalize(p+vec2(.0001));
 vec2 bend=(gradient*edge*.0035+n.xy*.0045)*(1.+side*.8);
 vec3 transmitted=vec3(texture(uBehind,clamp(screen+bend*1.035,.001,.999)).r,texture(uBehind,clamp(screen+bend,.001,.999)).g,texture(uBehind,clamp(screen+bend*.965,.001,.999)).b);
 vec3 col;
 if(uHasInternalScene>.5&&uReflection<.5){col=mix(texture(uBehind,screen).rgb,transmitted,edge)*absorption;}
 else{col=readMedia(clamp(vUv+gradient*edge*.002,.001,.999));vec4 text=texture(uLabel,vUv);col=mix(col,text.rgb,text.a);col+=transmitted*edge*.018;}

 vec3 reflection=vec3(0.);if(uUseProbe>.5)reflection=textureLod(uProbe,reflect(-v,n),side>.5?.7:.12).rgb;
 for(int i=0;i<6;i++){vec3 l=normalize(uLightPos[i]-vWorld),h=safeNorm(l+v);float spec=pow(max(dot(n,h),0.),mix(250.,72.,side));reflection+=uLightColor[i]*spec/(1.+dot(uLightPos[i]-vWorld,uLightPos[i]-vWorld)*.025);}
 float lamp=exp(-dot((vUv-uPointer)*size,(vUv-uPointer)*size)*1.6)*uHover;
 col=mix(col,reflection,clamp(fres*mix(.58,.86,side)+lamp*.018,0.,.88));

 float warmth=0.;for(int i=0;i<6;i++){vec2 q=(vUv-uTrail[i].xy)*size;warmth+=exp(-dot(q,q)*3.)*exp(-max(uTime-uTrail[i].z,0.)*2.4)*uTrail[i].w;}warmth=min(warmth,1.5);
 float rim=exp(-abs(d+.028)*135.),inner=exp(-abs(d+.075)*36.);float edgeFlow=pow(.5+.5*sin(atan(p.y,p.x)*2.-uTime*.4+uIndex),20.);
 vec3 hot=hotColor(.40);col+=hot*(rim*(1.8+edgeFlow*4.2+lamp*2.8)+inner*(.20+lamp*.55));
 col+=vec3(.40,.48,.54)*exp(-abs(d+.115)*35.)*(.10+fres*1.55);
 float returned=exp(-abs(d+.17)*38.)*(.10+side*.65);
 float corner=pow(clamp(abs(p.x)*abs(p.y)/(2.4*1.125),0.,1.),18.);
 col+=hot*returned+vec3(1.,.72,.36)*corner*(.8+lamp*1.5);

 // Hover craters: dark micro-pits surrounded by a hot mineral rim near the cursor.
 float craterField=cells(vUv*vec2(18.,8.2)+vec2(uIndex*6.7,uTime*.035));
 float craterMask=lamp*smoothstep(.13,.86,noise(vUv*vec2(7.5,5.2)+uIndex*3.));
 float craterRim=exp(-craterField*70.)*craterMask;
 float craterCore=exp(-craterField*210.)*craterMask;
 col*=1.-craterCore*.16;
 col+=hotColor(.92)*(craterRim*2.35+craterCore*.45);

 float fractures=exp(-cells(vUv*vec2(13.5,6.4)+uIndex*11.)*145.)*smoothstep(.45,.79,noise(vUv*vec2(9,4)+uIndex));
 col+=hot*(lamp*.024+warmth*.016+fractures*(lamp*.52+warmth*.20));
 col+=hotColor(.98)*(burnBand*6.2+revealBand*5.0);
 float charBand=exp(-abs(exitField-burnFront)*18.)*burn+exp(-abs(revealField-revealFront)*18.)*(1.-reveal);
 col*=1.-charBand*.10;
 outColor=vec4(max(col,0.),1.);outNormal=vec4(n*.5+.5,.75);
 outVelocity=vec4((vCurrent.xy/max(vCurrent.w,.001)-vPrevious.xy/max(vPrevious.w,.001))*.5,1.,1.);
}
