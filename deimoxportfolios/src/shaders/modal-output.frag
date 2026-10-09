#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene,uNear,uWide;
out vec4 outColor;
void main(){
 vec3 c=texture(uScene,vUv).rgb+texture(uNear,vUv).rgb*.24+texture(uWide,vUv).rgb*.16;
 // UI exposure stays independent of the scene. Highlights roll off without bleaching text.
 c=mix(c,c/(1.+c*.30),smoothstep(.8,2.,c));
 outColor=vec4(pow(clamp(c,0.,1.),vec3(1./2.2)),1.);
}
