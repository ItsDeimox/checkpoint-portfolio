export const noiseGLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return s;}
`;
export const skyVertex=`varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const skyFragment=`precision highp float;varying vec3 vPosition;${noiseGLSL}
void main(){
 vec3 dir=normalize(vPosition);float h=dir.y;
 float sunAxis=exp(-pow((dir.x+.21)*2.5,2.))*exp(-pow((h-.105)*6.,2.));
 vec3 sky=mix(vec3(.21,.11,.15),vec3(.025,.045,.084),smoothstep(.02,.63,h));
 sky+=vec3(.74,.25,.135)*sunAxis;
 vec2 p=vec2(atan(dir.x,dir.z)*3.7,h*5.8);
 float broad=fbm(p*1.35+vec2(2.,.7));float turbulence=fbm(p*5.+vec2(broad*2.,0.));
 float layer=fbm(p*3.+vec2(turbulence,broad)*1.2);
 float cloud=smoothstep(.32,.70,broad*.63+layer*.37);
 vec3 dark=mix(vec3(.026,.032,.055),vec3(.085,.055,.075),sunAxis);
 sky=mix(sky,dark,cloud*.95);
 float lip=exp(-pow((broad*.63+layer*.37-.44)/.034,2.));
 sky+=vec3(.58,.22,.20)*lip*sunAxis*(.35+turbulence);
 sky+=vec3(.95,.35,.18)*pow(max(dot(dir,normalize(vec3(-.32,.105,1.))),0.),520.);
 sky*=smoothstep(-.20,.08,h)*.86+.14;
 gl_FragColor=vec4(sky,1.);
}`;
export const smokeVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const smokeFragment=`precision highp float;uniform float time,seed,density;varying vec2 vUv;${noiseGLSL}
void main(){
 vec2 uv=vUv,p=uv*3.5+vec2(seed,-time*.10);
 float macro=fbm(p),curl=fbm(p*2.5+vec2(macro*1.4,time*.075));
 float fine=fbm(p*5.+curl*.7);
 vec2 shape=(uv-.5)*vec2(1.90,1.85);float edge=pow(max(0.,1.-dot(shape,shape)),1.5);
 float billow=smoothstep(.26,.63,macro*.45+curl*.40+fine*.15);
 float alpha=billow*edge*density;
 float silver=pow(max(0.,curl-.24),1.3);
 vec3 tint=mix(vec3(.31,.30,.38),vec3(.85,.83,.90),clamp(uv.y*.75+silver,0.,1.));
 tint+=vec3(.16,.014,.035)*pow(1.-uv.y,2.);
 gl_FragColor=vec4(tint,alpha);
}`;
export const groundVertex=`uniform mat4 textureMatrix;varying vec4 vRef;varying vec2 vGround;void main(){vRef=textureMatrix*vec4(position,1.);vGround=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const groundFragment=`precision highp float;uniform sampler2D tDiffuse;uniform vec3 color;varying vec4 vRef;varying vec2 vGround;${noiseGLSL}
void main(){
 vec2 p=vGround;float grit=noise(p*82.),medium=noise(p*23.),puddle=fbm(p*.74);
 vec2 uv=vRef.xy/vRef.w;
 vec2 ripple=vec2(noise(p*18.),noise(p.yx*21.))-.5;
 float dry=1.-smoothstep(.34,.69,puddle);float blur=.00045+dry*.0026;
 uv+=ripple*(.0015+dry*.004);
 vec3 mirror=texture2D(tDiffuse,uv).rgb*.28;
 mirror+=(texture2D(tDiffuse,uv+vec2(blur,0)).rgb+texture2D(tDiffuse,uv-vec2(blur,0)).rgb)*.15;
 mirror+=(texture2D(tDiffuse,uv+vec2(0,blur*1.6)).rgb+texture2D(tDiffuse,uv-vec2(0,blur*1.6)).rgb)*.21;
 float hot=max(mirror.r,max(mirror.g,mirror.b));
 float stone=(.30+grit*.65)*(.62+medium*.5);
 vec3 asphalt=vec3(.020,.022,.032)*stone;
 float wet=mix(.15,.52,1.-dry);vec3 c=mix(asphalt,mirror,wet);
 c+=vec3(.022,.022,.027)*pow(grit,9.)*(.25+hot);
 c*=.76+.24*medium;
 float mark=1.-smoothstep(.029,.049,abs(p.x+5.25));c+=vec3(.16,.081,.019)*mark*(.5+.5*grit);
 float track=exp(-pow((length(p-vec2(-2.,-8.))-6.5)/.13,2.));c*=1.-track*.25;
 gl_FragColor=vec4(c,1.);
}`;
export const contactFragment=`precision highp float;varying vec2 vUv;void main(){float a=exp(-dot((vUv-.5)*vec2(2.6,2.),(vUv-.5)*vec2(2.6,2.))*3.);gl_FragColor=vec4(0.,0.,0.,a*.73);}`;
