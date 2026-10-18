/** Leave native horizontal gestures and vertical scrolling at the edges alone. */
export function wheelTravel(dx,dy,left,maximum){
 if(![dx,dy,left,maximum].every(Number.isFinite)||maximum<=1||Math.abs(dx)>=Math.abs(dy))return 0;
 if((dy<0&&left<=1)||(dy>0&&left>=maximum-1))return 0;
 return dy;
}
export class GroupDeck {
 constructor(root,{reduced=()=>false}={}){
  this.root=root;this.reduced=reduced;this.controller=new AbortController();this.timer=null;this.wheelSum=0;this.nextWheelAt=0;
  const signal=this.controller.signal,view=root.ownerDocument.defaultView;
  this.track=root.querySelector('[data-group-track]');if(!this.track)return;
  this.slides=Array.from(this.track.querySelectorAll('[data-group-slide]'));
  this.track.addEventListener('wheel',event=>{
   if(event.ctrlKey)return;
   const scale=event.deltaMode===1?16:event.deltaMode===2?this.track.clientWidth:1;
   const delta=wheelTravel(event.deltaX*scale,event.deltaY*scale,this.track.scrollLeft,this.track.scrollWidth-this.track.clientWidth);
   if(!delta){this.wheelSum=0;return;}event.preventDefault();
   const now=view?.performance?.now?.()??Date.now();
   if(now<this.nextWheelAt)return;
   if(Math.sign(delta)!==Math.sign(this.wheelSum))this.wheelSum=0;
   this.wheelSum+=delta;
   // Incremental scrollLeft is immediately snapped back by mandatory snapping.
   // One deliberate wheel gesture advances one slide; trackpads remain native.
   if(Math.abs(this.wheelSum)>=36){this.go(this.index+Math.sign(this.wheelSum));this.wheelSum=0;this.nextWheelAt=now+420;}
  },{passive:false,signal});
  this.track.addEventListener('scroll',()=>{
   if(!this.reduced())root.setAttribute('data-moving','true');
   clearTimeout(this.timer);this.timer=setTimeout(()=>root.removeAttribute('data-moving'),140);
   this.refresh();
  },{passive:true,signal});
  root.addEventListener('click',event=>{
   const control=event.target.closest?.('[data-group-step]');if(control)this.go(this.index+Number(control.dataset.groupStep));
  },{signal});
  this.track.addEventListener('keydown',event=>{
   if(event.target!==this.track)return;
   const next=event.key==='ArrowRight'?this.index+1:event.key==='ArrowLeft'?this.index-1:event.key==='Home'?0:event.key==='End'?this.slides.length-1:null;
   if(next===null)return;event.preventDefault();this.go(next);
  },{signal});
  this.resize=typeof view?.ResizeObserver==='function'?new view.ResizeObserver(()=>this.refresh()):null;
  this.resize?.observe(this.track);this.refresh();
 }
 refresh(){
  if(!this.track||!this.slides.length)return;
  const maximum=Math.max(0,this.track.scrollWidth-this.track.clientWidth);
  this.index=maximum>0?Math.round(this.track.scrollLeft/maximum*(this.slides.length-1)):0;
  this.index=Math.max(0,Math.min(this.slides.length-1,this.index));
  this.root.querySelectorAll('[data-group-step]').forEach(button=>button.disabled=Number(button.dataset.groupStep)<0?this.index===0:this.index===this.slides.length-1);
  const count=this.root.querySelector('[data-group-count]');if(count)count.textContent=`${String(this.index+1).padStart(2,'0')} / ${String(this.slides.length).padStart(2,'0')}`;
  this.root.style.setProperty('--group-progress',String(maximum?this.track.scrollLeft/maximum:0));
 }
 go(index){
  if(!this.track)return;
  const i=Math.max(0,Math.min(this.slides.length-1,index)),maximum=this.track.scrollWidth-this.track.clientWidth;
  this.track.scrollTo({left:maximum*i/Math.max(1,this.slides.length-1),behavior:this.reduced()?'instant':'smooth'});
 }
 dispose(){clearTimeout(this.timer);this.controller.abort();this.resize?.disconnect();this.root.removeAttribute('data-moving');}
}
