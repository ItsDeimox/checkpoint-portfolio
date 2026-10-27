import {DestinationExperience} from './destination-experience.js';
import {FutureProjectDialog} from './future-project-dialog.js';
import {BERSERK_MEDIA,galleryIndex} from '../pages/berserk-media.js';
/** Delegated to the stable destination host. No new renderer or per-route frame loop. */
export class SectionMedia {
 constructor(root,{settings={}}={}){
  this.experience=root.ownerDocument?.defaultView?.matchMedia?new DestinationExperience(root,{settings}):null;this.ready=this.experience?.ready??Promise.resolve(false);
  this.projects=root.ownerDocument?.defaultView?.HTMLDialogElement?new FutureProjectDialog(root,{onOpen:()=>this.experience?.sleep(),onClose:()=>this.experience?.sync()}):null;
  this.root=root;this.controller=new AbortController();this.sequence=0;this.current=null;
  const signal=this.controller.signal;
  root.addEventListener('click',event=>{const button=event.target.closest?.('[data-gallery-select],[data-gallery-step]');if(!button)return;const gallery=button.closest('[data-game-gallery]');if(!gallery)return;const index=Number(gallery.dataset.activeIndex||0);this.select(gallery,button.hasAttribute('data-gallery-select')?Number(button.dataset.gallerySelect):index+Number(button.dataset.galleryStep));},{signal});
  root.addEventListener('keydown',event=>{if(!event.target.closest?.('.game-gallery-thumbs'))return;const offset=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0;if(!offset&&event.key!=='Home'&&event.key!=='End')return;event.preventDefault();const gallery=event.target.closest('[data-game-gallery]'),index=event.key==='Home'?0:event.key==='End'?BERSERK_MEDIA.length-1:Number(gallery.dataset.activeIndex||0)+offset;this.select(gallery,index,true);},{signal});
 }
 async select(gallery,index,focus=false){
  index=galleryIndex(index);gallery.dataset.activeIndex=String(index);const image=gallery.querySelector('[data-gallery-main]'),item=BERSERK_MEDIA[index],token=++this.sequence;
  gallery.querySelectorAll('[data-gallery-select]').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===index)));
  if(focus)gallery.querySelector(`[data-gallery-select="${index}"]`)?.focus({preventScroll:true});
  const preload=new Image();preload.src=item.src;
  try{await preload.decode();}catch{if(token===this.sequence&&gallery.isConnected)gallery.querySelector('[data-gallery-count]').textContent='Image temporarily unavailable';return;}
  if(token!==this.sequence||!gallery.isConnected)return;
  this.animation?.cancel();image.src=item.src;image.alt=item.alt;
  gallery.querySelector('[data-gallery-original]').href=item.src;
  gallery.querySelector('[data-gallery-count]').textContent=`${String(index+1).padStart(2,'0')} / ${String(BERSERK_MEDIA.length).padStart(2,'0')}`;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.animation=image.animate([{opacity:.5,transform:'scale(1.008)'},{opacity:1,transform:'none'}],{duration:240,easing:'ease-out'});
 }
 dispose(){this.projects?.dispose();this.experience?.dispose();this.sequence++;this.animation?.cancel();this.controller.abort();}
}
