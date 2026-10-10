import { DEFAULT_TRACK, normalizeMusicSettings } from './scene/room-music-settings.js';
import { home, ROOM_PANELS, renderPanelOptions } from './pages/home-room.js';
import { renderRoomHeader, renderRoomFooter } from './ui/room-visitor-shell.js';
import { mountIntro } from './ui/room-intro.js';
import { restoreVisitorSettings, QUALITY_VALUES } from './ui/room-visitor-settings.js';
import { RoomMusic } from './scene/room-music.js';
import { panelFromPath, pathForPanel } from './ui/room-navigation.js';
import { VISUAL_PRESET_VERSION, restoreVisualSettings } from './scene/room-visual-settings.js';

const main = document.querySelector('#main');
const header = document.querySelector('#header');
const footer = document.querySelector('#footer');
const announcer = document.querySelector('#announcer');
let stored = {};
try { stored = JSON.parse(localStorage.getItem('dxt-settings') || '{}'); } catch {}
const settings = {
  ...restoreVisitorSettings(stored),
  paused: false, sound: false,
  visual: restoreVisualSettings(stored),
  visualPreset: VISUAL_PRESET_VERSION,
};
const save = () => { try { localStorage.setItem('dxt-settings', JSON.stringify(settings)); } catch {} };
let musicState = {enabled:false,status:'idle',title:DEFAULT_TRACK.title,error:null,hasTrack:Boolean(DEFAULT_TRACK.url)};
let intro = null, bootTimedOut = false, startupTimeout = null;
let scene = null, phase = 'loading', selectedPanel = null, navigation = 0, restoreFocus = null;

document.body.dataset.page = 'home';
main.innerHTML = home();
footer.innerHTML = renderRoomFooter();
const host = main.querySelector('.room-hero');
const options = main.querySelector('#room-panel-options');
const canvas = main.querySelector('#hero-canvas');
const nativeTargets = main.querySelector('.room-panel-targets');
const mobileContext = main.querySelector('.room-mobile-context');

function updateHeader() {
  const musicOpen = header.querySelector('.room-audio-menu')?.open;
  const focusedId = header.contains(document.activeElement) ? document.activeElement.id : null;
  header.innerHTML = renderRoomHeader(settings);
  header.querySelector('#quality').disabled = phase === 'loading';
  if (musicOpen) header.querySelector('.room-audio-menu').open = true;
  updateMusicUI();
  if (focusedId) header.querySelector(`#${focusedId}`)?.focus({ preventScroll: true });
}
updateHeader();

function updateMusicUI() {
  const sound=header.querySelector('#sound-toggle');
  if(sound){
    sound.disabled=false;sound.setAttribute('aria-pressed',String(musicState.enabled));
    sound.setAttribute('aria-label',musicState.enabled?'Pause music':'Play music');
    sound.title=musicState.error||musicState.title;
    sound.dataset.musicState=musicState.status;
  }
  const introSound=document.querySelector('#intro-sound-toggle');
  if(introSound){introSound.hidden=!intro?.activated;introSound.textContent=musicState.enabled?'Pause music':'Resume music';introSound.setAttribute('aria-pressed',String(musicState.enabled));}
  const spin=header.querySelector('#brand-spin');
  if(spin)spin.disabled=phase!=='ready'||Boolean(scene&&!scene.brandLogo?.ready);
  const title=header.querySelector('[data-music-title]');
  if(title&&title.textContent!==musicState.title)title.textContent=musicState.title;
  const status=header.querySelector('[data-music-status]');
  const message=musicState.error||(musicState.status==='playing'?'Playing':musicState.status==='loading'?'Loading track...':'Press Sound to play.');
  if(status&&status.textContent!==message)status.textContent=message;
}

// Music belongs to the page, so the first gesture works even while WebGL loads.
const soundtrack = new RoomMusic({settings:settings.music,onState(state){
  musicState=state;settings.sound=state.enabled;updateMusicUI();scene?.wake();
}});
intro=mountIntro(document,{
  onActivate(){save();return soundtrack.setEnabled(true);},
  onDismiss(){
    setPanelPresentation(!options.hidden,phase==='ready');
    const focus=!options.hidden?options.querySelector('h2'):phase==='ready'?canvas:nativeTargets.querySelector('a');
    focus?.focus({preventScroll:true});scene?.wake();
  },
});
const entryNote=document.querySelector('.intro-audio-note');
if(entryNote)entryNote.textContent=`Click to enter · Music starts at ${Math.round(settings.music.volume*100)}%`;

