export const noiseGLSL=`
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+1.),f.x),f.y);}
float fbm4(vec2 p){float f=0.;f+=.5*noise2(p);p=mat2(1.6,1.2,-1.2,1.6)*p;f+=.25*noise2(p);p=mat2(1.6,1.2,-1.2,1.6)*p;f+=.125*noise2(p);p=mat2(1.6,1.2,-1.2,1.6)*p;return f+.0625*noise2(p);}
`;
export const roomVertex=`varying vec2 vUv;varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
export const displayFragment=`
precision highp float;uniform sampler2D artwork;uniform sampler2D contentMap;uniform float contentMix;uniform mat3 projection;uniform float hover;uniform float hoverTime;uniform vec2 hoverUv;uniform float eraseForeground;varying vec2 vUv;
#include <fog_pars_fragment>
${noiseGLSL}
// Restore only artwork hidden by the photographed foreground car. This keeps a
// second, printed roof from becoming visible when the real camera moves sideways.
float foregroundRoof(float x){
float y=.590;y-=.024*clamp((x-.399)/.020,0.,1.);y-=.056*clamp((x-.419)/.038,0.,1.);
y-=.012*clamp((x-.457)/.023,0.,1.);y-=.006*clamp((x-.480)/.060,0.,1.);
y+=.015*clamp((x-.540)/.048,0.,1.);y+=.029*clamp((x-.588)/.035,0.,1.);
y+=.030*clamp((x-.623)/.034,0.,1.);y+=.022*clamp((x-.657)/.033,0.,1.);return y;}
void main(){vec2 p=vec2(vUv.x,1.-vUv.y);vec3 h=projection*vec3(p,1.);vec2 source=h.xy/h.z;vec3 c=texture2D(artwork,vec2(source.x,1.-source.y)).rgb;
float hidden=eraseForeground*smoothstep(.399,.403,source.x)*(1.-smoothstep(.691,.695,source.x))*smoothstep(foregroundRoof(source.x)-.0015,foregroundRoof(source.x)+.0015,source.y);
float wallGrain=noise2(source*1024.);vec3 clean=vec3(.009,.010,.013)*(.65+wallGrain*.35);
clean+=vec3(.035,.001,.002)*exp(-pow((source.y-.56)*20.,2.))*(.5+.5*noise2(source*80.));c=mix(c,clean,hidden);
// The source is artwork printed on each physical display, never the scene backdrop.
float edge=min(min(p.x,1.-p.x),min(p.y,1.-p.y));
// Canvas content uses this same rigid mesh's UVs, including the reflection.
// Only the emitted surface changes. No vertex or camera-facing transform.
c=mix(c*1.13,texture2D(contentMap,vUv).rgb*1.1,contentMix);
float halo=exp(-dot(vUv-hoverUv,vUv-hoverUv)*27.);
c*=1.+hover*.11*(1.-contentMix*.65);
c+=vec3(.16,.004,.014)*hover*exp(-edge*85.);
c+=vec3(.055,.003,.008)*hover*halo*(1.-contentMix*.75);
// Emissive overlay only: the real surface and its UVs remain rigid.
float pixel=max(fwidth(p.y),.0005);
float sweepDistance=abs(fract(p.y-hoverTime*.12)-.5);
float sweep=1.-smoothstep(.004,.004+pixel*2.,sweepDistance);
vec2 cell=fract(p*vec2(18.,28.)),gridWidth=max(fwidth(p*vec2(18.,28.)),vec2(.001));
float horizontal=1.-smoothstep(.025,.025+gridWidth.y,abs(cell.y-.5));
float vertical=1.-smoothstep(.018,.018+gridWidth.x,abs(cell.x-.5));
float gate=step(.72,hash21(floor(p*vec2(18.,28.))));
float tech=(horizontal*.75+vertical*.25)*gate;
float rim=exp(-edge*140.);
float readable=1.-contentMix*.84;
c+=vec3(1.85,.012,.044)*hover*(rim*.6+sweep*.42+tech*.17)*readable;
c+=vec3(.10,.001,.006)*hover*halo*readable;
gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}`;
export const floorVertex=`uniform mat4 textureMatrix;varying vec4 vReflection;varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;vReflection=textureMatrix*vec4(position,1.);vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
export const perlinWaterGLSL=`
vec2 waterGradient(vec2 p){float a=hash21(p)*6.2831853;return vec2(cos(a),sin(a));}
float waterPerlin(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);
 float a=dot(waterGradient(i),f),b=dot(waterGradient(i+vec2(1.,0.)),f-vec2(1.,0.));
 float c=dot(waterGradient(i+vec2(0.,1.)),f-vec2(0.,1.)),d=dot(waterGradient(i+1.),f-1.);
 return mix(mix(a,b,u.x),mix(c,d,u.x),u.y)*1.41421356;}
float waterFbm3(vec2 p){float n=.57142857*waterPerlin(p);p=mat2(1.6,1.2,-1.2,1.6)*p;
 n+=.28571429*waterPerlin(p);p=mat2(1.6,1.2,-1.2,1.6)*p;return n+.14285714*waterPerlin(p);}
`;
export const floorFragment=`precision highp float;uniform sampler2D tDiffuse;uniform vec3 color;uniform float time;uniform float turntableAngle;uniform vec2 reflectionResolution;varying vec4 vReflection;varying vec3 vWorld;${noiseGLSL}${perlinWaterGLSL}
#include <fog_pars_fragment>
void main(){
 vec2 centered=vWorld.xz-vec2(0.,1.458534911);float radius=length(centered);
 float rotor=1.-smoothstep(5.14,5.17,radius);float a=-turntableAngle,c=cos(a),s=sin(a);
 vec2 p=mix(vWorld.xz,mat2(c,-s,s,c)*centered+vec2(0.,1.458534911),rotor);
 vec2 warp=vec2(waterPerlin(p*.23+2.),waterPerlin(p*.23-7.))*.32;
 float waterField=.5+.5*waterFbm3(p*.54+warp+vec2(2.1,7.3));
 float puddle=smoothstep(.40,.62,waterField);
 float grainVisibility=1.-smoothstep(.3,1.2,length(fwidth(p*110.)));
 float stone=mix(.5,noise2(p*110.),grainVisibility),patches=fbm4(p*5.1);
 float rough=mix(.42,.022,puddle);
 vec2 ripple=vec2(waterPerlin(p*2.5+vec2(time*.012,0.)),waterPerlin(p*3.1+vec2(0.,-time*.009)));
 vec2 dryNormal=vec2(noise2(p*17.1),noise2(p*19.7+11.))-.5;
 vec2 uv=vReflection.xy/vReflection.w;
 uv+=mix(dryNormal*vec2(.0018,.0035),ripple*.00035,puddle);
 vec2 texel=1./reflectionResolution;vec2 blur=texel*rough*7.;
 uv=clamp(uv,texel*3.,1.-texel*3.);
 vec3 reflected=texture2D(tDiffuse,uv).rgb*.32;
 reflected+=texture2D(tDiffuse,uv+vec2(1.4,1.1)*blur).rgb*.17;
 reflected+=texture2D(tDiffuse,uv-vec2(1.4,1.1)*blur).rgb*.17;
 reflected+=texture2D(tDiffuse,uv+vec2(-2.4,1.8)*blur).rgb*.17;
 reflected+=texture2D(tDiffuse,uv-vec2(-2.4,1.8)*blur).rgb*.17;
 vec3 eye=normalize(cameraPosition-vWorld);
 float fresnel=.045+.955*pow(1.-max(eye.y,0.),5.);
 float waterReflection=mix(.30,.88,puddle)+fresnel*.28;
 float breakup=mix(.4+.6*smoothstep(.16,.85,patches*.65+stone*.35),1.,puddle);
 vec3 base=vec3(.014,.016,.021)*(.4+patches*.65+stone*.12)*mix(1.,.30,puddle);
 vec3 outputColor=base+reflected*waterReflection*breakup;
 float seam=min(abs(fract(p.x*.245)-.5),abs(fract(p.y*.245)-.5));
 outputColor*=mix(.72+.28*smoothstep(0.,.008,seam),1.,max(puddle*.75,rotor));
 gl_FragColor=vec4(outputColor,1.);
#include <fog_fragment>
}
`;
export const smokeFragment=`precision highp float;uniform float time;uniform float seed;uniform float density;uniform vec3 tint;varying vec2 vUv;${noiseGLSL}
void main(){vec2 p=vUv;vec2 q=p*vec2(3.5,2.5)+vec2(seed-time*.028,time*.035);float n=fbm4(q*2.1+fbm4(q*1.6+time*.012)*2.8);float edge=pow(max(0.,1.-length((p-.5)*2.)),1.55);float a=smoothstep(.27,.79,n)*edge*density;vec3 c=tint*(.5+n*.7)+vec3(.13,.016,.020)*(1.-smoothstep(.05,.5,p.y));gl_FragColor=vec4(c,a);}`;
export const beamFragment=`precision highp float;uniform float time;uniform vec3 apex;uniform float bottom;uniform float slope;uniform float beamSamples;varying vec3 vWorld;${noiseGLSL}
void main(){
 vec3 origin=cameraPosition-apex,ray=normalize(vWorld-cameraPosition);
 float travel=length(vWorld-cameraPosition),height=apex.y-bottom;
 float start=0.,finish=travel;
 if(abs(ray.y)>.00001){float ya=(-height-origin.y)/ray.y,yb=-origin.y/ray.y;start=max(start,min(ya,yb));finish=min(finish,max(ya,yb));}
 else if(origin.y>0.||origin.y< -height)discard;
 float k=slope*slope,a=dot(ray.xz,ray.xz)-k*ray.y*ray.y;
 float b=2.*(dot(origin.xz,ray.xz)-k*origin.y*ray.y),c=dot(origin.xz,origin.xz)-k*origin.y*origin.y;
 if(abs(a)<.00001){if(abs(b)>.00001){float root=-c/b;if(b>0.)finish=min(finish,root);else start=max(start,root);}else if(c>0.)discard;}
 else {float discriminant=b*b-4.*a*c;if(discriminant<0.){if(a>0.)discard;}
 else {float root=sqrt(max(discriminant,0.)),ta=(-b-root)/(2.*a),tb=(-b+root)/(2.*a),nearHit=min(ta,tb),farHit=max(ta,tb);
 if(a>0.){start=max(start,nearHit);finish=min(finish,farHit);}
 else if(start<nearHit)finish=min(finish,nearHit);else start=max(start,farHit);}}
 if(finish<=start)discard;
 float density=0.;
 for(int i=0;i<32;i++){
  if(float(i)>=beamSamples)break;
  float t=mix(start,finish,(float(i)+.5)/beamSamples);vec3 point=origin+ray*t;
  float down=-point.y,radius=max(.025,down*slope),radial=length(point.xz)/radius;
  float edge=1.-smoothstep(.5,1.,radial);
  float fog=.9+.1*noise2(point.xz*2.7+vec2(point.y*.7-time*.025,time*.035));
  density+=edge*fog*smoothstep(0.,.5,down)*smoothstep(0.,.8,height-down);
 }
 float alpha=1.-exp(-(finish-start)*density*.035/beamSamples);
 gl_FragColor=vec4(vec3(.69,.83,1.12),min(alpha,.34));
}`;
export const contactFragment=`varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p*vec2(1.,.8),p*vec2(1.,.8))*2.5)*.83;gl_FragColor=vec4(0.,0.,0.,a);}`;
