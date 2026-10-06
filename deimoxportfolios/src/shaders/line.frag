#version 300 es
precision highp float;
in vec3 vPosition;
uniform vec3 uTheme;
uniform float uOpacity,uTime;
out vec4 outColor;
void main(){
 float depth=max(abs(vPosition.x),max(abs(vPosition.y),abs(vPosition.z)));
 float outer=smoothstep(1.02,1.46,depth);
 float inner=1.0-smoothstep(.22,1.0,depth);
 float dash=0.55+0.45*sin((vPosition.x+vPosition.y+vPosition.z)*5.0-uTime*0.45);
 float sparkle=pow(max(sin(dot(vPosition,vec3(2.4,1.6,1.2))-uTime*.18),0.),12.0);
 vec3 tint=mix(vec3(.83,.92,1.0),uTheme,.22+outer*.22);
 float strength=.018 + inner*.032 + outer*.055 + sparkle*.07 + dash*.02;
 vec3 color=tint*strength;
 outColor=vec4(color,uOpacity*(.11 + outer*.07 + inner*.02));
}