#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vRoot;
uniform sampler2D uEnergyMap;
uniform float uEnergySize;
uniform vec3 uTheme;
uniform float uTime,uOpacity,uReduced,uLayer;
out vec4 outColor;
float wrapped(float a){return abs(fract(a+.5)-.5);}
void main(){
 vec3 p=vRoot/max(abs(vRoot.x),max(abs(vRoot.y),abs(vRoot.z)));
 vec3 cubeAbs=abs(p);int face;vec2 uv;
 if(cubeAbs.x>=cubeAbs.y&&cubeAbs.x>=cubeAbs.z){face=p.x>0.?0:1;uv=vec2(p.x>0.?-p.z:p.z,p.y);}
 else if(cubeAbs.y>=cubeAbs.z){face=p.y>0.?2:3;uv=vec2(p.x,p.y>0.?-p.z:p.z);}
 else{face=p.z>0.?4:5;uv=vec2(p.z>0.?p.x:-p.x,p.y);}
 ivec2 o=ivec2(face%3,face/3)*int(uEnergySize),sampleCell=ivec2(clamp(uv*.5+.5,0.,.999)*(uEnergySize-1.));
 float signal=texelFetch(uEnergyMap,o+sampleCell,0).r*(1.-uReduced);
 float across=abs(vUv.y-.5),aa=max(fwidth(vUv.y),.015);
 float band=.032+uLayer*.0034;
 float core=1.-smoothstep(band,band+aa,across),halo=exp(-across*across/(.052+uLayer*.014));
 float motion=uTime*(.016+.004*uLayer)*(1.-uReduced);
 float a=wrapped(vUv.x-(.19+.07*uLayer)-motion),b=wrapped(vUv.x-(.61-.05*uLayer)+motion*(.7+.15*uLayer)),c=wrapped(vUv.x-(.85-.09*uLayer)-motion*(.4+.2*uLayer));
 float glints=exp(-a*a/.000032)+exp(-b*b/.000021)+exp(-c*c/.000012);
 float micro=pow(max(sin(vUv.x*72.-uTime*(.08+.035*uLayer)),0.),16.)*.36;
 vec3 tint=mix(vec3(.87,.94,1.),uTheme,.34+.08*uLayer);
 vec3 color=tint*(core*(.036+glints*1.0+micro*.22+signal*4.6)+halo*(.008+glints*.09+signal*.36));
 outColor=vec4(color*uOpacity,1.);
}