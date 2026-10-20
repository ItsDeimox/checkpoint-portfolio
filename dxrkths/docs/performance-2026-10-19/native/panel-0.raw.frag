varying vec2 vUv;

uniform sampler2D uEnergyMap;
uniform vec2 uPanelGrid;
uniform float uEnergyActive,uReduced;
float panelLine(float d,float w){return 1.-smoothstep(w,w+max(fwidth(d),.00035),abs(d));}
float panelRadiance(float e){return pow(max(e-.02,0.),.92)*(1.+3.7*smoothstep(.18,1.1,e));}
vec2 panelNetwork(vec2 surfaceUv){
 if(uEnergyActive<.5||uReduced>.5)return vec2(0.);
 vec2 g=clamp(surfaceUv,0.,1.)*uPanelGrid+vec2(1.);
 float column=floor(g.x),t=fract(g.x);
 float leftOffset=mod(column,2.)*0.5,rightOffset=0.5-leftOffset;
 float row=floor(g.y-mix(leftOffset,rightOffset,t));
 float v=g.y-row-mix(leftOffset,rightOffset,t);
 ivec2 cell=ivec2(column,row);
 vec4 a=texelFetch(uEnergyMap,cell,0),b=texelFetch(uEnergyMap,cell+ivec2(1,0),0);
 vec4 c=texelFetch(uEnergyMap,cell+ivec2(0,1),0),d=texelFetch(uEnergyMap,cell+ivec2(1,1),0);
 float slope=(rightOffset-leftOffset)*0.8;
 float normalScale=0.8/sqrt(1.+slope*slope);
 vec4 distanceToEdge=vec4(v*normalScale,(1.-v)*normalScale,t,1.-t);
 vec4 edgeEnergy=vec4(mix(a.r,b.r,t),mix(c.r,d.r,t),mix(a.r,c.r,clamp(v+t*(rightOffset-leftOffset),0.,1.)),mix(b.r,d.r,clamp(v+(t-1.)*(rightOffset-leftOffset),0.,1.)));
 vec4 gates=step(vec4(.001),vec4(a.g,c.g,a.b,b.b));
 vec4 light=vec4(panelRadiance(edgeEnergy.x),panelRadiance(edgeEnergy.y),panelRadiance(edgeEnergy.z),panelRadiance(edgeEnergy.w))*gates;
 light.zw*=.82;
 float wires=max(max(light.x*panelLine(distanceToEdge.x,.018),light.y*panelLine(distanceToEdge.y,.018)),max(light.z*panelLine(distanceToEdge.z,.015),light.w*panelLine(distanceToEdge.w,.015)));
 vec4 halos=light*exp(-distanceToEdge*22.);
 float wireHalo=max(max(halos.x,halos.y),max(halos.z,halos.w));
 vec2 p=vec2(t,v*0.8+t*slope);
 vec4 junctionDistance=vec4(length(p),length(p-vec2(1.,slope)),length(p-vec2(0.,0.8)),length(p-vec2(1.,slope+0.8)));
 vec4 junctionLight=vec4(panelRadiance(a.r),panelRadiance(b.r),panelRadiance(c.r),panelRadiance(d.r));
 junctionLight*=mix(vec4(.78),vec4(1.12),smoothstep(vec4(.12),vec4(1.1),vec4(a.a,b.a,c.a,d.a)));
 vec4 nodes=junctionLight*vec4(panelLine(junctionDistance.x,.055),panelLine(junctionDistance.y,.055),panelLine(junctionDistance.z,.055),panelLine(junctionDistance.w,.055));
 vec4 nodeHalos=junctionLight*exp(-junctionDistance*18.);
 float node=max(max(nodes.x,nodes.y),max(nodes.z,nodes.w));
 float nodeHalo=max(max(nodeHalos.x,nodeHalos.y),max(nodeHalos.z,nodeHalos.w));
 return vec2(max(wires,node),max(wireHalo*.12,nodeHalo*.16));
}

