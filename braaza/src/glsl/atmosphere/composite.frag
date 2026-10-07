#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uScene,uFire,uVolume,uDepth;uniform vec2 uResolution;uniform vec4 uFireScreen[2];uniform float uTime;out vec4 outColor;
#include "common/noise.glsl"
float linearZ(float d){return .1*140./(140.-d*(140.-.1));}
void main(){vec2 uv=vUv;float z=linearZ(texture(uDepth,uv).r);vec2 warp=vec2(0.);
 for(int i=0;i<2;i++){vec4 source=uFireScreen[i];vec2 dp=uv-source.xy;float above=dp.y*(i==0?1.:-1.);float mask=exp(-pow(dp.x/.065,2.))*smoothstep(0.,.018,above)*(1.-smoothstep(.05,.23,above));mask*=step(source.z,z);warp+=vec2(flow(uv*22.+vec2(uTime*.35,0)),flow(uv*24.-uTime*.5))*.0025*mask;}
 vec3 base=texture(uScene,clamp(uv+warp,.001,.999)).rgb;vec4 fire=texture(uFire,uv);base=base*(1.-fire.a)+fire.rgb;
 // Bilateral reconstruction keeps coarse smoke samples from leaking across silhouettes.
 vec4 volume=vec4(0.);float total=0.;for(int y=0;y<2;y++)for(int x=0;x<2;x++){vec2 off=(vec2(x,y)-.5)*2./uResolution;float nz=linearZ(texture(uDepth,uv+off).r),w=exp(-abs(nz-z)*.45);volume+=texture(uVolume,uv+off)*w;total+=w;}volume/=max(total,.0001);
 outColor=vec4(base*(1.-volume.a)+volume.rgb,1.);}
