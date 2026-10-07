const float PI=3.14159265359;
float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}
vec2 grad(vec2 p){float a=hash21(p)*6.2831853;return vec2(cos(a),sin(a));}
float perlin(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(grad(i),f),dot(grad(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(grad(i+vec2(0,1)),f-vec2(0,1)),dot(grad(i+1.),f-1.),u.x),u.y);}
float fbm(vec2 p){float sum=0.,a=.5;for(int i=0;i<4;i++){sum+=noise(p)*a;p=mat2(.8,-.6,.6,.8)*p*2.03+vec2(3.4,1.7);a*=.5;}return sum;}
float flow(vec2 p){float sum=0.,a=.58;for(int i=0;i<4;i++){sum+=perlin(p)*a;p=mat2(.8,-.6,.6,.8)*p*2.07+vec2(5.8,9.2);a*=.5;}return sum;}
float cells(vec2 p){vec2 k=floor(p),f=fract(p);float a=9.,b=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y),o=vec2(hash21(k+g),hash21(k+g+11.));float d=length(g+o-f);if(d<a){b=a;a=d;}else b=min(b,d);}return b-a;}
float sdRoundBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
vec3 hotColor(float t){return mix(vec3(1.,.043,.0013),vec3(1.,.46,.075),clamp(t,0.,1.));}
vec3 flameColor(float t){return mix(vec3(1.,.037,.0008),vec3(1.,.54,.15),smoothstep(.2,1.,t));}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float pulse(float time,float phase){return .96+.025*sin(time*2.2+phase)+.018*sin(time*5.7+phase*2.6);}
vec3 safeNorm(vec3 v){return v*inversesqrt(max(dot(v,v),1e-10));}
