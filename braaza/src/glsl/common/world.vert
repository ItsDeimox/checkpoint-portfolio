#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aSurface;
layout(location=4) in mat4 aInstance;
layout(location=8) in mat4 aPreviousInstance;
layout(location=12) in vec4 aInstanceSurface;
uniform mat4 uModel,uPreviousModel,uVP,uPreviousVP;
uniform vec4 uSurface;
uniform float uInstanced,uVertexSurface,uTime,uPreviousTime,uHistory,uCloth;
out vec3 vWorld,vNormal,vLocal,vMaterialNormal;
out vec2 vUv;
out vec4 vSurface,vCurrent,vPrevious;
vec3 deform(vec3 p,float t){if(uCloth>.5){p.z+=(sin(p.y*3.+p.x*2.+t*.48)*.065+sin(p.y*6.-t*.39)*.024)*(1.-aUv.y);}return p;}
void main(){mat4 model=uInstanced>.5?aInstance:uModel,previous=uInstanced>.5?aPreviousInstance:uPreviousModel;
 vec3 p=deform(aPosition,uTime);vec4 world=model*vec4(p,1.);vLocal=aPosition;vMaterialNormal=aNormal;vWorld=world.xyz;
 vNormal=normalize(mat3(transpose(inverse(model)))*aNormal);vUv=aUv;
 vSurface=uInstanced>.5?aInstanceSurface:(uVertexSurface>.5?aSurface:uSurface);
 vCurrent=uVP*world;vPrevious=uHistory>.5?uPreviousVP*previous*vec4(deform(aPosition,uPreviousTime),1.):vCurrent;
 gl_Position=vCurrent;
}
