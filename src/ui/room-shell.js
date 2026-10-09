import { icon, logo } from './icons.js';
import { ROOM_PANELS } from '../pages/home-room.js';

const settingsIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg>`;

export function renderRoomHeader(settings = {}) {
  const quality = ['auto', 'low', 'high'].includes(settings.quality) ? settings.quality : 'auto';
  const paused = Boolean(settings.paused);
  const sound = Boolean(settings.sound);
  return `<div class="room-header-bar">
    <a href="/" data-reset-room class="room-brand" aria-label="DXT home">
      ${logo('dxt', 'room-brand-logo')}
      <span class="room-brand-roles" aria-hidden="true"><span>Creator</span><span>Drifter</span><span>Builder</span></span>
    </a>
    <p class="room-motto">Same passion. Different roads</p>
    <nav class="room-header-nav" aria-label="Main navigation">
      <a href="/" data-reset-room class="room-home-link" aria-current="page">Home</a>
      <button id="sound-toggle" class="room-sound" type="button" aria-pressed="${sound}" aria-label="${sound ? 'Mute showroom sound' : 'Enable showroom sound'}"><span>Sound</span><span class="room-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
      <button type="button" data-open-panel="3" class="room-enter" aria-haspopup="dialog" aria-controls="room-panel-options">Enter DXT ${icon('external')}</button>
    </nav>
    <details class="room-settings">
      <summary class="room-settings-toggle" aria-label="View and motion settings" title="View settings">${settingsIcon}<span class="sr-only">View settings</span></summary>
      <div class="room-settings-panel">
        <span class="room-settings-caption">Showroom</span>
        <button id="quality" type="button" aria-label="Rendering quality: ${quality}. Activate to change quality."><span>Quality</span><span class="room-setting-value">${quality}</span></button>
        <button id="pause" type="button" aria-pressed="${paused}" aria-label="${paused ? 'Resume' : 'Pause'} animated effects"><span>${icon(paused ? 'play' : 'pause')} Motion</span><span class="room-setting-value">${paused ? 'Paused' : 'On'}</span></button>
        <button id="reset-view" type="button" data-reset-room aria-label="Reset showroom camera"><span>Reset view</span><span class="room-reset-symbol" aria-hidden="true">↺</span></button>
        <p>Drag or use the arrow keys to explore.</p><a class="room-credits" href="/assets/models/NISSAN-S15-LICENSE.txt" target="_blank" rel="noopener noreferrer">3D model credits ↗</a>
      </div>
    </details>
  </div>`;
}

export function renderRoomFooter() {
  return `<span class="room-copyright">DXT, 2024</span>
    <div class="room-bottom-center">
      <div class="room-orbit-cue" aria-hidden="true"><span class="room-mouse"><i></i></span><span>Drag to explore</span></div>
      <nav class="room-progress" aria-label="Showroom panels">
        ${ROOM_PANELS.map((panel, index) => `<button class="room-step${index === 0 ? ' is-active' : ''}" type="button" data-focus-panel="${index}" aria-label="Focus panel ${index + 1}: ${panel.title}" aria-pressed="${index === 0}"><span aria-hidden="true"></span></button>`).join('')}
      </nav>
    </div>
    <span class="room-signoff">Built different <i aria-hidden="true"></i></span>`;
}
