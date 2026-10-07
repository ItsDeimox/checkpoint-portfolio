#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uDepth,uNormal;uniform mat4 uInverseVP,uVP;uniform float uSamples;out vec4 outColor;
vec3 world(vec2 uv,float d){vec4 p=uInverseVP*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
void main(){float d=texture(uDepth,vUv).r;if(d>.9999){outColor=vec4(1);return;}
 vec3 p=world(vUv,d),n=normalize(texture(uNormal,vUv).xyz*2.-1.);vec3 t=normalize(cross(abs(n.y)>.9?vec3(1,0,0):vec3(0,1,0),n)),b=cross(n,t);float occ=0.;
 for(int i=0;i<8;i++){if(float(i)>=uSamples)break;float a=float(i)*2.399963;float r=.17+float(i)*.058;vec3 q=p+n*.12+(t*cos(a)+b*sin(a))*r;vec4 clip=uVP*vec4(q,1.);vec3 uvz=clip.xyz/clip.w*.5+.5;
  if(min(uvz.x,uvz.y)<.0||max(uvz.x,uvz.y)>1.)continue;float actual=texture(uDepth,uvz.xy).r;vec3 v=world(uvz.xy,actual)-p;
  occ+=step(actual+.00006,uvz.z)*smoothstep(.01,.12,dot(n,v))*(1.-smoothstep(.25,.75,length(v)));
 }
 float ao=clamp(1.-occ/uSamples*.86,.2,1.);outColor=vec4(ao,ao,ao,1.);}
