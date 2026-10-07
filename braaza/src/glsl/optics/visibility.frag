#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uDepth,uPrevious;uniform vec4 uFlare[2];uniform vec2 uResolution;uniform float uBlend;out vec4 outColor;
void main(){int index=int(floor(gl_FragCoord.x));vec4 source=uFlare[index];float visible=0.;if(source.w>.5&&min(source.x,source.y)>0.&&max(source.x,source.y)<1.){
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)visible+=step(source.z-.002,texture(uDepth,source.xy+vec2(x,y)*5./uResolution).r);visible/=9.;}
 float old=texture(uPrevious,vec2((float(index)+.5)/2.,.5)).r;outColor=vec4(mix(old,visible,uBlend),0,0,1);}
