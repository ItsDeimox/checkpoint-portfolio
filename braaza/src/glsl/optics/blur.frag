#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uMap;uniform vec2 uStep;uniform float uExtract;out vec4 outColor;
vec3 extract(vec3 c){if(uExtract<.5)return c;float brightness=max(c.r,max(c.g,c.b)),knee=.50;float soft=clamp(brightness-1.1+knee,0.,2.*knee);soft=soft*soft/(4.*knee+.00001);return c*max(brightness-1.1,soft)/max(brightness,.00001);}
void main(){vec3 c=extract(texture(uMap,vUv).rgb)*.227027027;for(int i=1;i<=4;i++){float w=i==1?.194594595:i==2?.121621622:i==3?.054054054:.016216216;c+=(extract(texture(uMap,vUv+float(i)*uStep).rgb)+extract(texture(uMap,vUv-float(i)*uStep).rgb))*w;}outColor=vec4(c,1.);}
