#version 300 es
precision highp float;
in vec2 vUv;uniform vec2 uResolution,uPointer;uniform float uTime;out vec4 outColor;
#include "common/noise.glsl"
void main(){vec2 uv=vUv,p=(uv-.5)*vec2(uResolution.x/uResolution.y,1.);p+=uPointer*.008;
 float t=uTime*.015,cloud=fbm(p*5.+vec2(t,-t)),cloud2=fbm(p*11.+vec2(cloud,t));
 float opening=exp(-pow((p.x-.65)/.28,2.)-pow((uv.y-.77)/.33,2.));
 float lower=exp(-pow((uv.y-.24)/.26,2.));
 vec3 c=vec3(.006,.008,.012)+vec3(.047,.055,.064)*pow(cloud2,2.)+vec3(.30,.23,.19)*opening*pow(cloud,1.7);
 c+=vec3(.14,.026,.003)*lower*pow(cloud,3.);c*=.6+.4*opening;outColor=vec4(c,1.);
}
