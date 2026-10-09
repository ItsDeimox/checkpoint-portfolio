// A single deterministic cut shared by glass, media visibility and depth.
// Coordinates are physical panel-local XY, never the different UVs on its bevels.
vec4 forgeLifecycle(vec2 local,float y,float index){
 float irregular=sin(local.x*7.1+index*1.7)*.045+sin(local.x*15.3+local.y*2.4+index*3.1)*.025;
 float axis=y+local.y*1.02;
 float lower=axis-irregular,upper=10.35-axis+irregular;
 float coverage=smoothstep(-.18,.18,lower)*smoothstep(-.18,.18,upper);
 float birth=exp(-pow(lower/.065,2.))*coverage;
 float burn=exp(-pow(upper/.065,2.))*coverage;
 float charBand=exp(-abs(lower)*9.)+exp(-abs(upper)*9.);
 return vec4(coverage,birth,burn,charBand);
}
