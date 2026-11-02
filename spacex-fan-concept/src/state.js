import { vehicles } from './data.js';
export const initialState=()=>({index:1,part:null,payload:'fairing',rotating:false});
export function reduce(state,event) {
  switch(event.type) {
    case 'NAVIGATE':
      if(!Number.isFinite(event.index)) return state;
      return {...state,index:Math.max(vehicles.findIndex(v=>v.available!==false),Math.min(vehicles.length-1,Math.round(event.index))),part:null,payload:'fairing',rotating:false};
    case 'FOCUS': return Object.hasOwn(vehicles[state.index].parts,event.part) ? {...state,part:event.part,payload:event.part==='fairing'?state.payload:'fairing',rotating:false} : state;
    case 'BACK': return {...state,part:null,payload:'fairing',rotating:false};
    case 'DRAGON': return {...state,index:1,part:'fairing',payload:'dragon',rotating:false};
    case 'ROTATE': return {...state,rotating:!state.rotating};
    default: return state;
  }
}
export function ease(value) { const t=Math.max(0,Math.min(1,value)); return t*t*t*(t*(t*6-15)+10); }
import {qualityProfile} from './quality.js';
export function getQuality(options={}){return qualityProfile({height:globalThis.innerHeight??720,saveData:Boolean(globalThis.navigator?.connection?.saveData),...options});}
export function fitView(height,width,screenHeight) {
  const aspect=Math.max(.25,width/Math.max(1,screenHeight));
  const mobile=width<760;
  const usable=mobile?.57:.77;
  const distance=height/(2*Math.tan(16*Math.PI/180)*usable);
  return {distance, target:[mobile?0:height*.145, mobile?height*.38:height*.447, 0], mobile, aspect};
}