function setLocation(index, mode = 'push') {
  const path = index === null ? '/' : pathForPanel(index);
  if (location.pathname !== path && mode !== 'none') {
    history[mode === 'replace' ? 'replaceState' : 'pushState']({ roomPanel: index }, '', path);
  }
  document.title = index === null ? 'DXT | Berserk Drift X' : `${ROOM_PANELS[index].title} | DXT`;
}

function setPanelPresentation(active, inWorld = false) {
  const modal = active && !inWorld;
  [header, footer, canvas].forEach(element => { element.inert = modal; });
  [nativeTargets, mobileContext].forEach(element => { element.inert = active; });
  host.classList.toggle('panel-options-open', modal);
  host.classList.toggle('panel-content-open', active && inWorld);
  options.classList.toggle('is-world-content', active && inWorld);
  options.setAttribute('role', inWorld ? 'group' : 'dialog');
  if (inWorld) options.removeAttribute('aria-modal');
  else options.setAttribute('aria-modal', 'true');
}

function revealOptions(index, token) {
  if (token !== navigation || selectedPanel !== index) return;
  options.innerHTML = renderPanelOptions(index);
  options.hidden = false;
  options.scrollTop = 0;
  const inWorld = phase === 'ready' && scene?.ready;
  setPanelPresentation(true, inWorld);
  if (inWorld) scene.showPanelContent(index);
  options.querySelector('h2').focus({ preventScroll: true });
  announcer.textContent = `${ROOM_PANELS[index].title}. Options are open.`;
}

function openPanel(index, trigger, historyMode = 'push') {
  index = Number(index);
  if (!Number.isInteger(index) || index < 0 || index >= ROOM_PANELS.length) return;
  const token = ++navigation;
  if (options.hidden) restoreFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
  options.hidden = true;
  setPanelPresentation(false);
  selectedPanel = index;
  setLocation(index, historyMode);
  announcer.textContent = `Opening ${ROOM_PANELS[index].title}.`;
  if (phase === 'ready' && scene?.ready) {
    scene.approach(index, () => revealOptions(index, token));
  } else if (phase === 'unavailable') {
    revealOptions(index, token);
  }
  // During initial loading, onReady continues this request without reloading.
}

function closePanel(historyMode = 'push') {
  const token = ++navigation;
  const wasOpen = selectedPanel !== null;
  selectedPanel = null;
  options.hidden = true;
  setPanelPresentation(false);
  setLocation(null, historyMode);
  host.classList.remove('camera-travelling');
  const finish = () => {
    if (token !== navigation) return;
    if (wasOpen) {
      const target = phase === 'ready' ? canvas : (restoreFocus?.isConnected && restoreFocus.getClientRects().length ? restoreFocus : nativeTargets.querySelector('a'));
      target?.focus({ preventScroll: true });
    }
    announcer.textContent = 'Showroom overview.';
  };
  if (phase === 'ready' && scene?.ready) scene.reset(finish);
  else finish();
}

function unavailable(error) {
  if (scene?.disposed) return;
  phase = 'unavailable';
  console.warn('[DXT] Showroom unavailable:', error?.message || error);
  host.classList.remove('scene-ready', 'camera-travelling');
  host.classList.add('scene-unavailable');
  host.dataset.sceneStatus = 'unavailable';
  updateMusicUI();intro?.fail();
  if (selectedPanel !== null) revealOptions(selectedPanel, navigation);
}

function onReady() {
  if(bootTimedOut)return;clearTimeout(startupTimeout);
  phase = 'ready';
  updateHeader();intro?.ready();
  if (selectedPanel !== null) {
    const token = navigation;
    // A restored context replaces the native fallback with the surface menu.
    options.hidden = true;
    setPanelPresentation(false);
    scene.approach(selectedPanel, () => revealOptions(selectedPanel, token));
  } else if (scene?.cameraRig?.mode !== 'overview') {
    scene?.reset();
  }
}

document.addEventListener('click', async event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (target.closest('[data-spin-logo]')) {event.preventDefault();scene?.spinLogo();return;}
  const open = target.closest('[data-open-panel]');
  if (open) { event.preventDefault(); openPanel(open.dataset.openPanel, open); return; }
  const fallback = target.closest('[data-fallback-panel]');
  if (fallback) {
    event.preventDefault();
    openPanel(fallback.dataset.fallbackPanel, fallback);
    return;
  }
  if (target.closest('[data-close-panel], [data-reset-room]')) {
    event.preventDefault(); closePanel(); return;
  }
  const focus = target.closest('[data-focus-panel]');
  if (focus) { scene?.focusPanel(Number(focus.dataset.focusPanel)); return; }
  if (target.closest('#quality')) {
    const values = QUALITY_VALUES;
    settings.quality = values[(values.indexOf(settings.quality) + 1) % values.length];
    save(); scene?.setSettings(); updateHeader();
  } else if (target.closest('#sound-toggle, #intro-sound-toggle')) {
    // Intent changes synchronously. Late play promises never overwrite a newer click.
    settings.sound = !settings.sound;
    try {await soundtrack.setEnabled(settings.sound);}
    catch {settings.sound=false;musicState={...musicState,enabled:false,status:'error',error:'Unable to play music. Try again.'};updateMusicUI();}
  }
});

