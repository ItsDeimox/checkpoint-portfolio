export const noiseGLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return s;}
`;
export const skyVertex=`varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const skyFragment=`precision highp float;varying vec3 vPosition;${noiseGLSL}
void main(){vec3 p=normalize(vPosition);float h=p.y;vec3 c=mix(vec3(.47,.095,.034),vec3(.025,.034,.062),smoothstep(-.07,.55,h));float sun=pow(max(dot(p,normalize(vec3(-.8,.15,1.))),0.),54.);c+=vec3(2.8,.62,.16)*sun;vec2 q=p.xz/max(p.y+.4,.15);float cloud=fbm(q*3.5);c=mix(c,c*.16,smoothstep(.38,.72,cloud)*smoothstep(.04,.28,h)*.8);c+=vec3(.58,.12,.045)*smoothstep(.52,.6,cloud)*(1.-smoothstep(.60,.68,cloud))*(1.-smoothstep(.15,.45,h));gl_FragColor=vec4(c,1.);}`;
export const smokeVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const smokeFragment=`precision highp float;uniform float time,seed,density;varying vec2 vUv;${noiseGLSL}
void main(){vec2 uv=vUv;vec2 p=uv*3.+vec2(seed,-time*.14);float n=fbm(p+fbm(p*1.7-time*.09));float tendril=fbm(p*2.3+vec2(n*2.,time*.06));float edges=pow(max(0.,1.-dot((uv-.5)*1.95,(uv-.5)*1.95)),1.7);float alpha=smoothstep(.24,.67,n*.6+tendril*.4)*edges*density;vec3 tint=mix(vec3(.25,.29,.34),vec3(.76,.64,.67),smoothstep(.25,.8,uv.y));gl_FragColor=vec4(tint,alpha);}`;
export const groundVertex=`uniform mat4 textureMatrix;varying vec4 vRef;varying vec2 vGround;void main(){vRef=textureMatrix*vec4(position,1.);vGround=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const groundFragment=`precision highp float;uniform sampler2D tDiffuse;uniform vec3 color;varying vec4 vRef;varying vec2 vGround;${noiseGLSL}
void main(){vec2 p=vGround;float n=noise(p*11.),puddle=fbm(p*.58);vec4 uv=vRef;uv.xy+=(vec2(noise(p*28.),noise(p.yx*22.))-.5)*.0025*uv.w;vec3 reflection=texture2DProj(tDiffuse,uv).rgb;vec3 asphalt=vec3(.013,.015,.019)*( .5+n*.85);float wet=.25+.40*smoothstep(.25,.7,puddle);vec3 c=mix(asphalt,reflection,wet);float mark=(1.-smoothstep(.025,.046,abs(p.x+5.2)))*.8;c+=vec3(.17,.06,.012)*mark;float track=pow(max(0.,1.-abs(length(p-vec2(1.,8.))-6.5)/.3),3.);c*=1.-track*.38;gl_FragColor=vec4(c,1.);}`;
export const contactFragment=`precision highp float;varying vec2 vUv;void main(){float a=exp(-dot((vUv-.5)*vec2(2.6,2.),(vUv-.5)*vec2(2.6,2.))*3.);gl_FragColor=vec4(0.,0.,0.,a*.8);}`;
