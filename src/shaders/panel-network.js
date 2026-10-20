import {PANEL_LATTICE} from '../scene/panel-energy-field.js';

/** A sheared four-corner cell locates the physical chevron graph. Green stores
 * its outgoing rail and blue its alternating rib: every drawn connection is
 * also a solver edge. Light stays on that material, including its afterglow. */
export const PANEL_NETWORK_GLSL = /* glsl */`
uniform sampler2D uEnergyMap;
uniform vec2 uPanelGrid;
uniform float uEnergyActive,uReduced;
float panelLine(float d,float w){return 1.-smoothstep(w,w+max(fwidth(d),.00035),abs(d));}
float panelRadiance(float e){return pow(max(e-.02,0.),.92)*(1.+3.7*smoothstep(.18,1.1,e));}
vec2 panelNetwork(vec2 surfaceUv){
 if(uEnergyActive<.5||uReduced>.5)return vec2(0.);
 vec2 g=clamp(surfaceUv,0.,1.)*uPanelGrid+vec2(1.);
 float column=floor(g.x),t=fract(g.x);
 float leftOffset=mod(column,2.)*${PANEL_LATTICE.bend},rightOffset=${PANEL_LATTICE.bend}-leftOffset;
 float row=floor(g.y-mix(leftOffset,rightOffset,t));
 float v=g.y-row-mix(leftOffset,rightOffset,t);
 ivec2 cell=ivec2(column,row);
 vec4 a=texelFetch(uEnergyMap,cell,0),b=texelFetch(uEnergyMap,cell+ivec2(1,0),0);
 vec4 c=texelFetch(uEnergyMap,cell+ivec2(0,1),0),d=texelFetch(uEnergyMap,cell+ivec2(1,1),0);
 float slope=(rightOffset-leftOffset)*${PANEL_LATTICE.rowRatio};
 float normalScale=${PANEL_LATTICE.rowRatio}/sqrt(1.+slope*slope);
 vec4 distanceToEdge=vec4(v*normalScale,(1.-v)*normalScale,t,1.-t);
 vec4 edgeEnergy=vec4(mix(a.r,b.r,t),mix(c.r,d.r,t),mix(a.r,c.r,clamp(v+t*(rightOffset-leftOffset),0.,1.)),mix(b.r,d.r,clamp(v+(t-1.)*(rightOffset-leftOffset),0.,1.)));
 vec4 gates=step(vec4(.001),vec4(a.g,c.g,a.b,b.b));
 vec4 light=vec4(panelRadiance(edgeEnergy.x),panelRadiance(edgeEnergy.y),panelRadiance(edgeEnergy.z),panelRadiance(edgeEnergy.w))*gates;
 light.zw*=.82;
 float wires=max(max(light.x*panelLine(distanceToEdge.x,.018),light.y*panelLine(distanceToEdge.y,.018)),max(light.z*panelLine(distanceToEdge.z,.015),light.w*panelLine(distanceToEdge.w,.015)));
 vec4 halos=light*exp(-distanceToEdge*22.);
 float wireHalo=max(max(halos.x,halos.y),max(halos.z,halos.w));
 vec2 p=vec2(t,v*${PANEL_LATTICE.rowRatio}+t*slope);
 vec4 junctionDistance=vec4(length(p),length(p-vec2(1.,slope)),length(p-vec2(0.,${PANEL_LATTICE.rowRatio})),length(p-vec2(1.,slope+${PANEL_LATTICE.rowRatio})));
 vec4 junctionLight=vec4(panelRadiance(a.r),panelRadiance(b.r),panelRadiance(c.r),panelRadiance(d.r));
 junctionLight*=mix(vec4(.78),vec4(1.12),smoothstep(vec4(.12),vec4(1.1),vec4(a.a,b.a,c.a,d.a)));
 vec4 nodes=junctionLight*vec4(panelLine(junctionDistance.x,.055),panelLine(junctionDistance.y,.055),panelLine(junctionDistance.z,.055),panelLine(junctionDistance.w,.055));
 vec4 nodeHalos=junctionLight*exp(-junctionDistance*18.);
 float node=max(max(nodes.x,nodes.y),max(nodes.z,nodes.w));
 float nodeHalo=max(max(nodeHalos.x,nodeHalos.y),max(nodeHalos.z,nodeHalos.w));
 return vec2(max(wires,node),max(wireHalo*.12,nodeHalo*.16));
}
`;
