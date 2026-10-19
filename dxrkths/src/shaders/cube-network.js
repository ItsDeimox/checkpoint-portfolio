/** Network sampling and radiance from the tracked, glow-reduced portfolio cube.
 * The sole adaptation is a UV argument so rectangular hosts keep square cells.
 * Both CTA and world panels call the exact same function. */
export const CUBE_NETWORK_GLSL = /* glsl */`
uniform sampler2D uEnergyMap;
uniform float uEnergyActive,uEnergySize,uReduced;
float line(float d,float w){return 1.-smoothstep(w,w+max(fwidth(d),.00035),abs(d));}
vec2 network(int face,vec2 surfaceUv){
 if(uEnergyActive<.5||uReduced>.5)return vec2(0.);
 vec2 g=clamp(surfaceUv,0.,.99999)*(uEnergySize-1.),f=fract(g);ivec2 c=ivec2(floor(g));
 ivec2 o=ivec2(face%3,face/3)*int(uEnergySize);c=clamp(c,ivec2(0),ivec2(int(uEnergySize)-2));
 vec4 a=texelFetch(uEnergyMap,o+c,0),b=texelFetch(uEnergyMap,o+c+ivec2(1,0),0),c0=texelFetch(uEnergyMap,o+c+ivec2(0,1),0),d=texelFetch(uEnergyMap,o+c+ivec2(1,1),0);
 float e=mix(mix(a.r,b.r,f.x),mix(c0.r,d.r,f.x),f.y);
 float wires=max(max(line(f.x,.016)*step(.26,a.g),line(f.y,.016)*step(.28,a.b)),line((f.x-f.y)*.707,.012)*step(.76,a.g));
 float radiance=pow(max(e-.02,0.),.92)*(1.+3.7*smoothstep(.18,1.1,e));
 return vec2(radiance*wires*0.98,radiance*.055);
}
`;
