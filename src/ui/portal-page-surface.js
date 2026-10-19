/** A browser-owned snapshot: no SVG serialization, pixel readback or image
 * encoding in a click handler. The existing portal camera remains the clock. */
export class PortalPageSurface {
 constructor(document,root){this.document=document;this.root=root;this.active=false;this.serial=0;}
 get supported(){return typeof this.document.startViewTransition==='function';}
 set(style,name,value){
  this.saved.push({style,name,value:style.getPropertyValue(name),priority:style.getPropertyPriority?.(name)||''});
  style.setProperty(name,value);
 }
 async capture({scroll=0,reverse=false}={}){
  if(!this.supported)return false;
  this.finish();const serial=++this.serial,doc=this.document,root=this.root,win=doc.defaultView;
  this.active=true;this.saved=[];this.width=win.innerWidth;this.height=win.innerHeight;const contentWidth=root.clientWidth;
  this.set(doc.documentElement.style,'view-transition-name','none');
  const header=doc.querySelector('#header');if(header)this.set(header.style,'view-transition-name','portal-header');
  const brand=doc.querySelector('.dxt-persistent-brand');if(brand)this.set(brand.style,'view-transition-name','portal-brand');
  for(const [key,value]of Object.entries({position:'fixed',inset:'0 auto 0 0',width:`${contentWidth}px`,height:`${win.innerHeight}px`,'min-height':'0',overflow:'hidden',visibility:'visible','view-transition-name':'portal-page',...(!reverse?{'z-index':'-1'}:{})}))this.set(root.style,key,value);
  root.style.setProperty('transform','none');root.style.setProperty('opacity','1');root.style.setProperty('clip-path','none');
  root.scrollTop=scroll;if(reverse)win.scrollTo?.(0,0);
  doc.documentElement.classList.add('portal-surface-active');
  doc.documentElement.style.setProperty('--portal-surface-width',`${root.clientWidth}px`);
  this.update({transform:'none',opacity:reverse?1:0,clip:'none'});
  try{
   this.transition=doc.startViewTransition(()=>{
    if(serial!==this.serial)return;
    root.style.setProperty('view-transition-name','none');root.style.setProperty('visibility','hidden');
   });
   this.transition.finished.then(()=>{if(serial===this.serial)this.finish(true);},()=>{if(serial===this.serial)this.finish(true);});
   await this.transition.ready;
   return serial===this.serial&&this.active;
  }catch{
   if(serial===this.serial)this.finish();return false;
  }
 }
 update({transform,opacity,clip}){
  if(!this.active)return;const style=this.document.documentElement.style;
  style.setProperty('--portal-surface-transform',transform||'none');
  style.setProperty('--portal-surface-opacity',String(opacity));style.setProperty('--portal-surface-clip',clip||'none');
 }
 finish(preservePose=false){
  ++this.serial;this.transition?.skipTransition();this.transition=null;
  if(!this.active)return;this.active=false;
  for(const item of (this.saved??[]).reverse())if(item.value)item.style.setProperty(item.name,item.value,item.priority);else item.style.removeProperty(item.name);
  this.saved=[];
  if(!preservePose)for(const name of ['transform','opacity','clip-path'])this.root.style.removeProperty(name);
  this.document.documentElement.classList.remove('portal-surface-active');
  for(const name of ['width','transform','opacity','clip'])this.document.documentElement.style.removeProperty(`--portal-surface-${name}`);
 }
}
