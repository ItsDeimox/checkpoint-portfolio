import * as T from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {buildRocket} from './models.js';
import {disposeSharedTextures} from './materials.js';
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
    vec2 blur=vec2(.0025,.0040)*(1.+abs(vWorld.z)*.06);uv.x+=(grain-.5)*.00065;
    vec3 reflected=texture2D(tDiffuse,uv).rgb*.36;
    reflected+=texture2D(tDiffuse,uv+vec2(blur.x,0.)).rgb*.16;
    reflected+=texture2D(tDiffuse,uv-vec2(blur.x,0.)).rgb*.16;
    reflected+=texture2D(tDiffuse,uv+vec2(0.,blur.y)).rgb*.16;
    reflected+=texture2D(tDiffuse,uv-vec2(0.,blur.y)).rgb*.16;
    float falloff=exp(-abs(vWorld.x)*.08-max(0.,vWorld.z)*.75);
    vec3 outColor=reflected*.26*falloff*(.86+grain*.10+ripples*.04);
    float pool=exp(-pow(vWorld.x*.34,2.)-pow((vWorld.z+1.)*.7,2.));
    outColor+=vec3(pool*.014*(.55+grain*.45));
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
  constructor(canvas,{onAction,onHover,onProgress,onError}){
    Object.assign(this,{canvas,onAction,onHover,onProgress,onError,models:[],frameId:0,frames:0,lastTime:0,hover:null,drag:null,qualityMode:'auto',disposed:false});
    this.abort=new AbortController();this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.target=new T.Vector3();this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.lastStats={};
  }
  async initialize(state){
    this.state=state;
    this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setClearColor(0x000000,1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.info.autoReset=false;
    this.scene=new T.Scene();this.scene.background=new T.Color(0x000000);
    this.camera=new T.PerspectiveCamera(32,1,.025,240);
    this.onProgress?.(.12,'CALIBRATING THE LIGHT');RectAreaLightUniformsLib.init();this.buildStudio();
    for(let i=0;i<vehicles.length;i++){
      const model=buildRocket(i);this.scene.add(model.group);this.models.push(model);this.onProgress?.(.2+i*.16,`ASSEMBLING ${vehicles[i].name}`);await new Promise(requestAnimationFrame);
    }
    this.quality=getQuality({width:innerWidth,dpr:devicePixelRatio,memory:navigator.deviceMemory??8});
    this.floor=new Reflector(new T.PlaneGeometry(160,160),{clipBias:.002,textureWidth:this.quality.reflectionSize,textureHeight:this.quality.reflectionSize,multisample:0,shader:floorShader});
    this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-.012;this.floor.material.dithering=true;this.scene.add(this.floor);
    this.haze=atmosphere(10,3.4,.25);this.haze.position.set(0,.9,-1.6);this.scene.add(this.haze);
    this.wideHaze=atmosphere(28,1.2,.09);this.wideHaze.position.set(0,.30,-3);this.scene.add(this.wideHaze);
    this.bindEvents();this.resize();this.applyState(state,true);
    this.onProgress?.(.9,'PREPARING THE SHOWROOM');await this.renderer.compileAsync(this.scene,this.camera);
    this.onProgress?.(1,'READY TO EXPLORE');this.wake();
  }
  buildStudio(){
    const studio=new T.Scene();studio.background=new T.Color(.009,.009,.011);
    const card=(x,y,z,w,h,power)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(power,power,power),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,9,0);studio.add(m);};
    card(-5,10,4,3,24,7);card(5,13,-4,2,28,11);card(0,24,4,8,4,4);card(1,5,8,5,15,.7);
    const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(studio,.05,.1,100);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.27;
    studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
    const area=(x,y,z,w,h,intensity,target)=>{const light=new T.RectAreaLight(0xffffff,intensity,w,h);light.position.set(x,y,z);light.lookAt(...target);this.scene.add(light);return light;};
    this.key=area(-5.8,8,2.2,2.2,16,3.0,[0,7,0]);
    this.rim=area(2.7,10,-3,1.5,20,8,[0,9,0]);
    this.uplight=area(-.6,.25,2.4,3.0,1.2,12,[0,6,0]);
    this.fill=area(3,9,6,4,16,.25,[0,7,0]);
    const top=new T.DirectionalLight(0xdde6f1,1.6);top.position.set(-2,25,5);this.scene.add(top,new T.AmbientLight(0xffffff,.035));
  }
  bindEvents(){
    const options={signal:this.abort.signal},on=(target,event,fn)=>target.addEventListener(event,fn,options);
    on(window,'resize',()=>this.resize());on(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.frameId);this.frameId=0;this.lastTime=0;}else this.wake();});
    on(this.reduced,'change',()=>{if(this.reduced.matches&&this.state.rotating)this.onAction({type:'ROTATE'});this.applyState(this.state);});
    on(this.canvas,'webglcontextlost',event=>{event.preventDefault();this.onError?.('The 3D context was interrupted. Reload to restore the showroom.');cancelAnimationFrame(this.frameId);this.frameId=0;});
    on(this.canvas,'pointermove',e=>{
      if(this.drag){
        const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;this.drag.moved=this.drag.moved||Math.hypot(dx,dy)>7;
        if(e.pointerType!=='touch'||this.state.part){this.models[this.state.index].group.rotation.y=this.drag.yaw+dx*.008;this.wake();}
      }else if(e.pointerType!=='touch'){this.pendingPointer={x:e.clientX,y:e.clientY};this.wake();}
    });
    on(this.canvas,'pointerdown',e=>{if(e.button!==0)return;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:this.models[this.state.index].group.rotation.y,moved:false,type:e.pointerType};this.canvas.setPointerCapture(e.pointerId);this.canvas.classList.add('is-dragging');});
    on(this.canvas,'pointerup',e=>{
      if(!this.drag||this.drag.id!==e.pointerId)return;
      const drag=this.drag,dx=e.clientX-drag.x,dy=e.clientY-drag.y;this.releasePointer();
      if(drag.type==='touch'&&!this.state.part&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3){this.onAction({type:'NAVIGATE',index:this.state.index+(dx<0?1:-1)});return;}
      if(drag.moved)return;
      const hit=this.pick(e.clientX,e.clientY);
      if(hit){if(hit.index!==this.state.index)this.onAction({type:'NAVIGATE',index:hit.index});else this.onAction({type:'FOCUS',part:hit.part});}
      else if(this.state.part)this.onAction({type:'BACK'});
    });
    on(this.canvas,'pointercancel',()=>this.releasePointer());on(this.canvas,'lostpointercapture',()=>this.releasePointer());
    on(this.canvas,'pointerleave',()=>{this.pendingPointer=null;this.setHover(null);});
  }
  releasePointer(){const id=this.drag?.id;this.drag=null;this.canvas.classList.remove('is-dragging');if(id!==undefined&&this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);}
  resize(){
    if(!this.renderer)return;
    const rect=this.canvas.getBoundingClientRect();this.width=rect.width||innerWidth;this.height=rect.height||innerHeight;
    this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();this.applyQuality();
    if(this.models.length===vehicles.length&&this.floor)this.applyState(this.state,true);
  }
  applyQuality(mode=this.qualityMode){
    this.qualityMode=mode;this.quality=getQuality({width:this.width,dpr:devicePixelRatio,memory:navigator.deviceMemory??8,mode});
    this.renderer.setPixelRatio(this.quality.dpr);this.renderer.setSize(this.width,this.height,false);
    this.floor?.getRenderTarget().setSize(this.quality.reflectionSize,this.quality.reflectionSize);this.wake();
  }
  desiredCamera(state){
    const vehicle=vehicles[state.index],fit=fitView(vehicle.height,this.width,this.height);
    if(!state.part)return {position:[fit.target[0],fit.target[1]+vehicle.height*.03,fit.distance],target:fit.target};
    const f=getPart(vehicle,state.part,state.payload).focus;
    const span=f.span*(fit.mobile?1.85:1.12);
    const distance=span/(2*Math.tan(16*Math.PI/180));
    const targetX=fit.mobile?0:f.span*.28;
    const targetY=f.y-(fit.mobile?f.span*.35:0);
    return {position:[Math.sin(f.angle)*distance+targetX,Math.max(.14,targetY+f.elevation),Math.cos(f.angle)*distance],target:[targetX,targetY,0]};
  }
  applyState(state,instant=false){
    if(!this.models.length)return;this.state=state;this.setHover(null);this.pendingPointer=null;
    const desired=this.desiredCamera(state),height=vehicles[state.index].height;
    const aspect=this.width/this.height;
    const spacing=height*(this.width<760?.64:Math.max(.78,aspect*.51));
    const destinations=this.models.map((model,i)=>{
      const delta=i-state.index;model.payload(i===1?state.payload:'fairing');
      const scale=i===state.index?1:height*(delta<0?.64:1.02)/vehicles[i].height;
      return {x:delta*spacing,scale,brightness:i===state.index?1:state.part?0:.24};
    });
    this.animation={start:performance.now(),duration:instant||this.reduced.matches?0:1150,fromPosition:this.camera.position.clone(),fromTarget:this.target.clone(),position:new T.Vector3(...desired.position),target:new T.Vector3(...desired.target),from:this.models.map(m=>({x:m.group.position.x,scale:m.group.scale.x,brightness:m.uniforms.tanks.brightness.value})),to:destinations};
    this.haze.scale.setScalar(height/14);this.wideHaze.scale.x=height/14;
    this.haze.position.y=height*.065;
    const h=height/14;this.key.position.set(-5.8*h,8*h,2.2*h);this.key.width=2.2*h;this.key.height=16*h;this.key.lookAt(0,7*h,0);
    this.rim.position.set(2.7*h,10*h,-3*h);this.rim.width=1.5*h;this.rim.height=20*h;this.rim.lookAt(0,9*h,0);
    this.uplight.position.set(-.6*h,.25*h,2.4*h);this.uplight.width=3*h;this.uplight.height=1.2*h;this.uplight.lookAt(0,6*h,0);
    this.fill.position.set(3*h,9*h,6*h);this.fill.width=4*h;this.fill.height=16*h;this.fill.lookAt(0,7*h,0);
    if(instant)this.updateAnimation(performance.now());this.wake();
  }
  updateAnimation(time){
    const a=this.animation;if(!a)return false;
    const p=a.duration===0?1:Math.min(1,(time-a.start)/a.duration),t=ease(p);
    this.camera.position.lerpVectors(a.fromPosition,a.position,t);this.target.lerpVectors(a.fromTarget,a.target,t);
    this.models.forEach((model,i)=>{
      model.group.position.x=T.MathUtils.lerp(a.from[i].x,a.to[i].x,t);model.group.scale.setScalar(T.MathUtils.lerp(a.from[i].scale,a.to[i].scale,t));
      const brightness=T.MathUtils.lerp(a.from[i].brightness,a.to[i].brightness,t);
      for(const u of Object.values(model.uniforms))u.brightness.value=brightness;
      model.group.visible=brightness>.002;
    });
    if(p===1)this.animation=null;return p<1;
  }
  pick(x,y){
    const rect=this.canvas.getBoundingClientRect();this.pointer.set(((x-rect.left)/rect.width)*2-1,-((y-rect.top)/rect.height)*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    let best=null;
    for(let i=0;i<this.models.length;i++){
      if(Math.abs(i-this.state.index)>1||!this.models[i].group.visible)continue;
      const hits=this.raycaster.intersectObject(this.models[i].group,true).filter(hit=>hit.object.visible&&hit.object.userData.part);
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
    const dt=Math.min(.05,(time-(this.lastTime||time))/1000);this.lastTime=time;
    let active=this.updateAnimation(time);
    this.camera.lookAt(this.target);this.camera.updateMatrixWorld();this.scene.updateMatrixWorld();
    if(this.pendingPointer){this.setHover(this.pick(this.pendingPointer.x,this.pendingPointer.y));this.pendingPointer=null;}
    for(const [i,model] of this.models.entries())for(const [part,u] of Object.entries(model.uniforms)){
      const target=i===this.state.index&&part===this.hover?1:0;
      if(Math.abs(u.highlight.value-target)>.002){u.highlight.value=T.MathUtils.lerp(u.highlight.value,target,1-Math.exp(-dt*15));active=true;}else u.highlight.value=target;
    }
    if(this.state.rotating&&!this.reduced.matches){this.models[this.state.index].group.rotation.y+=dt*.15;active=true;}
    this.renderer.info.reset();this.renderer.render(this.scene,this.camera);this.frames++;
    this.lastStats={frames:this.frames,triangles:this.renderer.info.render.triangles,drawCalls:this.renderer.info.render.calls,dpr:this.renderer.getPixelRatio(),geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures};
    if(this.hover)this.onHover?.(this.hover,this.projectPart(this.hover));
    if(active)this.wake();else this.lastTime=0;
  }
  dispose(){
    this.disposed=true;cancelAnimationFrame(this.frameId);this.abort.abort();this.models.forEach(model=>model.dispose());this.floor?.dispose();this.environment?.dispose();
    for(const mesh of [this.haze,this.wideHaze]){mesh?.geometry.dispose();mesh?.material.dispose();}disposeSharedTextures();this.renderer?.dispose();
  }
}
