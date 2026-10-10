import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoomBrandLogo,loadBrandModel,disposeBrandModel} from './room-brand-logo.js';
import {LogoSpin} from './room-logo-spin.js';
import {dressStudioEnvironment} from './room-lighting.js';
import {yieldToBrowser} from './room-startup.js';

/** A tiny persistent WebGL viewport. Navigation never replaces its mesh or lights.
 * Only resizing, header changes and the existing click-spin request a draw. */
export class PersistentBrand {
 constructor({document=globalThis.document,settings={},onState=()=>{}}={}){
  Object.assign(this,{document,settings,onState,ready:false,disposed:false,lost:false,raf:0,frames:0});
  this.controller=new AbortController();this.spinController=new LogoSpin();
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.canvas=document.createElement('canvas');this.canvas.className='dxt-persistent-brand';
  this.canvas.setAttribute('aria-hidden','true');this.canvas.hidden=true;document.body.append(this.canvas);
  const signal=this.controller.signal,win=document.defaultView;
  this.headerObserver=new MutationObserver(()=>this.invalidate());
  const header=document.querySelector('#header');if(header)this.headerObserver.observe(header,{childList:true,subtree:true});
  this.pageObserver=new MutationObserver(()=>this.invalidate());this.pageObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  win?.addEventListener('resize',()=>this.invalidate(),{signal});
  win?.addEventListener('scroll',()=>this.invalidate(),{signal,passive:true});
  document.addEventListener('visibilitychange',()=>document.hidden?this.suspend():this.wake(),{signal});
  this.reduced.addEventListener('change',()=>{this.spinController.reset();this.invalidate();},{signal});
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.ready=false;this.suspend();this.fallback();this.onState();},{signal});
  this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.readyPromise=this.restore().catch(e=>this.fail(e));},{signal});
  this.readyPromise=this.initialize().catch(e=>this.fail(e));
 }
 async initialize(){
  const signal=this.controller.signal;await yieldToBrowser(signal);
  this.model=await loadBrandModel(signal);signal.throwIfAborted();
  this.renderer=new T.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:false,powerPreference:'low-power'});
  Object.assign(this.renderer,{outputColorSpace:T.SRGBColorSpace,toneMapping:T.ACESFilmicToneMapping,toneMappingExposure:this.settings.visual?.exposure??1.13});
  this.renderer.setClearColor(0,0);this.renderer.setSize(96,64,false);
  this.logo=new RoomBrandLogo(this.renderer,this.model,()=>this.document.querySelector('.room-brand-logo'));
  return this.restore();
 }
 async restore(){
  const signal=this.controller.signal;signal.throwIfAborted();
  const studio=new RoomEnvironment();dressStudioEnvironment(studio);
  const generator=new T.PMREMGenerator(this.renderer);
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,colorSpace:T.LinearSRGBColorSpace});
  try{
   this.renderer.setRenderTarget(target);
   await this.renderer.compileAsync(studio,new T.PerspectiveCamera(90,1,.1,100),studio);
   await yieldToBrowser(signal);
   this.environment?.dispose();this.environment=generator.fromScene(studio,.018,.1,100,{size:128});
   signal.throwIfAborted();
  }finally{this.renderer.setRenderTarget(null);target.dispose();studio.dispose();generator.dispose();}
  await this.logo.prepare(this.environment.texture);signal.throwIfAborted();
  this.ready=true;this.invalidate();this.onState();return this;
 }
 fallback(){this.canvas.hidden=true;this.logo?.restoreFallback();this.document.body.classList.remove('persistent-brand-ready');}
 fail(error){if(!this.disposed){this.error=error.message;this.ready=false;this.fallback();this.onState();}return this;}
 invalidate(){this.logo?.invalidateLayout();this.wake();}
 wake(){
  if(!this.ready||this.disposed||this.lost||this.document.hidden||this.raf)return;
  this.last=performance.now();this.raf=requestAnimationFrame(now=>this.frame(now));
 }
 suspend(){cancelAnimationFrame(this.raf);this.raf=0;}
 frame(now){
  this.raf=0;if(!this.ready||this.disposed||this.lost||this.document.hidden)return;
  const dt=Math.min(.05,Math.max(0,(now-this.last)/1000));
  // Rate-limit the small click animation as well on high-refresh monitors.
  if(this.spinController.active&&dt<1/60-.001){this.raf=requestAnimationFrame(t=>this.frame(t));return;}
  this.last=now;this.spinController.update(dt,this.reduced.matches);
  try{this.draw();}catch(error){this.fail(error);return;}
  if(this.spinController.active)this.wake();
 }
 draw(){
  const anchor=this.document.querySelector('.room-brand-logo');
  if(!anchor||this.document.body.classList.contains('intro-pending')){this.canvas.hidden=true;return;}
  const rect=anchor.getBoundingClientRect();if(rect.width<2||rect.height<2){this.canvas.hidden=true;return;}
  const ratio=Math.max(1,Math.min(2,this.document.defaultView?.devicePixelRatio||1));
  const key=[rect.left,rect.top,rect.width,rect.height,ratio].join(':');
  if(key!==this.layoutKey){
   this.layoutKey=key;Object.assign(this.canvas.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
   this.renderer.setPixelRatio(ratio);this.renderer.setSize(rect.width,rect.height,false);this.logo.invalidateLayout();
  }
  this.canvas.hidden=false;this.renderer.setRenderTarget(null);this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,rect.width,rect.height);
  this.renderer.setClearColor(0,0);this.renderer.clear(true,true,false);
  if(this.logo.render(this.canvas,{spinAngle:this.spinController.angle})){
   if(!this.document.body.classList.contains('persistent-brand-ready'))this.document.body.classList.add('persistent-brand-ready');
   this.frames++;
  }
 }
 spin(){if(!this.ready||this.disposed||!this.spinController.request(this.reduced.matches))return false;this.wake();return true;}
 inspect(){return {ready:this.ready,error:this.error??null,frames:this.frames,spinning:this.spinController.active,angle:this.spinController.angle,raf:Boolean(this.raf),width:this.canvas.width,height:this.canvas.height};}
 async dispose(){
  if(this.disposed)return;this.disposed=true;this.ready=false;this.controller.abort();this.suspend();
  this.headerObserver.disconnect();this.pageObserver.disconnect();await this.readyPromise.catch(()=>{});
  this.fallback();if(this.logo)this.logo.dispose();else if(this.model)disposeBrandModel(this.model);
  this.environment?.dispose();this.renderer?.dispose();this.canvas.remove();
 }
}