header.addEventListener('input', event => {
  const music = event.target.closest?.('[data-music-setting]');
  if (music) {
    const key=music.dataset.musicSetting;
    settings.music=normalizeMusicSettings({...settings.music,[key]:Number(music.value)});
    const output=header.querySelector(`[data-music-value="${key}"]`);
    if(output)output.textContent=`${Math.round(settings.music[key]*100)}%`;
    soundtrack.setSettings(settings.music);scene?.wake();return;
  }
});
header.addEventListener('change', event => {
  if (event.target.matches?.('[data-music-setting]')) save();
});
document.addEventListener('click',event=>{
  if(!event.target.closest?.('.room-audio-controls'))header.querySelector('.room-audio-menu')?.removeAttribute('open');
});
options.addEventListener('focusin', event => {
  if (!options.classList.contains('is-world-content')) return;
  scene?.focusAction(event.target.closest?.('[data-room-panel-action]')?.dataset.roomPanelAction ?? null);
});
options.addEventListener('focusout', event => {
  if (!options.contains(event.relatedTarget)) scene?.focusAction(null);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (selectedPanel !== null || !options.hidden) { event.preventDefault(); closePanel(); }
    else {const menu=header.querySelector('.room-audio-menu');if(menu?.open){menu.removeAttribute('open');header.querySelector('#music-settings-toggle')?.focus();}}
  }
  if (event.key === 'Tab' && !options.hidden && options.getAttribute('role') === 'dialog') {
    const controls = [...options.querySelectorAll('a[href], button:not([disabled])')].filter(element => element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (!first) { event.preventDefault(); options.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
});
window.addEventListener('popstate', () => {
  const panel = panelFromPath(location.pathname);
  if (panel === null) closePanel('none');
  else openPanel(panel, null, 'none');
});
window.addEventListener('pagehide', event => {
  if (event.persisted) {scene?.sleep();soundtrack.suspend();}
  else {clearTimeout(startupTimeout);intro?.dispose();scene?.dispose();soundtrack.close();}
});
window.addEventListener('pageshow', () => {scene?.wake();if(!document.hidden)soundtrack.resume();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)soundtrack.suspend();else soundtrack.resume();});

const initialPanel = panelFromPath(location.pathname);
if (initialPanel !== null) openPanel(initialPanel, null, 'none');
else setLocation(null, 'none');

async function start() {
  // The UI and fallback links are usable while the renderer bundle downloads.
  startupTimeout=setTimeout(()=>{
    if(phase!=='loading')return;
    bootTimedOut=true;unavailable(new Error('Showroom preparation timed out.'));
    scene?.dispose();
  },60000);
  startupTimeout.unref?.();
  try {
    const { HeroScene } = await import('./render/showroom.bundle.js');
    if(bootTimedOut)return;
    scene = new HeroScene(canvas, settings, {
      onPanelRequest: openPanel, onResetRequest: closePanel, onReady, onUnavailable: unavailable,
      music:soundtrack,introPending:()=>!intro.dismissed,
      onProgress:caption=>intro.progress(caption),
      onMusicState(state) {musicState=state;settings.sound=state.enabled;updateMusicUI();},
      onPanelAction(action) {
        if (selectedPanel === null) return;
        if (action.kind === 'back') { closePanel(); return; }
        // Only an action already authored for the selected screen can navigate.
        const authored = ROOM_PANELS[selectedPanel].options.find(option => option.id === action.id && option.href === action.href);
        if (authored) {
          if (authored.external) window.open(authored.href, '_blank', 'noopener,noreferrer');
          else location.assign(authored.href);
        }
      },
    });
    await scene.readyPromise;
  } catch (error) {
    unavailable(error);
    if (scene && !scene.lost) await scene.dispose();
  } finally {clearTimeout(startupTimeout);}
}
start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__DXT__ = { inspect: () => ({ phase, selectedPanel, settings: { ...settings }, intro:{entered:intro.activated,closed:intro.dismissed},music:soundtrack.inspect(),scene: scene?.inspect() ?? null }) };
}
