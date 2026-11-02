/** Vendor-neutral integration boundary. The host supplies content and renderer controls. */
export const CHANNEL='deimox-viewer/v1';
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function createSession({catalog,read,dispatch,controls,describe}){
 if(!Array.isArray(catalog)||typeof read!=='function'||typeof dispatch!=='function')throw new TypeError('Invalid session adapter');
 const snapshot=()=>{const s=read(),v=catalog[s.index],part=s.part?(describe?.(s,v)??v?.parts?.[s.part]):null;return {vehicle:v?.id??null,name:v?.name??'',part:s.part??null,variant:s.payload??null,partTitle:part?.title??null};};
 function execute(command){
  if(!plain(command)||typeof command.type!=='string')return {ok:false,error:'INVALID_COMMAND'};
  const state=read(),vehicle=catalog[state.index];
  try{switch(command.type){
   case 'getState':break;
   case 'selectVehicle':{const index=catalog.findIndex(v=>v.id===command.id&&v.available!==false);if(index<0)return {ok:false,error:'UNAVAILABLE_CONTENT'};dispatch({type:'NAVIGATE',index});break;}
   case 'selectPart':if(typeof command.id!=='string'||!Object.hasOwn(vehicle?.parts??{},command.id))return {ok:false,error:'UNAVAILABLE_PART'};dispatch({type:'FOCUS',part:command.id});break;
   case 'back':dispatch({type:'BACK'});break;
   case 'setQuality':if(!['auto','low','medium','high'].includes(command.value))return {ok:false,error:'INVALID_QUALITY'};controls.setQuality(command.value);break;
   case 'setInternal':if(typeof command.value!=='boolean'||!controls.setInternal(command.value))return {ok:false,error:'UNSUPPORTED_INTERIOR'};break;
   case 'rotate':if(!finite(command.x)||!finite(command.y)||Math.abs(command.x)>60||Math.abs(command.y)>60)return {ok:false,error:'INVALID_ROTATION'};controls.rotate(command.x,command.y);break;
   case 'zoom':if(!finite(command.value)||command.value<.7||command.value>1.8)return {ok:false,error:'INVALID_ZOOM'};controls.zoom(command.value);break;
   case 'resetView':controls.reset();break;
   default:return {ok:false,error:'UNKNOWN_COMMAND'};
  }return {ok:true,state:snapshot()};}catch{return {ok:false,error:'CONTROL_UNAVAILABLE'};}
 }
 return {execute,snapshot};
}
/** No wildcard origins, opaque origins, arbitrary windows, URLs or code execution. */
export function receiveCommand(event,{parent,origins,session}){
 const d=event.data;
 if(event.source!==parent||event.origin==='null'||!origins.includes(event.origin)||!plain(d)||d.channel!==CHANNEL||typeof d.requestId!=='string'||!/^[\w-]{1,64}$/.test(d.requestId)||!plain(d.command))return null;
 return {channel:CHANNEL,requestId:d.requestId,...session.execute(d.command)};
}
export function connectBridge({window:host,session,origins}){
 const onMessage=e=>{const result=receiveCommand(e,{parent:host.parent,origins,session});if(result)e.source.postMessage(result,e.origin);};
 host.addEventListener('message',onMessage);return ()=>host.removeEventListener('message',onMessage);
}
