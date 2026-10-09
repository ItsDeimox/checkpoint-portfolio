#version 300 es
precision highp float;
in vec3 vWorld,vLocal;in vec2 vUv;in vec4 vCurrent,vPrevious;
uniform float uMediaAspect;uniform sampler2D uArt,uLabel;uniform float uIndex,uTime;out vec4 outColor;
#include "common/noise.glsl"
vec3 readMedia(vec2 uv){float aspect=max(uMediaAspect,.01),panelAspect=4.8/(2.25*.88);vec2 q=uv-.5;if(aspect>panelAspect)q.y*=aspect/panelAspect;else q.x*=panelAspect/aspect;q+=.5;if(min(q.x,q.y)<0.||max(q.x,q.y)>1.)return vec3(.001);return texture(uArt,q).rgb;}
void main(){vec2 p=(vUv-.5)*vec2(4.8,2.25);if(sdRoundBox(p,vec2(2.4,1.125)-.055,.1)>.0)discard;
 // Uncut transmission source; the front glass applies the common lifecycle exactly once.
 vec3 col=readMedia(vUv);float mediaLuma=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(mediaLuma),col,1.10)*1.025;vec4 label=texture(uLabel,vUv);col=mix(col,label.rgb,label.a);
 outColor=vec4(max(col,0.),1.);
}
