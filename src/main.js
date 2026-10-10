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
let scene=null,phase='loading',selectedPanel=null,intro=null,sections=null,started=false,bootTimedOut=false,startupTimeout=null;
let musicState={enabled:false,status:'idle',title:DEFAULT_TRACK.title,error:null,hasTrack:Boolean(DEFAULT_TRACK.url)};
document.body.dataset.page='home';main.innerHTML=home()+sectionHost();footer.innerHTML=renderRoomFooter();
const host=main.querySelector('.room-hero'),canvas=main.querySelector('#hero-canvas'),sectionRoot=main.querySelector('#room-section-page');

function updateMusicUI(){
 const sound=header.querySelector('#sound-toggle');
 if(sound){sound.disabled=false;sound.setAttribute('aria-pressed',String(musicState.enabled));sound.setAttribute('aria-label',musicState.enabled?'Pause music':'Play music');sound.title=musicState.error||musicState.title;sound.dataset.musicState=musicState.status;}
 const introSound=document.querySelector('#intro-sound-toggle');
 if(introSound){introSound.hidden=!intro?.activated;introSound.textContent=musicState.enabled?'Pause music':'Resume music';introSound.setAttribute('aria-pressed',String(musicState.enabled));}
 const spin=header.querySelector('#brand-spin');if(spin)spin.disabled=phase!=='ready'||Boolean(sections?.page)||Boolean(scene&&!scene.brandLogo?.ready);
 const title=header.querySelector('[data-music-title]');if(title&&title.textContent!==musicState.title)title.textContent=musicState.title;
 const status=header.querySelector('[data-music-status]');const message=musicState.error||(musicState.status==='playing'?'Playing':musicState.status==='loading'?'Loading track...':'Press Sound to play.');if(status&&status.textContent!==message)status.textContent=message;
}
function updateHeader(){
 const open=header.querySelector('.room-audio-menu')?.open,focus=header.contains(document.activeElement)?document.activeElement.id:null;
 header.innerHTML=renderRoomHeader(settings);header.querySelector('#quality').disabled=phase==='loading'&&!sections?.page;
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
function onReady(){
 if(bootTimedOut)return;clearTimeout(startupTimeout);phase='ready';updateHeader();intro?.ready();sections.ready();
}
const soundtrack=new RoomMusic({settings:settings.music,onState(state){musicState=state;settings.sound=state.enabled;updateMusicUI();scene?.wake();}});
sections=new SectionRoutes({document,host,root:sectionRoot,canvas,footer,getScene:()=>scene,getPhase:()=>phase,
 entered:()=>!intro||intro.dismissed,setLocation,onSelect(index){selectedPanel=index;announcer.textContent=index===null?'Showroom overview.':`Opening ${ROOM_PANELS[index].title}.`;},
 onNeedScene(){if(!started)start();},onRefresh:updateHeader});
updateHeader();
intro=mountIntro(document,{onActivate(){save();return soundtrack.setEnabled(true);},onDismiss(){sections.ready();const focus=sections.page?sectionRoot.querySelector('#section-title'):canvas;focus?.focus({preventScroll:true});scene?.wake();}});
const entryNote=document.querySelector('.intro-audio-note');if(entryNote)entryNote.textContent=`Click to enter · Music starts at ${Math.round(settings.music.volume*100)}%`;

// Preserve native new-tab and external-link activation; only authored local routes are intercepted.
document.addEventListener('click',async event=>{
 const target=event.target instanceof Element?event.target:null;
 if(!target||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const destination=target.closest('[data-section-route], [data-open-panel], [data-fallback-panel]');
 if(destination){event.preventDefault();sections.open(destination.dataset.sectionRoute??destination.dataset.openPanel??destination.dataset.fallbackPanel,destination);return;}
 if(target.closest('[data-return-showroom], [data-reset-room], [data-close-panel]')){event.preventDefault();sections.close();return;}
 if(target.closest('[data-spin-logo]')){event.preventDefault();scene?.spinLogo();return;}
 const focus=target.closest('[data-focus-panel]');if(focus){scene?.focusPanel(Number(focus.dataset.focusPanel));return;}
 if(target.closest('#quality')){settings.qualityPreference='manual';settings.quality=QUALITY_VALUES[(QUALITY_VALUES.indexOf(settings.quality)+1)%QUALITY_VALUES.length];save();scene?.setSettings();updateHeader();}
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
 if(event.key!=='Escape')return;
 if(selectedPanel!==null||sections.returning){event.preventDefault();sections.close('push',sections.returning);}
 else{const menu=header.querySelector('.room-audio-menu');if(menu?.open){menu.removeAttribute('open');header.querySelector('#music-settings-toggle')?.focus();}}
});
window.addEventListener('popstate',()=>{const index=panelFromPath(location.pathname);if(index===null)sections.close('none');else sections.open(index,null,'none',true);});
window.addEventListener('pagehide',event=>{if(event.persisted){scene?.sleep();soundtrack.suspend();}else{clearTimeout(startupTimeout);sections.dispose();intro?.dispose();scene?.dispose();soundtrack.close();}});
window.addEventListener('pageshow',()=>{scene?.wake();if(!document.hidden)soundtrack.resume();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)soundtrack.suspend();else soundtrack.resume();});

async function start(){
 if(started)return;started=true;phase='loading';updateHeader();
 startupTimeout=setTimeout(()=>{if(phase!=='loading')return;bootTimedOut=true;unavailable(Error('Showroom preparation timed out.'));scene?.dispose();},60000);startupTimeout.unref?.();
 try{
  const {HeroScene}=await import('./render/showroom.bundle.js');if(bootTimedOut)return;
  scene=new HeroScene(canvas,settings,{onPanelRequest:(index,trigger)=>sections.open(index,trigger),onResetRequest:()=>sections.close(),onReady,onUnavailable:unavailable,
   music:soundtrack,introPending:()=>!intro.dismissed,onProgress:caption=>intro.progress(caption),
   onMusicState(state){musicState=state;settings.sound=state.enabled;updateMusicUI();}});
  await scene.readyPromise;
 }catch(error){unavailable(error);if(scene&&!scene.lost)await scene.dispose();}finally{clearTimeout(startupTimeout);}
}
const initialPanel=panelFromPath(location.pathname);
if(initialPanel!==null){phase='dormant';sections.open(initialPanel,null,'none',true);intro.ready();}
else{setLocation(null,'none');start();}
if(new URLSearchParams(location.search).has('debug'))window.__DXT__={inspect:()=>({phase,selectedPanel,settings:{...settings},intro:{entered:intro.activated,closed:intro.dismissed},section:{active:sections.page,travelling:sections.travelling,returning:sections.returning,waitingReturn:sections.waitingReturn},music:soundtrack.inspect(),scene:scene?.inspect()??null})};
