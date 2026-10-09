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
precision highp float;uniform sampler2D artwork;uniform mat3 projection;uniform float hover;uniform float eraseForeground;varying vec2 vUv;
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
float edge=min(min(p.x,1.-p.x),min(p.y,1.-p.y));c*=1.13+hover*.18;c+=vec3(.085,.003,.006)*hover*exp(-edge*90.);gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}`;
export const floorVertex=`uniform mat4 textureMatrix;varying vec4 vReflection;varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;vReflection=textureMatrix*vec4(position,1.);vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
export const floorFragment=`precision highp float;uniform sampler2D tDiffuse;uniform vec3 color;uniform float time;uniform vec2 reflectionResolution;varying vec4 vReflection;varying vec3 vWorld;${noiseGLSL}
#include <fog_pars_fragment>
void main(){vec2 p=vWorld.xz;float puddle=smoothstep(.25,.7,fbm4(p*.48+2.));float stone=noise2(p*125.);float patches=fbm4(p*6.2);float rough=mix(.42,.1,puddle);
vec2 n=vec2(noise2(p*17.1),noise2(p*19.7+11.))-.5;vec2 streak=vec2(noise2(p*vec2(37.,4.)),noise2(p*vec2(21.,7.)))-.5;
vec2 uv=vReflection.xy/vReflection.w;uv+=(n*.0009+streak*vec2(.0018,.005))*(.3+rough*2.);vec2 texel=1./reflectionResolution;vec3 reflected=texture2D(tDiffuse,uv).rgb*.28;
reflected+=texture2D(tDiffuse,uv+texel*vec2(1.4,1.1)*rough*3.).rgb*.18;
reflected+=texture2D(tDiffuse,uv-texel*vec2(1.4,1.1)*rough*3.).rgb*.18;
reflected+=texture2D(tDiffuse,uv+texel*vec2(-2.4,1.8)*rough*3.).rgb*.18;
reflected+=texture2D(tDiffuse,uv-texel*vec2(-2.4,1.8)*rough*3.).rgb*.18;
vec3 view=normalize(cameraPosition-vWorld);float fresnel=.26+.67*pow(1.-max(view.y,0.),3.);float breakup=mix(.35,1.1,smoothstep(.19,.83,patches*.55+stone*.45));
vec3 base=vec3(.012,.014,.018)*(0.32+patches*.8+stone*.18);vec3 c=base+reflected*fresnel*breakup*mix(.53,.9,puddle);
float seam=min(abs(fract(p.x*.245)-.5),abs(fract(p.y*.245)-.5));c*=.64+.36*smoothstep(0.,.008,seam);
float streakGlow=pow(max(0.,1.-abs(p.x)/10.),5.)*.007;c+=vec3(.10,.005,.008)*streakGlow;gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}
`;
export const smokeFragment=`precision highp float;uniform float time;uniform float seed;uniform float density;uniform vec3 tint;varying vec2 vUv;${noiseGLSL}
void main(){vec2 p=vUv;vec2 q=p*vec2(3.5,2.5)+vec2(seed-time*.028,time*.035);float n=fbm4(q*2.1+fbm4(q*1.6+time*.012)*2.8);float edge=pow(max(0.,1.-length((p-.5)*2.)),1.55);float a=smoothstep(.27,.79,n)*edge*density;vec3 c=tint*(.5+n*.7)+vec3(.13,.016,.020)*(1.-smoothstep(.05,.5,p.y));gl_FragColor=vec4(c,a);}`;
export const beamFragment=`precision highp float;uniform float time;varying vec2 vUv;${noiseGLSL}
void main(){float y=vUv.y;float width=.16+(1.-y)*.34;float a=exp(-pow((vUv.x-.5)/width,2.)*3.);float fog=fbm4(vUv*vec2(14.,7.)+vec2(time*.01,-time*.028));a*=smoothstep(0.,.25,y)*(.018+.048*y)*(.7+fog*.6);gl_FragColor=vec4(vec3(.8,.84,.92),a);}`;
export const contactFragment=`varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p*vec2(1.,.8),p*vec2(1.,.8))*2.5)*.83;gl_FragColor=vec4(0.,0.,0.,a);}`;
