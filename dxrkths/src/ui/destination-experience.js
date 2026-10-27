import {CubeSurface} from './cube-surface.js';

/** Delegated page interactions survive cached DOM navigation. One scheduler,
 * active only for an on-screen covered car or a decaying pointer energy pulse. */
export class DestinationExperience {
 constructor(root,{settings={}}={}){
  this.settings=settings;
  this.root=root;this.document=root.ownerDocument;this.window=this.document.defaultView;
  this.controller=new AbortController();this.network=new CubeSurface();this.pointer=null;this.pendingPointer=null;this.raf=0;this.time=0;this.visible=true;
  this.reduced=this.window.matchMedia('(prefers-reduced-motion: reduce)');
  const on=(el,event,handler,options={})=>el?.addEventListener(event,handler,{...options,signal:this.controller.signal});
  on(root,'pointerdown',e=>this.groupPointerStart(e));
  on(root,'pointermove',e=>{this.point(e);this.groupPointerMove(e);});
  on(this.document,'pointerup',e=>this.groupPointerEnd(e));
  on(this.document,'pointercancel',e=>this.groupPointerEnd(e));
  on(root,'pointerout',e=>{const button=e.target.closest?.('[data-energy-button]');if(button&&!button.contains(e.relatedTarget)){this.pointer=null;this.pendingPointer=null;this.network.release();this.wake();}});
  on(root,'focusin',e=>{if(this.settings?.quality!=='low'&&e.target.closest?.('[data-energy-button]')){this.network.inject(.5,.5,.7);this.wake();}});
  on(root,'click',e=>this.click(e));
  on(root,'wheel',e=>this.wheel(e),{passive:false});
  on(root,'scroll',e=>{if(e.target.matches?.('[data-group-track]'))this.groupScroll(e.target);},{capture:true,passive:true});
  on(this.document,'visibilitychange',()=>{
   if(this.document.hidden){this.sleep();this.cancelGroupSettling();}
   else this.sync();
  });
  on(this.reduced,'change',()=>{this.sleep();this.pendingPointer=null;this.network.clear();this.sync();});
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
   this.graphics=new DestinationGraphics(this.document,{settings:this.settings});
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
  if(!canShow){this.sleep();this.cancelGroupSettling();this.graphics?.detach();this.surface=null;this.pointer=null;this.pendingPointer=null;return;}
  if(this.surface!==surface){
   this.intersection?.disconnect();this.surface=surface;this.pointer=null;this.pendingPointer=null;this.network.clear();this.visible=true;
   this.intersection?.observe(surface);
   for(const section of this.root.querySelectorAll('[data-scroll-reveal]')){
    section.classList.toggle('reveal-enabled',!this.reduced.matches&&Boolean(this.intersection));this.intersection?.observe(section);
   }
  }
  // The cached, already rendered preview rides the wall. No second GPU
  // context draws while the showroom owns the portal animation.
  if(this.root.inert){this.sleep();return;}
  if(this.settings?.quality==='low'){this.pendingPointer=null;this.network.clear();}
  if(this.gpuReady){this.graphics.attach(surface,surface.dataset.destinationSurface);this.drawOnce();}
  // The baked first frame can travel on the portal wall. Its camera starts
  // moving only once the native page owns input and the showroom is asleep.
  if(this.root.inert||this.document.hidden||this.reduced.matches||this.settings?.quality==='low')this.sleep();else this.wake();
 }
 point(event){
  const button=event.target.closest?.('[data-energy-button]');if(!button||this.root.inert||this.settings?.quality==='low')return;
  const r=button.getBoundingClientRect();if(!r.width||!r.height)return;
  this.network.setAspect(r.width/r.height);
  const x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;
  if(this.reduced.matches)return;
  this.pointer={x,y:1-y};
  // Coalesce high-frequency pointer events. The reference solver runs once
  // for the most recent position at the next painted frame, not per event.
  this.pendingPointer={x,y:1-y,time:event.timeStamp};this.wake();
 }
 wheel(event){
  // Ordinary vertical wheel/trackpad gestures must scroll the document, even
  // over this tall carousel and during a previous horizontal snap animation.
  // Native horizontal trackpad gestures, touch swipes and keyboard scroll stay
  // owned by the scrollable element. Shift+vertical wheel is an explicit
  // desktop shortcut for switching groups, never an implicit axis hijack.
  const track=event.target.closest?.('[data-group-track]');
  if(!track||this.root.inert||event.ctrlKey||!event.shiftKey||
    !event.deltaY||Math.abs(event.deltaX)>=Math.abs(event.deltaY)){
   this.wheelAmount=0;return;
  }
  const slides=[...track.querySelectorAll('[data-group-slide]')];
  if(slides.length<2||track.scrollWidth<=track.clientWidth)return;
  const stride=slides[1].offsetLeft-slides[0].offsetLeft||track.clientWidth;
  const direction=Math.sign(event.deltaY),at=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/stride)));
  const next=Math.max(0,Math.min(slides.length-1,at+direction));
  if(next===at){this.wheelAmount=0;return;}
  event.preventDefault();
  const now=this.window.performance.now();
  if(now<(this.groupWheelUntil||0))return;
  const delta=event.deltaY*(event.deltaMode===1?18:event.deltaMode===2?track.clientWidth:1);
  this.wheelAmount=(Math.sign(this.wheelAmount||delta)===Math.sign(delta)?(this.wheelAmount||0):0)+delta;
  if(Math.abs(this.wheelAmount)<36)return;
  this.wheelAmount=0;this.groupWheelUntil=now+450;
  const target=slides[next].offsetLeft-slides[0].offsetLeft;
  if(this.groupSettling?.track===track)this.settleGroup(track,target);
  else track.scrollTo({left:target,behavior:this.reduced.matches?'instant':'smooth'});
 }
 groupPointerStart(event){
  if(this.root.inert||event.pointerType!=='mouse'||event.button!==0)return;
  const track=event.target.closest?.('[data-group-track]');
  // Real links and controls keep their native click/drag semantics.
  if(!track||event.target.closest?.('a,button,input,textarea,select,[contenteditable]'))return;
  this.groupDrag={track,pointerId:event.pointerId,x:event.clientX,y:event.clientY,
   left:track.scrollLeft,lastLeft:track.scrollLeft,lastTime:this.window.performance.now(),
   velocity:0,dragging:false};
 }
 groupPointerMove(event){
  const d=this.groupDrag;
  if(!d||d.pointerId!==event.pointerId)return;
  const dx=event.clientX-d.x,dy=event.clientY-d.y;
  if(!d.dragging){
   // A predominantly vertical gesture never becomes a horizontal capture.
   if(Math.abs(dy)>9&&Math.abs(dy)>Math.abs(dx)){this.groupDrag=null;return;}
   if(Math.abs(dx)<9||Math.abs(dx)<=Math.abs(dy)*1.2)return;
   if(d.track.scrollWidth<=d.track.clientWidth){this.groupDrag=null;return;}
   d.dragging=true;d.track.classList.add('is-dragging');
   if(this.groupSettling?.track===d.track){
    // Take control of the actual current position rather than the position
    // at pointerdown, when a previous release animation was still moving.
    this.cancelGroupSettling();d.left=d.track.scrollLeft;d.x=event.clientX;
   }
   d.lastLeft=d.track.scrollLeft;d.lastTime=this.window.performance.now();
   d.track.setPointerCapture?.(event.pointerId);
  }
  if(event.cancelable)event.preventDefault();
  const max=d.track.scrollWidth-d.track.clientWidth;
  const left=Math.max(0,Math.min(max,d.left-(event.clientX-d.x)));
  d.track.scrollLeft=left;
  const now=this.window.performance.now(),dt=now-d.lastTime;
  if(dt>=4&&dt<100){
   // Pointer movement is an observation, never a permanent animation loop.
   // Ignore abnormally short/long samples and clamp release momentum.
   const speed=Math.max(-4,Math.min(4,(left-d.lastLeft)/dt));
   d.velocity=d.velocity*.3+speed*.7;
  }
  d.lastLeft=left;d.lastTime=now;
 }
 groupPointerEnd(event){
  const d=this.groupDrag;
  if(!d||d.pointerId!==event.pointerId)return;
  this.groupDrag=null;
  if(!d.dragging)return;
  // Keep native scroll snap OFF until the release animation reaches its
  // exact snap point. Re-enabling it here used to teleport the slide.
  d.track.classList.add('is-settling');
  d.track.classList.remove('is-dragging');
  if(d.track.hasPointerCapture?.(event.pointerId))d.track.releasePointerCapture(event.pointerId);
  const slides=[...d.track.querySelectorAll('[data-group-slide]')];
  if(slides.length<2){d.track.classList.remove('is-settling');return;}
  const stride=slides[1].offsetLeft-slides[0].offsetLeft||d.track.clientWidth;
  const now=this.window.performance.now();
  const momentum=event.type==='pointercancel'||now-d.lastTime>90?0:d.velocity;
  const projected=d.track.scrollLeft+Math.max(-stride*.32,Math.min(stride*.32,momentum*180));
  const index=Math.max(0,Math.min(slides.length-1,Math.round(projected/stride)));
  this.settleGroup(d.track,slides[index].offsetLeft-slides[0].offsetLeft);
 }
 /** One temporary compositor animation for mouse release only. Native touch
  * and horizontal trackpad motion remain browser-owned; no persistent loop. */
 settleGroup(track,target){
  if(this.groupSettling?.track===track)this.cancelGroupSettling();
  track.classList.add('is-settling');
  const max=Math.max(0,track.scrollWidth-track.clientWidth);
  const to=Math.max(0,Math.min(max,target)),from=track.scrollLeft;
  const distance=Math.abs(to-from);
  if(distance<.5||this.reduced.matches){
   track.scrollLeft=to;track.classList.remove('is-settling');return;
  }
  const start=this.window.performance.now(),duration=Math.min(620,Math.max(230,260+distance*.53));
  const state={track,raf:0};
  this.groupSettling=state;
  const step=now=>{
   if(this.groupSettling!==state)return;
   const t=Math.max(0,Math.min(1,(now-start)/duration));
   // Continue from the released position; decelerate without a CSS-snap jump.
   const ease=1-(1-t)*(1-t)*(1-t);
   track.scrollLeft=from+(to-from)*ease;
   if(t<1){state.raf=this.window.requestAnimationFrame(step);return;}
   track.scrollLeft=to;
   this.groupSettling=null;track.classList.remove('is-settling');
  };
  state.raf=this.window.requestAnimationFrame(step);
 }
 cancelGroupSettling(){
  const state=this.groupSettling;if(!state)return;
  this.groupSettling=null;
  this.window.cancelAnimationFrame(state.raf);
  state.track.classList.remove('is-settling');
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
   if(slide){
    const target=slide.offsetLeft-track.querySelector('[data-group-slide]').offsetLeft;
    if(this.groupSettling?.track===track)this.settleGroup(track,target);
    else track.scrollTo({left:target,behavior:this.reduced.matches?'instant':'smooth'});
   }
  }
  if(event.target.closest?.('[data-scroll-catalogue]')){event.preventDefault();this.root.querySelector('#future-catalogue')?.scrollIntoView({behavior:this.reduced.matches?'instant':'smooth',block:'start'});}
 }
 drawOnce(){
  if(!this.gpuReady||!this.surface)return;
  this.graphics.uploadEnergy(this.network);this.graphics.draw(0,this.time,true);
 }
 wake(){
  if(this.settings?.quality==='low'||this.raf||this.disposed||!this.gpuReady||!this.surface||this.root.inert||this.root.hidden||this.document.hidden||!this.visible||this.reduced.matches)return;
  if(this.surface.dataset.destinationSurface==='energy'&&!this.network.awake&&!this.pendingPointer)return;
  this.last=this.window.performance.now();this.raf=this.window.requestAnimationFrame(now=>this.frame(now));
 }
 frame(now){
  this.raf=0;
  if(this.settings?.quality==='low'||this.disposed||!this.surface||this.root.inert||this.root.hidden||this.document.hidden||!this.visible||this.reduced.matches)return;
  const step=(now-this.last)/1000;
  if(step<1/30){this.raf=this.window.requestAnimationFrame(t=>this.frame(t));return;}
  const dt=Math.min(.05,step);this.last=now;this.time+=dt;
  if(this.surface.dataset.destinationSurface==='energy'){
   if(this.pendingPointer){
    const p=this.pendingPointer;this.pendingPointer=null;this.network.point(p.x,p.y,p.time);
   }
   this.network.step(dt);this.graphics.uploadEnergy(this.network);
  }
  this.graphics.draw(dt,this.time);
  if(this.surface.dataset.destinationSurface==='car'||this.network.awake)this.raf=this.window.requestAnimationFrame(t=>this.frame(t));
  else{this.network.clear();this.graphics.uploadEnergy(this.network);this.graphics.draw(0,0,true);}
 }
 sleep(){if(this.raf)this.window.cancelAnimationFrame(this.raf);this.raf=0;}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.sleep();clearTimeout(this.scrollTimer);this.controller.abort();
  this.cancelGroupSettling();
  if(this.groupDrag){this.groupDrag.track.classList.remove('is-dragging');this.groupDrag=null;}
  this.observer?.disconnect();this.stateObserver?.disconnect();this.intersection?.disconnect();
  Promise.resolve(this.preparation).catch(()=>{}).then(()=>this.graphics?.dispose());
 }
}
