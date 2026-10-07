#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uScene,uBase,uParticles,uDepth,uVelocity,uNormal;uniform vec2 uResolution;uniform float uFocusDistance,uQuality,uMotionEnabled,uShutter;out vec4 outColor;
float viewZ(float d){return .1*140./(140.-d*(140.-.1));}
void main(){vec2 uv=vUv;float z=viewZ(texture(uDepth,uv).r),isMedia=step(.5,texture(uNormal,uv).a);float coc=clamp((abs(z-uFocusDistance)-5.)*.11,0.,.8)*uQuality*(1.-isMedia);vec3 c=texture(uScene,uv).rgb;
 if(coc>.1){vec3 sum=c;float total=1.;for(int i=0;i<12;i++){float a=float(i)*2.399963;vec2 off=vec2(cos(a),sin(a))*sqrt(float(i)+.5)*coc*.5/uResolution;vec2 q=clamp(uv+off,.001,.999);float nz=viewZ(texture(uDepth,q).r),w=step(z-1.5,nz)*(1.-step(.5,texture(uNormal,q).a));sum+=texture(uScene,q).rgb*w;total+=w;}c=sum/total;}
 vec2 velocity=texture(uVelocity,uv).xy*uShutter*uMotionEnabled;float logicalLimit=mix(8.,2.,isMedia),lengthPixels=length(velocity*uResolution);velocity*=min(1.,logicalLimit/max(lengthPixels,.001));
 if(lengthPixels>.35&&uMotionEnabled>.5){vec3 sum=c;float total=1.;for(int i=1;i<=6;i++){vec2 q=clamp(uv-velocity*float(i)/6.,.001,.999);float nz=viewZ(texture(uDepth,q).r),same=1.-step(.25,abs(texture(uNormal,q).a-texture(uNormal,uv).a)),w=exp(-abs(nz-z)*1.1)*same;sum+=texture(uScene,q).rgb*w;total+=w;}c=sum/total;}
 c+=texture(uParticles,uv).rgb;outColor=vec4(max(c,0.),1.);}
