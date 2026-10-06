#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene,uBloom,uBloomWide,uBloomAtmosphere,uBloomVeil;
uniform vec2 uResolution;
uniform float uHeroWeight,uCubeWeight;
uniform float uExposure,uBloomStrength,uVelocity,uTime,uReduced;
out vec4 outColor;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float random(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 float velocity=clamp(uVelocity*.0006,-.006,.006)*(1.-uReduced);
 vec2 texel=1./uResolution;
 vec3 color=vec3(0.);float sum=0.;
 for(int i=-3;i<=3;i++){
  float w=exp(-float(i*i)*.4);color+=texture(uScene,clamp(vUv+vec2(float(i)*velocity,0.),.001,.999)).rgb*w;sum+=w;
 }
 color/=sum;
 vec3 bloom=(texture(uBloom,vUv).rgb*.95+texture(uBloomWide,vUv).rgb*.82)*uBloomStrength;
 color+=bloom;
 float cubeBloomMix=clamp(uCubeWeight,0.0,1.0);
 float lens=exp(-pow(abs(vUv.x-.5)/.42,2.0)-pow(abs(vUv.y-.5)/.28,2.0))*dot(bloom,vec3(.333));
 color+=bloom*(0.045 - cubeBloomMix*0.022) + lens*(0.032 - cubeBloomMix*0.018);
 if(uHeroWeight>.001||uCubeWeight>.001){
  float opticalWeight=max(uHeroWeight,uCubeWeight*.42);
  vec3 air=texture(uBloomAtmosphere,vUv).rgb;
  vec3 veil=texture(uBloomVeil,vUv).rgb;
  color+=(air*.18+veil*.14)*opticalWeight;
  vec3 streak=vec3(0.);
  for(int i=-3;i<=3;i++){
   streak+=texture(uBloomAtmosphere,vUv+vec2(float(i)*.006,0.)).rgb*exp(-float(i*i)*.35);
  }
  color+=streak*.0065*opticalWeight;
 }
 float vignette=1.-.20*smoothstep(.35,.78,length(vUv-.5));
 color=pow(aces(color*uExposure*vignette),vec3(1./2.2));
 color+=(random(gl_FragCoord.xy)-.5)*.004;
 outColor=vec4(color,1.);
}