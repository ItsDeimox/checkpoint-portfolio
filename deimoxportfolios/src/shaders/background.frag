#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uGround;
uniform vec2 uResolution,uPointer;
uniform float uTime,uMobile,uReduced,uProgress;
uniform vec3 uTheme;
uniform float uHeroWeight,uPulse;
uniform vec2 uAccent;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.05+1.7;a*=.5;}return v;}
void main(){
 float aspect=uResolution.x/uResolution.y;
 vec2 uv=vUv;vec2 par=uPointer*.004*(1.-uReduced);
 float clock=uTime*.016*(1.-uReduced);
 uv.y+=sin(uProgress*3.14159)*.023;
 vec2 p=uv*vec2(aspect*4.,4.)+par;
 float warp=fbm(p*.7+vec2(0.,clock));
 float clouds=fbm(p+warp*3.+vec2(clock,0.));
 vec2 center=mix(vec2(.626,.51),vec2(.51,.37),uMobile);
 center.y-=.026*uHeroWeight;
 float radial=length((uv-center-par)*vec2(aspect,1.));
 float radius=mix(.428,.274,uMobile);
 float inside=1.-smoothstep(radius-.07,radius+.02,radial);
 float processStage=smoothstep(1.10,1.95,uProgress);
 float shell=(1.-processStage)*exp(-pow((radial-radius)/.0023,2.));
 float upper=smoothstep(center.y+.05,center.y+radius-.01,uv.y);
 float rimLight=exp(-pow((uv.x-center.x+.019)*aspect/.13,2.))*upper;
 vec3 col=vec3(.0012,.00135,.0016);
 col+=vec3(.012,.014,.017)*inside*clouds;
 col+=vec3(.28,.31,.34)*shell*(.02+pow(upper,3.)*.20+rimLight*1.2);
 col+=vec3(.06,.068,.078)*exp(-pow((radial-radius)/.038,2.))*upper*clouds*(1.-processStage);
 float mist=exp(-pow((uv.y-mix(.36,.21,uMobile))/.13,2.))*exp(-pow((uv.x-.66)/.32,2.));
 col+=vec3(.060,.067,.075)*mist*pow(clouds,2.5);
 float filament=pow(max(fbm(p*2.8+warp*2.)-.40,0.),2.3)*mist;
 col+=vec3(.095)*filament;
 // Independent terrain plate, with a restrained heat-haze warp and multi-plane parallax.
 float horizon=mix(.276,.12,uMobile);
 float groundMix=1.-smoothstep(horizon-.018,horizon+.014,uv.y);
 vec2 guv=vec2(clamp(uv.x+par.x*1.5,0.,1.),clamp(uv.y/(horizon+.002),0.,1.));
 guv.x+=sin(guv.y*35.+clock)*.0007;
 vec3 ground=texture(uGround,guv).rgb*.8;
 ground*=mix(vec3(1.),uTheme,.22);
 col=mix(col,ground,groundMix);
 // Distant stars are stable points, not screen-space white noise.
 vec2 cell=floor(uv*vec2(aspect,1.)*330.);vec2 local=fract(uv*vec2(aspect,1.)*330.)-.5;
 float star=step(.9984,hash(cell))*exp(-dot(local,local)*45.);
 col+=vec3(star*.12)*(1.-groundMix)*smoothstep(.20,.70,uv.x);
 col*=mix(vec3(1.),uTheme,.32);
 col+=uTheme*.024*exp(-pow((uv.x-.68)/.30,2.)-pow((uv.y-.35)/.20,2.));
 col*=mix(.55,1.,smoothstep(.03,.44,uv.x));
 if(uHeroWeight>.001){
  // An LDR terrain plate cannot invent HDR information. Lift existing specular
  // detail in linear light and add a simulated grazing reflection from the hero.
  float terrainLod=mix(2.4,.05,smoothstep(.0,.18,uv.y));
  vec3 terrain=textureLod(uGround,guv,terrainLod).rgb;
  float detail=max(max(terrain.r,terrain.g),terrain.b);
  vec3 terrainTint=mix(vec3(1.),uTheme,.50);
  vec3 wet=terrain*terrainTint*1.15+terrainTint*pow(detail,3.2)*1.8;
  float grazing=exp(-pow((uv.x-uAccent.x)/.16,2.));
  float travelMask=.55+.45*sin(guv.y*84.+guv.x*7.);
  wet+=terrainTint*pow(detail,.85)*grazing*(.42+uPulse*.26)*travelMask;
  float shadowLeft=mix(.55,1.,smoothstep(.03,.44,uv.x));
  vec3 oldGround=ground*mix(vec3(1.),uTheme,.32)*shadowLeft;
  col+=(wet*shadowLeft-oldGround)*groundMix*uHeroWeight;
  float atmosphere=exp(-pow((radial-radius)/.018,2.));
  float hot=pow(max(upper,0.),2.)*(.40+.60*rimLight);
  col+=uTheme*(shell*(.60+rimLight*1.2)+atmosphere*.07)*hot*uHeroWeight;
  float localMist=exp(-pow((uv.x-uAccent.x)/.21,2.)-pow((uv.y-.32)/.11,2.));
  col+=uTheme*localMist*(.014+.025*uPulse)*(.3+.7*clouds)*uHeroWeight;
 }
 outColor=vec4(col,1.);
}
