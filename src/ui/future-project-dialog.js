import {getFutureProject, projectMedia} from '../pages/future-project-details.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const closeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
const arrowIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const mediaIcon = '<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="8" y="8" width="50" height="38" rx="5"/><path d="m13 37 12-12 10 10 7-6 11 11"/><rect x="24" y="22" width="48" height="34" rx="5"/><path d="m44 32 13 8-13 8Z"/></svg>';

export function projectDialogContent(project) {
 const media = projectMedia(project.media);
 const paragraphs = Array.isArray(project.description) ? project.description.filter(p => typeof p === 'string' && p.trim()) : [];
 return `<div class="fp-window">
  <header class="fp-topline"><span>DXT / PROJECT FILE</span><button type="button" class="fp-close" data-project-close aria-label="Close project details" autofocus>${closeIcon}</button></header>
  <div class="fp-layout">
   <section class="fp-media" aria-label="Project photos and videos">
    <div class="fp-stage" data-project-stage><div class="fp-empty">${mediaIcon}<span class="fp-eyebrow">BEHIND THE SCENES</span><strong>Preview coming soon</strong><p>Photos and videos will appear here when shared.</p></div></div>
    <div class="fp-media-tools" ${media.length ? '' : 'hidden'}><span data-project-count aria-live="polite" aria-atomic="true"></span><div><button type="button" data-project-step="-1" aria-label="Previous project media">${arrowIcon}</button><button type="button" data-project-step="1" aria-label="Next project media">${arrowIcon}</button></div></div>
    <div class="fp-media-choices" role="group" aria-label="Choose project media" ${media.length ? '' : 'hidden'}>${media.map((item,i)=>`<button type="button" data-project-media="${i}" aria-label="Show ${item.type} ${i+1}" aria-pressed="${i===0}"><span>${String(i+1).padStart(2,'0')}</span>${item.type==='video'?'VIDEO':'PHOTO'}</button>`).join('')}</div>
    <p class="fp-caption" data-project-caption></p>
   </section>
   <section class="fp-details"><p class="fp-eyebrow">${escape(project.category)} / FUTURE PROJECT</p><h2 id="future-project-title">${escape(project.name)}</h2><span class="fp-platform">${escape(project.platform)}</span>
    <div class="fp-description">${paragraphs.length ? paragraphs.map(p=>`<p>${escape(p)}</p>`).join('') : '<p>More details about this project will be shared here.</p>'}</div>
    <dl class="fp-facts"><div><dt>Category</dt><dd>${escape(project.category)}</dd></div><div><dt>Platform</dt><dd>${escape(project.platform)}</dd></div></dl>
   </section>
  </div><footer class="fp-footer"><span>FUTURE PROJECTS / DXT</span><span>ESC TO CLOSE</span></footer>
 </div>`;
}

/** A single lazy native dialog. It owns no WebGL renderer or animation loop.
 * Existing card DOM, cached routes, the scroll controller and showroom stay intact. */
export class FutureProjectDialog {
 constructor(root, {getProject = getFutureProject, onOpen, onClose} = {}) {
  this.root = root; this.document = root.ownerDocument; this.window = this.document.defaultView;
  this.getProject = getProject; this.onOpen = onOpen; this.onClose = onClose;
  this.controller = new AbortController(); this.active = null; this.disposed = false;
  const signal = this.controller.signal;
  root.addEventListener('click', event => {
   const button = event.target.closest?.('[data-project-open]');
   if (!button || root.inert || root.hidden) return;
   event.preventDefault(); this.open(button.dataset.projectOpen, button);
  }, {signal});
  // Escape belongs to this modal, never to the showroom route beneath it.
  this.document.addEventListener('keydown', event => {
   if (event.key !== 'Escape' || (!this.dialog?.open && !this.escapeHeld)) return;
   this.escapeHeld = true; event.preventDefault(); event.stopImmediatePropagation(); this.close();
  }, {capture: true, signal});
  this.document.addEventListener('keyup', event => {if(event.key==='Escape') this.escapeHeld=false;}, {capture:true,signal});
  this.window.addEventListener('popstate', () => this.close({immediate:true,restoreFocus:false}), {signal});
  this.window.addEventListener('blur', () => {this.escapeHeld=false;}, {signal});
  this.observer = new this.window.MutationObserver(() => {
   if (this.active && (root.hidden || !root.contains(this.opener))) this.close({immediate:true,restoreFocus:false});
   this.enhance();
  });
  this.observer.observe(root, {childList:true,attributes:true,attributeFilter:['hidden']});
  this.enhance();
 }

