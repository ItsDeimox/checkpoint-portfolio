import * as T from 'three';
import {createInspection,inspectionCamera} from './inspection.js';
import {CarouselMotion,createFade,componentPose,rotateInView,depthRange,clamp,smooth} from './viewer-motion.js';
import {bindViewerControls} from './viewer-controls.js';
import {CinematicPipeline,buildPracticals} from './cinematic.js';
import {FrameBudget} from './quality.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {AssetLibrary,createModel,createEmptyModel,sourceFamilies,isEffectivelyVisible} from './external-models.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {vehicles,getPart} from './data.js';
import {fitView,getQuality,ease} from './state.js';

const floorShader={
  uniforms:{color:{value:new T.Color(0x070809)},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()}},
  vertexShader:`uniform mat4 textureMatrix; varying vec4 vReflection; varying vec3 vWorld;
  void main(){vReflection=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
  #include <common>
  #include <dithering_pars_fragment>
  uniform sampler2D tDiffuse; uniform vec3 color; varying vec4 vReflection; varying vec3 vWorld;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){vec2 uv=vReflection.xy/vReflection.w;
    float grain=hash(floor(vWorld.xz*320.));
    float ripples=sin(vWorld.z*180.+sin(vWorld.x*18.)*2.)*.5+.5;
    vec2 blur=vec2(.0018,.0065)*(1.+abs(vWorld.z)*.06);uv.x+=(grain-.5)*.00065;
    vec3 reflected=texture2D(tDiffuse,uv).rgb*.36;
    reflected+=texture2D(tDiffuse,uv+vec2(blur.x,0.)).rgb*.16;
    reflected+=texture2D(tDiffuse,uv-vec2(blur.x,0.)).rgb*.16;
    reflected+=texture2D(tDiffuse,uv+vec2(0.,blur.y)).rgb*.16;
    reflected+=texture2D(tDiffuse,uv-vec2(0.,blur.y)).rgb*.16;
    float falloff=exp(-abs(vWorld.x)*.08-max(0.,vWorld.z)*.19);
    // Preserve linear HDR highlights for the camera bloom pass.
    float grazing=clamp(abs(vWorld.z)*.025+.50,.50,.78);
    vec3 outColor=reflected*grazing*falloff*(.91+grain*.06+ripples*.03);
    float pool=exp(-pow(vWorld.x*.34,2.)-pow((vWorld.z+1.)*.7,2.));
    outColor+=vec3(pool*.026*(.55+grain*.45));
    gl_FragColor=vec4(outColor,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <dithering_fragment>
  }`
};
const atmosphereVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
function atmosphere(width,height,opacity){
  return new T.Mesh(new T.PlaneGeometry(width,height),new T.ShaderMaterial({
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{opacity:{value:opacity}},vertexShader:atmosphereVertex,
    fragmentShader:`varying vec2 vUv;uniform float opacity;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    void main(){vec2 p=(vUv-.5)*2.;float mist=noise(vUv*vec2(12.,7.))*.6+noise(vUv*vec2(24.,14.))*.25+.15;
    float a=exp(-p.x*p.x*4.-pow((vUv.y-.20)*4.2,2.))*mist*opacity;
    a*=smoothstep(0.,.15,vUv.y)*smoothstep(1.,.65,vUv.y);gl_FragColor=vec4(vec3(.84,.87,.90),a);}`
  }));
}

