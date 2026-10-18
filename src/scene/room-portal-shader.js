/** One bounded analytic ray hit, shared by the original doorway and its interior. */
export const PORTAL_UNIFORMS=/*glsl*/`
 uniform float portalMix,portalReturn,portalAge,portalProgress,portalSpeed,portalOpening,portalLayerCount;
 uniform vec3 portalAccent,portalOrigin,portalRight,portalUp,portalForward;
 uniform vec2 portalHalf,portalExitHalf;
 uniform float portalExitDepth,portalExitOffset,portalTunnelEnd;
`;
export const PORTAL_FUNCTIONS=/*glsl*/`
 float portalHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float portalNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(portalHash(i),portalHash(i+vec2(1,0)),f.x),mix(portalHash(i+vec2(0,1)),portalHash(i+1.),f.x),f.y);}
 vec3 portalLocal(vec3 v){return vec3(dot(v,portalRight),dot(v,portalUp),dot(v,portalForward));}
 vec3 portalPicture(vec2 uv){vec3 h=projection*vec3(clamp(uv,vec2(.005),vec2(.995)),1.);return texture2D(artwork,vec2(h.x/h.z,1.-h.y/h.z)).rgb;}
 vec3 portalRadiance(vec3 eye,vec3 direction){
  vec3 ro=portalLocal(eye-portalOrigin),rd=portalLocal(direction);
  if(rd.z<=.00001)return vec3(.003,.001,.002);
  float entry=max(0.,-ro.z/rd.z);vec3 door=ro+rd*entry;
  float tx=abs(rd.x)<.00001?10000.:(sign(rd.x)*portalHalf.x-door.x)/rd.x;
  float ty=abs(rd.y)<.00001?10000.:(sign(rd.y)*portalHalf.y-door.y)/rd.y;
  tx=tx>.00001?tx:10000.;ty=ty>.00001?ty:10000.;
  float wall=min(tx,ty);
  bool tunnelWall=ro.z<portalTunnelEnd && door.z+wall*rd.z<portalTunnelEnd;
  if(!tunnelWall)wall=max(.001,(portalExitDepth-door.z)/rd.z);
  vec3 hit=door+rd*wall;
  float horizontal=step(ty,tx),depth=hit.z;
  float across=mix(hit.y/portalHalf.y,hit.x/portalHalf.x,horizontal);
  float distanceFade=exp(-max(0.,depth-max(ro.z,0.))*.045);
  vec3 color;
  if(tunnelWall){
   vec2 grid=abs(fract(vec2(depth*.26,across*3.))-.5);
   float seam=1.-smoothstep(.46,.498,max(grid.x,grid.y));
   vec3 art=portalPicture(vec2(fract(depth*.06+across*.025),across*.5+.5));
   color=(vec3(.011,.004,.008)+art*mix(vec3(.025),portalAccent*.09,.7)*seam)*distanceFade;
   float rail=exp(-pow((abs(across)-.86)*55.,2.));
   color+=portalAccent*2.6*rail*distanceFade*(1.+portalOpening*.4);
   float floorSide=horizontal*(1.-step(0.,hit.y));
   float lanes=exp(-pow((abs(across)-.34)*125.,2.));
   float dashed=exp(-pow(across*150.,2.))*smoothstep(.3,.36,fract(depth*.27));
   color+=mix(portalAccent,vec3(1.),.13)*2.1*(lanes*.65+dashed*.4)*distanceFade*floorSide;
   // The nearest physical rib is sufficient after the ray has hit an opaque
   // wall. No summing 24 hidden frame planes through each other per pixel.
   float ribDistance=abs(fract(depth/2.35)-.5)*2.35;
   float aa=max(fwidth(depth),.012);
   float core=1.-smoothstep(.018,.018+aa,ribDistance);
   float halo=exp(-ribDistance*12.);
   color+=portalAccent*2.5*(core*.76+halo*.19)*distanceFade;
   float lane=floor((across+1.)*14.),lanePos=abs(fract((across+1.)*14.)-.5);
   float seed=portalHash(vec2(lane,horizontal));
   float flow=fract(depth*(.06+seed*.035)-portalAge*(.25+seed*.5));
   color+=portalAccent*3.5*exp(-lanePos*70.)*step(.35,seed)*pow(1.-flow,9.)*distanceFade*(.4+portalSpeed);
   float vapor=portalNoise(vec2(across*4.,depth*.31-portalAge*.22));
   color+=portalAccent*.035*vapor*(1.-distanceFade)*(.5+portalSpeed);
  }else{
   vec2 q=abs(hit.xy-vec2(portalExitOffset,0.))-portalExitHalf;
   float edge=max(q.x,q.y),aa=max(fwidth(edge),.008);
   color=vec3(.010,.004,.008);
   color+=portalAccent*2.3*(exp(-pow((edge-.06)/max(.018,aa),2.))*.35+exp(-abs(edge-.06)*9.)*.075);
  }
  // A distinct terminal arch marks where the tunnel ends, in front of the wall.
  if(ro.z<portalTunnelEnd){
   float t=(portalTunnelEnd-ro.z)/rd.z;vec2 q=(ro+rd*t).xy/portalHalf;
   float d=abs(max(abs(q.x),abs(q.y))-1.),aa=max(fwidth(d),.003);
   color+=portalAccent*2.5*(1.-smoothstep(.007,.007+aa*1.5,d)+exp(-d*38.)*.12)*exp(-t*.035);
  }
  // Radiance is preserved in BOTH directions. The page itself is the end wall.
  return color;
 }
`;
