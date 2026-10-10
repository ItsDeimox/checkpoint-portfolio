/** Audio permission and renderer readiness are independent: never await a load
 * before making the gesture-sensitive playback call. */
export class IntroGate {
 constructor({onActivate=()=>{},onDismiss=()=>{},onChange=()=>{}}={}){
  Object.assign(this,{onActivate,onDismiss,onChange,activated:false,prepared:false,failed:false,dismissed:false});
 }
 activate(){
  if(this.activated)return false;
  this.activated=true;
  try{Promise.resolve(this.onActivate()).catch(()=>{});}catch{}
  this.check();return true;
 }
 ready(){this.prepared=true;this.check();}
 fail(){this.failed=true;this.check();}
 check(){
  this.onChange(this);
  if(!this.dismissed&&this.activated&&(this.prepared||this.failed)){
   this.dismissed=true;this.onDismiss();
  }
 }
}

export function mountIntro(document,{onActivate,onDismiss}={}){
 const root=document.querySelector('#room-intro');
 if(!root)return {dismissed:true,activated:true,ready(){},fail(){},progress(){},dispose(){}};
 const button=root.querySelector('#intro-enter'),status=root.querySelector('#intro-status');
 const body=document.body,underlay=['#header','#main','#footer'].map(s=>document.querySelector(s)).filter(Boolean);
 let timer=null,stage=0,removed=false;
 const release=()=>{
  if(removed)return;removed=true;clearTimeout(timer);root.hidden=true;root.inert=true;
  body.classList.remove('intro-pending','intro-leaving');underlay.forEach(el=>el.inert=false);
  onDismiss?.();
 };
 const paint=gate=>{
  root.setAttribute('aria-busy',String(!gate.prepared&&!gate.failed));
  root.dataset.stage=String(gate.prepared?3:stage);
  root.dataset.entered=String(gate.activated);
  button.textContent=gate.failed?'Continue to site':gate.activated?'Preparing your showroom…':'Enter DXT';
  button.setAttribute('aria-disabled',String(gate.activated&&!gate.failed));
  if(gate.failed)status.textContent='3D is unavailable. You can still explore the links.';
  else if(gate.prepared)status.textContent='Showroom ready';
 };
 const gate=new IntroGate({onActivate,onChange:paint,onDismiss(){
  body.classList.add('intro-leaving');
  // Keep the cover until the prepared frame exists; no guessed progress timer.
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(reduced){release();return;}
  timer=setTimeout(release,650);
 }});
 underlay.forEach(el=>el.inert=true);
 const click=event=>{
  if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.target.closest?.('a'))return;
  gate.activate();
 };
 const ended=event=>{if(event.target===root&&event.propertyName==='opacity'&&gate.dismissed)release();};
 root.addEventListener('click',click);root.addEventListener('transitionend',ended);
 button.disabled=false;button.focus({preventScroll:true});paint(gate);
 return Object.assign(gate,{
  progress(caption){
   if(gate.prepared||gate.failed)return;
   stage=caption.includes('reflections')?2:caption.includes('studio')?1:0;
   status.textContent=caption;paint(gate);
  },
  dispose(){clearTimeout(timer);root.removeEventListener('click',click);root.removeEventListener('transitionend',ended);},
 });
}
