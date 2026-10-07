#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vLocal;in vec2 vUv;in vec4 vSurface,vCurrent,vPrevious;
uniform float uTime,uSeed,uFall,uReflection;out vec4 outColor;
#include "common/noise.glsl"
void main(){if(uReflection>.5&&vWorld.y< -1.10)discard;
 vec2 uv=vUv;
 if(uFall>.5){
  // Anisotropic advected channels run down the fall. Never stretch the pool's cellular crust vertically.
  float curl=flow(vec2(uv.x*3.+uSeed,uv.y*4.2+uTime*.55));
  float edgeX=uv.x+curl*.045;
  float mask=smoothstep(.025,.18,edgeX)*(1.-smoothstep(.81,.975,edgeX));
  mask*=smoothstep(0.,.28,uv.y)*(1.-smoothstep(.975,1.,uv.y));
  vec2 p=vec2(uv.x*22.+curl*2.3,uv.y*5.5+uTime*(1.62+uSeed*.009));
  float channel=pow(noise(p),3.1),filament=pow(noise(p*vec2(2.3,.45)+uSeed),7.);
  float crust=smoothstep(.32,.66,noise(p*vec2(.5,.70)+2.));
  float heat=clamp(channel*.94+filament*.60,0.,1.);
  float alpha=mask*(.50+.50*smoothstep(.03,.35,channel+filament));
  vec3 color=vec3(.042,.004,.0004)+hotColor(heat)*(channel*5.5+filament*12.+(1.-crust)*.22);
  outColor=vec4(color*alpha*pulse(uTime,uSeed),alpha);return;
 }
 vec2 q=(uv-.5)*2.;float radius=length(q);if(radius>1.)discard;
 float mask=1.-smoothstep(.90,1.,radius);vec2 p=q*4.3;
 p+=vec2(flow(p*.7+uTime*.04),flow(p*.8+7.-uTime*.06));float seam=cells(p),fissure=exp(-seam*23.);
 float stream=pow(max(noise(p*vec2(3.,.28)),0.),3.);
 float molten=clamp(fissure*.8+stream*.6,0.,1.);float crust=smoothstep(.32,.62,fbm(p*.8));
 vec3 c=vec3(.015,.002,.0005)+hotColor(molten*.8)*(molten*9.+(1.-crust)*1.3+.10);
 outColor=vec4(c*mask*pulse(uTime,uSeed),mask);
}
