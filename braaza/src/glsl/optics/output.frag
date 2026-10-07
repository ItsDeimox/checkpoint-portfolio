#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uScene,uBloom0,uBloom1,uBloom2,uBloom3,uBloom4,uVisibility;uniform vec4 uFlare[2];uniform vec2 uResolution;uniform float uLensK,uAspect,uExposure,uBloomGain,uFlareGain,uAberration;out vec4 outColor;
vec3 filmic(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
vec3 toSrgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,0.),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
void main(){vec2 p=(vUv-.5)*2.*vec2(uAspect,1.);vec2 uv=.5+p*(1.+uLensK*dot(p,p))/(2.*vec2(uAspect,1.));
 vec2 ca=(uv-.5)*pow(length(vUv-.5)*1.414,3.)*uAberration/uResolution;
 vec3 c=vec3(texture(uScene,uv+ca).r,texture(uScene,uv).g,texture(uScene,uv-ca).b);
 vec3 bloom=texture(uBloom0,uv).rgb*.24+texture(uBloom1,uv).rgb*.24+texture(uBloom2,uv).rgb*.22+texture(uBloom3,uv).rgb*.18+texture(uBloom4,uv).rgb*.12;c+=bloom*uBloomGain;
 for(int i=0;i<2;i++){vec2 src=uFlare[i].xy;float visibility=texture(uVisibility,vec2((float(i)+.5)/2.,.5)).r*uFlareGain;vec2 dp=(uv-src)*vec2(uAspect,1.);float streak=exp(-abs(dp.x)*9.)*exp(-abs(dp.y)*1200.);float halo=exp(-dot(dp,dp)*130.);c+=vec3(1.,.35,.04)*(streak*.45+halo*.04)*visibility;
  for(int j=0;j<3;j++){vec2 ghost=.5+(.5-src)*(.32+float(j)*.38);float radius=.018+float(j)*.008;float d=length((uv-ghost)*vec2(uAspect,1.));float shape=exp(-pow(d/radius,4.));c+=vec3(.024,.010,.002)*shape*visibility/(1.+float(j));}}
 float vign=1.-.23*smoothstep(.25,.82,length((vUv-.5)*vec2(1.,.86)));c=toSrgb(filmic(max(c,0.)*uExposure*vign));
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);outColor=vec4(clamp(c+(grain-.5)*.0014,0.,1.),1.);}
