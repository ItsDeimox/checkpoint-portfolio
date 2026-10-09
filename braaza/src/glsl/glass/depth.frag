#version 300 es
precision highp float;
in vec3 vLocal;
uniform float uCardY,uIndex;
out vec4 outColor;
#include "glass/lifecycle.glsl"
void main(){if(forgeLifecycle(vLocal.xy,uCardY,uIndex).x<.5)discard;outColor=vec4(0.);}
