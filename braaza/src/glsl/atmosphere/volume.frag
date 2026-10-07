#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uDepth;uniform mat4 uInverseVP;uniform float uSteps;out vec4 outColor;
#include "common/noise.glsl"
#include "common/lighting.glsl"
void main(){float depth=texture(uDepth,vUv).r;vec4 far=uInverseVP*vec4(vUv*2.-1.,depth*2.-1.,1.);vec3 end=far.xyz/far.w,dir=normalize(end-uCamera);float maximum=min(length(end-uCamera),58.);
 float trans=1.;vec3 scatter=vec3(0.);float ds=maximum/uSteps,jitter=hash21(gl_FragCoord.xy);
 for(int i=0;i<32;i++){if(float(i)>=uSteps)break;vec3 p=uCamera+dir*((float(i)+jitter)*ds);
  float foot=exp(-pow((p.y-1.1)/1.15,2.)),high=exp(-pow((p.y-12.6)/1.4,2.))*.45;
  float lateral=smoothstep(3.,7.,abs(p.x)),center=exp(-p.x*p.x*.09),distanceFade=1.-smoothstep(25.,60.,length(p.xz));
  float cloud=fbm(p.xz*.47+vec2(p.y*.65,-uTime*.10)),density=(foot*(.018+lateral*.06)+high*center*.045)*smoothstep(.20,.69,cloud)*distanceFade;
  if(density<.001)continue;
  vec3 light=vec3(.065,.078,.095);for(int j=0;j<4;j++){vec3 ld=uLightPos[j]-p;float att=1./(1.+dot(ld,ld)*.09);float visibility=1.;if(j==0&&uShadows>.5){vec4 c=uLightVP0*vec4(p,1);vec3 q=c.xyz/c.w*.5+.5;if(c.w>0.&&min(q.x,q.y)>0.&&max(q.x,q.y)<1.&&q.z<1.)visibility=mix(.10,1.,step(q.z-.002,texture(uShadow0,q.xy).r));}light+=uLightColor[j]*att*.014*visibility;}
  float segment=exp(-density*ds);scatter+=trans*(1.-segment)*light;trans*=segment;
 }
 outColor=vec4(max(scatter,0.),clamp(1.-trans,0.,.8));}
