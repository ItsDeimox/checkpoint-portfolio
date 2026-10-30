import {SectionMedia} from './ui/section-media.js';
import {DEFAULT_TRACK,normalizeMusicSettings} from './scene/room-music-settings.js';
import {home,ROOM_PANELS} from './pages/home-room.js';
import {sectionHost} from './pages/section-pages.js';
import {SectionRoutes} from './ui/room-section-routes.js';
import {renderRoomHeader,renderRoomFooter} from './ui/room-visitor-shell.js';
import {mountIntro} from './ui/room-intro.js';
import {restoreVisitorSettings,QUALITY_VALUES} from './ui/room-visitor-settings.js';
import {RoomMusic} from './scene/room-music.js';
import {panelFromPath,pathForPanel} from './ui/room-navigation.js';
import {VISUAL_PRESET_VERSION,restoreVisualSettings} from './scene/room-visual-settings.js';

const main=document.querySelector('#main'),header=document.querySelector('#header'),footer=document.querySelector('#footer'),announcer=document.querySelector('#announcer');
let stored={};try{stored=JSON.parse(localStorage.getItem('dxt-settings')||'{}');}catch{}
const settings={...restoreVisitorSettings(stored),paused:false,sound:false,visual:restoreVisualSettings(stored),visualPreset:VISUAL_PRESET_VERSION};
const save=()=>{try{localStorage.setItem('dxt-settings',JSON.stringify(settings));}catch{}};
let persistentBrand=null,modulePromise=null,pageDisposed=false,preloadTask=Promise.resolve();
const loadExperience=()=>modulePromise??=import('./render/showroom.bundle.js');
const initialPanel=panelFromPath(location.pathname);
let scene=null,phase='loading',selectedPanel=null,intro=null,sections=null,started=false,bootTimedOut=false,startupTimeout=null;
let musicState={enabled:false,status:'idle',title:DEFAULT_TRACK.title,error:null,hasTrack:Boolean(DEFAULT_TRACK.url)};
document.body.dataset.page='home';main.innerHTML=home()+sectionHost();footer.innerHTML=renderRoomFooter();
const host=main.querySelector('.room-hero'),canvas=main.querySelector('#hero-canvas'),sectionRoot=main.querySelector('#room-section-page');
const sectionMedia=new SectionMedia(sectionRoot,{settings});

function updateMusicUI(){
 const sound=header.querySelector('#sound-toggle');
 if(sound){sound.disabled=false;sound.setAttribute('aria-pressed',String(musicState.enabled));sound.setAttribute('aria-label',musicState.enabled?'Pause music':'Play music');sound.title=musicState.error||musicState.title;sound.dataset.musicState=musicState.status;}
 const introSound=document.querySelector('#intro-sound-toggle');
 if(introSound){introSound.hidden=!intro?.activated;introSound.textContent=musicState.enabled?'Pause music':'Resume music';introSound.setAttribute('aria-pressed',String(musicState.enabled));}
 const spin=header.querySelector('#brand-spin');if(spin?.matches('button[data-spin-logo]'))spin.disabled=persistentBrand?!persistentBrand.ready:(phase!=='ready'||Boolean(scene&&!scene.brandLogo?.ready));
 const title=header.querySelector('[data-music-title]');if(title&&title.textContent!==musicState.title)title.textContent=musicState.title;
 const status=header.querySelector('[data-music-status]');const message=musicState.error||(musicState.status==='playing'?'Playing':musicState.status==='loading'?'Loading track...':'Press Sound to play.');if(status&&status.textContent!==message)status.textContent=message;
}
function updateHeader(){
 const open=header.querySelector('.room-audio-menu')?.open,focus=header.contains(document.activeElement)?document.activeElement.id:null;
 header.innerHTML=renderRoomHeader(settings,{returnToShowroom:selectedPanel!==null||Boolean(sections?.returning)});header.querySelector('#quality').disabled=Boolean(scene?.qualityChanging)||sections?.travelling||(phase==='loading'&&!sections?.page);
 if(open)header.querySelector('.room-audio-menu').open=true;
 const homeLink=header.querySelector('.room-home-link');if(selectedPanel!==null)homeLink?.removeAttribute('aria-current');
 header.querySelector('[data-open-panel]')?.setAttribute('aria-controls','room-section-page');
 updateMusicUI();if(focus)header.querySelector(`#${focus}`)?.focus({preventScroll:true});
}
function setLocation(index,mode='push'){
 const path=index===null?'/':pathForPanel(index);
 if(location.pathname!==path&&mode!=='none')history[mode==='replace'?'replaceState':'pushState']({roomPanel:index},'',path);
 document.title=index===null?'DXT | Berserk Drift X':`${ROOM_PANELS[index].title} | DXT`;
}
function unavailable(error){
 if(scene?.disposed)return;phase='unavailable';console.warn('[DXT] Showroom unavailable:',error?.message||error);
 host.classList.remove('scene-ready','camera-travelling');host.classList.add('scene-unavailable');host.dataset.sceneStatus='unavailable';
 sections?.unavailable();updateHeader();intro?.fail();
}
async function onReady(){
 if(bootTimedOut||pageDisposed)return;
 intro?.progress('Preparing destination pages');
 try{await preloadTask;}catch(error){console.warn('[DXT] Destination preload could not finish:',error);}
 if(bootTimedOut||pageDisposed)return;
 clearTimeout(startupTimeout);phase='ready';updateHeader();intro?.ready();sections.ready();
}
const soundtrack=new RoomMusic({settings:settings.music,onState(state){musicState=state;settings.sound=state.enabled;updateMusicUI();scene?.wake();}});
sections=new SectionRoutes({document,host,root:sectionRoot,canvas,footer,getScene:()=>scene,getPhase:()=>phase,
 entered:()=>!intro||intro.released,setLocation,onSelect(index){selectedPanel=index;announcer.textContent=index===null?'Showroom overview.':`Opening ${ROOM_PANELS[index].title}.`;},
 onNeedScene(){if(!started)start();},onPreparePage:async(stage,signal)=>{
  await sectionMedia.experience?.preparePage(stage);
  const {capturePagePreview}=await loadExperience();return capturePagePreview(stage,signal);
 },onRefresh:updateHeader});
