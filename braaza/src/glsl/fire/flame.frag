#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vLocal;in vec2 vUv;in vec4 vSurface,vCurrent,vPrevious;
uniform float uTime,uSeed,uOpacity,uReflection;out vec4 outColor;
#include "common/noise.glsl"
void main(){if(uReflection>.5&&vWorld.y< -1.10)discard;
 float y=vUv.y;vec2 p=vec2((vUv.x-.5)*3.8,y*3.6-uTime*(1.18+uSeed*.017));
 float curl=flow(p*1.25+uSeed*3.4),detail=perlin(p*3.8+vec2(uSeed,-uTime*.19));
 float width=.38*pow(max(1.-y,0.),.65)+.018;
 float x=vUv.x-.5+curl*(.10+y*.34)+sin(y*7.-uTime*.8+uSeed)*y*.052;
 float density=smoothstep(.08,.78,1.-abs(x)/width+curl*.9+detail*.28-y*.56);
 density*=.58+.42*smoothstep(-.28,.32,perlin(p*3.2+uSeed));
 float alpha=density*(1.-smoothstep(.72,1.,y))*smoothstep(0.,.025,y)*uOpacity;
 float core=clamp(density*(1.-y)*(.67+curl*.55+detail*.3),0.,1.);
 vec3 radiance=flameColor(core)*(3.+core*10.)*pulse(uTime,uSeed>16.?3.:0.);
 outColor=vec4(radiance*alpha,alpha);
}
