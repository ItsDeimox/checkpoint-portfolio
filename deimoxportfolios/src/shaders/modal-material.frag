#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uEnergy;
uniform vec2 uGrid,uResolution,uCssSize,uPointer,uControlPointer;
uniform vec4 uRect;
uniform float uHover,uKind,uLevel,uReduced;
out vec4 outColor;
float uiBox(vec2 p,vec2 halfSize,float r){vec2 q=abs(p)-halfSize+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
float uiLine(float d,float width){return 1.-smoothstep(width,width+max(fwidth(d),.018),abs(d));}
float uiHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 linearColor(vec3 c){return pow(max(c,0.),vec3(2.2));}
void main(){
 vec2 px=vUv*uCssSize,q=px-uRect.xy,size=uRect.zw;
 float radius=uKind<.5?9.:uKind<1.5?4.:6.;
 // A single silhouette. Core and optical spread both peak at that edge, not inset rings.
 float sd=uiBox(q-size*.5,size*.5,radius);
 if(uKind>.5&&sd>0.)discard;
 float depth=max(-sd,0.);
 float rim=exp(-depth*1.8),spread=exp(-depth*.12);
 vec2 cells=clamp(vUv,0.,.9999)*uGrid,f=fract(cells);ivec2 c=ivec2(floor(cells));
 vec4 a=texelFetch(uEnergy,c,0),b=texelFetch(uEnergy,c+ivec2(1,0),0),d=texelFetch(uEnergy,c+ivec2(0,1),0),e=texelFetch(uEnergy,c+ivec2(1,1),0);
 float energy=mix(mix(a.g,b.g,f.x),mix(d.g,e.g,f.x),f.y)*(1.-uReduced);
 float wireX=uiLine(f.y,.014)*step(.96,a.b),wireY=uiLine(f.x,.014)*step(.94,a.a);
 float diag=uiLine((f.x-f.y)*.707,.010)*step(1.10,a.b)*step(.95,a.a);
 float lattice=max(max(wireX,wireY),diag),flow=1.-exp(-max(energy,0.)*3.2);
 vec3 tint=vec3(.34,.79,1.);
 float tilt=(a.r-b.r)*5.+(a.r-d.r)*3.;
 vec3 base=linearColor(mix(vec3(.031,.041,.050),vec3(.065,.078,.083),clamp((1.-vUv.x+vUv.y)*.5,0.,1.)));
 if(uKind<.5){
  vec2 delta=px-uPointer*uCssSize;float radial=exp(-dot(delta,delta)/24000.)*uHover;
  // Keep the approved 18px graph and its solver. Only raise the reflected energy slightly.
  base+=tint*(flow*lattice*.034+flow*.005+radial*.0035+abs(tilt)*.005);
  base+=tint*(rim*(.038+1.35*radial)+spread*radial*.010);
 }else{
  // Same optical falloff as Falar comigo / Qualidade: local rim + soft inward reflection.
  // Each control retains a smoothed light anchor while its envelope fades on leave.
  vec2 delta=q-uControlPointer*size;
  float radial=exp(-dot(delta,delta)/3800.);
  float grid=pow(max(0.,1.-abs(sin(q.x*.14))*abs(sin(q.y*.14))),14.)*step(.48,uiHash(floor(q*.05)));
  float interior=(1.-smoothstep(-1.,0.,sd))*(.027+grid*.026);
  float reflection=radial*(rim*.9+spread*.13+interior)*uLevel;
  if(uKind<1.5){
   base=linearColor(mix(vec3(.70,.75,.77),vec3(.85,.88,.88),q.y/size.y));
   base+=mix(tint,vec3(.85,.95,1.),.55)*(rim*.14+reflection*1.7);
   base+=tint*flow*lattice*.020*uLevel;
  }else if(uKind<2.5){
   base=linearColor(vec3(.035,.050,.057));
   base+=tint*(rim*.038+reflection*1.65+flow*lattice*.025*uLevel);
  }else if(uKind>3.5){
   // Blend from the underlying charcoal; crossing a tiny threshold must not reveal a plate.
   base=mix(base,linearColor(vec3(.052,.072,.082)),uLevel);
   base+=tint*reflection*1.2;
  }else{
   // Media stays in HTML. Its border is the only part rendered by this pass.
   if(depth>3.)discard;
   base=tint*(rim*.035+reflection*1.35);
  }
 }
 outColor=vec4(max(base,0.),1.);
}
