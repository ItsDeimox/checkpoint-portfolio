#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution,uPointer,uCssSize;
uniform vec4 uRect;
uniform vec3 uTheme;
uniform sampler2D uMap;
uniform float uTime,uHover,uOpacity,uIndex,uReduced,uDim,uRadius,uCut,uGridPitch;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float box(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
// An inset hexagon dilated by a disk gives tangent arcs on all six corners.
float glassDistance(vec2 p,vec2 size){
 float r=min(uRadius,min(size.x,size.y)*.1),hx=size.x*.5-r,hy=size.y*.5-r,c=max(0.,uCut-r*(2.-sqrt(2.)));
 vec2 v[6];v[0]=vec2(-hx,hy);v[1]=vec2(hx-c,hy);v[2]=vec2(hx,hy-c);v[3]=vec2(hx,-hy);v[4]=vec2(-hx+c,-hy);v[5]=vec2(-hx,-hy+c);
 float d=1.e6;bool inside=true;
 for(int i=0;i<6;i++){vec2 a=v[i],e=v[(i+1)%6]-a,w=p-a;float t=clamp(dot(w,e)/dot(e,e),0.,1.);d=min(d,length(w-e*t));if(e.x*w.y-e.y*w.x>0.)inside=false;}
 return (inside?-d:d)-r;
}
float rock(vec3 p){
 p.yz=rot(.18)*p.yz;p.xz=rot(.65)*p.xz;
 float d=max(abs(p.x)-.49,max(abs(p.y)-.74,abs(p.z)-.42));
 d=max(d,dot(p,normalize(vec3(1.,1.,1.)))-.65);d=max(d,dot(p,normalize(vec3(-1.,1.,1.)))-.62);
 d=max(d,dot(p,normalize(vec3(1.,-1.,1.)))-.59);d=max(d,dot(p,normalize(vec3(-1.,-1.,1.)))-.65);
 d=max(d,dot(p,normalize(vec3(.4,1.,-.6)))-.6);d=max(d,dot(p,normalize(vec3(-.8,-.5,-1.)))-.58);return d;
}
vec2 objectSDF(vec3 p){
 float d=10.,material=0.;
 if(uIndex<.5){
  for(int i=0;i<4;i++){
   float f=float(i);vec3 q=p-vec3((mod(f,2.)-.5)*.73,(floor(f/2.)-.5)*.79,(f-1.5)*.13);
   q.xy=rot(.16-f*.095)*q.xy;q.xz=rot(.36-f*.10)*q.xz;
   float sd=box(q,vec3(.29,.35,.035))-.013;if(sd<d){d=sd;material=3.+f;}
  }
 }else{
  vec3 q=p;q.yz=rot(.30)*q.yz;q.xy=rot(-.36)*q.xy;
  float ring=length(vec2(length(q.xz)-.98,q.y))-.0055;
  vec3 v=p;v.xz=rot(-.29)*v.xz;v.xy=rot(.11)*v.xy;
  float solid=uIndex<1.5?rock(p):box(v,vec3(.46,.71,.033))-.018;
  d=min(ring,solid);material=ring<solid?2.:(uIndex<1.5?1.:7.);
 }
 return vec2(d,material);
}
vec3 objectNormal(vec3 p){
 float e=.002;vec3 g=vec3(objectSDF(p+vec3(e,0,0)).x-objectSDF(p-vec3(e,0,0)).x,objectSDF(p+vec3(0,e,0)).x-objectSDF(p-vec3(0,e,0)).x,objectSDF(p+vec3(0,0,e)).x-objectSDF(p-vec3(0,0,e)).x);
 return normalize(g+vec3(.000001));
}
vec2 mineral(vec2 p){
 vec2 cell=floor(p),f=fract(p);float first=9.,second=9.,id=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y),o=vec2(hash(cell+g),hash(cell+g+21.));float d=length(g+o-f);if(d<first){second=first;first=d;id=hash(cell+g+7.);}else second=min(second,d);}
 return vec2(second-first,id);
}
vec4 illustration(vec2 uv,vec3 tint,float lamp){
 float ar=uCssSize.x/uCssSize.y;
 vec2 q=(uv-vec2(.5,.75))*vec2(ar,1.)*3.62;
 vec3 ro=vec3((uPointer.x-.5)*uHover*.07,.06+(uPointer.y-.5)*uHover*.055,4.),rd=normalize(vec3(q,-3.));
 float t=0.;vec2 hit=vec2(10.,0.);bool found=false;
 for(int i=0;i<64;i++){hit=objectSDF(ro+rd*t);if(hit.x<.0015){found=true;break;}t+=hit.x*.85;if(t>6.5)break;}
 if(!found)return vec4(0.);
 vec3 p=ro+rd*t,n=objectNormal(p),light=normalize(vec3(-.45,.9,1.2));
 float diff=max(dot(n,light),0.),spec=pow(max(dot(reflect(-light,n),-rd),0.),65.);
 float fresnel=pow(1.-max(dot(n,-rd),0.),4.);
 float kicker=pow(max(dot(n,normalize(vec3(.65,.18,.35))),0.),30.);
 if(hit.y>1.5&&hit.y<2.5)return vec4(tint*(.28+lamp*.55+uHover*.18),1.);
 vec2 m=mineral(p.xy*19.+p.z*11.);float veins=1.-smoothstep(.001,.012,m.x),flake=pow(m.y,18.);
 float fissure=veins*smoothstep(.48,.78,noise(p.xy*4.1+p.z));
 vec3 col=tint*(.0015+diff*.006+spec*.62+fresnel*.065+kicker*.08+veins*.006+fissure*.18+flake*.016);
 if(hit.y>2.5){
  vec3 local=p;float number=hit.y-3.;
  if(uIndex<.5){
   local-=vec3((mod(number,2.)-.5)*.73,(floor(number/2.)-.5)*.79,(number-1.5)*.13);
   local.xy=rot(.16-number*.095)*local.xy;local.xz=rot(.36-number*.10)*local.xz;
   float edge=min(.29-abs(local.x),.35-abs(local.y));
   col=tint*(.009+spec*.70+fresnel*.12+exp(-abs(edge)*170.)*(.30+lamp*.5));
   vec2 a=local.xy;float symbol=0.;
   if(number<.5){symbol=max(1.-smoothstep(.058,.067,length(a-vec2(0,.075))),step(abs(a.x),.12)*step(-.11,a.y)*step(a.y,-.025));}
   else if(number<1.5){a=rot(-.55)*a;float l0=abs(length((a-vec2(.058,0))*vec2(.7,1.))-.053),l1=abs(length((a+vec2(.058,0))*vec2(.7,1.))-.053);symbol=1.-smoothstep(.008,.013,min(l0,l1));}
   else if(number<2.5){symbol=step(abs(a.x),.15)*step(abs(a.y),.12)*step(a.y,-abs(a.x-.025)*.82+.085);}
   else{symbol=step(abs(a.x),.155)*step(abs(a.y),.13)*step(.66,fract(a.y*24.));}
   col+=tint*symbol*(.22+lamp*.15)*step(.008,local.z);
  }else{
   local.xz=rot(-.29)*local.xz;local.xy=rot(.11)*local.xy;
   float border=min(.46-abs(local.x),.71-abs(local.y));
   col+=tint*exp(-abs(border)*155.)*(.55+lamp*.9);
   float art=dot(texture(uMap,clamp(local.xy/vec2(.94,1.46)+.5,.01,.99)).rgb,vec3(.2126,.7152,.0722));
   col+=tint*art*.18;
   float bars=step(.72,fract((local.y+.18)*15.))*step(abs(local.x),.24)*step(-.28,local.y)*step(local.y,.2);
   col+=tint*bars*.12;
  }
 }
 return vec4(col*(1.+lamp*.35),1.);
}
float lineAA(float d,float w){return 1.-smoothstep(w,w+max(fwidth(d),.4),abs(d));}
void main(){
 vec2 origin=vec2(uRect.x,1.-uRect.y-uRect.w),uv=(vUv-origin)/uRect.zw;
 vec2 size=uCssSize,px=uv*size,p=px-size*.5;
 if(px.x<-30.||px.x>size.x+30.||px.y<-75.||px.y>size.y+30.)discard;
 float sdf=glassDistance(p,size),aa=max(fwidth(sdf),.65),inside=1.-smoothstep(-aa*.55,aa*.55,sdf);
 vec2 delta=(uv-uPointer)*size;float radius=clamp(size.x*.58,105.,178.);
 float lamp=exp(-dot(delta,delta)/(radius*radius))*uHover;
 vec3 tint=mix(vec3(.82),uTheme,uHover*.64),spotTint=mix(vec3(.86),uTheme,uHover*.84);
 // Low-contrast isotropic broken lattice. No luminous node dots and no UV stretching.
 vec2 grid=px/uGridPitch,cell=floor(grid),f=fract(grid);float fragment=0.;
 fragment=max(lineAA(f.x*uGridPitch,.23)*step(.62,hash(cell+uIndex*17.)),lineAA(f.y*uGridPitch,.23)*step(.62,hash(cell+11.+uIndex*17.)));
 fragment=max(fragment,lineAA((f.x-f.y)*uGridPitch*.707,.20)*step(.91,hash(cell+31.)));
 float square=max(abs(f.x-.5),abs(f.y-.5));float tile=lineAA((square-.28)*uGridPitch,.3)*step(.94,hash(cell+47.));
 float behind=smoothstep(.33,.62,uv.y);
 vec3 base=vec3(.0017)+tint*(.0015+lamp*.008);
 base+=spotTint*(fragment*.022+tile*.055)*(.09+lamp*.9)*behind;
 // A handful of rectangular glass fragments sit behind the illustration, not in front of text.
 vec2 shardGrid=px/44.,sf=fract(shardGrid)-.5,sc=floor(shardGrid);
 float shard=abs(max(abs(sf.x),abs(sf.y))-.12)*44.;
 base+=tint*lineAA(shard,.35)*step(.86,hash(sc+13.))*behind*(.016+lamp*.072);
 if(uv.y>.47&&inside>.01){vec4 art=illustration(uv,tint,lamp);base=mix(base,art.rgb,art.a*smoothstep(.47,.56,uv.y));}
 base*=1.-uDim;
 // Laminated glass rails share the same continuous SDF, including the rounded cuts.
 float rail=exp(-pow((sdf+1.1)/.62,2.)),innerRail=exp(-pow((sdf+4.0)/.9,2.));
 float bevel=exp(-pow((sdf+2.35)/2.,2.));
 vec2 grad=normalize(vec2(dFdx(sdf),dFdy(sdf))+vec2(.0001));
 float clearcoat=pow(max(dot(grad,normalize(vec2(-.35,.94))),0.),9.);
 float travel=sin((px.x+px.y)*.016+uIndex*.8);float glint=pow(max(travel,0.),18.);
 float envelope=.115+uHover*.14+lamp*1.48;
 vec3 rim=tint*(rail*(envelope+clearcoat*.38+glint*.12)+innerRail*(.024+lamp*.23)+bevel*(.013+lamp*.13));
 float lensHalo=exp(-abs(sdf)*.18)*(.004+lamp*.040)*uHover;
 vec3 color=base*inside+rim+spotTint*lensHalo;
 // An elongated caustic sits INSIDE the glass rail nearest the cursor. No orbiting point sprite.
 float streak=exp(-abs(delta.x)/80.-abs(delta.y)/3.5)+exp(-abs(delta.x)/3.5-abs(delta.y)/80.);
 color+=spotTint*bevel*streak*lamp*.20;
 // Low, broken vertical floor reflection. It fades linearly below the card, never a circular disc.
 if(px.y<0.){
  float fade=pow(max(0.,1.+px.y/64.),2.),span=smoothstep(-8.,12.,px.x)*(1.-smoothstep(size.x-12.,size.x+8.,px.x));
  float fragments=.25+.75*noise(vec2(px.x*.16,px.y*.7));
  color+=tint*fade*span*fragments*(.004+uHover*.018)*exp(px.y/24.);
 }
 float coverage=max(inside,exp(-abs(sdf)*.25)*.19);
 if(px.y<0.&&px.x>=0.&&px.x<=size.x)coverage=max(coverage,pow(max(0.,1.+px.y/64.),2.)*.09);
 outColor=vec4(color,uOpacity*coverage);
}
