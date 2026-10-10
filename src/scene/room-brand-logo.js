import * as T from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const BRAND_MODEL_URL = '/assets/models/DXTlogoPrinted.glb';
const BRAND_REST_POSE = Object.freeze({pitch:-.12,yaw:Math.PI+.27});

export function disposeBrandModel(root) {
  const geometries=new Set(), materials=new Set(), textures=new Set();
  root?.traverse(object=>{
    if(object.geometry)geometries.add(object.geometry);
    for(const material of [object.material].flat().filter(Boolean)){
      materials.add(material);
      for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
    }
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  textures.forEach(t=>{t.source?.data?.close?.();t.dispose();});
}

export async function loadBrandModel(signal) {
  const controller=new AbortController();
  const abort=()=>controller.abort(signal.reason);
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
  const timeout=setTimeout(()=>controller.abort(new Error('Logo download timed out.')),8000);
  let model;
  try{
    const response=await fetch(BRAND_MODEL_URL,{signal:controller.signal});
    if(!response.ok)throw new Error(`Logo download failed: ${response.status}`);
    const data=await response.arrayBuffer();
    controller.signal.throwIfAborted();
    const gltf=await new GLTFLoader().parseAsync(data,'');
    model=gltf.scene;
    controller.signal.throwIfAborted();
    return model;
  }catch(error){if(model)disposeBrandModel(model);throw error;}
  finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}

/** Normalize the exported node's orientation with wrappers, not edited vertices. */
export function createBrandMount(model) {
  model.updateMatrixWorld(true);
  let first;
  model.traverse(object=>{if(!first && object.isMesh)first=object;});
  if(!first)throw new Error('The supplied logo has no mesh.');
  const basis=new T.Group();
  basis.quaternion.copy(first.getWorldQuaternion(new T.Quaternion())).invert();
  basis.add(model);basis.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(basis,true),size=box.getSize(new T.Vector3());
  if(!Number.isFinite(size.y)||size.y<1e-6)throw new Error('Invalid logo dimensions.');
  basis.position.sub(box.getCenter(new T.Vector3()));
  const mount=new T.Group();mount.name='DXT supplied 3D wordmark';mount.add(basis);
  mount.scale.setScalar(1/size.y);
  // The printed/bevelled side faces -Z in mesh coordinates. Use a rotation,
  // not negative scaling, so D and T are neither mirrored nor inverted.
  mount.rotation.set(BRAND_REST_POSE.pitch,BRAND_REST_POSE.yaw,0);
  model.traverse(object=>{
    if(!object.isMesh)return;
    object.castShadow=false;object.receiveShadow=false;
    for(const material of [object.material].flat()){
      if(!material.isMeshStandardMaterial)continue;
      const face=material.name==='Material.002';
      // Silver face and lighter gunmetal bevels reveal the authored thickness.
      // Keep some micro-roughness so the small header does not shimmer.
      material.color.setHex(face?0xdbe1e9:0x727e8c);
      material.metalness=face?.94:.97;
      material.roughness=face?.16:.19;
      material.envMapIntensity=face?2.1:1.85;
      if(face)material.normalScale?.setScalar(.28);
      if(material.isMeshPhysicalMaterial){
        material.ior=1.5;material.specularColor.setRGB(1,1,1);
        material.clearcoat=face?.45:.32;material.clearcoatRoughness=face?.085:.11;
      }
    }
  });
  mount.updateMatrixWorld(true);
  return mount;
}

export function brandFrustum(aspect) {
  const ratio=Number.isFinite(aspect)&&aspect>0?aspect:1;
  const half=Math.max(.60,.80/ratio);
  return {left:-half*ratio,right:half*ratio,top:half,bottom:-half};
}

/** Small supersampled brand viewport, sharing the showroom's renderer/context. */
export class RoomBrandLogo {
  constructor(renderer,model,getAnchor){
    this.renderer=renderer;this.getAnchor=getAnchor;this.ready=false;this.disposed=false;
    this.scene=new T.Scene();this.mount=createBrandMount(model);this.scene.add(this.mount);
    this.camera=new T.OrthographicCamera(-1,1,.6,-.6,.01,20);this.camera.position.z=5;
    // These three sources affect only the brand, never the showroom lighting.
    // Close rectangular softboxes reveal relief even on the flat printed face.
    RectAreaLightUniformsLib.init();
    const key=new T.RectAreaLight(0xf4f6ff,16,2.2,.32);key.position.set(.45,.3,1.2);key.lookAt(0,0,0);
    const rim=new T.RectAreaLight(0xff243b,7,.25,1.6);rim.position.set(.9,-.35,.7);rim.lookAt(0,0,0);
    this.scene.add(key,rim,new T.HemisphereLight(0xe8f0ff,0x161016,.28));
    this.scene.environmentRotation.set(.08,.65,0);
    this.scene.environmentIntensity=.38;
    this.target=new T.WebGLRenderTarget(2,2,{
      type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,
      minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true,stencilBuffer:false,
    });
    this.target.texture.name='DXT.Brand.Supersampled';
    this.compositeMaterial=new T.ShaderMaterial({
      name:'DXT.Brand.Composite',transparent:true,depthTest:false,depthWrite:false,toneMapped:true,
      uniforms:{map:{value:this.target.texture}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`uniform sampler2D map;varying vec2 vUv;
        void main(){vec4 c=texture2D(map,vUv);if(c.a<.0001)discard;
        gl_FragColor=vec4(c.rgb/max(c.a,.0001),c.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.compositeMaterial);
    this.overlayScene=new T.Scene();this.overlayScene.add(this.quad);
    this.overlayCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
    this.savedViewport=new T.Vector4();this.savedScissor=new T.Vector4();
    this.savedColor=new T.Color();this.size=new T.Vector2();
  }
  async prepare(environment){
    if(this.disposed)return;
    this.ready=false;this.scene.environment=environment;
    const renderer=this.renderer,target=renderer.getRenderTarget();
    try{
      renderer.initRenderTarget(this.target);
      renderer.setRenderTarget(this.target);
      await renderer.compileAsync(this.scene,this.camera,this.scene);
      renderer.setRenderTarget(null);
      await renderer.compileAsync(this.overlayScene,this.overlayCamera,this.overlayScene);
      this.ready=true;
    }finally{renderer.setRenderTarget(target);}
  }
  restoreFallback(){
    if(this.anchor)this.anchor.style.opacity=this.anchorOpacity??'';
    this.anchor=null;this.layout=null;
  }
  invalidateLayout(){this.layout=null;}
  render(canvas,{yaw=0,pitch=0}={}){
    if(!this.ready||this.disposed)return false;
    const anchor=this.getAnchor();
    if(!anchor||!anchor.isConnected){this.restoreFallback();return false;}
    if(anchor!==this.anchor){
      this.restoreFallback();this.anchor=anchor;this.anchorOpacity=anchor.style.opacity;this.layout=null;
    }
    const renderer=this.renderer;
    if(!this.layout){
      const rect=anchor.getBoundingClientRect(),host=canvas.getBoundingClientRect();
      if(rect.width<2||rect.height<2||host.width<2||host.height<2)return false;
      renderer.getSize(this.size);
      const sx=this.size.x/host.width,sy=this.size.y/host.height;
      this.layout={x:(rect.left-host.left)*sx,y:(host.bottom-rect.bottom)*sy,w:rect.width*sx,h:rect.height*sy};
      Object.assign(this.camera,brandFrustum(rect.width/rect.height));this.camera.updateProjectionMatrix();
      const ratio=renderer.getPixelRatio();
      this.target.setSize(Math.max(2,Math.min(384,Math.ceil(rect.width*ratio*2))),Math.max(2,Math.min(256,Math.ceil(rect.height*ratio*2))));
    }
    const {x,y,w,h}=this.layout;
    this.mount.rotation.set(BRAND_REST_POSE.pitch+Math.max(-.04,Math.min(.04,pitch)),BRAND_REST_POSE.yaw+Math.max(-.10,Math.min(.10,yaw)),0);
    const target=renderer.getRenderTarget(),autoClear=renderer.autoClear,scissorTest=renderer.getScissorTest();
    renderer.getViewport(this.savedViewport);renderer.getScissor(this.savedScissor);
    renderer.getClearColor(this.savedColor);const alpha=renderer.getClearAlpha();
    try{
      renderer.autoClear=false;renderer.setScissorTest(false);renderer.setRenderTarget(this.target);
      renderer.setClearColor(0,0);renderer.clear(true,true,false);renderer.render(this.scene,this.camera);
      renderer.setRenderTarget(null);renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.setScissorTest(true);
      renderer.render(this.overlayScene,this.overlayCamera);
      anchor.style.opacity='0';return true;
    }finally{
      renderer.setClearColor(this.savedColor,alpha);renderer.setRenderTarget(target);
      renderer.setViewport(this.savedViewport);renderer.setScissor(this.savedScissor);renderer.setScissorTest(scissorTest);renderer.autoClear=autoClear;
    }
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.ready=false;this.restoreFallback();
    disposeBrandModel(this.mount);this.target.dispose();this.quad.geometry.dispose();this.compositeMaterial.dispose();
    this.scene.clear();this.overlayScene.clear();
  }
}