export class RocketViewer {
  constructor(canvas,{onAction,onHover,onProgress,onError,onAssetStatus}){
    Object.assign(this,{canvas,onAction,onHover,onProgress,onError,onAssetStatus,models:[],frameId:0,frames:0,lastTime:0,hover:null,drag:null,qualityMode:'auto',disposed:false});
    this.carousel=new CarouselMotion(1);this.contextAlpha=1;this.retiring=[];this.hiddenSources=[];this.rotationDelta=new T.Vector2();this.zoom=1;this.zoomTarget=1;this.stageScale=1;this.scratchSphere=new T.Sphere();this.scratchVector=new T.Vector3();this.depthVector=new T.Vector3();this.unitScale=new T.Vector3(1,1,1);this.poseTarget=new T.Vector3();this.lastPick=0;
    this.frameBudget=new FrameBudget();this.inspection=null;this.cutaway=false;this.autoCap=null;this.dragonModel=null;this.assetWants={};
    this.library=new AssetLibrary();this.assetStates={};this.assetJobs=new Map();this.assetVersions={};this.studioSource='procedural';
    this.abort=new AbortController();this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.target=new T.Vector3();this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.lastStats={};
  }
  async initialize(state){
    this.state=state;this.quality=getQuality({width:innerWidth,dpr:devicePixelRatio,memory:navigator.deviceMemory??4,cores:navigator.hardwareConcurrency??4});
    this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setClearColor(0x000000,1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;this.renderer.localClippingEnabled=true;this.renderer.info.autoReset=false;
    this.scene=new T.Scene();this.scene.background=new T.Color(0x000000);
    this.camera=new T.PerspectiveCamera(32,1,.025,240);this.pipeline=new CinematicPipeline(this.renderer,this.scene,this.camera);
    this.onProgress?.(.12,'CALIBRATING THE LIGHT');RectAreaLightUniformsLib.init();this.buildStudio();
    for(let i=0;i<vehicles.length;i++){
      const model=createEmptyModel(i);model.group.visible=false;model.fade=createFade(model.group);this.scene.add(model.group);this.models.push(model);this.onProgress?.(.2+i*.16,`ASSEMBLING ${vehicles[i].name}`);await new Promise(requestAnimationFrame);
    }
    this.onProgress?.(.78,'LOADING LICENSED GEOMETRY');
    await this.loadLicensed(state.index);
    this.floor=new Reflector(new T.PlaneGeometry(160,160),{clipBias:.002,textureWidth:this.quality.reflectionSize,textureHeight:this.quality.reflectionSize,multisample:0,shader:floorShader});
    this.floor.getRenderTarget().texture.type=this.renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType;
    this.practicals=buildPracticals();this.scene.add(this.practicals.group);
    this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-.012;this.floor.material.dithering=true;this.scene.add(this.floor);
    this.contactShadow=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:atmosphereVertex,fragmentShader:`varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*4.)*.76;gl_FragColor=vec4(0.,0.,0.,a);}`}));
    this.contactShadow.rotation.x=-Math.PI/2;this.contactShadow.position.y=-.008;this.contactShadow.renderOrder=1;this.scene.add(this.contactShadow);
    this.haze=atmosphere(12,3.0,.22);this.haze.position.set(0,.9,-1.6);this.scene.add(this.haze);
    this.wideHaze=atmosphere(30,1.0,.075);this.wideHaze.position.set(0,.30,-3);this.scene.add(this.wideHaze);
    this.bindEvents();this.resize();this.applyState(state,true);
    this.onProgress?.(.9,'PREPARING THE SHOWROOM');await this.renderer.compileAsync(this.scene,this.camera);
    this.onProgress?.(1,'READY TO EXPLORE');this.wake();
    this.loadStudioEnvironment();
    if(!this.quality.low)this.loadLicensed(2);
  }
  async loadLicensed(index){
    if(index===0||this.disposed)return;
    if(this.state.payload==='dragon'&&index===this.state.index)this.loadDragon();
    const quality=this.quality.tier==='high'?'high':'eco',key=`${index}-${quality}`;
    this.assetWants[index]=key;if(this.models[index]?.assetKey===key){const status='licensed-'+quality;if(this.assetStates[index]!==status){this.assetStates[index]=status;this.onAssetStatus?.(index,status);}return;}
    if(this.assetJobs.has(key))return this.assetJobs.get(key);
    const version=(this.assetVersions[index]??0)+1;this.assetVersions[index]=version;
    this.assetStates[index]='loading';this.onAssetStatus?.(index,'loading');
    const job=(async()=>{
      try{
        const template=await this.library.template(sourceFamilies[index],quality);
        if(this.disposed||this.assetWants[index]!==key)return;
        const previous=this.models[index],model=createModel(template,index);
        model.assetKey=key;model.fade=createFade(model.group);model.fade.set(previous.fade?.value??1);model.sphere=new T.Box3().setFromObject(model.group).getBoundingSphere(new T.Sphere());this.applyTextureBudget(model);model.group.position.copy(previous.group.position);model.group.quaternion.copy(previous.group.quaternion);model.group.scale.copy(previous.group.scale);model.group.visible=previous.group.visible;
        for(const part of Object.keys(model.uniforms)){model.uniforms[part].brightness.value=previous.uniforms[part].brightness.value;model.uniforms[part].highlight.value=previous.uniforms[part].highlight.value;}
        model.payload(index===1?this.state.payload:'fairing');this.scene.remove(previous.group);this.scene.add(model.group);this.models[index]=model;previous.dispose();if(this.state.part&&this.state.index===index&&this.floor)this.applyState(this.state,false,true);
        this.assetStates[index]=`licensed-${quality}`;this.onAssetStatus?.(index,this.assetStates[index]);this.wake();
      }catch(error){
        if(this.disposed)return;
        if(this.assetWants[index]!==key)return;
        this.assetStates[index]=this.models[index]?.source==='licensed'?'licensed-fallback':'unavailable';
        this.onAssetStatus?.(index,this.assetStates[index]);console.warn('Authored model unavailable; no substitute geometry is generated.',error.message);
      }finally{this.assetJobs.delete(key);}
    })();this.assetJobs.set(key,job);return job;
  }
  async loadDragon(){
    const quality=this.quality.tier==='high'?'high':'eco',key='dragon-'+quality;this.assetWants.dragon=key;
    if(this.dragonModel?.assetKey===key){const status='licensed-'+quality;if(this.assetStates.dragon!==status){this.assetStates.dragon=status;this.onAssetStatus?.('dragon',status);}return;}if(this.assetJobs.has(key))return;
    this.assetStates.dragon='loading';this.onAssetStatus?.('dragon','loading');
    const job=(async()=>{try{
      const t=await this.library.template('dragon',quality);if(this.disposed||this.assetWants.dragon!==key)return;
      const model=createModel(t,1);model.assetKey=key;model.fade=createFade(model.group);this.applyTextureBudget(model);const old=this.dragonModel;this.dragonModel=model;
      if(this.state.payload==='dragon'&&this.floor)this.applyState(this.state,false,true);
      old?.dispose();this.assetStates.dragon='licensed-'+quality;this.onAssetStatus?.('dragon',this.assetStates.dragon);this.wake();
    }catch(error){if(!this.disposed&&this.assetWants.dragon===key){this.assetStates.dragon=this.dragonModel?'licensed-fallback':'unavailable';this.onAssetStatus?.('dragon',this.assetStates.dragon);console.warn('Authored Dragon model unavailable.',error.message);}}finally{this.assetJobs.delete(key);}})();this.assetJobs.set(key,job);return job;
  }
  inspectionModel(){return this.state.payload==='dragon'?this.dragonModel:this.models[this.state.index];}
  retryModel(){if(this.state.payload==='dragon')this.loadDragon();else this.loadLicensed(this.state.index);}
  async loadStudioEnvironment(){
    try{
      const manifest=await this.library.manifest();
      const response=await fetch(manifest.files.studio.url,{signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(15000)])});
      if(!response.ok)throw Error('HDRI unavailable');
      const data=new HDRLoader().parse(await response.arrayBuffer());if(this.disposed)return;
      const texture=new T.DataTexture(data.data,data.width,data.height,T.RGBAFormat,data.type);texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.LinearSRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.flipY=true;texture.needsUpdate=true;
      const pmrem=new T.PMREMGenerator(this.renderer),environment=pmrem.fromEquirectangular(texture);texture.dispose();pmrem.dispose();
      this.environment.dispose();this.environment=environment;this.scene.environment=environment.texture;this.scene.environmentIntensity=.23;this.scene.environmentRotation.set(0,.65,0);this.studioSource='poly-haven-studio-small-03';this.wake();
    }catch(error){if(!this.disposed)console.warn('Keeping the fallback studio environment.',error.message);}
  }
  buildStudio(){
    const studio=new T.Scene();studio.background=new T.Color(.009,.009,.011);
    const card=(x,y,z,w,h,power)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(power,power,power),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,9,0);studio.add(m);};
    card(-5,10,4,3,24,7);card(5,13,-4,2,28,11);card(0,24,4,8,4,4);card(1,5,8,5,15,.7);
    const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(studio,.035,.1,100);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.27;
    studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
    const area=(x,y,z,w,h,intensity,target)=>{const light=new T.RectAreaLight(0xffffff,intensity,w,h);light.position.set(x,y,z);light.lookAt(...target);this.scene.add(light);return light;};
    this.key=area(-5.8,8,2.2,1.8,16,1.65,[0,7,0]);this.key.color.set(0xe4edff);
    this.rim=area(2.7,10,-3,1.2,20,12,[0,9,0]);
    this.uplight=area(-.6,.25,2.4,3.0,1.2,6,[0,6,0]);this.uplight.color.set(0xffebd2);
    this.fill=area(3,9,6,4,16,.10,[0,7,0]);
    const top=new T.DirectionalLight(0xdde6f1,1.0);top.position.set(-2,25,5);this.scene.add(top,new T.AmbientLight(0xffffff,.035));
  }
  bindEvents(){bindViewerControls(this);}
  resize(){
    if(!this.renderer)return;
    const rect=this.canvas.getBoundingClientRect();this.width=rect.width||innerWidth;this.height=rect.height||innerHeight;
    this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();this.applyQuality();
    if(this.models.length===vehicles.length&&this.floor)this.applyState(this.state,true);
  }
  applyTextureBudget(model){const max=Math.min(this.quality.anisotropy,this.renderer.capabilities.getMaxAnisotropy());model.group.traverse(o=>{if(o.isMesh)for(const value of Object.values(o.material))if(value?.isTexture&&value.anisotropy!==max){value.anisotropy=max;value.needsUpdate=true;}});}
  displayGroup(){return this.inspection?.group??this.models[this.state.index].group;}
  setCutaway(){this.cutaway=false;return false;}
  restoreSources(){for(const [mesh,visible]of this.hiddenSources)mesh.visible=visible;this.hiddenSources.length=0;}
  syncInspection(state,force=false){
    const key=state.part?`${state.index}:${state.part}:${state.payload}`:null;
    if(key===this.inspectionKey&&!force&&this.inspection)return this.inspection;
    const previous=this.inspection;this.restoreSources();this.inspection=null;this.inspectionKey=null;
    if(previous){this.retiring.push({view:previous,from:previous.fade.value,elapsed:0});if(this.retiring.length>2)this.retiring.shift().view.dispose();}
    if(!key)return null;
    const model=this.inspectionModel();if(!model||model.source!=='licensed')return null;
    model.payload('fairing');if(!model.group.children.some(o=>o.userData.part===state.part))return null;
    const view=createInspection(model,state.index,state.part,state.payload);this.inspection=view;this.inspectionKey=key;this.scene.add(view.group);
    const initial=state.payload!=='dragon'&&!previous&&this.contextAlpha>.85;
    if(initial){model.group.updateMatrixWorld(true);view.group.position.copy(view.sourceCenter).applyMatrix4(model.group.matrixWorld);model.group.getWorldQuaternion(view.group.quaternion);model.group.getWorldScale(view.group.scale);}
    else {view.group.position.set(0,view.radius+.08,0);view.group.quaternion.copy(previous?.group.quaternion??componentPose(state.part));view.fade.set(0);}
    for(const mesh of view.sourceMeshes){this.hiddenSources.push([mesh,mesh.visible]);mesh.visible=false;}
    return view;
  }
  setZoom(value){this.zoomTarget=clamp(value,.7,1.8);this.wake();}
  applyQuality(mode=this.qualityMode,reset=true){
    if(reset&&mode!==this.qualityMode){this.autoCap=null;this.frameBudget.reset();}
    this.qualityMode=mode;
    const options={width:this.width,dpr:devicePixelRatio,memory:navigator.deviceMemory??4,cores:navigator.hardwareConcurrency??4,mode};
    this.quality=getQuality(options);
    if(mode==='auto'&&this.autoCap&&['low','medium','high'].indexOf(this.autoCap)<['low','medium','high'].indexOf(this.quality.tier))this.quality=getQuality({...options,mode:this.autoCap});
    this.canvas.dataset.quality=this.quality.tier;
    // Keep an in-progress fade/drag intact when a graphics budget changes.
    for(const model of [...this.models,this.dragonModel].filter(Boolean))this.applyTextureBudget(model);
    this.renderer.setPixelRatio(this.quality.dpr);this.renderer.setSize(this.width,this.height,false);
    this.pipeline.configure(this.quality,this.width,this.height);
    this.floor?.getRenderTarget().setSize(this.quality.reflectionSize,this.quality.reflectionSize);if(this.floor)this.loadLicensed(this.state.index);this.wake();
  }
  overviewCamera(position=this.carousel.position){
    const p=clamp(position,1,3),i=Math.floor(p),next=Math.min(3,i+1),h=T.MathUtils.lerp(vehicles[i].height,vehicles[next].height,p-i),fit=fitView(h,this.width,this.height);
    return {height:h,position:[fit.target[0],fit.target[1]+h*.03,fit.distance],target:fit.target};
  }
  desiredCamera(state){
    if(state.part&&this.inspection)return inspectionCamera(this.inspection.bounds,this.width,this.height,this.zoom);
    return this.overviewCamera(state.index);
  }
  applyState(state,instant=false,force=false){
    if(!this.floor||!this.models.length)return;
    const same=this.state?.index===state.index&&this.state?.part===state.part&&this.state?.payload===state.payload,wasPart=this.inspection||this.retiring.length;
    this.state=state;this.setHover(null);this.pendingPointer=null;
    if(same&&!instant&&!force){this.wake();return;}
    if(!same){this.zoom=this.zoomTarget=1;this.rotationDelta.set(0,0);}
    this.carousel.target=state.index;if(instant||this.reduced.matches)this.carousel.snap(state.index);
    if(!state.part){this.restoreSources();for(const m of this.models)m.payload('fairing');}
    const view=this.syncInspection(state,force),desired=this.desiredCamera(state),duration=instant||this.reduced.matches?0:force?420:950;
    if(state.part||wasPart){
      this.animation={start:performance.now(),elapsed:0,duration,fromPosition:this.camera.position.clone(),fromTarget:this.target.clone(),position:new T.Vector3(...desired.position),target:new T.Vector3(...desired.target),fromContext:this.contextAlpha,toContext:state.part?0:1,view,fromPose:view?.group.position.clone(),fromScale:view?.group.scale.clone(),fromQuat:view?.group.quaternion.clone(),fromFade:view?.fade.value??0,toQuat:componentPose(state.part),fromLight:this.stageScale,toLight:view?Math.max(view.radius*3,.3)/14:vehicles[state.index].height/14};
    }else {this.animation=null;this.contextAlpha=1;}
    if(instant||this.reduced.matches){this.updateAnimation(performance.now());for(const x of this.retiring)x.view.dispose();this.retiring.length=0;}
    this.loadLicensed(state.index);this.wake();
  }
  layoutCarousel(){
    const p=this.carousel.position,overview=this.overviewCamera(),h=overview.height,spacing=h*(this.width<760?.64:Math.max(.78,this.width/this.height*.51));
    for(let i=1;i<this.models.length;i++){
      const m=this.models[i],d=i-p,a=Math.abs(d),proximity=1-smooth(Math.min(1,a)),sideScale=d<0?1-.36*smooth(Math.min(1,a)):1;
      m.group.position.x=d*spacing;m.group.scale.setScalar(h/vehicles[i].height*sideScale);
      const brightness=.10+.90*proximity;for(const u of Object.values(m.uniforms))u.brightness.value=brightness;
      const edge=1-smooth((a-1.03)/.25),budget=this.quality.low&&!this.carousel.dragging&&Math.abs(this.carousel.velocity)<.02&&a>.99?0:1;
      m.fade.set(m.source==='licensed'?this.contextAlpha*edge*budget:0);
    }
    const copy=1-.75*smooth(Math.abs(p-this.state.index));if(Math.abs(copy-this.lastCopyOpacity)>.003||this.lastCopyOpacity===undefined){this.lastCopyOpacity=copy;this.canvas.parentElement?.style.setProperty('--carousel-copy-opacity',copy.toFixed(3));}
    if(!this.animation&&!this.state.part){this.camera.position.set(...overview.position);this.target.set(...overview.target);this.updateStudio(h/14);}
  }
  updateStudio(h){
    if(!this.haze||Math.abs(h-this.lastLightScale)<.00001)return;this.lastLightScale=h;this.stageScale=h;
    this.haze.scale.setScalar(h);this.haze.position.set(0,.9*h,-1.6*h);this.wideHaze.scale.setScalar(h);this.wideHaze.position.set(0,.3*h,-3*h);this.practicals.group.scale.setScalar(h);
    const footprint=this.inspection?this.inspection.radius*1.8:[.65,1.45,3.3,3.3][this.state.index];this.contactShadow.scale.set(footprint,footprint*.7,1);
    const detail=this.state.part==='engines';this.uplight.intensity=detail?2.5:6;this.rim.intensity=detail?7:12;
    this.key.position.set(-5.8*h,8*h,2.2*h);this.key.width=1.8*h;this.key.height=16*h;this.key.lookAt(0,7*h,0);
    this.rim.position.set(2.7*h,10*h,-3*h);this.rim.width=1.2*h;this.rim.height=20*h;this.rim.lookAt(0,9*h,0);
    this.uplight.position.set(-.6*h,.25*h,2.4*h);this.uplight.width=3*h;this.uplight.height=1.2*h;this.uplight.lookAt(0,6*h,0);
    this.fill.position.set(3*h,9*h,6*h);this.fill.width=4*h;this.fill.height=16*h;this.fill.lookAt(0,7*h,0);
  }
  updateAnimation(time,delta=0){
    const a=this.animation;if(!a)return false;a.elapsed+=Math.min(64,Math.max(0,delta));const p=a.duration===0?1:clamp(a.elapsed/a.duration,0,1),t=ease(p);
    const contextT=a.toContext>a.fromContext?smooth((p-.30)/.70):smooth(p*1.45);
    this.contextAlpha=T.MathUtils.lerp(a.fromContext,a.toContext,contextT);
    this.camera.position.lerpVectors(a.fromPosition,a.position,t);this.target.lerpVectors(a.fromTarget,a.target,t);this.updateStudio(T.MathUtils.lerp(a.fromLight,a.toLight,t));
    if(a.view===this.inspection&&a.view){const g=a.view.group;g.position.lerpVectors(a.fromPose,this.poseTarget.set(0,a.view.radius+.08,0),t);g.scale.lerpVectors(a.fromScale,this.unitScale,t);if(!a.orientationCancelled)g.quaternion.slerpQuaternions(a.fromQuat,a.toQuat,t);a.view.fade.set(T.MathUtils.lerp(a.fromFade,1,smooth(p*1.5)));}
    if(p===1)this.animation=null;return p<1;
  }
  updateDepth(){
    let nearest=Infinity,farthest=20;this.camera.getWorldDirection(this.scratchVector);
    const consider=(group,sphere)=>{if(!group.visible||!sphere)return;const b=this.scratchSphere.copy(sphere).applyMatrix4(group.matrixWorld),depth=this.depthVector.copy(b.center).sub(this.camera.position).dot(this.scratchVector);nearest=Math.min(nearest,depth-b.radius);farthest=Math.max(farthest,depth+b.radius*3);};
    for(const m of this.models)consider(m.group,m.sphere);
    if(this.inspection)consider(this.inspection.group,this.inspection.sphere);for(const x of this.retiring)consider(x.view.group,x.view.sphere);
    const near=Number.isFinite(nearest)?Math.max(.002,nearest*.16):.1,far=Math.max(20,farthest);
    if(Math.abs(near-this.camera.near)>.0005||Math.abs(far-this.camera.far)>.01){this.camera.near=near;this.camera.far=far;this.camera.updateProjectionMatrix();}
    this.clearance=nearest;
  }
  pick(x,y){
    const rect=this.canvas.getBoundingClientRect();this.pointer.set(((x-rect.left)/rect.width)*2-1,-((y-rect.top)/rect.height)*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    let best=null;
    if(this.inspection){const hits=this.raycaster.intersectObject(this.inspection.group,true).filter(h=>isEffectivelyVisible(h.object));return hits[0]?{...hits[0],index:this.state.index,part:this.state.part}:null;}
    for(let i=0;i<this.models.length;i++){
      if(Math.abs(i-this.state.index)>1||!this.models[i].group.visible)continue;
      const model=this.models[i];if(model.sphere&&!this.raycaster.ray.intersectsSphere(this.scratchSphere.copy(model.sphere).applyMatrix4(model.group.matrixWorld)))continue;
      const hits=this.raycaster.intersectObject(model.group,true).filter(hit=>isEffectivelyVisible(hit.object)&&hit.object.userData.part);
      if(hits[0]&&(!best||hits[0].distance<best.distance))best={...hits[0],index:i,part:hits[0].object.userData.part};
    }
    return best;
  }
  setHover(hit){
    const part=hit?.index===this.state.index&&!this.state.part?hit.part:null;
    if(this.hover===part)return;
    this.hover=part;this.canvas.style.cursor=part?'pointer':'grab';
    this.onHover?.(part);this.wake();
  }
  projectPart(part){
    const f=getPart(vehicles[this.state.index],part,this.state.payload).focus;
    const pos=new T.Vector3(0,f.y,.4).applyMatrix4(this.models[this.state.index].group.matrixWorld).project(this.camera);
    return {x:(pos.x*.5+.5)*this.width,y:(-.5*pos.y+.5)*this.height};
  }
  wake(){if(this.disposed||document.hidden||this.frameId)return;this.frameId=requestAnimationFrame(t=>this.frame(t));}
  frame(time){
    this.frameId=0;if(this.disposed||document.hidden||!this.floor)return;
    const rawDelta=this.lastTime?time-this.lastTime:16.67,dt=Math.min(.05,rawDelta/1000);this.lastTime=time;
    let active=this.carousel.step(dt);active=this.updateAnimation(time,rawDelta)||active;
    if(Math.abs(this.zoom-this.zoomTarget)>.0002){this.zoom=T.MathUtils.lerp(this.zoom,this.zoomTarget,1-Math.exp(-dt*14));active=true;}else this.zoom=this.zoomTarget;
    if(this.inspection&&!this.animation){const c=this.desiredCamera(this.state);this.camera.position.set(...c.position);this.target.set(...c.target);}
    this.layoutCarousel();this.camera.lookAt(this.target);this.camera.updateMatrixWorld();
    if(this.rotationDelta.lengthSq()){if(this.inspection)rotateInView(this.inspection.group.quaternion,this.rotationDelta.x,this.rotationDelta.y,this.camera.quaternion,Math.min(this.width,this.height));else this.models[this.state.index].group.rotateY(this.rotationDelta.x*.006);this.rotationDelta.set(0,0);}
    if(this.state.rotating&&!this.reduced.matches){if(this.inspection)rotateInView(this.inspection.group.quaternion,dt*22,0,this.camera.quaternion,Math.min(this.width,this.height));else this.displayGroup().rotateY(dt*.15);active=true;}
    for(let i=this.retiring.length-1;i>=0;i--){const x=this.retiring[i];x.elapsed+=Math.min(rawDelta,64);const p=this.reduced.matches?1:clamp(x.elapsed/420,0,1);x.view.fade.set(x.from*(1-smooth(p)));if(p===1){x.view.dispose();this.retiring.splice(i,1);}else active=true;}
    this.scene.updateMatrixWorld();this.updateDepth();
    if(this.pendingPointer){if(time-this.lastPick>=32){this.setHover(this.pick(this.pendingPointer.x,this.pendingPointer.y));this.pendingPointer=null;this.lastPick=time;}else active=true;}
    for(const [i,m]of this.models.entries())for(const [part,u]of Object.entries(m.uniforms)){const target=i===this.state.index&&part===this.hover?1:0;if(this.reduced.matches)u.highlight.value=target;else if(Math.abs(u.highlight.value-target)>.002){u.highlight.value=T.MathUtils.lerp(u.highlight.value,target,1-Math.exp(-dt*15));active=true;}else u.highlight.value=target;}
    this.renderer.info.reset();this.pipeline.render();this.frames++;
    if(this.qualityMode==='auto'&&active&&!this.animation){const next=this.frameBudget.sample(rawDelta,this.quality.tier,time);if(next){this.autoCap=next;this.applyQuality('auto',false);}}
    this.lastStats={quality:this.quality.tier,bloom:Boolean(this.pipeline.composer),bloomResolution:this.pipeline.bloom?[this.pipeline.bloom.renderTargetBright.width,this.pipeline.bloom.renderTargetBright.height]:null,inspection:this.inspectionKey,cutaway:false,frames:this.frames,triangles:this.renderer.info.render.triangles,drawCalls:this.renderer.info.render.calls,dpr:this.renderer.getPixelRatio(),geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,assets:{...this.assetStates},studio:this.studioSource,carousel:this.carousel.position,contextAlpha:this.contextAlpha,near:this.camera.near,far:this.camera.far,clearance:this.clearance,transition:Boolean(this.animation),retiring:this.retiring.length,zoom:this.zoom};
    if(this.hover)this.onHover?.(this.hover,this.projectPart(this.hover));
    if(active)this.wake();else this.lastTime=0;
  }
  dispose(){
    this.restoreSources();for(const x of this.retiring)x.view.dispose();this.retiring.length=0;this.inspection?.dispose();this.pipeline?.dispose();this.practicals?.dispose();
    this.dragonModel?.dispose();this.disposed=true;cancelAnimationFrame(this.frameId);this.abort.abort();this.models.forEach(model=>model.dispose());this.library.dispose();this.contactShadow?.geometry.dispose();this.contactShadow?.material.dispose();this.floor?.dispose();this.environment?.dispose();
    for(const mesh of [this.haze,this.wideHaze]){mesh?.geometry.dispose();mesh?.material.dispose();}this.renderer?.dispose();
  }
}
