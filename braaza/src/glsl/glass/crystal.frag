#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vLocal;in vec2 vUv;in vec4 vSurface,vCurrent,vPrevious;
layout(location=0) out vec4 outColor;layout(location=1) out vec4 outNormal;layout(location=2) out vec4 outVelocity;
uniform float uMediaAspect;uniform sampler2D uArt,uLabel,uBehind;uniform vec2 uResolution,uPointer;
uniform vec4 uTrail[6];uniform float uHover,uBurn,uIndex,uHasInternalScene;
#include "common/noise.glsl"
#include "common/lighting.glsl"
vec3 readMedia(vec2 uv){float aspect=max(uMediaAspect,.01),panelAspect=4.8/(2.25*.88);vec2 q=uv-.5;if(aspect>panelAspect)q.y*=aspect/panelAspect;else q.x*=panelAspect/aspect;q+=.5;if(min(q.x,q.y)<0.||max(q.x,q.y)>1.)return vec3(.001);return texture(uArt,q).rgb;}
void main(){
 vec2 size=vec2(4.8,2.25),p=(vUv-.5)*size;float d=sdRoundBox(p,size*.5-.016,.08),aa=max(fwidth(d),.001);if(d>aa)discard;
 if(uReflection>.5&&vWorld.y< -1.10)discard;
 float burn=smoothstep(.4,1.,uBurn),edgeCut=vUv.y*1.06-fbm(vUv*vec2(10,6)+uIndex)*.065;if(burn>.001&&edgeCut>1.-burn)discard;
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
 vec3 reflection=vec3(0.);if(uUseProbe>.5)reflection=textureLod(uProbe,reflect(-v,n),side>.5?.7:.15).rgb;
 for(int i=0;i<6;i++){vec3 l=normalize(uLightPos[i]-vWorld),h=safeNorm(l+v);float spec=pow(max(dot(n,h),0.),mix(240.,75.,side));reflection+=uLightColor[i]*spec/(1.+dot(uLightPos[i]-vWorld,uLightPos[i]-vWorld)*.025);}
 col=mix(col,reflection,fres*mix(.48,.80,side));
 float lamp=exp(-dot((vUv-uPointer)*size,(vUv-uPointer)*size)*1.6)*uHover;
 float warmth=0.;for(int i=0;i<6;i++){vec2 q=(vUv-uTrail[i].xy)*size;warmth+=exp(-dot(q,q)*3.)*exp(-max(uTime-uTrail[i].z,0.)*2.4)*uTrail[i].w;}warmth=min(warmth,1.5);
 float rim=exp(-abs(d+.028)*135.),inner=exp(-abs(d+.075)*36.);float edgeFlow=pow(.5+.5*sin(atan(p.y,p.x)*2.-uTime*.4+uIndex),20.);
 vec3 hot=hotColor(.40);col+=hot*(rim*(1.8+edgeFlow*4.2+lamp*2.5)+inner*(.20+lamp*.45));
 // A reflection shoulder on the bevel, not an opaque white overlay across the media.
 col+=vec3(.40,.48,.54)*exp(-abs(d+.115)*35.)*(.09+fres*1.4);
 float returned=exp(-abs(d+.17)*38.)*(.10+side*.65);
 float corner=pow(clamp(abs(p.x)*abs(p.y)/(2.4*1.125),0.,1.),18.);
 col+=hot*returned+vec3(1.,.72,.36)*corner*(.8+lamp*1.5);
 float fractures=exp(-cells(vUv*vec2(12,5.6)+uIndex*11.)*180.)*smoothstep(.55,.79,noise(vUv*vec2(9,4)+uIndex));
 col+=hot*(lamp*.019+warmth*.013+fractures*(lamp*.3+warmth*.18));
 float burning=exp(-abs(edgeCut-(1.-burn))*110.)*step(.01,burn);col+=hotColor(.8)*burning*5.;
 outColor=vec4(max(col,0.),smoothstep(0.,.06,1.-uBurn));outNormal=vec4(n*.5+.5,.75);
 outVelocity=vec4((vCurrent.xy/max(vCurrent.w,.001)-vPrevious.xy/max(vPrevious.w,.001))*.5,1.,1.);
}
