import {icon,logo} from './icons.js';
import {DEFAULT_TRACK,normalizeMusicSettings} from '../scene/room-music-settings.js';
import {qualityLabel} from './room-visitor-settings.js';
export {renderRoomFooter} from './room-shell.js';
const volumeIcon='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14"/></svg>';
export function renderRoomHeader(settings={}){
 const music=normalizeMusicSettings(settings.music),sound=Boolean(settings.sound),label=qualityLabel(settings.quality);
 return `<div class="room-header-bar room-visitor-bar">
  <button id="brand-spin" type="button" data-spin-logo class="room-brand" aria-label="Rotate DXT logo" title="Rotate DXT logo">
   ${logo('dxt','room-brand-logo')}<span class="room-brand-roles" aria-hidden="true"><span>Creator</span><span>Drifter</span><span>Builder</span></span>
  </button>
  <p class="room-motto">Same passion. Different roads</p>
  <nav class="room-header-nav" aria-label="Main navigation">
   <a href="/" data-reset-room class="room-home-link" aria-current="page">Home</a>
   <div class="room-audio-controls">
    <button id="sound-toggle" class="room-sound" type="button" aria-pressed="${sound}" aria-label="${sound?'Pause':'Play'} music"><span>Sound</span><span class="room-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
    <details class="room-audio-menu">
     <summary id="music-settings-toggle" aria-label="Music volume and light response" title="Music settings">${volumeIcon}</summary>
     <div class="room-audio-popup">
      <span class="room-audio-eyebrow">Showroom soundtrack</span>
      <strong data-music-title>${DEFAULT_TRACK.title}</strong><p data-music-status role="status">Music starts on entry</p>
      <label class="room-visual-control" for="music-volume"><span>Volume</span><output for="music-volume" data-music-value="volume">${Math.round(music.volume*100)}%</output><input id="music-volume" data-music-setting="volume" type="range" min="0" max="1" step=".01" value="${music.volume}"></label>
      <label class="room-visual-control" for="music-reactivity"><span>Light response</span><output for="music-reactivity" data-music-value="reactivity">${Math.round(music.reactivity*100)}%</output><input id="music-reactivity" data-music-setting="reactivity" type="range" min="0" max="1" step=".01" value="${music.reactivity}"></label>
      <p class="room-audio-hint">Tap Sound to pause or resume.</p>
     </div>
    </details>
   </div>
   <button id="quality" class="room-quality" type="button" aria-label="Rendering quality: ${label}. Activate to change quality." title="Low / Medium / High"><span>Quality</span><strong>${label}</strong></button>
   <button type="button" data-open-panel="3" class="room-enter" aria-label="Enter DXT" aria-controls="room-panel-options"><span>Enter DXT</span>${icon('external')}</button>
  </nav>
 </div>`;
}
