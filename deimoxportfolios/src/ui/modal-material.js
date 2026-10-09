import {VertexEnergyField,SurfaceImpulseTracker} from '../core/vertex-energy.js';
import {Program,shaderSource,target,bindTexture} from '../rendering/gl.js';

// DOM geometry is measured in CSS pixels; simulation and raster scale are independent.
export function modalLocalPoint(x,y,rect){return [(x-rect.left)/Math.max(1,rect.width),1-(y-rect.top)/Math.max(1,rect.height)];}
export function modalTextureSize(width,height,dpr=1){const s=Math.min(Math.max(1,dpr),1.5,1260/width,1000/height);return [Math.max(2,Math.round(width*s)),Math.max(2,Math.round(height*s))];}
export class ModalEnergy {
 constructor(width,height){
  const unit=110;
  this.field=new VertexEnergyField({width:width/unit,height:height/unit,columns:Math.max(8,Math.round(width/18)),rows:Math.max(8,Math.round(height/18)),seed:73,waveSpeed:3.2,damping:8.5,glowDecay:5.4,impulseRadius:2.5,impulseStrength:4.8});
  this.tracker=new SurfaceImpulseTracker(width/unit,height/unit);
 }
 stroke(uv,time,screen){const s=this.tracker.sample(0,uv,time,screen);if(s)this.field.addStroke(s);}
 step(dt){return this.field.step(dt);}
 leave(){this.tracker.reset();}
 reset(){this.field.reset();this.leave();}
}