uniform vec3 cardAccent;uniform float cardLevel;

 uniform float portalMix,portalReturn,portalAge,portalProgress,portalSpeed,portalOpening,portalLayerCount;
 uniform vec3 portalAccent,portalOrigin,portalRight,portalUp,portalForward;
 uniform vec2 portalHalf,portalExitHalf;
 uniform float portalExitDepth,portalExitOffset,portalTunnelEnd;

varying vec3 vWorld;

precision highp float;uniform sampler2D artwork;uniform sampler2D contentMap;uniform float contentMix;uniform mat3 projection;uniform float hover;uniform float hoverTime;uniform vec2 hoverUv;uniform float eraseForeground;
#include <fog_pars_fragment>

float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+1.),f.x),f.y);}
float fbm4(vec2 p){float f=0.;f+=.5*noise2(p);p=mat2(1.6,1.2,-1.2,1.6)*p;f+=.25*noise2(p);p=mat2(1.6,1.2,-1.2,1.6)*p;f+=.125*noise2(p);p=mat2(1.6,1.2,-1.2,1.6)*p;return f+.0625*noise2(p);}

// Restore only artwork hidden by the photographed foreground car. This keeps a
// second, printed roof from becoming visible when the real camera moves sideways.

// DXT_HOLOGRAM_V2: emissive layers, never vertex displacement.
uniform vec2 holoView;
uniform float musicTreble;
float holoScanDistance(vec2 p) { return abs(p.y - fract(hoverTime * .19 + .07)); }
vec2 holoWarp(vec2 p) {
  float activity = hover * pow(1. - contentMix, 2.);
  if(activity <= 0.0001)return vec2(0.);
  float band = exp(-pow(holoScanDistance(p) * 35., 2.));
  float tear = (noise2(vec2(p.y * 85., hoverTime * 1.1)) - .5) * .017;
  tear += sin(p.y * 170. + hoverTime * 7.) * .0028;
  float edge = smoothstep(0., .05, min(min(p.x,1.-p.x),min(p.y,1.-p.y)));
  return vec2(tear, sin(p.x * 55. - hoverTime * 2.) * .0013) * band * activity * edge;
}
vec2 holoLanes(vec2 p, float rows, float columns, float speed, float seed) {
  // Segments depend on X as well as Y, so horizontal travel is genuinely visible.
  vec2 q = p * vec2(columns, rows);
  float row = floor(q.y), random = hash21(vec2(row, seed));
  float y = abs(fract(q.y) - mix(.30, .70, random));
  float footprint = max(fwidth(q.y), .008);
  float line = 1. - smoothstep(.012, .012 + footprint * .8, y);
  float halo = exp(-y * 16.);
  float x = fract(q.x - hoverTime * speed + random * 4.);
  float ends = smoothstep(.05, .12, x) * (1. - smoothstep(.39 + random * .22, .50 + random * .22, x));
  float gate = step(.24, random);
  float tracer = exp(-pow((x - .18) * 29., 2.));
  return vec2(line * (ends + tracer * .75), halo * ends) * gate;
}
vec3 holoLight(vec2 p) {
  float activity = (hover + musicTreble * .16 * (1. - hover)) * (1. - contentMix * .94);
  if(activity <= 0.0001)return vec3(0.);
  vec2 shift = holoView + (hoverUv - .5) * .65;
  vec2 streams = holoLanes(p + shift * 0.014, 11.0, 3.4, -0.17, 1.0) * 0.42 +
    holoLanes(p + shift * 0.035, 17.0, 4.8, 0.29, 2.0) * 0.6 +
    holoLanes(p + shift * 0.061, 7.0, 2.7, -0.075, 3.0) * 0.36;
  float scanDistance = holoScanDistance(p);
  // Approximately one screen pixel at the core, with a separate soft halo.
  float pixel = max(fwidth(p.y), .00025);
  float scan = 1. - smoothstep(pixel * .22, pixel * .85, scanDistance);
  float scanGlow = exp(-scanDistance * 100.);
  float edge = min(min(p.x,1.-p.x),min(p.y,1.-p.y));
  float edgeCore = exp(-edge * 180.);
  float cursorGlow = exp(-dot(vUv-hoverUv,vUv-hoverUv) * 15.);
  float edgeFade = smoothstep(0., .012, edge);
  vec3 core = cardAccent*2.65 * (streams.x * .48 * edgeFade + scan * .72 + edgeCore * .35);
  vec3 halo = cardAccent*.34 * (streams.y * .8 + scanGlow * .75 + cursorGlow * .28);
  return (core + halo) * activity * (1. + musicTreble * .5);
}

