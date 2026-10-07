#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
uniform mat4 uVP;uniform float uTime,uDpr,uReduced,uMotion;out float vLife,vSeed,vBig;
void main(){float seed=aPosition.z,life=fract(aPosition.y+uTime*(.042+seed*.031)*(1.-uReduced));float y=-.2+life*13.;float x=aPosition.x+sin(life*8.+aPosition.y*24.+uTime*.24)*(.16+life*.56);float z=2.5-seed*8.;
 vec4 clip=uVP*vec4(x,y,z,1.);gl_Position=clip;vBig=step(.976,seed);
 gl_PointSize=clamp((2.7+seed*4.+vBig*10.)*uDpr*13./max(clip.w,.1),1.,20.);vLife=life;vSeed=seed;}
