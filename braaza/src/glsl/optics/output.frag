#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uScene,uBloom0,uBloom1,uBloom2,uBloom3,uBloom4,uVisibility;uniform vec4 uFlare[2];uniform vec2 uResolution;uniform float uLensK,uAspect,uExposure,uBloomGain,uFlareGain,uAberration,uAaStrength;out vec4 outColor;
vec3 filmic(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
vec3 toSrgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,0.),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec2 lensUv(vec2 screenUv){vec2 p=(screenUv-.5)*2.*vec2(uAspect,1.);return .5+p*(1.+uLensK*dot(p,p))/(2.*vec2(uAspect,1.));}
vec3 sceneAt(vec2 screenUv){return texture(uScene,clamp(lensUv(screenUv),.001,.999)).rgb;}
vec3 fxaa(vec2 uv){
 vec2 px=1./uResolution;
 vec3 c=sceneAt(uv),n=sceneAt(uv+vec2(0.,px.y)),s=sceneAt(uv-vec2(0.,px.y)),e=sceneAt(uv+vec2(px.x,0.)),w=sceneAt(uv-vec2(px.x,0.));
 float lc=luma(c),ln=luma(n),ls=luma(s),le=luma(e),lw=luma(w);
 float lo=min(lc,min(min(ln,ls),min(le,lw))),hi=max(lc,max(max(ln,ls),max(le,lw))),range=hi-lo;
 if(range<max(.018,hi*.085))return c;
 float edgeH=abs(ln+ls-2.*lc),edgeV=abs(le+lw-2.*lc);
 vec2 dir=edgeH>edgeV?vec2(px.x,0.):vec2(0.,px.y);
 vec3 a=sceneAt(uv-dir*.55),b=sceneAt(uv+dir*.55);
 float strength=clamp(range*3.2,0.,1.)*uAaStrength;
 return mix(c,(a+b)*.5,strength);
}
void main(){
 vec2 uv=lensUv(vUv);
 vec3 c=fxaa(vUv);
 vec2 px=1./uResolution;
 vec3 local=(sceneAt(vUv+vec2(px.x,0.))+sceneAt(vUv-vec2(px.x,0.))+sceneAt(vUv+vec2(0.,px.y))+sceneAt(vUv-vec2(0.,px.y)))*.25;
 vec3 detail=clamp(c-local,vec3(-.08),vec3(.08));c=max(c+detail*(.09+.07*uAaStrength),0.);
 vec2 ca=(vUv-.5)*pow(length(vUv-.5)*1.414,3.)*uAberration/uResolution;
 vec3 chroma=vec3(sceneAt(vUv+ca).r,c.g,sceneAt(vUv-ca).b);
 c=mix(c,chroma,.34);
 vec3 bloom=texture(uBloom0,uv).rgb*.24+texture(uBloom1,uv).rgb*.24+texture(uBloom2,uv).rgb*.22+texture(uBloom3,uv).rgb*.18+texture(uBloom4,uv).rgb*.12;c+=bloom*uBloomGain;
 for(int i=0;i<2;i++){vec2 src=uFlare[i].xy;float visibility=texture(uVisibility,vec2((float(i)+.5)/2.,.5)).r*uFlareGain;vec2 dp=(uv-src)*vec2(uAspect,1.);float streak=exp(-abs(dp.x)*9.)*exp(-abs(dp.y)*1200.);float halo=exp(-dot(dp,dp)*130.);c+=vec3(1.,.35,.04)*(streak*.45+halo*.04)*visibility;
  for(int j=0;j<3;j++){vec2 ghost=.5+(.5-src)*(.32+float(j)*.38);float radius=.018+float(j)*.008;float d=length((uv-ghost)*vec2(uAspect,1.));float shape=exp(-pow(d/radius,4.));c+=vec3(.024,.010,.002)*shape*visibility/(1.+float(j));}}
 float vign=1.-.23*smoothstep(.25,.82,length((vUv-.5)*vec2(1.,.86)));c=toSrgb(filmic(max(c,0.)*uExposure*vign));
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);outColor=vec4(clamp(c+(grain-.5)*.0014,0.,1.),1.);
}
