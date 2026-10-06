import {PROCESS} from '../core/experience.js';
import {makeProcessSurface,advanceProcessSurface} from '../core/process-surface.js';
/** Owns only the final chapter. Text/hit targets and GLSL use the same transformed rectangles. */
export class ProcessCards {
 constructor(grid){
  this.grid=grid;this.focusIndex=-1;this.pointerIndex=-1;this.gesture=null;this.suppressClick=false;this.keyboardIntent=false;
  document.addEventListener('keydown',event=>{if(event.key==='Tab'||event.key.startsWith('Arrow'))this.keyboardIntent=true;});
  document.addEventListener('pointermove',()=>{this.keyboardIntent=false;this.focusIndex=-1;},{passive:true});
  this.items=[...grid.querySelectorAll('.process-card')].map((el,index)=>({...makeProcessSurface(index),el,color:PROCESS[index].color}));
  for(const item of this.items){
   const track=event=>{const r=item.el.getBoundingClientRect();item.pointerTarget=[Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),Math.max(0,Math.min(1,1-(event.clientY-r.top)/r.height))];this.pointerIndex=item.index;};
   item.el.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')track(event);});
   item.el.addEventListener('pointermove',event=>{track(event);if(this.gesture?.id===event.pointerId&&Math.hypot(event.clientX-this.gesture.x,event.clientY-this.gesture.y)>8)this.suppressClick=true;});
   item.el.addEventListener('pointerleave',()=>{if(this.pointerIndex===item.index)this.pointerIndex=-1;});
   item.el.addEventListener('pointerdown',event=>{this.focusIndex=-1;this.suppressClick=false;this.gesture={id:event.pointerId,x:event.clientX,y:event.clientY};track(event);});
   item.el.addEventListener('pointercancel',()=>{this.pointerIndex=-1;this.gesture=null;this.suppressClick=true;});
   item.el.addEventListener('pointerup',event=>{this.gesture=null;if(event.pointerType==='touch')this.pointerIndex=-1;});
   item.el.addEventListener('click',event=>{if(this.suppressClick&&event.detail){event.preventDefault();event.stopImmediatePropagation();}this.suppressClick=false;},true);
   item.el.addEventListener('dragstart',event=>event.preventDefault());
   item.el.addEventListener('focus',()=>{if(this.keyboardIntent&&item.el.matches(':focus-visible')){this.focusIndex=item.index;item.pointerTarget=[.5,.7];}});
   item.el.addEventListener('blur',()=>{if(this.focusIndex===item.index)this.focusIndex=-1;});
  }
  grid.addEventListener('scroll',()=>{this.pointerIndex=-1;},{passive:true});
 }
 reset(){this.pointerIndex=-1;this.focusIndex=-1;this.gesture=null;for(const item of this.items)item.target=0;}
 update(scene,dt,enabled){
  if(!enabled)this.reset();
  const owner=this.pointerIndex>=0?this.pointerIndex:this.focusIndex;
  for(const item of this.items){
   item.target=+(enabled&&item.index===owner);advanceProcessSurface(item,dt,scene.reduced);
   item.el.style.transform=`translate3d(0,${item.lift.toFixed(3)}px,0) scale(${item.scale.toFixed(5)})`;
   item.el.style.setProperty('--process-light',item.hover.toFixed(4));
   item.el.style.setProperty('--process-rgb',item.color.map(v=>Math.round(v*255)).join(' '));
   item.el.classList.toggle('is-illuminated',item.hover>.04);
   const r=item.el.getBoundingClientRect();item.rect=[r.left/scene.width,r.top/scene.height,r.width/scene.width,r.height/scene.height];item.cssSize=[item.el.clientWidth,item.el.clientHeight];
  }
  const strongest=this.items.reduce((a,b)=>a.hover>b.hover?a:b),amount=strongest.hover;
  for(const item of this.items)item.dim=item===strongest?0:amount*.18;
  scene.processColor=amount>.003?strongest.color:[.88,.92,.96];scene.processHover=amount>.003?strongest.index:-1;scene.processLight=amount;
  scene.surfaces=this.items;
  const r=this.grid.getBoundingClientRect();scene.processClip=[r.left/scene.width,r.top/scene.height,r.width/scene.width,r.height/scene.height];
 }
}