float foregroundRoof(float x){
float y=.590;y-=.024*clamp((x-.399)/.020,0.,1.);y-=.056*clamp((x-.419)/.038,0.,1.);
y-=.012*clamp((x-.457)/.023,0.,1.);y-=.006*clamp((x-.480)/.060,0.,1.);
y+=.015*clamp((x-.540)/.048,0.,1.);y+=.029*clamp((x-.588)/.035,0.,1.);
y+=.030*clamp((x-.623)/.034,0.,1.);y+=.022*clamp((x-.657)/.033,0.,1.);return y;}

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

void main(){vec2 p=vec2(vUv.x,1.-vUv.y);vec2 artUv=clamp(p,vec2(.001),vec2(.999));artUv+=vec2(sin(artUv.y*35.-portalAge*9.),cos(artUv.x*22.+portalAge*6.))*portalMix*(1.-portalMix)*.065;artUv=clamp(artUv,vec2(.001),vec2(.999));vec3 h=projection*vec3(artUv,1.);vec2 source=h.xy/h.z;vec3 c=texture2D(artwork,vec2(source.x,1.-source.y)).rgb;
float hidden=eraseForeground*smoothstep(.399,.403,source.x)*(1.-smoothstep(.691,.695,source.x))*smoothstep(foregroundRoof(source.x)-.0015,foregroundRoof(source.x)+.0015,source.y);
if(hidden>0.){float wallGrain=noise2(source*1024.);vec3 clean=vec3(.009,.010,.013)*(.65+wallGrain*.35);
clean+=vec3(.035,.001,.002)*exp(-pow((source.y-.56)*20.,2.))*(.5+.5*noise2(source*80.));c=mix(c,clean,hidden);}
// The source is artwork printed on each physical display, never the scene backdrop.
float edge=min(min(p.x,1.-p.x),min(p.y,1.-p.y));
// Canvas content uses this same rigid mesh's UVs, including the reflection.
// Only the emitted surface changes. No vertex or camera-facing transform.
c*=1.13;if(contentMix>0.)c=mix(c,texture2D(contentMap,vUv).rgb*1.1,contentMix);
c *= 1. + hover * .12 * (1. - contentMix);
vec2 panelWave=panelNetwork(vUv);
    vec3 panelTint=mix(vec3(.80,.92,1.),cardAccent,.60);
    c+=mix(panelTint,cardAccent,.70)*(panelWave.x*.42+panelWave.y*.46)*(1.-portalMix);
if(portalMix>0.){
  float radius=portalMix*1.22;float aperture=1.-smoothstep(radius-.09,radius,max(abs(p.x-.5),abs(p.y-.5))*2.);
  if(aperture>0.)c=mix(c,portalRadiance(cameraPosition,normalize(vWorld-cameraPosition)),aperture);
  float rim=abs(max(abs(p.x-.5),abs(p.y-.5))*2.-radius);
  float filament=1.-smoothstep(.005,.022,rim);
  float halo=exp(-rim*38.)*.32;
  float energy=.7+.3*sin((p.x+p.y)*57.+portalAge*8.);
  c+=portalAccent*4.8*(filament+halo)*energy*portalOpening;
 }float cardGray=dot(c,vec3(.2126,.7152,.0722));
    c=mix(vec3(cardGray),c,.16+.84*hover)*cardLevel;
    gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}