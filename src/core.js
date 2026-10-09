export const ROUTES=['home','groups','projects','about','contact'];
export function routeName(path){const p=path.split(/[?#]/)[0].replace(/^\/+|\/+$/g,'');return p===''||p==='index.html'||p==='berserk'?'home':ROUTES.includes(p)?p:'not-found';}
export const advance=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*Math.max(0,dt)));
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function coverUV(iw,ih,w,h){const a=iw/ih,b=w/h;return b>a?[1,a/b]:[b/a,1];}
export function qualitySize(w,h,dpr=1,quality='auto'){const max=quality==='high'?3200000:quality==='low'?850000:2200000;const scale=Math.min(dpr,quality==='high'?1.75:quality==='low'?.8:1.25,Math.sqrt(max/Math.max(1,w*h)));return [Math.max(2,Math.floor(w*scale)),Math.max(2,Math.floor(h*scale))];}
export class DragState{constructor(){this.cancel();}start(id,x,y){this.id=id;this.x=x;this.y=y;this.moved=false;this.active=true;}move(id,x,y){if(!this.active||this.id!==id)return;this.moved ||= Math.hypot(x-this.x,y-this.y)>7;}end(id){const click=this.active&&this.id===id&&!this.moved;this.cancel();return click;}cancel(){this.active=false;this.id=null;this.moved=false;}}
export function safeImageURL(value){try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname.endsWith('.rbxcdn.com')||u.hostname==='tr.rbxcdn.com')?u.href:null;}catch{return null;}}

/** Visual damping consumes wall time, independently of the physics/ambient time clamp. */
export function elapsedFrameTime(now,last){return Number.isFinite(now)&&Number.isFinite(last)?Math.max(0,(now-last)/1000):0;}
