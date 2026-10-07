#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vLocal,vMaterialNormal;
uniform float uInstanced;in vec2 vUv;in vec4 vSurface,vCurrent,vPrevious;
layout(location=0) out vec4 outColor;
layout(location=1) out vec4 outNormal;
layout(location=2) out vec4 outVelocity;
#include "common/noise.glsl"
#include "common/lighting.glsl"
void main(){
 if(uReflection>.5&&vWorld.y< -1.10)discard;
 float kind=vSurface.x,heat=vSurface.y,seed=vSurface.z,metal=step(.5,kind)*(1.-step(1.5,kind));
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 vec3 coord=mix(vWorld,vLocal*1.35,uInstanced);vec3 weights=pow(abs(normalize(vMaterialNormal)),vec3(6.));weights/=max(dot(weights,vec3(1)),.001);
 vec2 q=coord.xy*1.65+seed;float grain=noise(q*42.),vein;
 if(kind<1.5){float x=cells(coord.yz*1.7+seed),y=cells(coord.xz*1.7+seed),z=cells(coord.xy*1.7+seed);vein=dot(vec3(x,y,z),weights);}
 else vein=cells(q+vec2(fbm(q),fbm(q+8.))*.8);
 float crack=1.-smoothstep(.004,.006+max(fwidth(vein)*.7,.002),vein);
 float rough=mix(.30,.16,metal)+grain*.065;
 vec3 albedo=mix(vec3(.009,.010,.014),vec3(.13,.15,.18),metal)*(.7+grain*.3);
 float height=fbm(q*1.5)*.012+noise(q*9.)*.0012;
 if(kind>2.5&&kind<3.5){vec2 brick=vec2(abs(n.x)>.5?vWorld.z:vWorld.x,vWorld.y);float mortar=min(abs(fract(brick.y*1.3)-.5),abs(fract(brick.x*.63+step(.5,fract(brick.y*.65))*.5)-.5));float joints=smoothstep(.003,.028,mortar);albedo=vec3(.009,.009,.013)*(.50+.50*joints);rough=.36+grain*.10;height+=joints*.006;}
 height*=mix(1.,.06,metal);
 vec3 dx=dFdx(vWorld),dy=dFdy(vWorld),r1=cross(dy,n),r2=cross(n,dx);float det=dot(dx,r1);
 vec3 bump=(dFdx(height)*r1+dFdy(height)*r2)/(det<0.?-max(abs(det),1e-7):max(abs(det),1e-7));n=normalize(n-bump);
 rough=max(rough,sqrt(clamp(length(fwidth(n))*.15,0.,.6)));
 vec3 col=illuminate(vWorld,n,albedo,rough,metal,vSurface.w);
 if(kind>2.5&&kind<3.5)heat*=.12;
 float pockets=smoothstep(.39,.65,fbm(q*.6));float glow=heat*pockets*pulse(uTime,seed);
 col+=hotColor(glow)*(crack*2.4+exp(-vein*40.)*.20)*glow;
 if(kind>1.5&&kind<2.5)col=hotColor(heat*.7)*(1.8+heat*4.)*pulse(uTime,seed);
 if(kind>3.5&&kind<4.5){float stripe=smoothstep(.36,.5,abs(vUv.x-.5));col=illuminate(vWorld,n,mix(vec3(.038,.01,.007),vec3(.055,.022,.011),stripe),.79,0.,1.);}
 if(kind>4.5)col=hotColor(.60)*3.6;
 float fog=1.-exp(-max(length(uCamera-vWorld)-20.,0.)*.018);
 col=mix(col,fogColor(vWorld),fog);outColor=vec4(max(col,0.),1.);
 outNormal=vec4(n*.5+.5,0.);
 vec2 now=vCurrent.xy/max(vCurrent.w,.001),previous=vPrevious.xy/max(vPrevious.w,.001);outVelocity=vec4((now-previous)*.5,0,1);
}
