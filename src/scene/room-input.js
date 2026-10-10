/** Pointer navigation, turntable rotation and surface activation use one owner. */
export function bindRoomPointer(view, on) {
 const {canvas}=view;
 const interactive=()=>view.ready && (view.cameraRig.mode==='overview' || (view.cameraRig.mode==='focused' && view.contentPanel!==null));
 on(canvas,'pointermove',event=>{
  if(!interactive())return;
  const dragging=view.drag?.id===event.pointerId;
  if(view.drag && !dragging)return;
  if(dragging)view.drag.moved ||= Math.hypot(event.clientX-view.drag.startX,event.clientY-view.drag.startY)>7;
  if(dragging && view.drag.mode==='turntable'){
   view.turntable.movePixels(event.clientX-view.drag.x,canvas.getBoundingClientRect().width);
   view.drag.x=event.clientX;view.drag.y=event.clientY;view.wake();return;
  }
  if(view.cameraRig.mode==='overview' && !view.reduced.matches){
   if(event.pointerType==='touch'){
    if(dragging)view.cameraRig.look(-(event.clientX-view.drag.x)*.0008,-(event.clientY-view.drag.y)*.0008);
   }else{
    const rect=canvas.getBoundingClientRect();
    view.cameraRig.pointLook((event.clientX-rect.left)/rect.width*2-1,(event.clientY-rect.top)/rect.height*2-1);
   }
  }
  if(dragging){view.drag.x=event.clientX;view.drag.y=event.clientY;}
  view.lastPointer=[event.clientX,event.clientY];view.pendingPick=view.lastPointer;view.wake();
 },{passive:true});
 on(canvas,'pointerdown',event=>{
  if(!interactive() || event.button!==0 || view.drag)return;
  const rotating=view.cameraRig.mode==='overview' && view.beginTurntable?.(event.clientX,event.clientY);
  view.drag={id:event.pointerId,type:event.pointerType,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false,mode:rotating?'turntable':'look'};
  canvas.setPointerCapture(event.pointerId);
  if(rotating || event.pointerType==='touch' && view.cameraRig.mode==='overview'){
   canvas.classList.add('dragging');canvas.style.cursor='grabbing';
  }
 });
 on(canvas,'pointerup',event=>{
  if(view.drag?.id!==event.pointerId)return;
  const rotating=view.drag.mode==='turntable',click=!rotating && !view.drag.moved && interactive();
  if(rotating)view.turntable.end(!view.settings?.paused && !view.reduced.matches);
  view.release();if(rotating)view.wake();
  // Keep link activation synchronous with the browser's trusted gesture.
  if(click)view.activateAt(event.clientX,event.clientY);
  if(event.pointerType==='touch'){view.pendingPick=null;view.lastPointer=null;view.clearHover();}
 });
 on(canvas,'pointercancel',event=>{
  if(view.drag && view.drag.id!==event.pointerId)return;
  if(view.drag?.mode==='turntable')view.turntable.end(false);
  view.release();view.lastPointer=null;view.pendingPick=null;view.clearHover();view.wake();
 });
 on(canvas,'lostpointercapture',event=>{
  if(view.drag?.id!==event.pointerId)return;
  if(view.drag.mode==='turntable')view.turntable.end(false);
  view.drag=null;canvas.classList.remove('dragging');view.wake();
 });
 on(canvas,'pointerleave',()=>{
  if(view.drag?.mode==='turntable')return;
  view.pendingPick=null;view.lastPointer=null;view.clearHover();view.cameraRig.neutralLook();view.wake();
 });
}