updateHeader();
intro=mountIntro(document,{
 primaryDestination:initialPanel===null?'berserk':'page',
 primaryLabel:initialPanel===null||initialPanel===0?'Enter BDX':`Continue to ${ROOM_PANELS[initialPanel].title}`,
 showShowroom:initialPanel===null,
 onActivate(destination){
  save();const audio=soundtrack.setEnabled(true);
  if(destination==='showroom'){
   preloadTask=Promise.all([sections.preload(),sectionMedia.ready]).catch(error=>{if(!pageDisposed)console.warn('[DXT] Destination preparation failed:',error);});
   start();
  }
  return audio;
 },
 onBeforeDismiss(destination){
  if(destination==='berserk')sections.open(0,null,'replace',true);
 },
 onDismiss(){sections.ready();const focus=sections.page?sectionRoot.querySelector('#section-title'):canvas;focus?.focus({preventScroll:true});scene?.wake();startBrand();}
});
const entryNote=document.querySelector('.intro-audio-note');if(entryNote)entryNote.textContent=`Music starts at ${Math.round(settings.music.volume*100)}%`;

// Preserve native new-tab and external-link activation; only authored local routes are intercepted.
document.addEventListener('click',async event=>{
 const target=event.target instanceof Element?event.target:null;
 if(!target||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 if(document.body.classList.contains('intro-pending')&&!target.closest('#intro-sound-toggle'))return;
 const destination=target.closest('[data-section-route], [data-open-panel], [data-fallback-panel]');
 if(destination){event.preventDefault();sections.open(destination.dataset.sectionRoute??destination.dataset.openPanel??destination.dataset.fallbackPanel,destination);return;}
 const brand=target.closest('[data-spin-logo]');
 if(brand){
  event.preventDefault();
  if(sections.returning||sections.capturingReturn)return;
  try{if(persistentBrand)persistentBrand.spin();else scene?.spinLogo();}
  catch(error){console.warn('[DXT] Logo animation unavailable:',error);}
  if(brand.matches('[data-return-showroom]'))sections.close();
  return;
 }
 if(target.closest('[data-return-showroom], [data-reset-room], [data-close-panel]')){event.preventDefault();sections.close();return;}
 const focus=target.closest('[data-focus-panel]');if(focus){scene?.focusPanel(Number(focus.dataset.focusPanel));return;}
 if(target.closest('#quality')){
  if(scene?.qualityChanging||sections.travelling)return;
  settings.qualityPreference='manual';settings.quality=QUALITY_VALUES[(QUALITY_VALUES.indexOf(settings.quality)+1)%QUALITY_VALUES.length];save();
  const preparation=scene?.setSettings();updateHeader();
  await preparation;if(!pageDisposed){save();sectionMedia.experience?.sync();updateHeader();sections.ready();}
 }
 else if(target.closest('#sound-toggle, #intro-sound-toggle')){
  settings.sound=!settings.sound;
  try{await soundtrack.setEnabled(settings.sound);}catch{settings.sound=false;musicState={...musicState,enabled:false,status:'error',error:'Unable to play music. Try again.'};updateMusicUI();}
 }
});
header.addEventListener('input',event=>{
 const input=event.target.closest?.('[data-music-setting]');if(!input)return;
 const key=input.dataset.musicSetting;settings.music=normalizeMusicSettings({...settings.music,[key]:Number(input.value)});
 const output=header.querySelector(`[data-music-value="${key}"]`);if(output)output.textContent=`${Math.round(settings.music[key]*100)}%`;
 soundtrack.setSettings(settings.music);scene?.wake();
});
header.addEventListener('change',event=>{if(event.target.matches?.('[data-music-setting]'))save();});
document.addEventListener('click',event=>{if(!event.target.closest?.('.room-audio-controls'))header.querySelector('.room-audio-menu')?.removeAttribute('open');});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||document.body.classList.contains('intro-pending'))return;
 if(selectedPanel!==null||sections.returning||sections.capturingReturn){event.preventDefault();sections.close('push',sections.returning||sections.capturingReturn);}
 else{const menu=header.querySelector('.room-audio-menu');if(menu?.open){menu.removeAttribute('open');header.querySelector('#music-settings-toggle')?.focus();}}
});
window.addEventListener('popstate',()=>{const index=panelFromPath(location.pathname);if(index===null)sections.close('none');else sections.open(index,null,'none',true);});
window.addEventListener('pagehide',event=>{if(event.persisted){persistentBrand?.suspend();scene?.sleep();soundtrack.suspend();}else{pageDisposed=true;sectionMedia.dispose();persistentBrand?.dispose();clearTimeout(startupTimeout);sections.dispose();intro?.dispose();scene?.dispose();soundtrack.close();}});
window.addEventListener('pageshow',()=>{persistentBrand?.wake();scene?.wake();if(!document.hidden)soundtrack.resume();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)soundtrack.suspend();else soundtrack.resume();});

