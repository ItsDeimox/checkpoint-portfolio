import {arrivalVisual,arrivalTransform,arrivalClip,destinationGutter} from './portal-arrival.js';
import {renderSectionPage} from '../pages/section-pages.js';

/** One physical page surface for both directions; history owns cancellation. */
export class SectionRoutes {
 constructor({document,host,root,canvas,footer,getScene,getPhase,entered,setLocation,onSelect,onNeedScene,onRefresh}){
  Object.assign(this,{document,host,root,canvas,footer,getScene,getPhase,entered,setLocation,onSelect,onNeedScene,onRefresh});
  this.onArrivalResize=()=>this.fitArrivalViewport();
  document.defaultView?.addEventListener?.('resize',this.onArrivalResize,{passive:true});
  this.index=null;this.token=0;this.page=false;this.travelling=false;this.pending=false;this.returning=false;this.waitingReturn=false;
 }
 clearArrival(retain=false){
  this.arrival=null;
  this.document.body.classList.remove('section-arriving','section-retreating');
  this.root.inert=false;this.root.removeAttribute('aria-hidden');
  if(retain)this.root.setAttribute('data-portal-arrival','arrived');else this.root.removeAttribute('data-portal-arrival');
  for(const name of ['--arrival-opacity','--arrival-transform','--arrival-gutter','transform','opacity','clip-path'])this.root.style.removeProperty?.(name);
 }
 prepareArrival(index,token,reuse=false,scroll=0){
  this.arrival={index,token,reverse:reuse,opacity:reuse?1:0};
  if(!reuse)this.root.innerHTML=renderSectionPage(index);
  this.root.setAttribute('data-portal-arrival',reuse?'retreat':'preview');this.root.setAttribute('aria-hidden','true');
  this.root.style.setProperty('--arrival-gutter','0px');this.root.style.opacity=reuse?'1':'0';
  this.root.style.transform='none';this.root.style.clipPath='none';this.root.inert=true;this.root.hidden=false;
  this.document.body.classList.add('section-arriving');
  if(reuse)this.document.body.classList.add('section-retreating');
  this.fitArrivalViewport();this.root.scrollTop=scroll;
 }
 fitArrivalViewport(){
  if(!this.arrival)return;
  const win=this.document.defaultView,width=win?.innerWidth||this.canvas.clientWidth||this.root.clientWidth||900,height=win?.innerHeight||this.canvas.clientHeight||this.root.clientHeight||600;
  this.root.style.setProperty('--arrival-gutter','0px');
  const gutter=this.root.scrollHeight>this.root.clientHeight+1?destinationGutter(this.document):0;
  this.root.style.setProperty('--arrival-gutter',`${gutter}px`);
  // Measured once, not after each transform write. No forced style/layout reads
  // in the camera callback; the compositor owns motion after this point.
  this.arrival.viewport={width,height,contentWidth:width-gutter};
 }
 arrivalViewport(){return this.arrival?.viewport;}
 revealArrival(index,token,progress,frame){
  if(token!==this.token||!this.arrival||this.arrival.index!==index)return;
  const v=this.arrival.viewport;
  const transform=arrivalTransform(frame,v?.contentWidth,v?.height);
  if(!transform){this.root.style.opacity='0';return;}
  this.root.style.transform=transform;
  this.root.style.clipPath=arrivalClip(frame);
  const opacity=arrivalVisual(progress).opacity;
  if(opacity!==this.arrival.opacity||this.root.style.opacity==='0'){
   this.arrival.opacity=opacity;this.root.style.opacity=String(opacity);
   this.root.style.setProperty('--arrival-opacity',String(opacity));
  }
 }
 clearReturn(){
  this.returning=this.waitingReturn=false;this.root.inert=false;this.root.removeAttribute('aria-busy');
  this.document.body.classList.remove('section-returning','section-return-pending');
 }
 open(index,trigger,historyMode='push',direct=false){
  index=Number(index);if(!Number.isInteger(index)||index<0||index>=5)return;
  if(this.travelling&&this.index===index)return;
  const fromPage=this.page,token=++this.token;this.clearArrival();this.clearReturn();this.index=index;this.onSelect(index);this.setLocation(index,historyMode);
  const scene=this.getScene();scene?.cancelPortal?.();
  if(direct||fromPage||this.getPhase()==='unavailable'||scene?.reduced?.matches){this.show(index,token);return;}
  if(!scene?.ready||!this.entered()){this.pending=true;return;}
  this.pending=false;this.page=false;this.travelling=true;this.root.hidden=true;this.host.hidden=false;
  this.document.body.classList.add('portal-travelling');this.document.body.classList.remove('section-active');
  this.canvas.inert=true;this.footer.inert=true;
  this.prepareArrival(index,token);
  const started=scene.enterPortal(index,()=>this.show(index,token),(p,frame)=>this.revealArrival(index,token,p,frame),()=>this.arrivalViewport());
  if(!started)this.show(index,token);
 }
 ready(){
  if(this.waitingReturn){this.startReturn(this.token);return;}
  if(this.page){this.getScene()?.parkSection();return;}
  if(this.pending&&this.entered())this.open(this.index,null,'none');
 }
 show(index,token){
  if(token!==this.token||this.index!==index)return;
  const prepared=this.arrival?.index===index&&this.arrival?.token===token;
  this.clearArrival(prepared);this.clearReturn();this.page=true;this.pending=false;this.travelling=false;
  this.getScene()?.parkSection();if(!prepared)this.root.innerHTML=renderSectionPage(index);this.root.hidden=false;
  this.host.hidden=true;this.footer.hidden=true;this.canvas.inert=true;
  this.document.body.classList.remove('portal-travelling');this.document.body.classList.add('section-active');
  this.root.scrollTop=0;this.document.defaultView?.scrollTo?.(0,0);
  this.onRefresh?.();this.root.querySelector('#section-title')?.focus({preventScroll:true});
 }
 close(historyMode='push',immediate=false){
  if(this.returning&&!immediate)return;
  const fromPage=this.page,index=this.index,scroll=this.document.defaultView?.scrollY??Math.max(0,-(this.root.getBoundingClientRect?.().top??0));
  this.clearArrival(this.page);
  const token=++this.token,scene=this.getScene();
  this.index=null;this.onSelect(null);this.setLocation(null,historyMode);this.pending=false;
  if(!immediate&&fromPage&&this.entered()&&!scene?.reduced?.matches&&this.getPhase()!=='unavailable'){
   this.returnIndex=index;this.returning=true;this.page=false;this.travelling=true;this.canvas.inert=true;this.footer.inert=true;
   this.root.inert=true;this.host.hidden=false;this.footer.hidden=true;
   // Reuse the current viewport, including its scroll position. It starts full
   // size, then retreats behind the same physical tunnel mouth as entry.
   this.prepareArrival(index,token,true,scroll);
   this.document.body.classList.remove('section-active');this.document.body.classList.add('portal-travelling','section-return-pending');
   this.document.defaultView?.scrollTo?.(0,0);
   if(scene?.ready)this.startReturn(token);else{this.waitingReturn=true;this.root.setAttribute('aria-busy','true');this.onNeedScene?.();}
   return;
  }
  this.finishReturn(token);
 }
 startReturn(token){
  if(token!==this.token||!this.returning)return;
  this.waitingReturn=false;this.root.removeAttribute('aria-busy');
  this.document.body.classList.remove('section-return-pending');this.document.body.classList.add('section-returning');
  try{
   if(this.getScene()?.returnPortal?.(this.returnIndex,()=>this.finishReturn(token),(p,frame)=>this.revealArrival(this.returnIndex,token,p,frame),()=>this.arrivalViewport()))return;
  }catch(error){console.warn('[DXT] Return journey unavailable:',error);}
  this.finishReturn(token);
 }
 finishReturn(token){
  if(token!==this.token)return;
  this.clearArrival(this.root.getAttribute('data-portal-arrival')==='arrived');this.clearReturn();this.page=this.pending=this.travelling=false;
  this.root.hidden=true;this.root.innerHTML='';this.host.hidden=false;this.footer.hidden=false;
  this.canvas.inert=false;this.footer.inert=false;
  this.document.body.classList.remove('portal-travelling','section-active');
  const scene=this.getScene();if(scene?.ready&&!scene.lost)scene.resumeShowroom();else this.onNeedScene?.();
  this.onRefresh?.();this.canvas.focus({preventScroll:true});
 }
 unavailable(){if(this.returning)this.finishReturn(this.token);else if(this.index!==null)this.show(this.index,this.token);}
 dispose(){this.document.defaultView?.removeEventListener?.('resize',this.onArrivalResize);++this.token;this.clearArrival();this.clearReturn();this.getScene()?.cancelPortal?.();}
}