 enhance() {
  if (this.disposed) return;
  this.root.querySelectorAll('.future-category').forEach((category,i) => {
   category.querySelectorAll('.future-project').forEach((card,j) => {
    const id = `${i}-${j}`, project = this.getProject(id);
    if (!project || card.querySelector('[data-project-open]')) return;
    const button = this.document.createElement('button');
    button.type = 'button'; button.className = 'future-project-trigger'; button.dataset.projectOpen = id;
    button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'future-project-dialog');
    button.setAttribute('aria-label', `View ${project.name} details`);
    button.innerHTML = '<span aria-hidden="true">↗</span>';
    card.append(button);
   });
  });
 }

 createDialog() {
  if (this.dialog) return this.dialog;
  const dialog = this.document.createElement('dialog');
  dialog.id = 'future-project-dialog'; dialog.className = 'future-project-dialog';
  dialog.setAttribute('aria-labelledby','future-project-title');
  const signal = this.controller.signal;
  dialog.addEventListener('cancel', event => {event.preventDefault(); this.close();}, {signal});
  dialog.addEventListener('close', () => {if(!dialog.open && this.active) this.finishClose(true);}, {signal});
  dialog.addEventListener('pointerdown', event => {
   this.backdropDown = event.target === dialog && this.outside(event);
  }, {signal});
  dialog.addEventListener('click', event => {
   event.stopPropagation();
   if(event.target.closest?.('[data-project-close]') || (this.backdropDown && event.target===dialog && this.outside(event))) this.close();
   else {
    const choice=event.target.closest?.('[data-project-media]'), step=event.target.closest?.('[data-project-step]');
    if(choice) this.select(Number(choice.dataset.projectMedia));
    else if(step) this.select(this.mediaIndex+Number(step.dataset.projectStep));
   }
   this.backdropDown=false;
  }, {signal});
  dialog.addEventListener('keydown', event => {
   if(!event.target.closest?.('.fp-media-choices') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
   event.preventDefault();
   const index=event.key==='Home'?0:event.key==='End'?this.active.media.length-1:this.mediaIndex+(event.key==='ArrowRight'?1:-1);
   this.select(index); dialog.querySelector(`[data-project-media="${this.mediaIndex}"]`)?.focus({preventScroll:true});
  }, {signal});
  this.document.body.append(dialog); this.dialog=dialog; return dialog;
 }

 outside(event) {
  const box=this.dialog.getBoundingClientRect();
  return event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom;
 }

 open(id, opener) {
  if(this.disposed) return false;
  const project=this.getProject(id);
  if(!project) return false;
  if(this.active) this.finishClose(false);
  if(this.root.hidden || this.root.inert) return false;
  const dialog=this.createDialog();
  if(typeof dialog.showModal!=='function') return false;
  this.active={...project,media:projectMedia(project.media)}; this.opener=opener; this.mediaIndex=0;
  const body=this.document.body, html=this.document.documentElement;
  this.saved={inert:this.root.inert,x:this.window.scrollX,y:this.window.scrollY,styles:[]};
  const set=(element,name,value)=>{
   this.saved.styles.push([element,name,element.style.getPropertyValue(name),element.style.getPropertyPriority(name)]);
   element.style.setProperty(name,value);
  };
  const gutter=Math.max(0,this.window.innerWidth-html.clientWidth);
  if(gutter) set(body,'padding-right',`${parseFloat(this.window.getComputedStyle(body).paddingRight||'0')+gutter}px`);
  set(html,'overflow','hidden'); set(body,'overflow','hidden');
  this.root.inert=true; body.classList.add('project-dialog-open');
  dialog.classList.remove('is-closing'); dialog.innerHTML=projectDialogContent(this.active);
  try {dialog.showModal();} catch {this.finishClose(false);return false;}
  this.select(0); this.onOpen?.(); dialog.querySelector('[data-project-close]')?.focus({preventScroll:true});
  return true;
 }

 releaseMedia() {
  this.mediaController?.abort(); this.mediaController=null;
  this.dialog?.querySelectorAll('video').forEach(video=>{
   video.pause(); video.removeAttribute('src'); video.load();
  });
 }

 select(index) {
  if(!this.active?.media.length || this.closing) return;
  this.releaseMedia();
  const count=this.active.media.length;
  this.mediaIndex=((index%count)+count)%count;
  const item=this.active.media[this.mediaIndex], stage=this.dialog.querySelector('[data-project-stage]');
  stage.replaceChildren(); this.mediaController=new AbortController();
  const media=this.document.createElement(item.type==='video'?'video':'img');
  if(item.type==='video') {
   media.controls=true; media.playsInline=true; media.preload='none';
   media.setAttribute('aria-label',item.alt||`${this.active.name} video ${this.mediaIndex+1}`);
   if(item.poster) media.poster=item.poster;
  } else {
   media.alt=item.alt||`${this.active.name} image ${this.mediaIndex+1}`; media.decoding='async';
  }
  media.addEventListener('error',()=>{
   const note=this.document.createElement('p'); note.className='fp-media-error'; note.setAttribute('role','status');
   note.textContent='This preview is temporarily unavailable.'; stage.replaceChildren(note);
  },{once:true,signal:this.mediaController.signal});
  media.src=item.src; stage.append(media);
  this.dialog.querySelector('[data-project-count]').textContent=`${String(this.mediaIndex+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`;
  this.dialog.querySelector('[data-project-caption]').textContent=item.caption;
  this.dialog.querySelectorAll('[data-project-media]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===this.mediaIndex)));
 }

 close({immediate=false,restoreFocus=true}={}) {
  if(!this.active) return;
  this.releaseMedia();
  if(immediate || this.window.matchMedia('(prefers-reduced-motion: reduce)').matches) {this.finishClose(restoreFocus);return;}
  if(this.closing) return;
  this.closing=true; this.dialog.classList.add('is-closing');
  this.closeTimer=this.window.setTimeout(()=>this.finishClose(restoreFocus),160);
 }

 finishClose(restoreFocus) {
  this.window.clearTimeout(this.closeTimer); this.closing=false;
  if(!this.active) return;
  this.releaseMedia(); this.active=null;
  if(this.dialog.open) this.dialog.close();
  this.dialog.classList.remove('is-closing'); this.dialog.replaceChildren();
  const saved=this.saved; this.saved=null;
  if(saved) {
   this.root.inert=saved.inert;
   for(const [element,name,value,priority] of saved.styles.reverse()) {
    if(value) element.style.setProperty(name,value,priority); else element.style.removeProperty(name);
   }
  }
  this.document.body.classList.remove('project-dialog-open');
  if(restoreFocus && this.opener?.isConnected && !this.root.hidden) {
   if(saved) this.window.scrollTo(saved.x,saved.y);
   this.opener.focus({preventScroll:true});
  }
  this.opener=null; this.onClose?.();
 }

 dispose() {
  if(this.disposed) return;
  this.disposed=true; this.observer.disconnect(); this.controller.abort();
  this.finishClose(false); this.dialog?.remove();
 }
}
