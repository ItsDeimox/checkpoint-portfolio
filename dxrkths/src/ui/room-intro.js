/** Audio permission and renderer readiness are independent. Page entry never
 * waits for a 3D scene; only an explicit showroom choice needs prepared geometry. */
export class IntroGate {
 constructor({onActivate=()=>{},onDismiss=()=>{},onChange=()=>{}}={}){
  Object.assign(this,{onActivate,onDismiss,onChange,activated:false,prepared:false,failed:false,dismissed:false,destination:null});
 }
 activate(destination='showroom'){
  if(this.activated||!['berserk','showroom','page'].includes(destination))return false;
  this.activated=true;this.destination=destination;
  try{Promise.resolve(this.onActivate(destination)).catch(()=>{});}catch{}
  this.check();return true;
 }
 ready(){this.prepared=true;this.check();}
 fail(){this.failed=true;this.check();}
 check(){
  this.onChange(this);
  if(!this.dismissed&&this.activated&&(this.destination!=='showroom'||this.prepared||this.failed)){
   this.dismissed=true;this.onDismiss(this.destination);
  }
 }
}

export function mountIntro(document,{onActivate,onBeforeDismiss,onDismiss,primaryDestination='berserk',primaryLabel='Enter BDX',showShowroom=true}={}){
 const root=document.querySelector('#room-intro');
 if(!root)return {dismissed:true,released:true,activated:true,ready(){},fail(){},progress(){},dispose(){}};
 const button=root.querySelector('#intro-enter'),showroom=root.querySelector('#intro-showroom'),status=root.querySelector('#intro-status');
 const body=document.body,underlay=['#header','#main','#footer'].map(s=>document.querySelector(s)).filter(Boolean);
 let timer=null,stage=0,removed=false,gate;
 const release=()=>{
  if(removed)return;removed=true;clearTimeout(timer);root.hidden=true;root.inert=true;gate.released=true;
  body.classList.remove('intro-pending','intro-leaving');underlay.forEach(el=>el.inert=false);
  onDismiss?.(gate.destination);
 };
 const paint=state=>{
  const waiting=state.activated&&state.destination==='showroom'&&!state.prepared&&!state.failed;
  root.setAttribute('aria-busy',String(waiting));
  root.dataset.stage=String(state.prepared?3:stage);
  root.dataset.entered=String(state.activated);root.dataset.destination=state.destination??'';
  button.textContent=state.activated&&state.destination!=='showroom'?'Opening…':primaryLabel;
  button.setAttribute('aria-disabled',String(state.activated));
  if(showroom){
   showroom.hidden=!showShowroom;
   showroom.textContent=waiting?'Preparing showroom…':'3D Showroom';
   showroom.setAttribute('aria-disabled',String(state.activated));
  }
  if(!state.activated)status.textContent=showShowroom?'Open BDX or explore the 3D showroom.':'Continue to the page you opened.';
  else if(state.destination!=='showroom')status.textContent='Opening your page';
  else if(state.failed)status.textContent='3D is unavailable. You can still explore the links.';
  else if(state.prepared)status.textContent='Showroom ready';
  else if(!stage)status.textContent='Preparing the 3D showroom';
 };
 gate=new IntroGate({onActivate,onChange:paint,onDismiss(destination){
  // Mount the chosen page before fading, never expose an unrelated panel first.
  onBeforeDismiss?.(destination);
  body.classList.add('intro-leaving');
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(reduced){release();return;}
  timer=setTimeout(release,650);
 }});
 gate.released=false;
 underlay.forEach(el=>el.inert=true);
 const click=event=>{
  if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
  const primary=event.target.closest?.('#intro-enter');
  const secondary=event.target.closest?.('#intro-showroom');
  if(!primary&&(!secondary||!showShowroom))return;
  // Own the activation event: it must not hit the route handlers below the cover.
  event.preventDefault();event.stopPropagation();
  gate.activate(primary?primaryDestination:'showroom');
 };
 const ended=event=>{if(event.target===root&&event.propertyName==='opacity'&&gate.dismissed)release();};
 root.addEventListener('click',click);root.addEventListener('transitionend',ended);
 button.disabled=false;if(showroom)showroom.disabled=false;
 button.focus({preventScroll:true});paint(gate);
 return Object.assign(gate,{
  progress(caption){
   if(gate.prepared||gate.failed||gate.destination!=='showroom')return;
   stage=caption.includes('reflections')?2:caption.includes('studio')?1:0;
   paint(gate);status.textContent=caption;
  },
  dispose(){clearTimeout(timer);root.removeEventListener('click',click);root.removeEventListener('transitionend',ended);},
 });
}
