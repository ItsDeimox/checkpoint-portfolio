/** Lighting is evaluated in physical card coordinates, before perspective projection. */
export const cardVertex=`#version 300 es
precision highp float;
layout(location=0) in vec2 aUv;
uniform mat4 uMatrix;
uniform vec2 uSize,uCenter,uViewport;
uniform float uBack;
out vec2 vUv;
void main(){vUv=aUv;vec4 p=uMatrix*vec4((aUv-.5)*uSize,uBack,1.);gl_Position=vec4((p.x+uCenter.x*p.w)*2./uViewport.x-p.w,p.w-(p.y+uCenter.y*p.w)*2./uViewport.y,0.,p.w);}`;
export const cardFragment=`#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uImage;uniform vec2 uSize,uPointer,uRaster,uViewport;uniform vec4 uClip;uniform vec3 uTint;uniform float uHover,uTime,uDim,uBack,uDefocus;uniform vec4 uPulse[8];out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float box(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
void main(){
 vec2 screen=vec2(gl_FragCoord.x,uRaster.y-gl_FragCoord.y)*uViewport/uRaster;if(screen.x<uClip.x||screen.x>uClip.z||screen.y<uClip.y||screen.y>uClip.w)discard;
 vec2 px=vUv*uSize,p=px-uSize*.5;float d=box(p,uSize*.5-vec2(.8),5.);float aa=max(fwidth(d),.5),cover=1.-smoothstep(-aa*.5,aa*.5,d);if(cover<.002)discard;
 if(uBack<-.1){outColor=vec4(vec3(.055,.045,.052)*cover,cover);return;}
 vec2 delta=(vUv-uPointer)*uSize;float radial=exp(-dot(delta,delta)/16500.)*uHover;
 float pulse=0.;for(int i=0;i<8;i++){float age=uTime-uPulse[i].z;vec2 q=(vUv-uPulse[i].xy)*uSize;float distance=length(q),wave=exp(-pow((distance-age*160.)/7.,2.));pulse+=wave*exp(-age*3.8)*uPulse[i].w*step(0.,age);}
 vec2 grid=px/12.;vec2 cell=floor(grid);vec2 f=fract(grid);float gridLine=max(1.-smoothstep(.025,.025+fwidth(grid.x),min(f.x,1.-f.x)),1.-smoothstep(.025,.025+fwidth(grid.y),min(f.y,1.-f.y)));
 float segments=gridLine*step(.36,hash(cell+vec2(11.,3.)));
 vec2 refraction=delta/max(length(delta),1.)*(pulse*.00045+radial*.00025);
 vec3 tex=textureLod(uImage,clamp(vUv+refraction,0.,1.),uDefocus).rgb;
 vec3 base=pow(tex,vec3(2.2))*(.94+.14*uHover)*uDim;
 // Broad reflected sky and the small hot highlight belong to the glass, not the artwork.
 float band=exp(-pow((vUv.y-(.20+vUv.x*.21+uPointer.y*.11))/.11,2.));
 base+=vec3(.37,.45,.55)*band*(.012+.022*uHover)*(1.-vUv.y);
 float edge=exp(-pow((d+1.35)/.62,2.)),inner=exp(-max(-d,0.)/7.5);
 float rimLamp=exp(-dot(delta,delta)/42000.)*uHover;
 base+=mix(vec3(.13,.16,.18),uTint,radial)*edge*(.72+rimLamp*3.8+pulse*.36);
 base+=uTint*(inner*radial*.085+radial*.021+segments*pulse*.14+pulse*.027);
 float horizontal=exp(-abs(delta.y)/1.4)*exp(-abs(delta.x)/45.);base+=uTint*horizontal*rimLamp*inner*.5;
 outColor=vec4(max(base,0.)*cover,cover);
}`;
export const fullVertex=`#version 300 es
precision highp float;out vec2 vUv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
export const blurFragment=`#version 300 es
precision highp float;in vec2 vUv;uniform sampler2D uImage;uniform vec2 uStep;uniform float uExtract;out vec4 outColor;
vec3 readColor(vec2 uv){vec3 c=texture(uImage,uv).rgb;if(uExtract>.5){float l=max(c.r,max(c.g,c.b));c*=max(l-.95,0.)/max(l,.00001);}return c;}
void main(){vec3 c=readColor(vUv)*.227027;for(int i=1;i<=4;i++){float weight=i==1?.1945946:i==2?.1216216:i==3?.054054:.016216;c+=(readColor(vUv+float(i)*uStep)+readColor(vUv-float(i)*uStep))*weight;}outColor=vec4(c,0.);}`;
export const finishFragment=`#version 300 es
precision highp float;in vec2 vUv;uniform sampler2D uImage,uGlow,uAir;out vec4 outColor;
void main(){vec4 source=texture(uImage,vUv);vec3 halo=texture(uGlow,vUv).rgb*.5+texture(uAir,vUv).rgb*.28;vec3 c=source.rgb+halo;float a=clamp(source.a+max(halo.r,max(halo.g,halo.b))*1.2,0.,1.);if(a<.001){outColor=vec4(0.);return;}c/=max(a,.001);c=mix(c,c/(1.+c*.28),smoothstep(.8,2.,c));c=pow(clamp(c,0.,1.),vec3(1./2.2));outColor=vec4(c*a,a);}`;
