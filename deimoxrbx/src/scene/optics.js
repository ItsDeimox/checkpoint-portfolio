import {THREE} from './shared.js';
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const blur=`precision highp float;uniform sampler2D tInput;uniform vec2 uStep;uniform float uThreshold;varying vec2 vUv;
vec3 sampleColor(vec2 uv){vec3 c=texture2D(tInput,uv).rgb;return max(vec3(0.),c-uThreshold);}
void main(){vec3 c=sampleColor(vUv)*.227027;c+=(sampleColor(vUv+uStep*1.384615)+sampleColor(vUv-uStep*1.384615))*.316216;c+=(sampleColor(vUv+uStep*3.230769)+sampleColor(vUv-uStep*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`;
const composite=`precision highp float;
uniform sampler2D tScene,tBloom0,tBloom1,tBloom2,tBloom3,tStreak;uniform vec2 uResolution;uniform float uTime,uBloom,uLens,uExposure;
varying vec2 vUv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec2 p=vUv-.5;float r=dot(p,p);vec2 uv=.5+p*(1.+uLens*r);vec2 shift=p*r*.0015;
vec3 scene=vec3(texture2D(tScene,uv+shift).r,texture2D(tScene,uv).g,texture2D(tScene,uv-shift).b);
vec3 bloom=texture2D(tBloom0,uv).rgb*.22+texture2D(tBloom1,uv).rgb*.36+texture2D(tBloom2,uv).rgb*.52+texture2D(tBloom3,uv).rgb*.65;
vec3 c=scene+bloom*uBloom+texture2D(tStreak,uv).rgb*.17;
c*=1.-smoothstep(.10,.65,r)*.23;
c=aces(max(c,vec3(0.))*uExposure);c=pow(c,vec3(1./2.2));
float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))+uTime*.18)*43758.5453)-.5;
c+=grain/470.;gl_FragColor=vec4(c,1.);}`;
/** Linear half-float render pipeline. Bloom/dispersion precede display tonemapping. */
export class Optics {
 constructor(renderer){this.renderer=renderer;this.hdr=renderer.extensions.has('EXT_color_buffer_float');this.type=this.hdr?THREE.HalfFloatType:THREE.UnsignedByteType;this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),null);this.quad.frustumCulled=false;this.scene.add(this.quad);this.blur=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:blur,depthTest:false,depthWrite:false,uniforms:{tInput:{value:null},uStep:{value:new THREE.Vector2()},uThreshold:{value:0}}});this.final=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:composite,depthTest:false,depthWrite:false,uniforms:{tScene:{value:null},tBloom0:{value:null},tBloom1:{value:null},tBloom2:{value:null},tBloom3:{value:null},tStreak:{value:null},uResolution:{value:new THREE.Vector2()},uTime:{value:0},uBloom:{value:.8},uLens:{value:.006},uExposure:{value:1.05}}});this.targets=[];}
 target(w,h,depth=false){return new THREE.WebGLRenderTarget(Math.max(1,Math.round(w)),Math.max(1,Math.round(h)),{type:this.type,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:depth,stencilBuffer:false});}
 resize(w,h){this.targets.forEach(t=>t.dispose());this.background=this.target(w,h,true);this.main=this.target(w,h,true);this.main.samples=4;this.glassBlur=[this.target(w/2,h/2),this.target(w/2,h/2)];this.levels=[];for(let i=0;i<4;i++){const d=Math.pow(2,i+1);this.levels.push([this.target(w/d,h/d),this.target(w/d,h/d)]);}this.streak=this.target(w/4,h/4);this.targets=[this.background,this.main,this.streak,...this.glassBlur,...this.levels.flat()];this.final.uniforms.uResolution.value.set(w,h);}
 pass(material,target){this.quad.material=material;this.renderer.setRenderTarget(target);this.renderer.render(this.scene,this.camera);}
 blurPass(input,target,x,y,threshold=0){const u=this.blur.uniforms;u.tInput.value=input;u.uStep.value.set(x,y);u.uThreshold.value=threshold;this.pass(this.blur,target);}
 render(world,camera,cards,floor,time){const r=this.renderer;
  cards.setMirror(true);floor.reflect(world,camera,r);cards.setMirror(false);
  cards.group.visible=false;r.setRenderTarget(this.background);r.render(world,camera);cards.group.visible=true;
  this.blurPass(this.background.texture,this.glassBlur[0],5/this.main.width,0);this.blurPass(this.glassBlur[0].texture,this.glassBlur[1],0,5/this.main.height);
  cards.setBackground(this.glassBlur[1].texture,this.main.width,this.main.height);
  r.setRenderTarget(this.main);r.render(world,camera);
  let input=this.main.texture;
  for(let i=0;i<this.levels.length;i++){const[a,b]=this.levels[i];this.blurPass(input,a,1/a.width,0,i===0?.78:0);this.blurPass(a.texture,b,0,1/b.height);input=b.texture;this.final.uniforms['tBloom'+i].value=b.texture;}
  this.blurPass(this.levels[0][1].texture,this.streak,20/this.main.width,0);
  this.final.uniforms.tScene.value=this.main.texture;this.final.uniforms.tStreak.value=this.streak.texture;this.final.uniforms.uTime.value=time;this.pass(this.final,null);
 }
 dispose(){this.targets.forEach(t=>t.dispose());this.blur.dispose();this.final.dispose();this.quad.geometry.dispose();}
}
