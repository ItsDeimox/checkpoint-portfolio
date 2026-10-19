/** DXT Prism Trails.
 * Physical-card-only interpretation of the existing energy simulation.
 * Unlike the portfolio cube's orthogonal graph, displays show fragmented
 * diagonal light paths and interrupted elliptical echoes around the pointer.
 * One existing texture, four reads, no new render passes, geometry or timers.
 */
export const PANEL_PRISM_GLSL = /* glsl */`
uniform sampler2D uEnergyMap;
uniform float uEnergyActive,uEnergySize,uReduced,uSignalSeed;

vec2 prismTrail(vec2 uv, vec2 pointer, float time, vec2 span, float seed){
 if(uEnergyActive<.5||uReduced>.5)return vec2(0.);
 // Face 4 of the existing 3x2 cube atlas; no second energy simulation.
 vec2 g=clamp((uv-.5)*span+.5,0.,.99999)*(uEnergySize-1.);
 ivec2 c=clamp(ivec2(floor(g)),ivec2(0),ivec2(int(uEnergySize)-2));
 vec2 f=fract(g);ivec2 o=ivec2(int(uEnergySize));
 float a=texelFetch(uEnergyMap,o+c,0).r;
 float b=texelFetch(uEnergyMap,o+c+ivec2(1,0),0).r;
 float e=texelFetch(uEnergyMap,o+c+ivec2(0,1),0).r;
 float h=texelFetch(uEnergyMap,o+c+ivec2(1,1),0).r;
 float wave=mix(mix(a,b,f.x),mix(e,h,f.x),f.y);

 // Differentials run outside the per-pixel early exit, so anti-aliasing stays
 // defined on NVIDIA and AMD fragment quads near the edge of a pulse.
 vec2 d=(uv-pointer)*vec2(span.x/max(span.y,.07),1.);
 float radius=length(d),pixel=max(fwidth(d.y),.0015);
 float radialAA=fwidth(radius);
 if(wave<.017)return vec2(0.);
 float energy=smoothstep(.018,.25,wave)*min(wave*.85,1.2);
 float bend=.010*sin(d.x*13.+time*.38+seed*1.6);
 float laneA=abs(d.y-d.x*.36-bend);
 float laneB=abs(d.y+d.x*.47+.058+.009*sin(d.x*11.-time*.29+seed));
 float thinA=1.-smoothstep(.0008,.0036+pixel,laneA);
 float thinB=1.-smoothstep(.0010,.0045+pixel,laneB);

 // Incomplete, drifting slashes rather than the cube's node-and-wire grid.
 float shardA=fract(d.x*13.8+time*.16+seed*.17);
 float shardB=fract(d.x*9.3-time*.10+seed*.41);
 float gatedA=smoothstep(.03,.10,shardA)*(1.-smoothstep(.63,.82,shardA));
 float gatedB=smoothstep(.04,.13,shardB)*(1.-smoothstep(.56,.80,shardB));
 float tracers=thinA*gatedA+thinB*gatedB*.52;
 float spark=thinA*exp(-pow((shardA-.21)*13.,2.));

 // Sparse elliptical echoes with missing sectors make each interaction feel
 // like a scanner reflection rather than a six-sided lattice propagating.
 float echo=1.-smoothstep(.055,.18+radialAA*48.,abs(sin(radius*48.-time*.32+seed*.23)));
 float sector=fract((d.x-d.y*1.06)*8.2+seed*.37);
 echo*=smoothstep(.03,.14,sector)*(1.-smoothstep(.66,.89,sector));
 float glaze=exp(-pow(laneA*27.,2.));
 float edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));
 float fade=smoothstep(.004,.039,edge);
 return vec2((tracers*.76+spark*.5+echo*.34)*energy*fade,
             (glaze*.034+echo*.022)*energy*fade);
}
`;
