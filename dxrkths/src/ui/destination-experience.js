import {CubeSurface} from './cube-surface.js';

/** Delegated page interactions survive cached DOM navigation. One scheduler,
 * active only for an on-screen covered car or a decaying pointer energy pulse. */
export class DestinationExperience {
 constructor(root){
  this.root=root;this.document=root.ownerDocument;this.window=this.document.defaultView;
  this.controller=new AbortController();this.network=new CubeSurface();this.pointer=null;this.raf=0;this.time=0;this.visible=true;
  this.reduced=this.window.matchMedia('(prefers-reduced-motion: reduce)');
  const on=(el,event,handler,options={})=>el?.addEventListener(event,handler,{...options,signal:this.controller.signal});
  on(root,'pointermove',e=>this.point(e));
  on(root,'pointerout',e=>{const button=e.target.closest?.('[data-energy-button]');if(button&&!button.contains(e.relatedTarget)){this.pointer=null;this.network.release();this.wake();}});
  on(root,'focusin',e=>{if(e.target.closest?.('[data-energy-button]')){this.network.inject(.5,.5,.7);this.wake();}});
  on(root,'click',e=>this.click(e));
  on(root,'wheel',e=>this.wheel(e),{passive:false});
  on(root,'scroll',e=>{if(e.target.matches?.('[data-group-track]'))this.groupScroll(e.target);},{capture:true,passive:true});
  on(this.document,'visibilitychange',()=>this.document.hidden?this.sleep():this.sync());
  on(this.reduced,'change',()=>{this.sleep();this.network.clear();this.sync();});
  on(this.window,'resize',()=>{this.graphics?.resize();this.drawOnce();});
  if(typeof this.window.MutationObserver==='function'){
   this.observer=new this.window.MutationObserver(()=>this.sync());this.observer.observe(root,{childList:true});
   this.stateObserver=new this.window.MutationObserver(()=>this.sync());this.stateObserver.observe(this.document.body,{attributes:true,attributeFilter:['class']});
  }
  if(typeof this.window.IntersectionObserver==='function')this.intersection=new this.window.IntersectionObserver(entries=>{
   for(const entry of entries){
    if(entry.target.matches('[data-scroll-reveal]')){if(entry.isIntersecting){entry.target.classList.add('is-revealed');this.intersection.unobserve(entry.target);}}
    else{this.visible=entry.isIntersecting;this.visible?this.wake():this.sleep();}
   }
  },{threshold:.06});
  this.ready=this.prepare();
 }
 async preparePage(stage){
  await this.ready;if(!this.gpuReady||this.disposed)return;
  const surface=stage.querySelector('[data-destination-surface]');
  if(surface)await this.graphics.prepareSurface(surface,this.controller.signal);
 }
 async prepare(){
  try{
   const {DestinationGraphics}=await import('../render/showroom.bundle.js');
   if(this.disposed)return false;
   this.graphics=new DestinationGraphics(this.document);
   this.graphics.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.gpuReady=false;this.sleep();this.graphics.detach();},{signal:this.controller.signal});
   this.graphics.canvas.addEventListener('webglcontextrestored',()=>{
    this.preparation=this.graphics.prepare(this.controller.signal).then(()=>{if(!this.disposed){this.gpuReady=true;this.sync();}}).catch(()=>{});
   },{signal:this.controller.signal});
   this.preparation=this.graphics.prepare(this.controller.signal);await this.preparation;
   if(this.disposed)return false;
   this.gpuReady=true;this.sync();return true;
  }catch(error){
   if(!this.disposed){this.root.dataset.graphicsFallback='true';console.warn('[DXT] Page graphics use the lightweight fallback:',error.message);}
   this.graphics?.dispose();this.graphics=null;return false;
  }
 }
 sync(){
  if(this.disposed)return;
  const surface=this.root.querySelector('[data-destination-surface]');
  const canShow=!this.root.hidden&&Boolean(surface);
  if(!canShow){this.sleep();this.graphics?.detach();this.surface=null;this.pointer=null;return;}
  if(this.surface!==surface){
   this.intersection?.disconnect();this.surface=surface;this.pointer=null;this.network.clear();this.visible=true;
   this.intersection?.observe(surface);
   for(const section of this.root.querySelectorAll('[data-scroll-reveal]')){
    section.classList.toggle('reveal-enabled',!this.reduced.matches&&Boolean(this.intersection));this.intersection?.observe(section);
   }
  }
  // The cached, already rendered preview rides the wall. No second GPU
  // context draws while the showroom owns the portal animation.
  if(this.root.inert){this.sleep();return;}
  if(this.gpuReady){this.graphics.attach(surface,surface.dataset.destinationSurface);this.drawOnce();}
  // The baked first frame can travel on the portal wall. Its camera starts
  // moving only once the native page owns input and the showroom is asleep.
  if(this.root.inert||this.document.hidden||this.reduced.matches)this.sleep();else this.wake();
 }
 point(event){
  const button=event.target.closest?.('[data-energy-button]');if(!button||this.root.inert)return;
  const r=button.getBoundingClientRect();if(!r.width||!r.height)return;
  this.network.setAspect(r.width/r.height);
  const x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;
  if(this.reduced.matches)return;
  this.pointer={x,y:1-y};this.network.point(x,1-y,event.timeStamp);this.wake();
 }
 wheel(event){
  const track=event.target.closest?.('[data-group-track]');if(!track||event.ctrlKey||this.root.inert||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
  const slides=[...track.querySelectorAll('[data-group-slide]')],stride=slides[1]?slides[1].offsetLeft-slides[0].offsetLeft:track.clientWidth;
  const max=track.scrollWidth-track.clientWidth,delta=event.deltaY*(event.deltaMode===1?18:event.deltaMode===2?track.clientWidth:1);
  const now=this.window.performance.now();
  if(now<(this.groupWheelUntil||0)){event.preventDefault();return;}
  if(max<1||delta<0&&track.scrollLeft<=1||delta>0&&track.scrollLeft>=max-1)return;
  event.preventDefault();
  this.wheelAmount=(Math.sign(this.wheelAmount||delta)===Math.sign(delta)?this.wheelAmount||0:0)+delta;
  if(Math.abs(this.wheelAmount)<36)return;
  const next=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/stride)+Math.sign(this.wheelAmount)));
  this.wheelAmount=0;this.groupWheelUntil=now+450;
  track.scrollTo({left:next*stride,behavior:this.reduced.matches?'instant':'smooth'});
 }
 groupScroll(track){
  const slides=[...track.querySelectorAll('[data-group-slide]')];if(!slides.length)return;
  const stride=slides[1]?slides[1].offsetLeft-slides[0].offsetLeft:track.clientWidth;
  const progress=track.scrollLeft/Math.max(1,stride),index=Math.max(0,Math.min(slides.length-1,Math.round(progress)));
  slides.forEach((slide,i)=>slide.style.setProperty('--group-shift',String(Math.max(-1,Math.min(1,progress-i)))));
  track.classList.add('is-scrolling');clearTimeout(this.scrollTimer);this.scrollTimer=setTimeout(()=>track.classList.remove('is-scrolling'),150);
  const count=this.root.querySelector('[data-group-count]');if(count)count.textContent=`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
  this.root.querySelectorAll('[data-group-select]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
 }
 click(event){
  const selector=event.target.closest?.('[data-group-select]');
  if(selector){
   const track=this.root.querySelector('[data-group-track]'),slide=track?.querySelector(`[data-group-slide="${Number(selector.dataset.groupSelect)}"]`);
   if(slide)track.scrollTo({left:slide.offsetLeft-track.querySelector('[data-group-slide]').offsetLeft,behavior:this.reduced.matches?'instant':'smooth'});
  }
  if(event.target.closest?.('[data-scroll-catalogue]')){event.preventDefault();this.root.querySelector('#future-catalogue')?.scrollIntoView({behavior:this.reduced.matches?'instant':'smooth',block:'start'});}
 }
 drawOnce(){
  if(!this.gpuReady||!this.surface)return;
  this.graphics.uploadEnergy(this.network);this.graphics.draw(0,this.time,true);
 }
 wake(){
  if(this.raf||this.disposed||!this.gpuReady||!this.surface||this.root.inert||this.root.hidden||this.document.hidden||!this.visible||this.reduced.matches)return;
  if(this.surface.dataset.destinationSurface==='energy'&&!this.network.awake)return;
  this.last=this.window.performance.now();this.raf=this.window.requestAnimationFrame(now=>this.frame(now));
 }
 frame(now){
  this.raf=0;
  if(this.disposed||!this.surface||this.root.inert||this.root.hidden||this.document.hidden||!this.visible||this.reduced.matches)return;
  const step=(now-this.last)/1000;
  if(step<1/30){this.raf=this.window.requestAnimationFrame(t=>this.frame(t));return;}
  const dt=Math.min(.05,step);this.last=now;this.time+=dt;
  if(this.surface.dataset.destinationSurface==='energy'){
   this.network.step(dt);this.graphics.uploadEnergy(this.network);
  }
  this.graphics.draw(dt,this.time);
  if(this.surface.dataset.destinationSurface==='car'||this.network.awake)this.raf=this.window.requestAnimationFrame(t=>this.frame(t));
  else{this.network.clear();this.graphics.uploadEnergy(this.network);this.graphics.draw(0,0,true);}
 }
 sleep(){if(this.raf)this.window.cancelAnimationFrame(this.raf);this.raf=0;}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.sleep();clearTimeout(this.scrollTimer);this.controller.abort();
  this.observer?.disconnect();this.stateObserver?.disconnect();this.intersection?.disconnect();
  Promise.resolve(this.preparation).catch(()=>{}).then(()=>this.graphics?.dispose());
 }
}
