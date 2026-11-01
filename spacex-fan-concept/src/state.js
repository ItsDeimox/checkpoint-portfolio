import { vehicles } from './data.js';
export const initialState=()=>({index:1,part:null,payload:'fairing',rotating:false});
export function reduce(state,event) {
  switch(event.type) {
    case 'NAVIGATE':
      if(!Number.isFinite(event.index)) return state;
      return {...state,index:Math.max(0,Math.min(vehicles.length-1,Math.round(event.index))),part:null,payload:'fairing',rotating:false};
    case 'FOCUS': return Object.hasOwn(vehicles[state.index].parts,event.part) ? {...state,part:event.part,rotating:false} : state;
    case 'BACK': return {...state,part:null,rotating:false};
    case 'DRAGON': return {...state,index:1,part:'fairing',payload:'dragon',rotating:false};
    case 'ROTATE': return {...state,rotating:!state.rotating};
    default: return state;
  }
}
export function ease(value) { const t=Math.max(0,Math.min(1,value)); return t*t*t*(t*(t*6-15)+10); }
export function getQuality({width=1280,dpr=1,memory=8,mode='auto'}={}) {
  const low=mode==='eco'||(mode==='auto'&&(width<768||memory<=4));
  return {dpr:Math.min(dpr,low?1.25:1.75), reflectionSize:low?256:768, low};
}
export function fitView(height,width,screenHeight) {
  const aspect=Math.max(.25,width/Math.max(1,screenHeight));
  const mobile=width<760;
  const usable=mobile?.57:.77;
  const distance=height/(2*Math.tan(16*Math.PI/180)*usable);
  return {distance, target:[mobile?0:height*.145, mobile?height*.38:height*.447, 0], mobile, aspect};
}
