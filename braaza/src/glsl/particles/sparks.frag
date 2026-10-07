#version 300 es
precision highp float;
in float vLife,vSeed,vBig;out vec4 outColor;
void main(){vec2 p=gl_PointCoord-.5;float angle=(vSeed-.5)*.8;p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;
 float trail=exp(-p.x*p.x*mix(40.,120.,vBig)-p.y*p.y*12.),core=exp(-dot(p,p)*88.),halo=exp(-dot(p,p)*13.);
 float env=smoothstep(0.,.08,vLife)*(1.-smoothstep(.72,1.,vLife));vec3 tint=mix(vec3(2.2,.26,.015),vec3(4.1,1.1,.12),vSeed);
 outColor=vec4(tint*(trail+core*.6+halo*.10)*env,(trail*.64+halo*.12)*env);}
