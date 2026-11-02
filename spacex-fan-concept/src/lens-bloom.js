import {Vector2} from 'three';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
/** Source highlights -> tight scattering -> progressively weaker wide halos. */
export class LensBloomPass extends UnrealBloomPass{
 constructor(strength=.34){
  super(new Vector2(1,1),strength,0,1.35);
  this.highPassUniforms.smoothWidth.value=.65;
  this.compositeMaterial.uniforms.bloomFactors.value=[1,.64,.34,.16,.065];
  this.compositeMaterial.uniforms.bloomTexSizes={value:Array.from({length:5},()=>new Vector2(1,1))};
  const sample=`
    uniform vec2 bloomTexSizes[NUM_MIPS];
    vec4 cubicWeights(float x){float x2=x*x,x3=x2*x;return vec4(1.-3.*x+3.*x2-x3,4.-6.*x2+3.*x3,1.+3.*x+3.*x2-3.*x3,x3)/6.;}
    vec4 bloomSample(sampler2D tex,vec2 uv,vec2 size){
      vec2 p=uv*size-.5,base=floor(p),f=fract(p);vec4 wx=cubicWeights(f.x),wy=cubicWeights(f.y);
      vec2 gx=vec2(wx.x+wx.y,wx.z+wx.w),gy=vec2(wy.x+wy.y,wy.z+wy.w);
      vec2 px=base.x+vec2(-.5+wx.y/gx.x,1.5+wx.w/gx.y),py=base.y+vec2(-.5+wy.y/gy.x,1.5+wy.w/gy.y);
      return texture2D(tex,vec2(px.x,py.x)/size)*gx.x*gy.x+texture2D(tex,vec2(px.y,py.x)/size)*gx.y*gy.x+
             texture2D(tex,vec2(px.x,py.y)/size)*gx.x*gy.y+texture2D(tex,vec2(px.y,py.y)/size)*gx.y*gy.y;
    }`;
  let fragment=this.compositeMaterial.fragmentShader.replace('void main()',sample+'\nvoid main()');
  for(let i=1;i<=5;i++)fragment=fragment.replace(`texture2D(blurTexture${i}, vUv)`,`bloomSample(blurTexture${i}, vUv, bloomTexSizes[${i-1}])`);
  this.compositeMaterial.fragmentShader=fragment;
 }
 setSize(width,height){
  super.setSize(Math.max(2,width),Math.max(2,height));
  const sizes=this.compositeMaterial?.uniforms.bloomTexSizes?.value;
  if(sizes)this.renderTargetsVertical.forEach((target,i)=>sizes[i].set(target.width,target.height));
 }
}
