import { home, ROOM_PANELS, renderPanelOptions } from './pages/home-room.js';
import { renderRoomHeader, renderRoomFooter } from './ui/room-shell.js';
import { panelFromPath, pathForPanel } from './ui/room-navigation.js';
import { normalizeVisualSettings, DEFAULT_VISUAL_SETTINGS } from './scene/room-visual-settings.js';

const main = document.querySelector('#main');
const header = document.querySelector('#header');
const footer = document.querySelector('#footer');
const announcer = document.querySelector('#announcer');
let stored = {};
try { stored = JSON.parse(localStorage.getItem('dxt-settings') || '{}'); } catch {}
const settings = {
  quality: ['auto', 'low', 'high'].includes(stored?.quality) ? stored.quality : 'auto',
  paused: Boolean(stored?.paused), sound: false,
  visual: normalizeVisualSettings(stored?.visual),
};
const save = () => { try { localStorage.setItem('dxt-settings', JSON.stringify(settings)); } catch {} };
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
  const open = header.querySelector('.room-settings')?.open;
  const focusedId = header.contains(document.activeElement) ? document.activeElement.id : null;
  header.innerHTML = renderRoomHeader(settings);
  header.querySelector('#quality').disabled = phase === 'loading';
  if (open) header.querySelector('.room-settings').open = true;
  if (focusedId) header.querySelector(`#${focusedId}`)?.focus({ preventScroll: true });
}
updateHeader();

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
  if (selectedPanel !== null) revealOptions(selectedPanel, navigation);
}

function onReady() {
  phase = 'ready';
  updateHeader();
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
  if (target.closest('[data-reset-visuals]')) {
    settings.visual = { ...DEFAULT_VISUAL_SETTINGS };
    save(); scene?.setVisualSettings(settings.visual); updateHeader(); return;
  }
  if (target.closest('#quality')) {
    const values = ['auto', 'low', 'high'];
    settings.quality = values[(values.indexOf(settings.quality) + 1) % values.length];
    save(); scene?.setSettings(); updateHeader();
  } else if (target.closest('#pause')) {
    settings.paused = !settings.paused;
    save(); scene?.setSettings(); updateHeader();
  } else if (target.closest('#sound-toggle')) {
    try { settings.sound = await scene?.setSound(!settings.sound) || false; }
    catch { settings.sound = false; }
    updateHeader();
  }
});

header.addEventListener('input', event => {
  const input = event.target.closest?.('[data-visual-setting]');
  if (!input) return;
  const key = input.dataset.visualSetting;
  settings.visual = normalizeVisualSettings({ [key]: Number(input.value) }, settings.visual);
  const output = header.querySelector(`[data-visual-value="${key}"]`);
  if (output) output.textContent = settings.visual[key].toFixed(2);
  scene?.setVisualSettings(settings.visual);
});
header.addEventListener('change', event => {
  if (event.target.matches?.('[data-visual-setting]')) save();
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
    else header.querySelector('.room-settings')?.removeAttribute('open');
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
  if (event.persisted) scene?.sleep();
  else scene?.dispose();
});
window.addEventListener('pageshow', () => scene?.wake());

const initialPanel = panelFromPath(location.pathname);
if (initialPanel !== null) openPanel(initialPanel, null, 'none');
else setLocation(null, 'none');

async function start() {
  // The UI and fallback links are usable while the renderer bundle downloads.
  try {
    const { HeroScene } = await import('./render/showroom.bundle.js');
    scene = new HeroScene(canvas, settings, {
      onPanelRequest: openPanel, onResetRequest: closePanel, onReady, onUnavailable: unavailable,
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
  }
}
start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__DXT__ = { inspect: () => ({ phase, selectedPanel, settings: { ...settings }, scene: scene?.inspect() ?? null }) };
}
