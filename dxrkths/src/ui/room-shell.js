import { DEFAULT_TRACK, normalizeMusicSettings } from '../scene/room-music-settings.js';
import { icon, logo } from './icons.js';
import { ROOM_PANELS } from '../pages/home-room.js';
import { VISUAL_CONTROLS, normalizeVisualSettings } from '../scene/room-visual-settings.js';

const settingsIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg>`;

export function renderRoomHeader(settings = {}) {
  const quality = ['auto', 'low', 'high'].includes(settings.quality) ? settings.quality : 'auto';
  const paused = Boolean(settings.paused);
  const sound = Boolean(settings.sound);
  const visual = normalizeVisualSettings(settings.visual);
  const music = normalizeMusicSettings(settings.music);
  return `<div class="room-header-bar">
    <button id="brand-spin" type="button" data-spin-logo class="room-brand" aria-label="Rotate DXT logo" title="Rotate DXT logo">
      ${logo('dxt', 'room-brand-logo')}
      <span class="room-brand-roles" aria-hidden="true"><span>Creator</span><span>Drifter</span><span>Builder</span></span>
    </button>
    <p class="room-motto">Same passion. Different roads</p>
    <nav class="room-header-nav" aria-label="Main navigation">
      <a href="/" data-reset-room class="room-home-link" aria-current="page">Home</a>
      <button id="sound-toggle" class="room-sound" type="button" aria-pressed="${sound}" aria-label="${sound ? 'Mute showroom sound' : 'Enable showroom sound'}"><span>Sound</span><span class="room-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
      <button type="button" data-open-panel="3" class="room-enter" aria-controls="room-panel-options">Enter DXT ${icon('external')}</button>
    </nav>
    <details class="room-settings">
      <summary class="room-settings-toggle" aria-label="View and motion settings" title="View settings">${settingsIcon}<span class="sr-only">View settings</span></summary>
      <div class="room-settings-panel">
        <span class="room-settings-caption">Showroom</span>
        <button id="quality" type="button" aria-label="Rendering quality: ${quality}. Activate to change quality."><span>Quality</span><span class="room-setting-value">${quality}</span></button>
        <button id="pause" type="button" aria-pressed="${paused}" aria-label="${paused ? 'Resume' : 'Pause'} animated effects"><span>${icon(paused ? 'play' : 'pause')} Motion</span><span class="room-setting-value">${paused ? 'Paused' : 'On'}</span></button>
        <button id="reset-view" type="button" data-reset-room aria-label="Reset showroom camera"><span>Reset view</span><span class="room-reset-symbol" aria-hidden="true">↺</span></button>
        <details class="room-music-controls">
          <summary>Music &amp; reactive lights</summary>
          <p class="room-track-title" data-music-title>${DEFAULT_TRACK.title}</p>
          <p data-music-status role="status">Press Sound to play.</p>
          <label class="room-visual-control" for="music-volume"><span>Volume</span><output for="music-volume" data-music-value="volume">${Math.round(music.volume*100)}%</output><input id="music-volume" data-music-setting="volume" type="range" min="0" max="1" step=".01" value="${music.volume}"></label>
          <label class="room-visual-control" for="music-reactivity"><span>Light response</span><output for="music-reactivity" data-music-value="reactivity">${Math.round(music.reactivity*100)}%</output><input id="music-reactivity" data-music-setting="reactivity" type="range" min="0" max="1" step=".01" value="${music.reactivity}"></label>
          <button id="choose-music" type="button" data-music-choose>Choose a local track ${icon('music')}</button>
          <input id="music-file" class="sr-only" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm" tabindex="-1" aria-label="Choose a local audio file">
          <button id="default-music" type="button" data-music-default>Clear local track ${icon('pause')}</button>
          <p>Local files play only on this device. Motion off disables reactive lights.</p>
        </details>
        <fieldset class="room-visual-controls"><legend>Light &amp; lens</legend>
          ${VISUAL_CONTROLS.map(control => `<label class="room-visual-control" for="visual-${control.key}"><span>${control.label}</span><output for="visual-${control.key}" data-visual-value="${control.key}">${visual[control.key].toFixed(2)}</output><input id="visual-${control.key}" data-visual-setting="${control.key}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${visual[control.key]}"></label>`).join('')}
        </fieldset>
        <button id="reset-visuals" type="button" data-reset-visuals><span>Restore visual defaults</span><span class="room-reset-symbol" aria-hidden="true">↺</span></button>
        <p>Move your mouse to look around. Touch and drag on mobile. Arrow keys also work.</p><a class="room-credits" href="/assets/models/NISSAN-S15-LICENSE.txt" target="_blank" rel="noopener noreferrer">3D model credits ↗</a>
      </div>
    </details>
  </div>`;
}

export function renderRoomFooter() {
  return `<span class="room-copyright">DXT, 2024</span>
    <div class="room-bottom-center">
      <div class="room-orbit-cue" aria-hidden="true"><span class="room-mouse"><i></i></span><span class="room-mouse-cue">Move to explore</span><span class="room-touch-cue">Drag to explore</span></div>
      <nav class="room-progress" aria-label="Showroom panels">
        ${ROOM_PANELS.map((panel, index) => `<button class="room-step${index === 0 ? ' is-active' : ''}" type="button" data-focus-panel="${index}" aria-label="Focus panel ${index + 1}: ${panel.title}" aria-pressed="${index === 0}"><span aria-hidden="true"></span></button>`).join('')}
      </nav>
    </div>
    <span class="room-signoff">Built different <i aria-hidden="true"></i></span>`;
}
