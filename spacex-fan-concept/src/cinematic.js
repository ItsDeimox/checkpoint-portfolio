import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {LensBloomPass} from './lens-bloom.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

/** Linear half-float scene -> thresholded, multiscale lens bloom -> one output transform. */
export class CinematicPipeline {
  constructor(renderer,scene,camera){this.renderer=renderer;this.scene=scene;this.camera=camera;this.key='';}
  configure(quality,width,height){
    const key=`${quality.tier}:${width}:${height}:${quality.dpr}`;if(this.key===key)return;this.key=key;this.dispose();
    if(!quality.bloom||!this.renderer.extensions.has('EXT_color_buffer_float'))return;
    const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:quality.tier==='high'?Math.min(4,this.renderer.capabilities.maxSamples):Math.min(2,this.renderer.capabilities.maxSamples)});
    this.composer=new EffectComposer(this.renderer,target);this.composer.setPixelRatio(quality.dpr);this.composer.setSize(width,height);
    this.renderPass=new RenderPass(this.scene,this.camera);
    this.bloom=new LensBloomPass(quality.bloomStrength);
    this.output=new OutputPass();
    this.composer.addPass(this.renderPass);this.composer.addPass(this.bloom);this.composer.addPass(this.output);
    // addPass reuses the full viewport; restore the bounded bloom working resolution.
    this.bloom.setSize(width*quality.dpr*quality.bloomScale,height*quality.dpr*quality.bloomScale);
  }
  render(){if(this.composer)this.composer.render();else this.renderer.render(this.scene,this.camera);}
  dispose(){this.bloom?.dispose();this.output?.dispose();this.renderPass?.dispose();this.composer?.dispose();this.composer=null;this.bloom=null;this.output=null;this.renderPass=null;}
}

/** Small emissive studio practicals: genuine scene highlights participate in bloom/reflection. */
export function buildPracticals(){
 const group=new T.Group(),geometry=new T.BoxGeometry(.10,.18,.08);
 const material=new T.MeshStandardMaterial({color:0xfff0d9,emissive:0xffe4bd,emissiveIntensity:5.5,roughness:.35,metalness:0});
 const mesh=new T.InstancedMesh(geometry,material,8);
 [-6,-4.6,-3.2,-1.9,1.9,3.2,4.6,6].forEach((x,i)=>mesh.setMatrixAt(i,new T.Matrix4().makeTranslation(x,.09,-1.5)));
 mesh.instanceMatrix.needsUpdate=true;group.add(mesh);group.name='studio-practicals';
 return {group,dispose(){geometry.dispose();material.dispose();}};
}