/** One optional GPU surface behind native modal text. It never participates in layout. */
export class ModalMaterial {
 constructor(dialog){
  this.dialog=dialog;this.content=dialog.querySelector('#sheet-content');this.abort=new AbortController();
  this.scroll=document.createElement('div');this.scroll.className='sheet-scroll';this.content.before(this.scroll);this.scroll.append(this.content);
  this.canvas=document.createElement('canvas');this.canvas.className='sheet-material-canvas';this.canvas.setAttribute('aria-hidden','true');this.canvas.hidden=true;dialog.prepend(this.canvas);
  dialog.classList.add('sheet-material');this.pointer=[.5,.5];this.goal=0;this.hover=0;this.frames=0;this.phase='closed';this.raf=0;this.levels=new WeakMap();this.controls=[];this.resources=[];
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:this.abort.signal,passive:true});
  listen(dialog,'pointermove',event=>{
   if(this.phase==='closing')return;
   const rect=this.canvas.getBoundingClientRect();this.pointer=modalLocalPoint(event.clientX,event.clientY,rect);this.goal=event.pointerType==='touch'?.4:1;
   if(!this.reduced.matches)this.energy?.stroke(this.pointer,event.timeStamp,[event.clientX,event.clientY]);this.wake();
  });
  listen(dialog,'pointerleave',()=>{this.goal=0;this.energy?.leave();this.wake();});
  listen(dialog,'focusin',event=>{this.focusTarget=event.target;this.wake();});
  listen(dialog,'focusout',()=>{this.focusTarget=null;this.wake();});
  listen(this.scroll,'scroll',()=>{this.energy?.leave();this.wake();});
  listen(dialog,'close',()=>this.closed());
  listen(document,'visibilitychange',()=>{if(document.hidden)this.sleep();else this.wake();});
  listen(this.reduced,'change',()=>{this.energy?.reset();this.wake();});
  listen(window,'pageshow',()=>this.wake());
  listen(window,'pagehide',event=>{this.sleep();if(!event.persisted)this.dispose();});
  this.resizeObserver=new ResizeObserver(()=>{this.dirtySize=true;this.wake();});this.resizeObserver.observe(dialog);this.resizeObserver.observe(this.content);
  this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;this.canvas.hidden=true;delete dialog.dataset.material;this.sleep();},{signal:this.abort.signal});
  this.canvas.addEventListener('webglcontextrestored',()=>{this.pending=null;this.resources=[];this.initialize().then(()=>this.wake());},{signal:this.abort.signal});
 }
 async initialize(){
  if(this.pending)return this.pending;
  this.pending=(async()=>{
   try{
    const gl=this.gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,powerPreference:'low-power'});
    if(!gl)throw Error('WebGL2 unavailable');
    const [v,material,blur,output]=await Promise.all(['fullscreen.vert','modal-material.frag','bloom.frag','modal-output.frag'].map(shaderSource));
    this.material=new Program(gl,v,material);this.blur=new Program(gl,v,blur);this.output=new Program(gl,v,output);
    this.hdr=!!gl.getExtension('EXT_color_buffer_float');
    this.map=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.map);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.ready=true;this.dirtySize=true;this.wake();
   }catch(error){this.ready=false;this.canvas.hidden=true;delete this.dialog.dataset.material;this.release();console.warn('[Deimox] Modal: CSS fallback.',error.message);}
  })();return this.pending;
 }
 opened(){
  clearTimeout(this.closeTimer);this.animation?.cancel();this.phase='open';delete this.dialog.dataset.closing;
  this.scroll.scrollTop=0;this.pointer=[.5,.5];this.goal=0;this.hover=0;this.energy?.reset();this.levels=new WeakMap();
  this.controls=[...this.dialog.querySelectorAll('.button,.contact-option,.project-detail>img,.project-list button,.close-sheet,summary')];
  if(!this.reduced.matches){this.animation=this.dialog.animate([{opacity:0,transform:'translateY(8px) scale(.992)'},{opacity:1,transform:'none'}],{duration:200,easing:'cubic-bezier(.2,.7,.2,1)'});}
  this.dirtySize=true;this.initialize();this.wake();
 }
 close(){
  if(!this.dialog.open||this.phase==='closing')return;
  if(this.reduced.matches){this.dialog.close();return;}
  this.phase='closing';this.dialog.dataset.closing='true';this.goal=0;this.animation?.cancel();
  this.animation=this.dialog.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(5px) scale(.997)'}],{duration:130,easing:'ease-in',fill:'forwards'});
  this.closeTimer=setTimeout(()=>{if(this.phase==='closing')this.dialog.close();},140);
 }
 closed(){this.phase='closed';clearTimeout(this.closeTimer);this.animation?.cancel();delete this.dialog.dataset.closing;this.sleep();this.energy?.reset();this.goal=0;this.hover=0;}
 wake(){if(this.raf||!this.dialog.open||!this.ready||document.hidden)return;this.last=performance.now();this.raf=requestAnimationFrame(now=>this.frame(now));}
 sleep(){cancelAnimationFrame(this.raf);this.raf=0;}
 resize(){
  const w=this.dialog.clientWidth,h=this.dialog.clientHeight;if(w<2||h<2)return;
  const [width,height]=modalTextureSize(w,h,devicePixelRatio||1);
  if(width===this.canvas.width&&height===this.canvas.height&&this.energy){this.dirtySize=false;return;}
  this.canvas.width=width;this.canvas.height=height;this.cssSize=[w,h];this.energy=new ModalEnergy(w,h);
  this.resources.forEach(x=>x.dispose());this.resources=[];
  const allocate=()=>{const add=(a,b)=>{const rt=target(this.gl,a,b,this.hdr);this.resources.push(rt);return rt;};this.scene=add(width,height);this.nearA=add(Math.ceil(width/2),Math.ceil(height/2));this.nearB=add(this.nearA.width,this.nearA.height);this.wideA=add(Math.ceil(width/4),Math.ceil(height/4));this.wideB=add(this.wideA.width,this.wideA.height);};
  try{allocate();}catch(e){this.resources.forEach(x=>x.dispose());this.resources=[];this.hdr=false;allocate();}
  const gl=this.gl,f=this.energy.field;bindTexture(gl,this.map,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,f.textureWidth,f.textureHeight,0,gl.RGBA,gl.FLOAT,f.data);
  this.uploaded=f.version;this.dirtySize=false;
 }
 bind(rt){this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,rt?.framebuffer??null);this.gl.viewport(0,0,rt?.width??this.canvas.width,rt?.height??this.canvas.height);}
 draw(){this.gl.drawArrays(this.gl.TRIANGLES,0,3);}
 blurInto(from,to,direction,extract){this.bind(to);bindTexture(this.gl,from.texture,0);this.blur.use().setAll({uSource:0,uDirection:direction,uTexel:[1/from.width,1/from.height],uExtract:extract,uThreshold:.95});this.draw();}
 frame(now){
  this.raf=0;if(!this.ready||!this.dialog.open||document.hidden)return;
  try{
   const dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;if(this.dirtySize)this.resize();if(!this.energy)return;
   this.hover+=(this.goal-this.hover)*(1-Math.exp(-10*dt));
   if(!this.reduced.matches)this.energy.step(dt);
   const gl=this.gl,f=this.energy.field;gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.bindVertexArray(null);
   bindTexture(gl,this.map,0);if(f.version!==this.uploaded){gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,f.textureWidth,f.textureHeight,gl.RGBA,gl.FLOAT,f.data);this.uploaded=f.version;}
   this.canvas.hidden=false;const css=this.canvas.getBoundingClientRect();this.bind(this.scene);
   this.material.use().setAll({uEnergy:0,uGrid:[f.columns,f.rows],uResolution:[this.canvas.width,this.canvas.height],uCssSize:this.cssSize,uPointer:this.pointer,uHover:this.hover,uRect:[0,0,...this.cssSize],uKind:0,uLevel:0,uReduced:+this.reduced.matches});this.draw();
   let moving=Math.abs(this.goal-this.hover)>.005;
   for(const el of this.controls){if(!el.isConnected)continue;const b=el.getBoundingClientRect();if(b.bottom<css.top||b.top>css.bottom||b.width<2)continue;
    const focus=el===this.focusTarget&&el.matches(':focus-visible')&&!el.classList.contains('close-sheet');
    const goal=el.matches(':hover')||focus?1:0,prior=this.levels.get(el)??0,level=prior+(goal-prior)*(1-Math.exp(-12*dt));this.levels.set(el,level);moving ||= Math.abs(level-goal)>.005;
    const sx=this.cssSize[0]/css.width,sy=this.cssSize[1]/css.height;
    this.material.setAll({uRect:[(b.left-css.left)*sx,(css.bottom-b.bottom)*sy,b.width*sx,b.height*sy],uKind:el.classList.contains('close-sheet')?4:el.tagName==='IMG'?3:el.classList.contains('button-primary')?1:2,uLevel:level});this.draw();
   }
   this.blurInto(this.scene,this.nearA,[1,0],1);this.blurInto(this.nearA,this.nearB,[0,1],0);this.blurInto(this.nearB,this.wideA,[2,0],0);this.blurInto(this.wideA,this.wideB,[0,2],0);
   this.bind(null);bindTexture(gl,this.scene.texture,0);bindTexture(gl,this.nearB.texture,1);bindTexture(gl,this.wideB.texture,2);
   this.output.use().setAll({uScene:0,uNear:1,uWide:2});this.draw();this.frames++;
   this.canvas.hidden=false;this.dialog.dataset.material='webgl2';
   if((this.energy.field.awake&&!this.reduced.matches)||moving||this.animation?.playState==='running')this.raf=requestAnimationFrame(t=>this.frame(t));
  }catch(error){console.warn('[Deimox] Modal: restored CSS material.',error.message);this.ready=false;delete this.dialog.dataset.material;this.canvas.hidden=true;this.sleep();}
 }
 inspect(){return {ready:!!this.ready,hdr:!!this.hdr,frames:this.frames,scheduled:!!this.raf,phase:this.phase,dimensions:[this.canvas.width,this.canvas.height],energy:this.energy?.field.inspect()??null};}
 release(){this.resources.forEach(r=>r.dispose());this.resources=[];this.material?.dispose();this.blur?.dispose();this.output?.dispose();if(this.map)this.gl?.deleteTexture(this.map);this.map=null;}
 dispose(){this.sleep();clearTimeout(this.closeTimer);this.animation?.cancel();this.abort.abort();this.resizeObserver.disconnect();this.release();this.ready=false;}
}
