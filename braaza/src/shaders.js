const H=`#version 300 es
precision highp float;
`;
export const full=H+`out vec2 vUv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
export const vertex=H+`layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUv;
uniform mat4 uModel,uVP;out vec3 vWorld,vNormal,vLocal;out vec2 vUv;
void main(){vLocal=aPosition;vUv=aUv;vec4 p=uModel*vec4(aPosition,1.);vWorld=p.xyz;vNormal=normalize(mat3(transpose(inverse(uModel)))*aNormal);gl_Position=uVP*p;}`;
const noise=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p=mat2(.8,-.6,.6,.8)*p*2.03+3.1;a*=.5;}return v;}
float cells(vec2 p){vec2 k=floor(p),f=fract(p);float a=9.,b=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y),o=vec2(hash(k+g),hash(k+g+11.));float d=length(g+o-f);if(d<a){b=a;a=d;}else b=min(b,d);}return b-a;}
float box2(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 ember(float t){return mix(vec3(1.,.105,.006),vec3(1.,.64,.14),clamp(t,0.,1.));}
`;
export const stone=H+`in vec3 vWorld,vNormal,vLocal;in vec2 vUv;uniform vec3 uCamera;uniform float uTime,uSeed,uKind,uHeat;out vec4 outColor;
`+noise+`
vec3 key(vec3 n,vec3 v,vec3 pos,vec3 color,float rough){vec3 d=pos-vWorld,l=normalize(d),h=normalize(l+v);float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001),nh=max(dot(n,h),0.),hv=max(dot(h,v),0.);float a=rough*rough,a2=a*a,f=nh*nh*(a2-1.)+1.,ndf=a2/(3.14159*f*f+.00001);float k=pow(rough+1.,2.)/8.,g=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);vec3 fres=vec3(.07)+(1.-vec3(.07))*pow(clamp(1.-hv,0.,1.),5.);return (vec3(nl*.014)+ndf*g*fres*nl/(4.*nv*max(nl,.001)+.001))*color/(1.+dot(d,d)*.026);}
void main(){vec3 n=normalize(vNormal),v=normalize(uCamera-vWorld);vec2 coord=vLocal.xy*3.8+vLocal.z*1.5+uSeed*7.;float grit=noise(coord*54.);n=normalize(n+vec3(noise(coord*47.)-.5,noise(coord*51.+8.)-.5,noise(coord*39.+3.)-.5)*.17);vec3 r=reflect(-v,n);float seam=cells(coord+vec2(noise(coord*1.1),noise(coord*1.3+3.))*1.2);float crack=1.-smoothstep(.003,.003+max(fwidth(seam)*.85,.003),seam),halo=exp(-seam*48.);float hot=smoothstep(.43,.70,fbm(coord*.82))*uHeat*.50;hot*=.86+.14*sin(uTime*.9+uSeed*6.);
float rough=uKind<.5?.43:.28;vec3 base=mix(vec3(.009,.010,.012),vec3(.040,.025,.018),grit*.28);float env=pow(max(dot(r,normalize(vec3(-.6,.8,1.))),0.),28.)+pow(max(dot(r,normalize(vec3(.8,.2,1.))),0.),40.)*.6;
vec3 col=base+vec3(.26,.29,.31)*env*(.3+grit*.55);col+=key(n,v,vec3(-4.,8.,6.),vec3(.6,.70,.83),rough);col+=key(n,v,vec3(3.,5.,7.),vec3(.32,.38,.44),rough);col+=key(n,v,vec3(0.,.1,1.6),vec3(3.9,.54,.025),rough);col+=key(n,v,vec3(0.,12.,-1.),vec3(3.2,.41,.027),rough);
float fres=pow(clamp(1.-max(dot(n,v),0.),0.,1.),4.);col+=vec3(.036,.045,.052)*fres;col+=ember(hot)*(crack*4.+halo*.17)*hot;
if(uKind>1.5)col+=ember(.55)*(2.0+noise(vUv*18.)*.6);
col=mix(col*.43,col,step(.5,uKind))+ember(hot)*(crack*6.+halo*.09)*hot;
float fog=1.-exp(-max(length(uCamera-vWorld)-17.,0.)*.052);col=mix(col,vec3(.006,.005,.005),fog);
outColor=vec4(col,1.);}`;
export const background=H+`in vec2 vUv;uniform vec2 uResolution,uPointer;uniform float uTime,uMotion;out vec4 outColor;`+noise+`
void main(){vec2 uv=vUv;float aspect=uResolution.x/uResolution.y;vec2 p=uv*vec2(aspect*3.,4.)+uPointer*.03;float t=uTime*.04;
float n=fbm(p+vec2(fbm(p+vec2(t,-t)), -t)*2.2);float fog=pow(n,3.);float central=exp(-pow((uv.x-.5)*aspect/.62,2.));float bottom=exp(-pow((uv.y-.11)/.20,2.)),top=exp(-pow((uv.y-.97)/.16,2.));
vec3 col=vec3(.0025,.0026,.003);col+=vec3(.060,.066,.072)*fog*(.5+central);col+=vec3(.44,.070,.008)*fog*(bottom+top*.8)*(central+.25);col+=vec3(.045,.015,.003)*central*pow(n,2.);
float plumes=pow(max(fbm(p*1.8+vec2(0,-t*.8))-.46,0.),2.);col+=vec3(.30,.10,.035)*plumes*central;
col*=.55+.45*(1.-smoothstep(.2,.72,abs(uv.x-.5)));outColor=vec4(col,1.);}`;
export const lava=H+`in vec3 vWorld,vNormal,vLocal;in vec2 vUv;uniform float uTime,uPower;out vec4 outColor;`+noise+`
void main(){vec2 uv=(vUv-.5)*2.;float radius=length(uv);if(radius>1.)discard;
vec2 p=uv*5.;p+=vec2(fbm(p+uTime*.05),fbm(p-uTime*.04))*1.2;float seam=cells(p);float molten=exp(-seam*32.);float swirl=noise(p*2.-vec2(0,uTime*.4));float v=molten*.8+pow(swirl,5.)*.30;float ring=exp(-pow((radius-.80)/.007,2.))+exp(-pow((radius-.94)/.005,2.))*.65;
vec3 col=vec3(.045,.007,.001)+ember(v)*(v*3.6+ring*2.6+.08);col*=1.-smoothstep(.93,1.,radius);outColor=vec4(col*uPower,1.);}`;
export const flame=H+`in vec3 vWorld,vNormal,vLocal;in vec2 vUv;uniform float uTime,uSeed,uOpacity;out vec4 outColor;`+noise+`
void main(){vec2 uv=vUv;float y=uv.y;vec2 p=vec2(uv.x*4.5,y*4.-uTime*(1.0+uSeed*.07));float turb=fbm(p*1.9+vec2(fbm(p),0.));float w=(1.-y)*.32+.024;float x=uv.x-.5+sin(y*7.-uTime*.8+uSeed)*.047+(.5-turb)*y*.28;
float body=exp(-x*x/(w*w))*pow(1.-y,1.25);float lace=fbm(p*2.2+uSeed);float flame=clamp((body-.20-turb*.24+lace*.12)*3.,0.,1.);flame*=smoothstep(0.,.035,y)*(1.-smoothstep(.8,1.,y));float heat=pow(flame,2.5);vec3 c=ember(heat)*flame*(1.4+heat*2.);outColor=vec4(c*uOpacity,flame*uOpacity);}`;
export const art=H+`in vec2 vUv;uniform float uIndex;out vec4 outColor;`+noise+`
float sdBox3(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float mineral(vec3 p){float d=max(abs(p.x)*.92,max(abs(p.z),abs(p.y)*.78))-.60;d=max(d,dot(p,normalize(vec3(1,1,1)))-.75);d=max(d,dot(p,normalize(vec3(-1,1,1)))-.62);d=max(d,dot(p,normalize(vec3(1,-1,1)))-.65);d=max(d,dot(p,normalize(vec3(-1,-1,-1)))-.75);return d;}
vec2 sdf(vec3 p){vec3 q=p;q.xz=rot(.55+uIndex*.3)*q.xz;q.xy=rot(-.15)*q.xy;float d;
if(uIndex<.5){d=mineral(q);}
else if(uIndex<1.5){float peak=max(abs(q.x)*.9+q.y*.47-.44,max(abs(q.z)*1.2+q.y*.42-.43,-q.y-.68));d=peak;}
else if(uIndex<2.5){vec3 h=q;h.y-=.2;d=mineral(h*vec3(1.12,1.22,.92));d=max(d,sdBox3(h,vec3(.62,.56,.62)));d=min(d,sdBox3(q-vec3(0,-.54,-.12),vec3(.76,.17,.37)));}
else{d=abs(q.x)+abs(q.z)+abs(q.y)*.48-.48;}
vec3 rr=p;rr.yz=rot(.46)*rr.yz;float ring=length(vec2(length(rr.xz)-1.01,rr.y))-.008;
if(uIndex<1.5&&uIndex>.5)return ring<d?vec2(ring,1.):vec2(d,0.);return vec2(d,0.);}
void main(){vec2 uv=vUv;vec2 p=(uv-.5)*vec2(3.55,2.0);p.y-=.09;vec3 ro=vec3(0,.15,4.0),rd=normalize(vec3(p,-3.15));float t=0.;vec2 d;bool hit=false;
for(int i=0;i<90;i++){d=sdf(ro+rd*t);if(d.x<.0013){hit=true;break;}t+=max(d.x*.70,.001);if(t>8.)break;}
float fog=fbm(uv*vec2(5.,3.)+uIndex);vec3 c=vec3(.018,.024,.026)*fog+vec3(.04,.014,.003)*pow(fog,3.);float flare=exp(-pow((uv.x-.5)/.35,2.)-pow((uv.y-.42)/.35,2.));c+=vec3(.048,.026,.018)*flare;
if(hit){vec3 pos=ro+rd*t;float e=.002;vec3 n=normalize(vec3(sdf(pos+vec3(e,0,0)).x-sdf(pos-vec3(e,0,0)).x,sdf(pos+vec3(0,e,0)).x-sdf(pos-vec3(0,e,0)).x,sdf(pos+vec3(0,0,e)).x-sdf(pos-vec3(0,0,e)).x));
float nl=max(dot(n,normalize(vec3(-.7,1.,1.5))),0.),spec=pow(max(dot(reflect(-normalize(vec3(-.5,.8,1.2)),n),-rd),0.),38.);float mineral=cells(pos.xy*7.+pos.z*2.+uIndex*7.+vec2(noise(pos.xy*14.),noise(pos.yz*14.+1.))*.8);float seam=1.-smoothstep(.004,.004+max(fwidth(mineral),.003),mineral),wide=exp(-mineral*24.);float light=pow(smoothstep(.35,.67,fbm(pos.xy*3.+4.)),2.);c=vec3(.002,.003,.004)+vec3(.027,.031,.039)*nl+vec3(.50,.57,.64)*spec;c+=ember(light)*(seam*2.7+wide*.30)*light;
if(uIndex>1.5&&uIndex<2.5){float visor=exp(-pow((pos.y-.27+pos.x*.09)/.013,2.))*smoothstep(.08,.4,pos.z);c+=ember(.6)*visor*3.;}
if(d.y>.5)c=vec3(3.,.68,.10);
}
vec2 g=uv*vec2(220.,124.);float star=step(.995,hash(floor(g)+uIndex))*exp(-dot(fract(g)-.5,fract(g)-.5)*35.);c+=vec3(1.,.33,.055)*star*.7;
c*=smoothstep(0.,.17,uv.y)*(.75+.25*smoothstep(.03,.3,uv.x));outColor=vec4(c,1.);}`;
export const card=H+`in vec3 vWorld,vNormal,vLocal;in vec2 vUv;uniform sampler2D uArt,uLabel;uniform vec3 uCamera;uniform vec2 uPointer;uniform vec4 uTrail[6];uniform float uTime,uHover,uBurn,uIndex;out vec4 outColor;`+noise+`
void main(){vec2 sz=vec2(4.8,2.25),p=(vUv-.5)*sz;float d=box2(p,sz*.5-.016,.08),aa=fwidth(d);if(d>aa)discard;
float pattern=fbm(vUv*vec2(10.,6.)+uIndex);float burn=smoothstep(.7,1.,uBurn);float edgeCut=vUv.y*1.06-pattern*.065;float mask=burn>.001?1.-step(1.-burn,edgeCut):1.;if(mask<.1)discard;
vec3 col=texture(uArt,vUv).rgb;vec3 n=normalize(vNormal),v=normalize(uCamera-vWorld);float sheen=pow(max(dot(reflect(-v,n),normalize(vec3(-.3,.9,1.))),0.),64.);float lamp=exp(-dot((vUv-uPointer)*sz,(vUv-uPointer)*sz)*2.1)*uHover;
float warmth=0.;for(int i=0;i<6;i++){float age=uTime-uTrail[i].z;vec2 delta=(vUv-uTrail[i].xy)*sz;warmth+=exp(-dot(delta,delta)*3.5)*exp(-max(age,0.)*2.8)*uTrail[i].w;}
float rim=exp(-abs(d+.026)*125.),inner=exp(-abs(d+.050)*68.);float peri=atan(p.y,p.x);float glide=pow(.5+.5*sin(peri*1.3-uTime*.36),18.);
col+=vec3(.11,.14,.17)*sheen;col+=ember(.42)*(rim*(2.8+glide*3.+lamp*3.)+inner*.10);
float meshLine=min(abs(sin(vUv.x*90.)),abs(sin(vUv.y*48.)));col+=ember(.45)*(lamp*.012+warmth*.023)*(1.+(1.-smoothstep(.04,.12,meshLine))*.65);
vec4 text=texture(uLabel,vUv);col=mix(col,text.rgb,text.a);
float burning=exp(-abs(edgeCut-(1.-burn))*150.)*step(.01,burn);col+=ember(.8)*burning*6.;outColor=vec4(col,smoothstep(0.,.06,1.-uBurn));}`;
export const particlesV=H+`layout(location=0) in vec3 aPosition;uniform mat4 uVP;uniform float uTime,uDpr,uReduced,uMotion;out float vLife,vSeed;
void main(){float life=fract(aPosition.y+uTime*(.035+aPosition.z*.024)*(1.-uReduced));float y=-.2+life*13.;float x=aPosition.x+sin(life*8.+aPosition.y*24.+uTime*.3)*(.20+life*.45);float z=1.5-aPosition.z*8.;vec4 clip=uVP*vec4(x,y,z,1.);gl_Position=clip;gl_PointSize=clamp((2.5+aPosition.z*6.)*uDpr*13./clip.w,1.0,9.0);vLife=life;vSeed=aPosition.z;}`;
export const particlesF=H+`in float vLife,vSeed;out vec4 outColor;void main(){vec2 p=gl_PointCoord-.5;float f=exp(-dot(p,p)*24.);float envelope=sin(vLife*3.14159);outColor=vec4(mix(vec3(1.9,.22,.02),vec3(3.4,1.15,.16),vSeed)*f*envelope,f*envelope);}`;
export const blur=H+`in vec2 vUv;uniform sampler2D uMap;uniform vec2 uStep;uniform float uExtract;out vec4 outColor;void main(){vec3 c=texture(uMap,vUv).rgb*.227027;for(int i=1;i<=4;i++){float w=i==1?.1945946:i==2?.1216216:i==3?.054054:.016216;c+=(texture(uMap,vUv+float(i)*uStep).rgb+texture(uMap,vUv-float(i)*uStep).rgb)*w;}if(uExtract>.5){float l=max(c.r,max(c.g,c.b));c*=max(l-.9,0.)/max(l,.0001);}outColor=vec4(c,1.);}`;
export const output=H+`in vec2 vUv;uniform sampler2D uScene,uDepth,uNear,uFar,uAir;uniform vec2 uResolution;uniform float uTime,uReduced,uQuality,uFocusDistance;out vec4 outColor;
vec3 aces(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
float viewZ(float d){return .1*70./(70.-d*(70.-.1));}
void main(){vec2 uv=vUv;float z=viewZ(texture(uDepth,uv).r);float coc=clamp(abs(z-uFocusDistance)-4.0,0.,2.5)*uQuality;vec3 c=texture(uScene,uv).rgb;
if(coc>.1){vec3 sum=c;for(int i=0;i<12;i++){float a=float(i)*2.399963;vec2 off=vec2(cos(a),sin(a))*sqrt(float(i)+.5)*coc*.6/uResolution;sum+=texture(uScene,clamp(uv+off,0.,1.)).rgb;}c=sum/13.;}
c+=texture(uNear,uv).rgb*.44+texture(uFar,uv).rgb*.32+texture(uAir,uv).rgb*.17;
float vign=1.-.42*smoothstep(.25,.79,length((uv-.5)*vec2(1.,.86)));c=pow(aces(c*.93*vign),vec3(1./2.2));float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);c+=(grain-.5)*.002;outColor=vec4(c,1.);}`;
