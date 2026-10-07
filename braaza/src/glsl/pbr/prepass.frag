#version 300 es
precision highp float;
in vec3 vNormal;in vec4 vCurrent,vPrevious;
layout(location=0) out vec4 outNormal;layout(location=1) out vec4 outVelocity;
void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;outNormal=vec4(n*.5+.5,0.);outVelocity=vec4((vCurrent.xy/max(vCurrent.w,.001)-vPrevious.xy/max(vPrevious.w,.001))*.5,0,1);}
