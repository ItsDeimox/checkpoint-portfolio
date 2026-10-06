#version 300 es
precision highp float;
in vec3 vWorld,vNormal,vLocal;
in vec2 vUv;
uniform sampler2D uEnergyMap,uBehind,uFrosted;
uniform vec3 uCamera,uLocalCamera,uTheme,uFaceLightA,uFaceLightB;
uniform vec2 uResolution;
uniform float uTime,uLayer,uOpacity,uEnergyActive,uEnergySize,uReduced,uWall,uInnerOnly,uGlassBlur,uDispersion;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float line(float d,float w){return 1.-smoothstep(w,w+max(fwidth(d),.00035),abs(d));}
float sdBox(vec2 p,float b,float radius){vec2 q=abs(p)-b+radius;return min(max(q.x,q.y),0.)+length(max(q,0.))-radius;}
int faceOf(vec3 p){vec3 a=abs(p);if(a.x>=a.y&&a.x>=a.z)return p.x>0.?0:1;if(a.y>=a.z)return p.y>0.?2:3;return p.z>0.?4:5;}
vec3 faceVector(int f,vec3 p){if(f==0)return vec3(-p.z,p.y,p.x);if(f==1)return vec3(p.z,p.y,-p.x);if(f==2)return vec3(p.x,-p.z,p.y);if(f==3)return vec3(p.x,p.z,-p.y);if(f==4)return p;return vec3(-p.x,p.y,-p.z);}
vec2 crystal(vec2 p){
 vec2 cell=floor(p),f=fract(p);float first=10.,second=10.,id=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 g=vec2(x,y),o=vec2(hash(cell+g),hash(cell+g+23.));float d=length(g+o-f);
  if(d<first){second=first;first=d;id=hash(cell+g+9.);}else second=min(second,d);
 }
 return vec2(second-first,id);
}
vec2 network(int face){
 if(uEnergyActive<.5||uReduced>.5)return vec2(0.);
 vec2 g=clamp(vUv,0.,.99999)*(uEnergySize-1.),f=fract(g);ivec2 c=ivec2(floor(g));
 ivec2 o=ivec2(face%3,face/3)*int(uEnergySize);c=clamp(c,ivec2(0),ivec2(int(uEnergySize)-2));
 vec4 a=texelFetch(uEnergyMap,o+c,0),b=texelFetch(uEnergyMap,o+c+ivec2(1,0),0),c0=texelFetch(uEnergyMap,o+c+ivec2(0,1),0),d=texelFetch(uEnergyMap,o+c+ivec2(1,1),0);
 float e=mix(mix(a.r,b.r,f.x),mix(c0.r,d.r,f.x),f.y);
 float wires=max(max(line(f.x,.016)*step(.26,a.g),line(f.y,.016)*step(.28,a.b)),line((f.x-f.y)*.707,.012)*step(.76,a.g));
 float radiance=pow(max(e-.02,0.),.92)*(1.+3.7*smoothstep(.18,1.1,e));
 return vec2(radiance*wires*0.98,radiance*.055);
}
vec3 infinityCorridor(int face,vec2 p,vec3 tint,float light){
 vec3 direction=faceVector(face,normalize(vLocal-uLocalCamera));
 vec2 slope=direction.xy/max(.09,-direction.z);
 vec3 total=vec3(.0015,.002,.003);float prevDepth=0.;
 for(int i=0;i<20;i++){
  float k=float(i),depth=pow(1.245,k)-1.,transmission=exp(-k*.21);
  vec2 q=p+slope*depth;
  float width=.0025+k*k*.00032;
  float d=sdBox(q,.457,.014);float pixel=max(fwidth(d)*.8,.0005);
  width=max(width,pixel);
  float split=uDispersion*(.0013+.00048*k)*(1.+length(slope));
  vec3 distance=vec3(sdBox(q+vec2(split,0.),.457,.014),d,sdBox(q-vec2(split,0.),.457,.014));
  vec3 core=exp(-distance*distance/(width*width));
  vec3 halo=exp(-distance*distance/(width*width*15.));
  float glint=.68+.32*pow(max(sin(atan(q.y,q.x)*2.+k*.62-uTime*.18*(1.-uReduced)),0.),8.);
  total+=tint*(core*(.94+light*.35)*glint+halo*.065)*transmission;
  float corner=line(abs(abs(q.x)-abs(q.y)),.0028)*step(.28,max(abs(q.x),abs(q.y)))*(1.-step(.47,max(abs(q.x),abs(q.y))));
  total+=tint*corner*.016*transmission;
  prevDepth=depth;
 }
 return total;
}
void main(){
 int face=faceOf(vLocal);
 float light=face<3?uFaceLightA[face]:uFaceLightB[face-3];
 float square=max(abs(vUv.x-.5),abs(vUv.y-.5)),opening=.234;
 vec3 n=normalize(vNormal)*(gl_FrontFacing?1.:-1.),v=normalize(uCamera-vWorld),r=reflect(-v,n);
 float fresnel=pow(1.-abs(dot(n,v)),4.);
 vec3 tint=mix(vec3(.80,.92,1.),uTheme,.20+light*.40);
 vec2 uv=vUv+vec2(float(face)*1.73,uLayer*.37),mineral=crystal(uv*17.);
 float islands=smoothstep(.40,.76,noise(uv*5.1))*smoothstep(.27,.50,square);
 float fracture=line(mineral.x,.006),chips=pow(mineral.y,5.)*islands;
 float rim=line(square-.496,.0017),aperture=line(square-opening,.0024);
 float chamfer=exp(-abs(square-opening-.010)*190.);
 float spec=pow(max(dot(n,normalize(normalize(vec3(-.5,.85,1.))+v)),0.),92.);
 float strip=pow(max(dot(r,normalize(vec3(-.22,.86,.52))),0.),72.);
 float window=exp(-pow((r.x+.28)/.105,2.))*smoothstep(.2,.85,r.y);
 float reflection=spec*.55+window*.17+strip*.55;
 vec2 wave=network(face);
 vec3 material=tint*(.003+reflection+fresnel*.03+chips*.14+fracture*(.004+islands*.30));
 material+=tint*(rim*(.64+fresnel*1.1)+aperture*.36+chamfer*.07);
 if(uInnerOnly>.5){
  if(square<opening&&uLayer<3.5&&uWall<.5)discard;
  material*=exp(-uLayer*.26);
  material+=tint*wave.x*.13;
  float alpha=clamp(.14+islands*.6+rim*.6+aperture*.55+reflection*.2,.1,.9)*uOpacity;
  if(uWall>.5)alpha=uOpacity*.68;
  if(!gl_FrontFacing){material*=.45;alpha*=.4;}
  outColor=vec4(material,alpha);return;
 }
 vec2 screen=gl_FragCoord.xy/uResolution;
 vec2 bevel=normalize((vUv-.5)+vec2(.0001))*exp(-abs(square-opening)*45.);
 vec2 bend=(n.xy*.006+bevel*.0025)*(1.+fresnel);
 vec2 ca=bend*(.11*uDispersion)+vec2(uDispersion*.6/uResolution.x,0.);
 vec3 rough=vec3(texture(uFrosted,clamp(screen+bend+ca,.001,.999)).r,texture(uFrosted,clamp(screen+bend,.001,.999)).g,texture(uFrosted,clamp(screen+bend-ca,.001,.999)).b);
 vec3 sharp=texture(uBehind,clamp(screen+bend,.001,.999)).rgb;
 vec3 transmitted=mix(sharp,rough,clamp(uGlassBlur,0.,1.));
 float pane=1.-smoothstep(opening-.009,opening+.007,square);
 vec3 corridor=infinityCorridor(face,(vUv-.5)*2.,tint,light);
 vec3 glass=transmitted*(.27-.15*pane)+material;
 vec3 color=mix(glass,corridor+rough*.012+tint*reflection*.22,pane);
 float rimEnergy=light*.34+wave.y*0.78;
 color+=tint*(rim*(rimEnergy+fresnel*.10)+aperture*rimEnergy*.34);
 color+=mix(tint,uTheme,.70)*(wave.x*.42+wave.y*.46);
 color+=tint*light*.0045;
 outColor=vec4(color,uOpacity);
}