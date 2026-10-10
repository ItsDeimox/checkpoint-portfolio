/** Shared world-ray corridor: the banner and the interior see the same space. */
export const PORTAL_UNIFORMS=/*glsl*/`
 uniform float portalMix;uniform float portalAge;uniform float portalProgress;
 uniform float portalLayerCount;uniform vec3 portalOrigin;uniform vec3 portalRight;
 uniform vec3 portalUp;uniform vec3 portalForward;uniform vec2 portalHalf;
`;
export const PORTAL_FUNCTIONS=/*glsl*/`
 vec3 portalLocal(vec3 v){return vec3(dot(v,portalRight),dot(v,portalUp),dot(v,portalForward));}
 vec3 portalPicture(vec2 uv){
  vec3 h=projection*vec3(clamp(uv,vec2(.005),vec2(.995)),1.);
  return texture2D(artwork,vec2(h.x/h.z,1.-h.y/h.z)).rgb;
 }
 vec3 portalRadiance(vec3 eye,vec3 direction){
  vec3 ro=portalLocal(eye-portalOrigin),rd=portalLocal(direction);
  if(rd.z<=.00001)return vec3(.003,.001,.002);
  // Start the wall test at the doorway when looking from the showroom.
  float entry=max(0.,-ro.z/rd.z);vec3 door=ro+rd*entry;
  float tx=(sign(rd.x)*portalHalf.x-door.x)/(abs(rd.x)<.00001?.00001:rd.x);
  float ty=(sign(rd.y)*portalHalf.y-door.y)/(abs(rd.y)<.00001?.00001:rd.y);
  tx=tx>.001?tx:1000.;ty=ty>.001?ty:1000.;
  float wall=min(min(tx,ty),110.);vec3 hit=door+rd*wall;
  float horizontal=step(ty,tx);float across=mix(hit.y/portalHalf.y,hit.x/portalHalf.x,horizontal);
  float depth=hit.z,maxDepth=max(0.,depth-max(ro.z,0.));
  vec2 tiles=vec2(depth*.26,across*3.);
  vec2 grid=abs(fract(tiles)-.5);
  float seam=1.-smoothstep(.46,.498,max(grid.x,grid.y));
  float distanceFade=exp(-maxDepth*.055);
  vec3 art=portalPicture(vec2(fract(depth*.06+across*.025),across*.5+.5));
  vec3 color=(vec3(.011,.004,.008)+art*vec3(.09,.018,.026)*seam)*distanceFade;
  float rail=exp(-pow((abs(across)-.86)*55.,2.));
  color+=vec3(2.6,.008,.038)*rail*distanceFade;
  float streak=pow(max(0.,sin(depth*.85+across*7.-portalAge*(1.1+portalProgress*5.))),24.);
  color+=vec3(.38,.003,.018)*streak*distanceFade*(.35+portalProgress);
  // Repeated physical frames recede into the vanishing point, not flat UV zooms.
  float first=floor(max(ro.z,0.)/2.35);
  for(int i=0;i<24;i++){
   if(float(i)>=portalLayerCount)break;
   float z=(first+float(i)+1.)*2.35;
   float t=(z-ro.z)/rd.z;if(t<=0.)continue;
   vec2 q=(ro+rd*t).xy/portalHalf;
   float edge=abs(max(abs(q.x),abs(q.y))-1.);
   float pixel=.003+min(t*.00065,.016);
   float core=1.-smoothstep(pixel,pixel*2.7,edge);
   float glow=exp(-edge*45.)*.2;
   float fade=exp(-(z-max(ro.z,0.))*.072);
   color+=vec3(2.5,.012,.058)*(core*.75+glow)*fade;
  }
  vec2 vanishing=rd.xy/max(rd.z,.02);
  float endGlow=exp(-dot(vanishing,vanishing)*110.);
  color+=vec3(.15,.002,.012)*endGlow;
  return color*(1.-smoothstep(.84,1.,portalProgress));
 }
`;
