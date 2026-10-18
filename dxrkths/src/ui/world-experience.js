import {EnergyField} from './energy-field.js';
import {GroupDeck} from './group-deck.js';
import {VERTEX,ENERGY_FRAGMENT,FUTURE_FRAGMENT} from '../shaders/world-graphics.js';

const KEY=Symbol.for('DXT.SectionGraphics.R22');
const pause=view=>new Promise(resolve=>{
 let done=false,timer;
 const end=()=>{if(done)return;done=true;clearTimeout(timer);resolve();};
 timer=setTimeout(end,40);view?.requestAnimationFrame?.(()=>setTimeout(end,0));
});
function program(gl,fragment){
 const shaders=[];let linked=null;
 try{
  for(const [type,source] of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,fragment]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'Section shader compilation failed');
  }
  linked=gl.createProgram();shaders.forEach(shader=>gl.attachShader(linked,shader));gl.linkProgram(linked);
  if(!gl.getProgramParameter(linked,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(linked)||'Section program linking failed');
  return linked;
 }catch(error){if(linked)gl.deleteProgram(linked);throw error;}
 finally{shaders.forEach(shader=>gl.deleteShader(shader));}
}
/** One small, shared surface. It is prepared under the loader and moves between
 * the CTA and the covered-car scene; never one GPU context per page or card. */
