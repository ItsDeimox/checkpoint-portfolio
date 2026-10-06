/** Linear-light GLSL. Independent materials, no baked environment screenshot.
 * Gradient noise uses Perlin's quintic interpolation; see docs/REFINEMENT.md. */
const H=`#version 300 es
precision highp float;
`;
const common=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p=mat2(.8,-.6,.6,.8)*p*2.03+3.1;a*=.5;}return v;}
vec2 gradient(vec2 p){float a=hash(p)*6.2831853;return vec2(cos(a),sin(a));}
float perlin(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);
 return mix(mix(dot(gradient(i),f),dot(gradient(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(gradient(i+vec2(0,1)),f-vec2(0,1)),dot(gradient(i+1.),f-1.),u.x),u.y);}
float turbulence(vec2 p){float a=.58,v=0.;for(int i=0;i<4;i++){v+=a*perlin(p);p=mat2(.8,-.6,.6,.8)*p*2.07+vec2(9.2,3.7);a*=.5;}return v;}
float cells(vec2 p){vec2 k=floor(p),f=fract(p);float a=9.,b=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y),o=vec2(hash(k+g),hash(k+g+11.));float d=length(g+o-f);if(d<a){b=a;a=d;}else b=min(b,d);}return b-a;}
float box2(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
vec3 ember(float t){return mix(vec3(1.,.09,.003),vec3(1.,.46,.072),clamp(t,0.,1.));}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
`;
export const stone=H+`in vec3 vWorld,vNormal,vLocal;in vec2 vUv;uniform vec3 uCamera;uniform float uTime,uSeed,uKind,uHeat;out vec4 outColor;`+common+`
vec3 light(vec3 n,vec3 v,vec3 pos,vec3 tint,float metal){vec3 d=pos-vWorld,l=normalize(d),h=normalize(l+v);float diffuse=max(dot(n,l),0.);float spec=pow(max(dot(n,h),0.),mix(44.,110.,metal));return tint*(diffuse*mix(.030,.008,metal)+spec*mix(.30,.80,metal))/(1.+dot(d,d)*.035);}
void main(){
 float metal=step(.5,uKind);vec2 coord=vLocal.xy*2.1+vLocal.z*.7+uSeed*7.;float grit=noise(coord*32.);
 vec3 n=normalize(vNormal),v=normalize(uCamera-vWorld);n=normalize(n+(vec3(noise(coord*47.),noise(coord*39.+2.),noise(coord*31.+4.))-.5)*mix(.10,.032,metal));vec3 r=reflect(-v,n);
 float seam=cells(coord+vec2(noise(coord*1.1),noise(coord*1.3+3.))*.8);
 float aa=max(fwidth(seam),.001),crack=1.-smoothstep(.006,.006+aa,seam),halo=exp(-seam*30.);
 float pockets=smoothstep(.42,.64,fbm(coord*.62));float proximity=exp(-abs(vWorld.y-.4)*.22)+exp(-abs(vWorld.y-11.9)*.22);
 float hot=pockets*uHeat*mix(.56,.26,metal)*(.55+proximity*.45)*(.94+.06*sin(uTime*1.8+uSeed));
 vec3 col=mix(vec3(.006,.007,.009),vec3(.012,.015,.019),metal)*(.65+grit*.65);
 float env=pow(max(dot(r,normalize(vec3(-.7,.7,1.))),0.),28.)+pow(max(dot(r,normalize(vec3(.8,.15,1.))),0.),50.)*.55;
 col+=vec3(.24,.29,.35)*env*mix(.30,.64,metal);
 col+=light(n,v,vec3(-4,8,6),vec3(.65,.78,.93),metal);
 col+=light(n,v,vec3(4,4,7),vec3(.45,.53,.65),metal);
 col+=light(n,v,vec3(0,.6,1.5),vec3(4.2,.45,.022),metal);
 col+=light(n,v,vec3(0,11.7,-1.5),vec3(3.4,.31,.013),metal);
 float fres=pow(clamp(1.-max(dot(n,v),0.),0.,1.),4.);col+=vec3(.035,.039,.05)*fres;
 col+=ember(hot)*(crack*2.8+halo*.24)*hot;
 if(uKind>1.5)col=ember(.42)*(1.6+noise(vUv*18.)*.5);
 float fog=1.-exp(-max(length(uCamera-vWorld)-17.,0.)*.065);col=mix(col,vec3(.009,.009,.011),fog);
 outColor=vec4(max(col,0.),1.);
}`;
export const background=H+`in vec2 vUv;uniform vec2 uResolution,uPointer;uniform float uTime,uMotion;out vec4 outColor;`+common+`
void main(){
 vec2 uv=vUv,q=(uv-.5)*vec2(uResolution.x/uResolution.y,1.);float t=uTime*.055;
 vec2 p=q*vec2(4.8,6.)+uPointer*.07;float cloud=fbm(p+vec2(t,-t*.7));
 float smoke=fbm(p*1.55+vec2(cloud*1.8,-t));float detail=fbm(p*3.1+vec2(t*.4,-t*1.6));
 float center=exp(-q.x*q.x*3.7),bottom=exp(-pow((uv.y-.06)/.26,2.)),top=exp(-pow((uv.y-.98)/.22,2.));
 vec3 col=vec3(.002,.0025,.0035)+vec3(.025,.032,.042)*pow(smoke,2.)*(.45+center);
 col+=vec3(.40,.062,.006)*(bottom+top*.75)*center*pow(cloud,2.);
 col+=vec3(.042,.039,.040)*smoothstep(.43,.77,smoke+detail*.13)*center;
 float pillars=exp(-pow((abs(q.x)-.51)/.16,2.));col+=vec3(.024,.013,.010)*pillars*cloud;
 outColor=vec4(col,1.);
}`;
export const lava=H+`in vec3 vWorld,vNormal,vLocal;in vec2 vUv;uniform float uTime,uPower;out vec4 outColor;`+common+`
void main(){vec2 uv=(vUv-.5)*2.;float radius=length(uv);if(radius>1.)discard;
 vec2 p=uv*4.4;vec2 warp=vec2(turbulence(p+vec2(0,-uTime*.13)),turbulence(p+vec2(7,uTime*.11)));p+=warp*1.5;
 float seam=cells(p),channel=exp(-seam*18.);float crust=smoothstep(.42,.69,fbm(p*1.3));
 float molten=channel*.72+(.45+.25*perlin(p*2.-uTime*.14))*(1.-crust);
 float ring=exp(-pow((radius-.83)/.012,2.));
 vec3 col=vec3(.022,.003,.001)+ember(molten*.68)*(molten*2.9+ring*1.3);
 col*=1.-smoothstep(.93,1.,radius);outColor=vec4(col*uPower,1.);
}`;
export const flame=H+`in vec3 vWorld,vNormal,vLocal;in vec2 vUv;uniform float uTime,uSeed,uOpacity;out vec4 outColor;`+common+`
void main(){
 float y=vUv.y;vec2 p=vec2((vUv.x-.5)*3.8,y*3.6-uTime*(1.18+uSeed*.017));
 // Independent advected octaves break up the silhouette, not just its opacity.
 float curl=turbulence(p*1.25+uSeed*3.4),detail=perlin(p*3.8+vec2(uSeed,-uTime*.19));
 float width=.38*pow(max(1.-y,0.),.65)+.018;
 float x=vUv.x-.5+curl*(.1+y*.34)+sin(y*7.-uTime*.8+uSeed)*y*.052;
 float envelope=1.-abs(x)/width;
 float density=smoothstep(.08,.78,envelope+curl*.9+detail*.28-y*.56);
 density*=.58+.42*smoothstep(-.28,.32,perlin(p*3.2+vec2(uSeed,0.)));
 float tip=1.-smoothstep(.68+.12*curl,1.,y);float base=smoothstep(0.,.035,y);
 float alpha=density*tip*base*uOpacity;
 float tongues=clamp(density*(1.-y)*(.62+curl*.55+detail*.3),0.,1.);
 vec3 radiance=mix(vec3(1.5,.049,.0008),vec3(3.5,.39,.021),pow(tongues,1.7));
 // Premultiplied alpha: overlapping sheets stay orange instead of washing white.
 outColor=vec4(radiance*alpha,alpha);
}`;
export const floor=H+`in vec3 vWorld,vNormal,vLocal;in vec2 vUv;uniform float uTime;out vec4 outColor;`+common+`
void main(){vec2 p=vWorld.xz;float cracks=cells(p*1.7+fbm(p*.8));float grain=fbm(p*4.);
 float reflection=exp(-p.x*p.x*.42)*exp(-abs(p.y-1.)*.23);float ripple=.45+.55*fbm(vec2(p.x*5.,p.y*12.-uTime*.09));
 vec3 col=vec3(.004,.005,.006)+ember(.30)*reflection*(ripple*.12+exp(-cracks*38.)*.11);
 col+=vec3(.022,.025,.03)*pow(grain,4.);float fade=1.-smoothstep(4.,18.,abs(p.y));if(fade<.002)discard;outColor=vec4(col,fade);}
`;
export const card=H+`in vec3 vWorld,vNormal,vLocal;in vec2 vUv;uniform sampler2D uArt,uLabel,uBehind;uniform vec2 uResolution;uniform vec3 uCamera;uniform vec2 uPointer;uniform vec4 uTrail[6];uniform float uTime,uHover,uBurn,uIndex;out vec4 outColor;`+common+`
void main(){
 vec2 sz=vec2(4.8,2.25),p=(vUv-.5)*sz;float d=box2(p,sz*.5-.016,.08),aa=max(fwidth(d),.001);if(d>aa)discard;
 float pattern=fbm(vUv*vec2(10.,6.)+uIndex),burn=smoothstep(.40,1.,uBurn),edgeCut=vUv.y*1.06-pattern*.065;
 if(burn>.001&&edgeCut>1.-burn)discard;
 vec3 n=normalize(vNormal),v=normalize(uCamera-vWorld),r=reflect(-v,n);float fres=pow(clamp(1.-abs(dot(n,v)),0.,1.),4.);
 float lamp=exp(-dot((vUv-uPointer)*sz,(vUv-uPointer)*sz)*1.6)*uHover;
 float warmth=0.;for(int i=0;i<6;i++){float age=max(uTime-uTrail[i].z,0.);vec2 dp=(vUv-uTrail[i].xy)*sz;warmth+=exp(-dot(dp,dp)*3.)*exp(-age*2.4)*uTrail[i].w;}warmth=min(warmth,1.5);
 vec2 bend=normalize(p+vec2(.0001))*.004*exp(-abs(d)*12.)+n.xy*.002;
 vec2 screen=gl_FragCoord.xy/uResolution;
 vec3 through=vec3(texture(uBehind,screen+bend*1.1).r,texture(uBehind,screen+bend).g,texture(uBehind,screen+bend*.85).b);
 vec2 uv=clamp(vUv+normalize(p+vec2(.0001))*.0025*exp(-abs(d)*18.),.001,.999);
 vec3 media=texture(uArt,uv).rgb;float lum=dot(media,vec3(.2126,.7152,.0722));
 vec3 col=media*1.14+through*(.014+exp(-abs(d)*14.)*.12)*(1.-smoothstep(.04,.2,lum));
 float sheen=pow(max(dot(r,normalize(vec3(-.3,.85,1.))),0.),64.);
 float ribbon=exp(-pow((p.x*.65+p.y+.35+uHover*.16)/.25,2.));
 col+=vec3(.065,.080,.095)*(sheen*.4+ribbon*.12)*(1.-smoothstep(.1,.9,lum));
 float rim=exp(-abs(d+.022)*145.),inner=exp(-abs(d+.06)*68.),bevel=exp(-abs(d+.105)*45.);
 float edgeFlow=pow(.5+.5*sin(atan(p.y,p.x)*2.-uTime*.40+uIndex),16.);
 vec3 hot=ember(.32),perimeter=hot*(rim*(1.8+edgeFlow*1.8+lamp*1.9)+inner*(.22+lamp*.6));
 col+=vec3(.32,.35,.38)*bevel*(.15+sheen*.50+fres*.2);
 float seam=cells(vUv*vec2(12.,5.6)+uIndex*11.);float cracks=1.-smoothstep(.004,.004+max(fwidth(seam)*.65,.001),seam);
 float mask=smoothstep(.53,.76,noise(vUv*vec2(9.,4.)+uIndex));
 col+=vec3(.25,.23,.21)*cracks*mask*.12;
 col+=hot*(lamp*.028+warmth*.019+cracks*mask*(lamp*.45+warmth*.20));
 vec4 text=texture(uLabel,vUv);col=mix(col,text.rgb,text.a);
 // The title matte belongs to the media surface, behind the emitting glass edge.
 col+=perimeter;
 float burning=exp(-abs(edgeCut-(1.-burn))*110.)*step(.01,burn);col+=ember(.65)*burning*3.4;
 outColor=vec4(max(col,0.),smoothstep(0.,.06,1.-uBurn));
}`;
export const particlesV=H+`layout(location=0) in vec3 aPosition;uniform mat4 uVP;uniform float uTime,uDpr,uReduced,uMotion;out float vLife,vSeed,vBig;
void main(){float seed=aPosition.z,life=fract(aPosition.y+uTime*(.042+seed*.031)*(1.-uReduced));float y=-.2+life*13.;
 float x=aPosition.x+sin(life*8.+aPosition.y*24.+uTime*.24)*(.16+life*.56);float z=2.5-seed*8.;
 vec4 clip=uVP*vec4(x,y,z,1.);gl_Position=clip;vBig=step(.962,seed);
 gl_PointSize=clamp((2.7+seed*5.+vBig*11.)*uDpr*13./max(clip.w,.1),1.,21.);vLife=life;vSeed=seed;}
`;
export const particlesF=H+`in float vLife,vSeed,vBig;out vec4 outColor;
void main(){vec2 p=gl_PointCoord-.5;float angle=(vSeed-.5)*.8;p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;
 float trail=exp(-p.x*p.x*mix(40.,120.,vBig)-p.y*p.y*12.);float core=exp(-dot(p,p)*88.),halo=exp(-dot(p,p)*13.);
 float env=smoothstep(0.,.08,vLife)*(1.-smoothstep(.72,1.,vLife));vec3 tint=mix(vec3(1.8,.19,.008),vec3(2.9,.65,.065),vSeed);
 float alpha=(trail*.64+halo*.12)*env;outColor=vec4(tint*(trail+core*.60+halo*.10)*env,alpha);}
`;
export const output=H+`in vec2 vUv;uniform sampler2D uScene,uBase,uDepth,uNear,uFar,uAir;uniform vec2 uResolution;uniform float uTime,uReduced,uQuality,uFocusDistance;out vec4 outColor;
vec3 aces(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
float viewZ(float d){return .1*70./(70.-d*(70.-.1));}
void main(){vec2 uv=vUv;float z=viewZ(texture(uDepth,uv).r);float coc=clamp(abs(z-uFocusDistance)-2.8,0.,5.)*uQuality;vec3 c=texture(uBase,uv).rgb;
 vec3 sparks=max(texture(uScene,uv).rgb-c,0.);
 if(coc>.1){vec3 sum=c;float total=1.;for(int i=0;i<12;i++){float a=float(i)*2.399963;vec2 off=vec2(cos(a),sin(a))*sqrt(float(i)+.5)*coc*.7/uResolution;float nz=viewZ(texture(uDepth,clamp(uv+off,0.,1.)).r);float w=step(z-1.8,nz);sum+=texture(uBase,clamp(uv+off,0.,1.)).rgb*w;total+=w;}c=sum/total;}
 // Sprites keep their own soft profile; their emission still feeds HDR bloom.
 c+=sparks;
 vec3 near=texture(uNear,uv).rgb,far=texture(uFar,uv).rgb,air=texture(uAir,uv).rgb;
 c+=near*.40+far*.29+air*.24;
 vec3 streak=vec3(0.);for(int i=-3;i<=3;i++)streak+=texture(uAir,uv+vec2(float(i)*.006,0.)).rgb*exp(-float(i*i)*.45);c+=streak*.012;
 float vign=1.-.32*smoothstep(.24,.81,length((uv-.5)*vec2(1.,.88)));c=pow(aces(max(c,0.)*.94*vign),vec3(1./2.2));
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);c+=(grain-.5)*.002;outColor=vec4(c,1.);}
`;

export const art=H+`in vec2 vUv;uniform float uIndex;out vec4 outColor;`+common+`
float sdBox3(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float mineral(vec3 p){float d=max(abs(p.x)*.92,max(abs(p.z),abs(p.y)*.78))-.60;d=max(d,dot(p,normalize(vec3(1,1,1)))-.75);d=max(d,dot(p,normalize(vec3(-1,1,1)))-.62);d=max(d,dot(p,normalize(vec3(1,-1,1)))-.65);d=max(d,dot(p,normalize(vec3(-1,-1,-1)))-.75);return d;}
vec2 sdf(vec3 p){vec3 q=p;q.xz=rot(.55+uIndex*.3)*q.xz;q.xy=rot(-.15)*q.xy;float d;
if(uIndex<.5){d=mineral(q);}
else if(uIndex<1.5){float peak=max(abs(q.x)*.9+q.y*.47-.44,max(abs(q.z)*1.2+q.y*.42-.43,-q.y-.68));d=peak;}
else if(uIndex<2.5){vec3 h=q;h.y-=.2;d=mineral(h*vec3(1.12,1.22,.92));d=max(d,sdBox3(h,vec3(.62,.56,.62)));d=min(d,sdBox3(q-vec3(0,-.54,-.12),vec3(.76,.17,.37)));}
else{d=abs(q.x)+abs(q.z)+abs(q.y)*.48-.48;}
vec3 rr=p;rr.yz=rot(.46)*rr.yz;float ring=length(vec2(length(rr.xz)-1.01,rr.y))-.008;
if(uIndex<1.5&&uIndex>.5)return ring<d?vec2(ring,1.):vec2(d,0.);return vec2(d,0.);}
void main(){vec2 uv=vUv;vec2 p=(uv-.5)*vec2(3.55,2.0);p.y-=.09;vec3 ro=vec3(0,.15,4.0),rd=normalize(vec3(p,-4.35));float t=0.;vec2 d;bool hit=false;
for(int i=0;i<90;i++){d=sdf(ro+rd*t);if(d.x<.0013){hit=true;break;}t+=max(d.x*.70,.001);if(t>8.)break;}
float fog=fbm(uv*vec2(5.,3.)+uIndex);vec3 c=vec3(.034,.038,.047)*fog+vec3(.12,.030,.005)*pow(fog,3.);float flare=exp(-pow((uv.x-.5)/.35,2.)-pow((uv.y-.42)/.35,2.));c+=vec3(.18,.055,.016)*flare;
if(hit){vec3 pos=ro+rd*t;float e=.002;vec3 n=normalize(vec3(sdf(pos+vec3(e,0,0)).x-sdf(pos-vec3(e,0,0)).x,sdf(pos+vec3(0,e,0)).x-sdf(pos-vec3(0,e,0)).x,sdf(pos+vec3(0,0,e)).x-sdf(pos-vec3(0,0,e)).x));
float nl=max(dot(n,normalize(vec3(-.7,1.,1.5))),0.),spec=pow(max(dot(reflect(-normalize(vec3(-.5,.8,1.2)),n),-rd),0.),38.);float mineral=cells(pos.xy*7.+pos.z*2.+uIndex*7.+vec2(noise(pos.xy*14.),noise(pos.yz*14.+1.))*.8);float seam=1.-smoothstep(.004,.004+max(fwidth(mineral),.003),mineral),wide=exp(-mineral*24.);float light=pow(smoothstep(.35,.67,fbm(pos.xy*3.+4.)),2.);c=vec3(.002,.003,.004)+vec3(.056,.062,.076)*nl+vec3(.50,.57,.64)*spec;c+=ember(light)*(seam*3.5+wide*.55)*light;
 c+=vec3(.45,.12,.026)*pow(clamp(1.-max(dot(n,-rd),0.),0.,1.),3.);
if(uIndex>1.5&&uIndex<2.5){float visor=exp(-pow((pos.y-.27+pos.x*.09)/.013,2.))*smoothstep(.08,.4,pos.z);c+=ember(.6)*visor*3.;}
if(d.y>.5)c=vec3(3.,.68,.10);
}
vec2 g=uv*vec2(220.,124.);float star=step(.995,hash(floor(g)+uIndex))*exp(-dot(fract(g)-.5,fract(g)-.5)*35.);c+=vec3(1.,.33,.055)*star*.7;
c*=smoothstep(0.,.17,uv.y)*(.75+.25*smoothstep(.03,.3,uv.x));outColor=vec4(c,1.);}`;
