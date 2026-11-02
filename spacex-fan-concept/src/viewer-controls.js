import {dragCarousel,settleCarousel,clamp} from './viewer-motion.js';
/** Pointer events collect deltas; all WebGL/pose work stays on the render frame. */
export function bindViewerControls(v){
 const signal=v.abort.signal,on=(target,event,fn,extra={})=>target.addEventListener(event,fn,{signal,...extra}),points=new Map();
 let pinch=0,suppress=false;
 const release=(id)=>{try{if(v.canvas.hasPointerCapture(id))v.canvas.releasePointerCapture(id);}catch{}};
 const finish=(e,cancel=false)=>{
  points.delete(e.pointerId);const d=v.drag;
  if(!d||d.id!==e.pointerId){release(e.pointerId);if(!points.size){pinch=0;suppress=false;}return;}
  v.drag=null;v.canvas.classList.remove('is-dragging');release(e.pointerId);
  if(d.mode==='carousel'){
   v.carousel.dragging=false;
   const stale=performance.now()-d.lastTime>100,velocity=stale?0:d.velocity;
   const target=settleCarousel(v.carousel.position,velocity,d.startPosition,1,3,cancel);
   v.carousel.velocity=cancel?0:clamp(velocity,-2.5,2.5);v.carousel.target=target;if(v.reduced.matches)v.carousel.snap(target);
   v.onAction({type:'NAVIGATE',index:target});v.wake();return;
  }
  if(cancel||d.moved||suppress)return;
  const hit=v.pick(e.clientX,e.clientY);
  if(hit)v.onAction(hit.index!==v.state.index?{type:'NAVIGATE',index:hit.index}:{type:'FOCUS',part:hit.part});
  else if(v.state.part)v.onAction({type:'BACK'});
 };
 on(window,'resize',()=>v.resize());
 on(document,'visibilitychange',()=>{if(document.hidden){if(v.drag)finish({pointerId:v.drag.id},true);cancelAnimationFrame(v.frameId);v.frameId=0;v.lastTime=0;}else v.wake();});
 on(v.reduced,'change',()=>{if(v.reduced.matches&&v.state.rotating)v.onAction({type:'ROTATE'});v.applyState(v.state,true);});
 on(v.canvas,'webglcontextlost',e=>{e.preventDefault();v.recovery.lose();v.onError?.('Graphics were interrupted. The viewer will resume if the context recovers; reload or use the text catalogue if it does not.');cancelAnimationFrame(v.frameId);v.frameId=0;});
 on(v.canvas,'webglcontextrestored',()=>v.recovery.restore());
 on(v.canvas,'contextmenu',e=>e.preventDefault());
 on(v.canvas,'pointerdown',e=>{
  if(e.button!==0&&e.button!==2)return;
  points.set(e.pointerId,{x:e.clientX,y:e.clientY});try{v.canvas.setPointerCapture(e.pointerId);}catch{}
  if(points.size>1){suppress=true;if(v.drag)v.drag.moved=true;if(v.state.part){const p=[...points.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}return;}
  suppress=false;if(v.state.rotating)v.onAction({type:'ROTATE'});
  if(v.animation)v.animation.orientationCancelled=true;
  v.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,lastTime:performance.now(),startPosition:v.carousel.position,velocity:0,moved:false,mode:v.state.part||e.shiftKey||e.button===2?'rotate':'pending'};
  v.canvas.classList.add('is-dragging');v.pendingPointer=null;v.setHover(null);
 });
 on(v.canvas,'pointermove',e=>{
  if(points.has(e.pointerId))points.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(points.size>1&&v.state.part){const p=[...points.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch>0&&distance>0)v.setZoom(v.zoomTarget*pinch/distance);pinch=distance;return;}
  const d=v.drag;if(!d){if(e.pointerType!=='touch'){v.pendingPointer={x:e.clientX,y:e.clientY};v.wake();}return;}
  if(d.id!==e.pointerId||suppress)return;
  const dx=e.clientX-d.x,dy=e.clientY-d.y;d.moved=d.moved||Math.hypot(dx,dy)>6;
  if(d.mode==='pending'&&d.moved){d.mode=Math.abs(dx)>Math.abs(dy)*.8?'carousel':'rotate';if(d.mode==='carousel'){v.carousel.dragging=true;for(const i of [v.state.index-1,v.state.index+1])if(i>=1&&i<=3)v.loadLicensed(i);}}
  if(d.mode==='carousel'){
   const previous=v.carousel.position,now=performance.now(),p=dragCarousel(d.startPosition,dx,Math.max(200,v.width*.63),1,3);
   d.velocity=d.velocity*.55+clamp((p-previous)/Math.max(.008,(now-d.lastTime)/1000),-4,4)*.45;v.carousel.position=p;d.lastTime=now;
  }else if(d.mode==='rotate'){v.rotationDelta.x+=e.clientX-d.lastX;v.rotationDelta.y+=e.clientY-d.lastY;}
  d.lastX=e.clientX;d.lastY=e.clientY;v.wake();
 });
 on(v.canvas,'pointerup',e=>finish(e));on(v.canvas,'pointercancel',e=>finish(e,true));
 on(v.canvas,'lostpointercapture',e=>{if(v.drag?.id===e.pointerId)finish(e,true);});
 on(v.canvas,'pointerleave',()=>{if(!v.drag){v.pendingPointer=null;v.setHover(null);}});
 on(v.canvas,'wheel',e=>{if(!v.state.part)return;e.preventDefault();v.setZoom(v.zoomTarget*Math.exp(clamp(e.deltaY*(e.deltaMode===1?16:1),-200,200)*.0015));},{passive:false});
 on(v.canvas,'dblclick',()=>{if(v.state.part)v.applyState(v.state,false,true);});
 v.cancelGesture=()=>{if(v.drag)finish({pointerId:v.drag.id},true);points.clear();pinch=0;suppress=false;};
}
