import {renderSectionPage} from '../pages/section-pages.js';

/** History and cancellation are page concerns; the renderer owns the flight. */
export class SectionRoutes {
 constructor({document,host,root,canvas,footer,getScene,getPhase,entered,setLocation,onSelect,onNeedScene,onRefresh}){
  Object.assign(this,{document,host,root,canvas,footer,getScene,getPhase,entered,setLocation,onSelect,onNeedScene,onRefresh});
  this.index=null;this.token=0;this.page=false;this.travelling=false;this.pending=false;
 }
 open(index,trigger,historyMode='push',direct=false){
  index=Number(index);if(!Number.isInteger(index)||index<0||index>=5)return;
  if(this.travelling&&this.index===index)return;
  const fromPage=this.page,token=++this.token;this.index=index;this.onSelect(index);this.setLocation(index,historyMode);
  const scene=this.getScene();scene?.cancelPortal?.();
  if(direct||fromPage||this.getPhase()==='unavailable'||scene?.reduced?.matches){this.show(index,token);return;}
  if(!scene?.ready||!this.entered()){this.pending=true;return;}
  this.pending=false;this.page=false;this.travelling=true;this.root.hidden=true;this.host.hidden=false;
  this.document.body.classList.add('portal-travelling');this.document.body.classList.remove('section-active');
  this.canvas.inert=true;this.footer.inert=true;
  const started=scene.enterPortal(index,()=>this.show(index,token));
  if(!started)this.show(index,token);
 }
 ready(){if(this.page){this.getScene()?.parkSection();return;}if(this.pending&&this.entered())this.open(this.index,null,'none');}
 show(index,token){
  if(token!==this.token||this.index!==index)return;
  this.page=true;this.pending=false;this.travelling=false;
  this.getScene()?.parkSection();this.root.innerHTML=renderSectionPage(index);this.root.hidden=false;
  this.host.hidden=true;this.footer.hidden=true;this.canvas.inert=true;
  this.document.body.classList.remove('portal-travelling');this.document.body.classList.add('section-active');
  this.root.scrollTop=0;this.document.defaultView?.scrollTo?.(0,0);
  this.onRefresh?.();this.root.querySelector('#section-title')?.focus({preventScroll:true});
 }
 close(historyMode='push'){
  ++this.token;this.index=null;this.onSelect(null);this.pending=this.page=this.travelling=false;this.setLocation(null,historyMode);
  this.root.hidden=true;this.root.innerHTML='';this.host.hidden=false;this.footer.hidden=false;
  this.canvas.inert=false;this.footer.inert=false;
  this.document.body.classList.remove('portal-travelling','section-active');
  const scene=this.getScene();if(scene?.ready)scene.resumeShowroom();else this.onNeedScene?.();
  this.onRefresh?.();this.canvas.focus({preventScroll:true});
 }
 unavailable(){if(this.index!==null)this.show(this.index,this.token);}
 dispose(){++this.token;this.getScene()?.cancelPortal?.();}
}
