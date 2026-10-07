uniform vec3 uLightPos[6],uLightColor[6],uCamera;
uniform mat4 uLightVP0,uLightVP1;
uniform sampler2D uShadow0,uShadow1;
uniform samplerCube uProbe;
uniform sampler2D uScreenAO;uniform vec2 uAOResolution;uniform float uUseAO;
uniform float uShadowTexel,uShadows,uUseProbe,uTime,uReflection;
float shadowAt(sampler2D map,mat4 matrix,vec3 world,vec3 n,vec3 light){
 vec4 clip=matrix*vec4(world+n*.013,1.);vec3 q=clip.xyz/clip.w*.5+.5;
 if(clip.w<=0.||q.z>1.||q.z<0.||min(q.x,q.y)<.005||max(q.x,q.y)>.995)return 1.;
 float bias=max(.0007*(1.-max(dot(n,safeNorm(light-world)),0.)),.00015),s=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)s+=step(q.z-bias,texture(map,q.xy+vec2(x,y)*uShadowTexel).r);
 return s/9.;
}
vec3 brdf(vec3 n,vec3 v,vec3 l,vec3 albedo,float rough,float metal){
 vec3 h=safeNorm(l+v);float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
 float alpha=rough*rough,a2=alpha*alpha,den=nh*nh*(a2-1.)+1.;float D=a2/(PI*den*den+.00001);
 float k=(rough+1.)*(rough+1.)*.125;float G=nl/(nl*(1.-k)+k)*nv/(nv*(1.-k)+k);
 vec3 f0=mix(vec3(.04),albedo,metal),F=f0+(1.-f0)*pow(clamp(1.-vh,0.,1.),5.);
 return ((1.-F)*(1.-metal)*albedo/PI+D*G*F/(4.*nl*nv+.0001))*nl;
}
vec3 illuminate(vec3 world,vec3 n,vec3 albedo,float rough,float metal,float ao){
 if(uUseAO>.5)ao*=texture(uScreenAO,gl_FragCoord.xy/uAOResolution).r;
 vec3 v=safeNorm(uCamera-world);vec3 sum=albedo*vec3(.055,.068,.085)*ao;
 for(int i=0;i<6;i++){vec3 d=uLightPos[i]-world;float atten=1./(1.+dot(d,d)*.065),visibility=1.;
 if(uShadows>.5){if(i==0)visibility=shadowAt(uShadow0,uLightVP0,world,n,uLightPos[0]);if(i==1)visibility=shadowAt(uShadow1,uLightVP1,world,n,uLightPos[1]);}
 float sourceRadius=i<2?1.10:.45;float areaRough=clamp(sqrt(rough*rough+sourceRadius*sourceRadius/(dot(d,d)+1.)),.12,.9);
 sum+=brdf(n,v,safeNorm(d),albedo,areaRough,metal)*uLightColor[i]*atten*visibility;}
 if(uUseProbe>.5){vec3 refl=reflect(-v,n);vec3 env=textureLod(uProbe,refl,rough*5.).rgb;float nv=max(dot(n,v),0.);vec3 F=mix(vec3(.04),albedo,metal);F+=(1.-F)*pow(1.-nv,5.);sum+=env*F*(.46+.22*metal)*ao;}
 return sum;
}
vec3 fogColor(vec3 world){float glow=exp(-abs(world.x)*.055)*exp(-abs(world.y-2.)*.09);return mix(vec3(.006,.008,.012),vec3(.024,.013,.009),glow);}
