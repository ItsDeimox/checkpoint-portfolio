#version 300 es
precision highp float;
in vec3 vWorld,vNormal;in vec2 vUv;in vec4 vCurrent,vPrevious;
uniform sampler2D uMap;uniform float uTime;
layout(location=0)out vec4 outColor;layout(location=1)out vec4 outNormal;layout(location=2)out vec4 outVelocity;
void main(){vec4 c=texture(uMap,vUv);if(c.a<.025)discard;
 float heat=smoothstep(.08,.5,c.r)*smoothstep(.06,.22,c.r-c.b);vec3 col=c.rgb*(.83+heat*(.25+.035*sin(uTime*1.3)));
 outColor=vec4(col,c.a);outNormal=vec4(normalize(vNormal)*.5+.5,0);outVelocity=vec4((vCurrent.xy/max(vCurrent.w,.001)-vPrevious.xy/max(vPrevious.w,.001))*.5,0,1);}
