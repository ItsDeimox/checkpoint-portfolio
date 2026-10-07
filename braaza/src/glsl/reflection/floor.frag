#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vLocal;in vec2 vUv;in vec4 vSurface,vCurrent,vPrevious;
layout(location=0) out vec4 outColor;layout(location=1) out vec4 outNormal;layout(location=2) out vec4 outVelocity;
uniform float uReflectionEnabled;uniform sampler2D uReflectionMap;uniform mat4 uReflectVP;uniform vec2 uReflectSize;
#include "common/noise.glsl"
#include "common/lighting.glsl"
void main(){vec2 p=vWorld.xz;float grain=fbm(p*vec2(4.,19.));vec3 n=normalize(vec3((noise(p*7.)-.5)*.025,1.,(noise(p*11.+2.)-.5)*.025));
 vec4 clip=uReflectVP*vec4(vWorld,1.);vec2 uv=clip.xy/clip.w*.5+.5;
 vec2 warp=vec2(flow(p*4.+vec2(uTime*.02,0)),flow(p*vec2(3.,16.)))*.006;uv+=warp;
 float wet=smoothstep(.20,.65,fbm(p*.8)),rough=mix(.35,.10,wet),radius=rough*5.;
 vec3 reflection=vec3(0.);float sum=0.;for(int i=0;i<9;i++){float a=float(i)*2.399963;float weight=i==0?2.:1.;reflection+=texture(uReflectionMap,clamp(uv+vec2(cos(a),sin(a))*sqrt(float(i))*radius/uReflectSize,.001,.999)).rgb*weight;sum+=weight;}reflection/=sum;
 float nv=abs(dot(n,normalize(uCamera-vWorld))),fres=.10+.70*pow(1.-nv,4.);
 float lines=min(abs(fract(p.x*.65)-.5),abs(fract(p.y*.85)-.5));float mortar=smoothstep(.004,.025,lines);
 vec3 base=illuminate(vWorld,n,vec3(.021,.021,.024)*mortar,rough,0.,.6);
 vec3 col=base+reflection*uReflectionEnabled*fres*(.4+wet*.6)*(.73+grain*.27);
 outColor=vec4(max(col,0.),1.);outNormal=vec4(n*.5+.5,0.);outVelocity=vec4((vCurrent.xy/vCurrent.w-vPrevious.xy/max(vPrevious.w,.001))*.5,0,1);
}
