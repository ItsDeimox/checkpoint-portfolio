"""Finish the reviewed hover only: smooth the nearest recorded segment."""
from pathlib import Path
import subprocess
p=Path('dxrkths/src/shaders/panel-flow.js')
s=p.read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,a
 s=s.replace(a,b)
replace('float best=0.,distance=0.,width=.019,weight=0.,light=0.;','float best=0.,along=0.;int segment=0;')
replace('   best=influence;distance=sqrt(d2);width=radius;weight=strength;\n   light=.55+.45*dot(offset/max(distance,.00001),vec2(-.45,.89));','   best=influence;along=t;segment=i;')
replace(' // Transcendentals are evaluated once per pixel, not once for every sample.\n float coverage=', ''' // Refine only the nearest segment into a smooth Hermite curve. This keeps
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
 float coverage=''')
replace('float a=texelFetch(uEnergyMap,o+c,0).r,b=texelFetch(uEnergyMap,o+c+ivec2(1,0),0).r;','float wa=texelFetch(uEnergyMap,o+c,0).r,wb=texelFetch(uEnergyMap,o+c+ivec2(1,0),0).r;')
replace('mix(mix(a,b,f.x),mix(d,e,f.x),f.y)','mix(mix(wa,wb,f.x),mix(d,e,f.x),f.y)')
p.write_text(s)
p=Path('dxrkths/docs/HOVER-FLOW.md')
s=p.read_text();assert s.count('The visual is a restrained soft wake')==1
p.write_text(s.replace('The visual is a restrained soft wake','The nearest recorded segment is refined into a tangent-bounded curve, avoiding angular joints without adding samples or render passes. The visual is a restrained soft wake'))
subprocess.run(['git','add','dxrkths/src/shaders/panel-flow.js','dxrkths/docs/HOVER-FLOW.md'],check=True)
