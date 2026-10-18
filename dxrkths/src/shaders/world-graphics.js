/** The CTA network follows deimoxportfolios/src/shaders/cube.frag: persistent
 * node energy, connection masks, derivative-antialiased wires and local halos.
 * The covered car is a procedural 3D distance field, not a flat photograph. */
export const VERTEX=`#version 300 es
precision highp float;
out vec2 vUv;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
export const ENERGY_FRAGMENT=`#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uEnergy;uniform vec2 uSize;out vec4 outColor;
float wire(float distance,float width){return 1.-smoothstep(width,width+max(fwidth(distance),.001),abs(distance));}
void main(){
 vec2 g=clamp(vUv,0.,.99999)*(uSize-1.),f=fract(g);ivec2 c=ivec2(floor(g));
 vec4 a=texelFetch(uEnergy,c,0),b=texelFetch(uEnergy,c+ivec2(1,0),0),d=texelFetch(uEnergy,c+ivec2(1,1),0),e=texelFetch(uEnergy,c+ivec2(0,1),0);
 float energy=mix(mix(a.r,b.r,f.x),mix(e.r,d.r,f.x),f.y);
 float horizontal=max(wire(f.y,.020)*a.g,wire(1.-f.y,.020)*e.g);
 float vertical=max(wire(f.x,.020)*a.b,wire(1.-f.x,.020)*b.b);
 float diagonal=wire((f.x-f.y)*.707,.014)*step(.75,a.g*a.b);
 float lines=max(max(horizontal,vertical),diagonal*.52);
 float radiance=pow(max(energy-.008,0.),.90)*(1.+3.4*smoothstep(.12,1.,energy));
 float node=exp(-dot(min(f,1.-f),min(f,1.-f))*150.);
 vec3 tint=vec3(1.,.055,.16),white=vec3(1.,.63,.69);
 vec3 color=mix(tint,white,clamp(radiance*.18,0.,.58));
 float alpha=clamp(radiance*(lines*.72+node*.15)+energy*.065,0.,.82);
 outColor=vec4(color,alpha);
}`;
export const FUTURE_FRAGMENT=`#version 300 es
precision highp float;
in vec2 vUv;uniform vec2 uResolution;uniform float uTime,uMotion,uQuality;out vec4 outColor;
float roundedBox(vec3 p,vec3 size,float radius){vec3 q=abs(p)-size;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-radius;}
float joinSmooth(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float coveredCar(vec3 point){
 vec3 p=point;
 float skirt=1.-smoothstep(.02,.70,p.y);
 p.x/=1.+skirt*.055;p.z/=1.+skirt*.14;
 float side=smoothstep(.58,.94,abs(p.z));
 float fall=1.-smoothstep(.45,1.12,p.y);
 float folds=(sin(p.x*13.+p.y*.85)*.012+sin(p.x*27.-p.y*.6)*.005)*side*fall;
 p.z+=folds;
 p.x+=smoothstep(1.85,2.4,abs(p.x))*sin(p.z*17.+p.y*.9)*.010*fall;
 float body=roundedBox(p-vec3(0.,.40,0.),vec3(2.03,.22,.68),.25);
 vec3 c=p-vec3(-.24,1.04,0.);
 float rise=(c.y+sqrt(c.y*c.y+.04))*.5;
 c.x*=1.+rise*.68;c.z*=1.+rise*.26;
 float cabin=roundedBox(c,vec3(.84,.12,.37),.35)*.80;
 return joinSmooth(body,cabin,.58);
}
vec3 normalAt(vec3 p){vec2 e=vec2(.003,0.);return normalize(vec3(coveredCar(p+e.xyy)-coveredCar(p-e.xyy),coveredCar(p+e.yxy)-coveredCar(p-e.yxy),coveredCar(p+e.yyx)-coveredCar(p-e.yyx)));}
float shadow(vec3 p,vec3 light){
 vec3 ray=normalize(light-p);float limit=length(light-p),t=.04,result=1.;
 for(int i=0;i<16;i++){float h=coveredCar(p+ray*t);result=min(result,12.*max(h,0.)/t);t+=clamp(h,.055,.55);if(t>limit||result<.02)break;}
 return clamp(result,.12,1.);
}
vec3 aces(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
void main(){
 vec2 screen=(vUv-.5)*2.;screen.x*=uResolution.x/max(1.,uResolution.y);
 float turn=.71+sin(uTime*.105)*.026*uMotion;
 vec3 eye=vec3(cos(turn)*6.9,2.85+sin(uTime*.08)*.04*uMotion,sin(turn)*6.9);
 vec3 target=vec3(0.,.60,0.),forward=normalize(target-eye),right=normalize(cross(forward,vec3(0.,1.,0.))),up=cross(right,forward);
 vec3 ray=normalize(forward*1.94+screen.x*right+screen.y*up);
 float floorDistance=ray.y<-.001?-eye.y/ray.y:28.,travel=.4;bool hit=false;
 for(int i=0;i<86;i++){
  if(float(i)>mix(57.,85.,uQuality))break;
  float d=coveredCar(eye+ray*travel);
  if(d<.004){hit=true;break;}travel+=max(.003,d*.78);
  if(travel>min(22.,floorDistance))break;
 }
 vec3 light=vec3(-.7,6.2,.9),color=vec3(.002,.0016,.0028);
 if(hit){
  vec3 p=eye+ray*travel,n=normalAt(p),l=normalize(light-p),v=normalize(eye-p),h=normalize(l+v);
  float diffuse=max(0.,dot(n,l)),visibility=shadow(p+n*.015,light);
  float weave=.985+.015*sin(p.x*145.)*sin(p.z*170.);
  float grazing=pow(1.-max(0.,dot(n,v)),3.);
  float spec=pow(max(0.,dot(n,h)),37.0)*.64;
  float pleat=.985+.015*sin(p.x*19.+p.y*.8);
  vec3 fabric=vec3(.155,.151,.173)*weave*pleat;
  color=fabric*(.045+diffuse*visibility*.98)+vec3(.57,.55,.68)*spec*visibility;
  color+=vec3(.13,.075,.25)*grazing*.13;
  color*=smoothstep(.0,.18,p.y)*.68+.32;
 }else if(floorDistance<22.){
  vec3 p=eye+ray*floorDistance;
  float pool=exp(-dot((p.xz-vec2(-.7,.9))/3.1,(p.xz-vec2(-.7,.9))/3.1));
  float contact=1.-.85*exp(-dot(p.xz/vec2(2.65,1.2),p.xz/vec2(2.65,1.2))*1.4);
  float grit=fract(sin(dot(floor(p.xz*130.),vec2(127.1,311.7)))*43758.5453);
  color+=vec3(.035,.03,.05)*pool*contact*shadow(p+vec3(0.,.03,0.),light)*(.88+grit*.12);
 }
 vec3 mapped=pow(aces(color),vec3(1./2.2));
 float edge=1.-smoothstep(.69,1.25,length((vUv-.5)*vec2(1.60,1.73)));
 vec3 background=vec3(.031,.027,.042);
 outColor=vec4(mix(background,mapped,edge),1.);
}`;
