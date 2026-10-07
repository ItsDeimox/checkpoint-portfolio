#version 300 es
precision highp float;
in vec2 vUv;uniform float uIndex;out vec4 outColor;
#include "common/noise.glsl"
float mineral(vec3 q){float d=max(abs(q.x),max(abs(q.z),abs(q.y)*.84))-.62;d=max(d,dot(q,normalize(vec3(1,1,1)))-.77);d=max(d,dot(q,normalize(vec3(-1,1,1)))-.75);d=max(d,dot(q,normalize(vec3(1,-1,1)))-.70);d=max(d,dot(q,normalize(vec3(-1,-1,-1)))-.72);return d;}
vec2 map(vec3 p){vec3 q=p;q.xz=rot(.48+uIndex*.3)*q.xz;q.xy=rot(-.15-uIndex*.03)*q.xy;float d;
 if(uIndex<.5)d=mineral(q);
 else if(uIndex<1.5){d=max(abs(q.x)*.87+q.y*.46-.45,max(abs(q.z)*1.13+q.y*.46-.43,-q.y-.68));}
 else if(uIndex<2.5){vec3 v=abs(q-vec3(0,.1,0))-vec3(.59,.56,.46);d=length(max(v,0.))+min(max(v.x,max(v.y,v.z)),0.);}
 else d=abs(q.x)+abs(q.z)+abs(q.y)*.60-.58;
 vec3 ring=p;ring.yz=rot(.42)*ring.yz;float orbit=length(vec2(length(ring.xz)-1.,ring.y))-.012;
 if(uIndex>.5&&uIndex<1.5&&orbit<d)return vec2(orbit,1.);return vec2(d,0.);
}
void main(){vec2 uv=vUv,p=(uv-.5)*vec2(3.9,1.61);p.y-=.055;vec3 ro=vec3(0,.19,4.),rd=normalize(vec3(p,-4.05));float t=0.;vec2 d=vec2(0);bool hit=false;
 for(int i=0;i<85;i++){d=map(ro+rd*t);if(d.x<.0014){hit=true;break;}t+=max(d.x*.72,.001);if(t>8.)break;}
 float cloud=fbm(uv*vec2(7,5)+uIndex),f=exp(-pow((uv.x-.51)/.31,2.)-pow((uv.y-.37)/.19,2.));
 vec3 c=vec3(.012,.014,.022)*cloud+hotColor(.3)*f*(.20+pow(cloud,4.)*3.6);
 float ridge=.20+fbm(vec2(uv.x*7.,uIndex))* .12,foreground=1.-smoothstep(ridge-.03,ridge,uv.y);c=mix(c,vec3(.004,.004,.005),foreground);
 if(hit){vec3 pos=ro+rd*t;float e=.002;vec3 n=normalize(vec3(map(pos+vec3(e,0,0)).x-map(pos-vec3(e,0,0)).x,map(pos+vec3(0,e,0)).x-map(pos-vec3(0,e,0)).x,map(pos+vec3(0,0,e)).x-map(pos-vec3(0,0,e)).x));
  float nl=max(dot(n,normalize(vec3(-.7,1,1.5))),0.),spec=pow(max(dot(reflect(-normalize(vec3(-.5,.8,1.2)),n),-rd),0.),45.);
  float seam=cells(pos.xy*3.4+pos.z*2.+uIndex*7.+vec2(noise(pos.xy*11.),noise(pos.yz*11.+1.))*.6),crack=1.-smoothstep(.006,.006+max(fwidth(seam),.002),seam),heat=smoothstep(.35,.70,fbm(pos.xy*3.+pos.z+4.));
  c=vec3(.017,.023,.035)*(.3+nl)+vec3(.35,.41,.52)*spec+hotColor(heat)*(crack*3.2+exp(-seam*30.)*.35)*heat;
  c+=hotColor(.4)*pow(clamp(1.-max(dot(n,-rd),0.),0.,1.),3.)*.38;
  if(uIndex>1.5&&uIndex<2.5){float visor=exp(-pow((pos.y-.12+pos.x*.14)/.016,2.))*smoothstep(.0,.3,pos.z);c+=hotColor(.8)*visor*5.;}
  if(d.y>.5)c=hotColor(.7)*5.5;
 }
 vec2 grid=uv*vec2(150,85);float spark=step(.995,hash21(floor(grid)+uIndex))*exp(-dot(fract(grid)-.5,fract(grid)-.5)*35.);c+=hotColor(.6)*spark*.9;
 outColor=vec4(max(c,0.),1.);
}
