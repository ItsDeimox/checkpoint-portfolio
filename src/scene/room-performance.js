/** Skip GPU work on surplus display refreshes, not elapsed simulation time.
 * No timers, catch-up renders or second animation loop. */
export class FramePacer {
  constructor(){this.reset();}
  reset(){this.next=null;this.limit=null;this.skipped=0;}
  take(now,limit=60){
    if(!Number.isFinite(now))return false;
    const fps=Number.isFinite(limit)&&limit>0?limit:60, interval=1000/fps;
    if(this.next===null||fps!==this.limit){this.limit=fps;this.next=now+interval;return true;}
    if(now+.15<this.next){this.skipped++;return false;}
    this.next+=Math.max(1,Math.floor((now-this.next+.15)/interval)+1)*interval;
    return true;
  }
}
export function frameRateLimit(quality,mobile=false){
  if(mobile)return quality==='low'?30:60;
  return quality==='high'?90:60;
}