async function start(){
 if(started)return;started=true;phase='loading';updateHeader();
 startupTimeout=setTimeout(()=>{if(phase!=='loading')return;bootTimedOut=true;unavailable(Error('Showroom preparation timed out.'));scene?.dispose();},60000);startupTimeout.unref?.();
 try{
  await preloadTask;if(bootTimedOut||pageDisposed)return;
  const {HeroScene}=await loadExperience();if(bootTimedOut)return;
  scene=new HeroScene(canvas,settings,{onPanelRequest:(index,trigger)=>sections.open(index,trigger),onResetRequest:()=>sections.close(),onReady,onUnavailable:unavailable,
   onQualityState(busy){
    document.body.classList.toggle('quality-preparing',busy);
    announcer.textContent=busy?'Preparing graphics quality…':'Graphics quality ready.';updateHeader();
   },onQualityError(error){announcer.textContent='Quality could not be changed. Previous setting retained.';console.warn('[DXT] Graphics preparation:',error.message);},
   externalBrand:true,music:soundtrack,introPending:()=>!intro.dismissed,onProgress:caption=>intro.progress(caption),
   onMusicState(state){musicState=state;settings.sound=state.enabled;updateMusicUI();}});
  await scene.readyPromise;
  await preloadTask;
 }catch(error){unavailable(error);if(scene&&!scene.lost)await scene.dispose();}finally{clearTimeout(startupTimeout);}
}
if(initialPanel!==null){phase='dormant';sections.open(initialPanel,null,'none',true);intro.ready();}
// The landing page is ready without loading the showroom. Only the explicit
// 3D choice (or the existing return control) pays for its preparation.
else{phase='dormant';setLocation(null,'none');updateHeader();}
// Embedded/no-cover entrypoints retain the normal showroom fallback.
if(intro.released){startBrand();if(initialPanel===null)start();}
async function startBrand(){
 try{const {PersistentBrand}=await loadExperience();if(pageDisposed||!PersistentBrand)return;
  persistentBrand=new PersistentBrand({document,settings,onState:updateMusicUI});await persistentBrand.readyPromise;
 }catch(error){console.warn('[DXT] Header logo unavailable:',error);}
}
if(new URLSearchParams(location.search).has('debug'))window.__DXT__={inspect:()=>({phase,selectedPanel,settings:{...settings},intro:{entered:intro.activated,closed:intro.dismissed},section:{active:sections.page,travelling:sections.travelling,returning:sections.returning,waitingReturn:sections.waitingReturn},brand:persistentBrand?.inspect()??null,music:soundtrack.inspect(),scene:scene?.inspect()??null})};
