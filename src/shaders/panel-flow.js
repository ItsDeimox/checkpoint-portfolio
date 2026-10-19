import {WAKE_POINTS,WAKE_LIFETIME} from '../scene/room-cursor-wake.js';

/** A soft continuous wake drawn on the card, not a decoration attached to the
 * cursor. The existing wave atlas lends gentle surface motion to recorded
 * strokes. Fixed history bound, four texture taps, no feedback/render pass. */
export const PANEL_FLOW_GLSL=/* glsl */`
uniform sampler2D uEnergyMap;
uniform float uEnergyActive,uEnergySize,uReduced;
uniform int uWakeCount;
uniform vec4 uWakePoints[${WAKE_POINTS}];
vec2 flowTrail(vec2 uv,vec2 span){
 if(uEnergyActive<.5||uReduced>.5||uWakeCount==0)return vec2(0.);
 vec2 p=(uv-.5)*span;
 float aa=max(length(fwidth(p)),.0008);
 float best=0.,along=0.;int segment=0;
 for(int i=0;i<${WAKE_POINTS};i++){
  if(i>=uWakeCount)break;
  vec4 b=uWakePoints[i],a=b;
  if(i>0&&uWakePoints[i-1].w==b.w)a=uWakePoints[i-1];
  vec2 start=(a.xy-.5)*span,ab=(b.xy-a.xy)*span;
  float t=clamp(dot(p-start,ab)/max(dot(ab,ab),.000001),0.,1.);
  vec2 offset=p-start-t*ab;
  float age=mix(a.z,b.z,t),life=max(0.,1.-age/${WAKE_LIFETIME});
  float strength=life*life*(3.-2.*life);
  // The head stays under the cursor; the deposited tail broadens as it fades.
  float radius=mix(.019,.035,1.-life),d2=dot(offset,offset);
  float influence=strength/(1.+d2/(radius*radius));
  if(influence>best){
   best=influence;along=t;segment=i;
  }
 }
 // Refine only the nearest segment into a smooth Hermite curve. This keeps
 // the same bounded search and uniform buffer, without multiplying the loop.
 vec4 b=uWakePoints[segment],a=b,before=b,after=b;
 if(segment>0&&uWakePoints[segment-1].w==b.w){a=uWakePoints[segment-1];before=a;}
 if(segment>1&&uWakePoints[segment-2].w==b.w)before=uWakePoints[segment-2];
 if(segment+1<uWakeCount&&uWakePoints[segment+1].w==b.w)after=uWakePoints[segment+1];
 vec2 start=(a.xy-.5)*span,finish=(b.xy-.5)*span;
 vec2 chord=finish-start,ta=(b.xy-before.xy)*span*.5,tb=(after.xy-a.xy)*span*.5;
 float chordLength=length(chord);
 // Tangent bounds prevent overshoot at abrupt reversals and clipped edges.
 ta*=min(1.,chordLength/max(length(ta),.00001));
 tb*=min(1.,chordLength/max(length(tb),.00001));
 vec2 c3=-2.*chord+ta+tb,c2=3.*chord-2.*ta-tb;
 float t=along;
 for(int j=0;j<2;j++){
  vec2 curve=((c3*t+c2)*t+ta)*t+start;
  vec2 derivative=(3.*c3*t+2.*c2)*t+ta;
  t=clamp(t-dot(curve-p,derivative)/max(dot(derivative,derivative),.000001),0.,1.);
 }
 vec2 offset=p-(((c3*t+c2)*t+ta)*t+start);
 float distance=length(offset),age=mix(a.z,b.z,t),life=max(0.,1.-age/${WAKE_LIFETIME});
 float weight=life*life*(3.-2.*life),width=mix(.019,.035,1.-life);
 float light=.55+.45*dot(offset/max(distance,.00001),vec2(-.45,.89));
 // Transcendentals are evaluated once per pixel, not once for every sample.
 float coverage=exp(-distance*distance/(width*width))*weight;
 float sheen=exp(-pow((distance-width*.65)/(.0045+aa),2.))*light*weight;
 float mist=exp(-distance*distance/(width*width*3.2))*weight;
 if(mist<.001)return vec2(0.);
 vec2 g=clamp((uv-.5)*span+.5,0.,.99999)*(uEnergySize-1.);
 ivec2 c=clamp(ivec2(floor(g)),ivec2(0),ivec2(int(uEnergySize)-2));
 vec2 f=fract(g);ivec2 o=ivec2(int(uEnergySize));
 float wa=texelFetch(uEnergyMap,o+c,0).r,wb=texelFetch(uEnergyMap,o+c+ivec2(1,0),0).r;
 float d=texelFetch(uEnergyMap,o+c+ivec2(0,1),0).r,e=texelFetch(uEnergyMap,o+c+ivec2(1,1),0).r;
 float wave=mix(mix(wa,wb,f.x),mix(d,e,f.x),f.y);
 // Smooth refractive-looking highlights, without cell gates or disconnected
 // slashes. Artwork remains rigid and readable beneath restrained emission.
 return vec2(coverage*.20+sheen*.27, mist*.035+coverage*min(wave,.9)*.065);
}
`;
