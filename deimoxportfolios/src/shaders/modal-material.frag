#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uEnergy;
uniform vec2 uGrid,uResolution,uCssSize,uPointer;
uniform vec4 uRect;
uniform float uHover,uKind,uLevel,uReduced;
out vec4 outColor;
float uiBox(vec2 p,vec2 halfSize,float r){vec2 q=abs(p)-halfSize+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
float uiLine(float d,float width){return 1.-smoothstep(width,width+max(fwidth(d),.018),abs(d));}
vec3 linearColor(vec3 c){return pow(max(c,0.),vec3(2.2));}
void main(){
 vec2 px=vUv*uCssSize,q=px-uRect.xy,size=uRect.zw;
 float radius=uKind<.5?9.:uKind<1.5?4.:6.;float sd=uiBox(q-size*.5,size*.5-1.,radius);
 if(uKind>.5&&sd>0.)discard;
 vec2 cells=clamp(vUv,0.,.9999)*uGrid,f=fract(cells);ivec2 c=ivec2(floor(cells));
 vec4 a=texelFetch(uEnergy,c,0),b=texelFetch(uEnergy,c+ivec2(1,0),0),d=texelFetch(uEnergy,c+ivec2(0,1),0),e=texelFetch(uEnergy,c+ivec2(1,1),0);
 float energy=mix(mix(a.g,b.g,f.x),mix(d.g,e.g,f.x),f.y)*(1.-uReduced);
 float wireX=uiLine(f.y,.014)*step(.96,a.b),wireY=uiLine(f.x,.014)*step(.94,a.a);
 float diag=uiLine((f.x-f.y)*.707,.010)*step(1.10,a.b)*step(.95,a.a);
 float lattice=max(max(wireX,wireY),diag),flow=1.-exp(-max(energy,0.)*3.2);
 vec2 delta=px-uPointer*uCssSize;float radial=exp(-dot(delta,delta)/(uKind<.5?24000.:13000.))*uHover;
 float rim=exp(-pow((sd+1.4)/.8,2.)),inner=exp(-pow((sd+4.)/2.4,2.)),halo=exp(-max(-sd,0.)/13.);
 vec3 tint=vec3(.34,.79,1.);
 float tilt=(a.r-b.r)*5.+(a.r-d.r)*3.;
 vec3 base=linearColor(mix(vec3(.031,.041,.050),vec3(.065,.078,.083),clamp((1.-vUv.x+vUv.y)*.5,0.,1.)));
 if(uKind<.5){
  base+=tint*(flow*lattice*.024+flow*.0035+radial*.0025+abs(tilt)*.005);
  base+=tint*(rim*(.008+.65*radial)+inner*(.002+.09*radial)+halo*radial*.004);
 }else if(uKind<1.5){
  base=linearColor(mix(vec3(.70,.75,.77),vec3(.85,.88,.88),q.y/size.y));
  base+=tint*(radial*.11+flow*lattice*.025)*uLevel;
  base+=vec3(.75,.9,1.)*(rim*(.20+uLevel*.80)+inner*uLevel*.10);
 }else if(uKind<2.5){
  base=linearColor(vec3(.035,.050,.057));
  base+=tint*(radial*uLevel*.016+flow*lattice*.040+rim*(.025+uLevel*.8)+inner*(.008+uLevel*.10));
 }else if(uKind>3.5){
  if(uLevel<.003)discard;
  base=linearColor(vec3(.052,.072,.082))+tint*(rim*.30+radial*.018)*uLevel;
 }else{
  // Keep the media pixels completely untouched; only the inset frame is rendered.
  if(sd< -4.)discard;
  base=tint*(rim*(.020+uLevel*.7)+inner*uLevel*.04);
 }
 outColor=vec4(max(base,0.),1.);
}
