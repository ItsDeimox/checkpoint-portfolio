import {createSession,connectBridge} from './session.js';
import {siteConfig} from './site-config.js';
/** A small adapter; the approved renderer remains unchanged. No analytics requests. */
export function startProductLayer({viewer,read,dispatch,catalog,refresh=()=>{},document:doc=document,window:win=window}){
 const abort=new AbortController(),canvas=doc.getElementById('viewer');
 const session=createSession({catalog,read,dispatch,controls:{
  setQuality(value){viewer.applyQuality(value);doc.getElementById('quality').value=value;},
  setInternal(value){const ok=viewer.setCutaway(value);if(ok){refresh();sync();}return ok;},
  rotate(x,y){if(read().rotating)dispatch({type:'ROTATE'});if(viewer.animation)viewer.animation.orientationCancelled=true;viewer.rotationDelta.x+=x;viewer.rotationDelta.y+=y;viewer.wake();},
  zoom(value){viewer.setZoom(value);},reset(){viewer.zoom=viewer.zoomTarget=1;viewer.applyState(read(),false,true);}
 }});
 const status=doc.getElementById('viewer-status');let previous='';
 function sync(){const s=read(),v=catalog[s.index],part=v?.parts?.[s.part],text=s.part?`${v.name}: ${part?.title??s.part}. ${viewer.cutaway?'Internal structure':'Assembled view'}.`:`${v?.name??'Viewer'} selected.`;if(text!==previous){status.textContent=text;previous=text;}canvas.setAttribute('aria-label',text+' Interactive 3D viewer.');}
 canvas.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const s=read(),step=event.shiftKey?32:14;let command;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
   if(s.part)command={type:'rotate',x:event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0,y:event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0};
   else if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopPropagation();dispatch({type:'NAVIGATE',index:s.index+(event.key==='ArrowRight'?1:-1)});return;}
  }else if(['+','=','-','_'].includes(event.key)&&s.part)command={type:'zoom',value:Math.max(.7,Math.min(1.8,viewer.zoomTarget+(['-','_'].includes(event.key)?.1:-.1)))};
  else if(event.key==='0'&&s.part)command={type:'resetView'};
  else if(event.key==='Enter'&&!s.part)command={type:'selectPart',id:'engines'};
  else if(event.key==='Escape'&&s.part)command={type:'back'};
  if(command){event.preventDefault();event.stopPropagation();session.execute(command);sync();}
 },{signal:abort.signal});
 const origins=[win.location.origin,...siteConfig.allowedEmbedOrigins.filter(o=>{try{return new URL(o).origin===o&&o.startsWith('https://');}catch{return false;}})];
 const unbind=new URLSearchParams(win.location.search).get('embed')==='1'&&win.parent!==win?connectBridge({window:win,session,origins}):()=>{};
 // A failure cannot trap visitors behind WebGL or a progress overlay.
 doc.querySelectorAll('[data-catalog-link]').forEach(a=>a.href=siteConfig.catalogURL);
 sync();return {session,sync,dispose(){abort.abort();unbind();}};
}