export class SectionExperience {
 constructor(root){
  this.root=root;this.document=root.ownerDocument;this.view=this.document?.defaultView;
  this.controller=new AbortController();this.field=new EnergyField();this.disposed=false;
  this.time=0;this.last=0;this.raf=0;this.host=null;this.article=null;this.inView=true;
  this.reduced=this.view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const signal=this.controller.signal;
  const on=(node,event,callback,options={})=>node?.addEventListener?.(event,callback,{...options,signal});
  on(root,'pointermove',event=>{
   const button=event.target.closest?.('.berserk-play-button');
   if(!button||this.reduced?.matches||!this.ready)return;
   const rect=button.getBoundingClientRect();
   this.field.inject((event.clientX-rect.left)/Math.max(1,rect.width),1-(event.clientY-rect.top)/Math.max(1,rect.height));this.energy=1;this.wake();
  },{passive:true});
  on(root,'focusin',event=>{
   if(event.target.matches?.('.berserk-play-button')&&!this.reduced?.matches){this.field.inject(.5,.5,1);this.energy=1;this.wake();}
  });
  on(root,'click',event=>{
   const link=event.target.closest?.('[data-roadmap-scroll]');if(!link)return;
   if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
   const target=root.querySelector('#project-roadmap');if(!target)return;
   event.preventDefault();target.scrollIntoView({behavior:this.reduced?.matches?'auto':'smooth',block:'start'});
  });
  on(this.document,'visibilitychange',()=>this.document.hidden?this.sleep():this.refresh());
  on(this.view,'pagehide',()=>this.sleep());on(this.view,'pageshow',()=>this.refresh());
  on(this.reduced,'change',()=>{this.sleep();this.refresh();});
  if(typeof this.view?.MutationObserver==='function'){
   this.observer=new this.view.MutationObserver(()=>this.sync());
   this.observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','inert','data-portal-arrival']});
  }
 }
 prepare(){return this.preparation??=this.prepareGraphics();}
 async prepareGraphics(){
  if(this.disposed||typeof this.document?.createElement!=='function')return false;
  const canvas=this.canvas??this.document.createElement('canvas');
  if(typeof canvas.getContext!=='function')return false;
  this.canvas=canvas;canvas.className='world-graphics-canvas';canvas.setAttribute('aria-hidden','true');
  canvas.width=canvas.height=4;
  try{
   const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:'low-power'});
   if(!gl)return false;
   this.gl=gl;
   if(!this.contextEvents){this.contextEvents=true;
   canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;this.sleep();this.host?.removeAttribute('data-rendered');},{signal:this.controller.signal});
   canvas.addEventListener('webglcontextrestored',()=>{
    if(this.disposed)return;this.destroyPrograms();this.preparation=null;this.prepare().catch(()=>{});
   },{signal:this.controller.signal});}
   await pause(this.view);if(this.disposed)return false;
   this.energyProgram=program(gl,ENERGY_FRAGMENT);
   await pause(this.view);if(this.disposed)return false;
   this.futureProgram=program(gl,FUTURE_FRAGMENT);
   this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.field.columns,this.field.rows,0,gl.RGBA,gl.UNSIGNED_BYTE,this.field.pixels);
   this.uniforms={energy:{size:gl.getUniformLocation(this.energyProgram,'uSize'),texture:gl.getUniformLocation(this.energyProgram,'uEnergy')},future:{resolution:gl.getUniformLocation(this.futureProgram,'uResolution'),time:gl.getUniformLocation(this.futureProgram,'uTime'),motion:gl.getUniformLocation(this.futureProgram,'uMotion'),quality:gl.getUniformLocation(this.futureProgram,'uQuality')}};
   this.draw('energy',0);this.draw('future',0);
   const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
   if(fence){gl.flush();try{for(let i=0;i<120&&!this.disposed;i++){if(gl.clientWaitSync(fence,0,0)!==gl.TIMEOUT_EXPIRED)break;await pause(this.view);}}finally{gl.deleteSync(fence);}}
   if(this.disposed)return false;
   this.ready=true;this.host=null;this.sync();return true;
  }catch(error){this.ready=false;this.destroyPrograms();console.warn('[DXT] Optional section graphics unavailable:',error.message);return false;}
 }
 sync(){
  if(this.disposed)return;
  const article=this.root.querySelector('.section-layout');
  if(article!==this.article){
   this.deck?.dispose();this.reveals?.disconnect();this.article=article;
   const deck=this.root.querySelector('[data-group-deck]');this.deck=deck?new GroupDeck(deck,{reduced:()=>Boolean(this.reduced?.matches)}):null;
   this.setupReveals();
  }
  const host=this.root.querySelector('[data-world-graphic]');
  if(host!==this.host){
   this.sleep();this.resizeObserver?.disconnect();this.intersection?.disconnect();this.host?.removeAttribute('data-rendered');
   this.canvas?.remove();this.host=host;this.inView=true;
   if(host&&this.ready){
    host.appendChild(this.canvas);host.setAttribute('data-rendered','true');
    if(typeof this.view.ResizeObserver==='function'){
     this.resizeObserver=new this.view.ResizeObserver(()=>this.refresh());this.resizeObserver.observe(host);
    }
    if(typeof this.view.IntersectionObserver==='function'){
     this.intersection=new this.view.IntersectionObserver(entries=>{this.inView=entries[0]?.isIntersecting??false;this.inView?this.refresh():this.sleep();});this.intersection.observe(host);
    }
   }
  }else if(host&&this.ready&&this.canvas?.parentNode!==host){
   host.appendChild(this.canvas);host.setAttribute('data-rendered','true');
  }
  this.refresh();
 }
 setupReveals(){
  const rows=Array.from(this.root.querySelectorAll('[data-world-reveal]'));
  if(this.reduced?.matches||typeof this.view?.IntersectionObserver!=='function')return;
  this.reveals=new this.view.IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-revealed');this.reveals.unobserve(entry.target);}
  },{threshold:.12});
  for(const row of rows){row.classList.add('reveal-armed');this.reveals.observe(row);}
 }
 refresh(){
  if(!this.ready||!this.host||this.root.hidden||this.document.hidden||!this.inView||this.disposed){this.sleep();return;}
  const box=this.host.getBoundingClientRect();if(box.width<2||box.height<2){this.sleep();return;}
  const mode=this.host.dataset.worldGraphic;
  const ratio=mode==='future'?Math.min(1.25,this.view.devicePixelRatio||1):Math.min(1.5,this.view.devicePixelRatio||1);
  const nativeWidth=this.host.clientWidth||box.width,nativeHeight=this.host.clientHeight||box.height;
  const maximum=mode==='future'?850:560,scale=Math.min(ratio,maximum/nativeWidth);
  const width=Math.max(4,Math.round(nativeWidth*scale)),height=Math.max(4,Math.round(nativeHeight*scale));
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  this.draw(mode,0);
  if(mode==='future'&&!this.reduced?.matches&&!this.root.inert)this.wake();
 }
 draw(mode,dt){
  const gl=this.gl;if(!gl||!this.uniforms)return;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  if(mode==='future'){
   const u=this.uniforms.future;gl.useProgram(this.futureProgram);
   gl.uniform2f(u.resolution,this.canvas.width,this.canvas.height);gl.uniform1f(u.time,this.time);
   gl.uniform1f(u.motion,this.reduced?.matches?0:1);gl.uniform1f(u.quality,this.canvas.width<600?0:1);
  }else{
   this.energy=this.field.step(dt);const u=this.uniforms.energy;gl.useProgram(this.energyProgram);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
   gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,this.field.columns,this.field.rows,gl.RGBA,gl.UNSIGNED_BYTE,this.field.pixels);
   gl.uniform2f(u.size,this.field.columns,this.field.rows);gl.uniform1i(u.texture,0);
  }
  gl.drawArrays(gl.TRIANGLES,0,3);
 }
 wake(){
  if(this.raf||!this.ready||!this.host||this.root.hidden||this.root.inert||this.document.hidden||!this.inView||this.disposed)return;
  this.last=this.view.performance.now();this.raf=this.view.requestAnimationFrame(now=>this.frame(now));
 }
 frame(now){
  this.raf=0;
  if(this.disposed||!this.ready||!this.host||this.root.hidden||this.root.inert||this.document.hidden||!this.inView)return;
  const elapsed=now-this.last,mode=this.host.dataset.worldGraphic;
  if(elapsed>=1000/30-1){const dt=Math.min(.05,elapsed/1000);this.last=now;this.time+=dt;this.draw(mode,dt);}
  if(!this.reduced?.matches&&(mode==='future'||this.energy>.004))this.raf=this.view.requestAnimationFrame(time=>this.frame(time));
 }
 sleep(){if(this.raf)this.view?.cancelAnimationFrame?.(this.raf);this.raf=0;}
 destroyPrograms(){
  const gl=this.gl;if(!gl)return;
  if(this.energyProgram)gl.deleteProgram(this.energyProgram);if(this.futureProgram)gl.deleteProgram(this.futureProgram);if(this.texture)gl.deleteTexture(this.texture);
  this.energyProgram=this.futureProgram=this.texture=null;
 }
 dispose(){
  this.disposed=true;this.sleep();this.controller.abort();this.observer?.disconnect();this.resizeObserver?.disconnect();this.intersection?.disconnect();this.reveals?.disconnect();this.deck?.dispose();
  this.host?.removeAttribute('data-rendered');this.canvas?.remove();this.preparation?.finally(()=>this.destroyPrograms());
 }
}
export function getSectionExperience(root){
 if(!root?.ownerDocument?.defaultView||typeof root.ownerDocument.createElement!=='function')return null;
 return root[KEY]??=new SectionExperience(root);
}
export async function prepareSectionGraphics(document){
 const root=document?.querySelector?.('#room-section-page');
 return getSectionExperience(root)?.prepare()??false;
}
