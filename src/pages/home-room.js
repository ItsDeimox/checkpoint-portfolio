import { ROOM_PANELS, getRoomPanel } from './room-panel-data.js';
import {pathForPanel} from '../ui/room-navigation.js';
import { icon, logo } from '../ui/icons.js';

export { ROOM_PANELS } from './room-panel-data.js';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function panelCopy(panel, index) {
  return `<span class="room-panel-copy"><span class="room-panel-number">0${index + 1}</span><strong>${escape(panel.title)}</strong><span class="room-panel-action">${escape(panel.action)} ${icon('external')}</span></span>`;
}

function optionLink(option) {
  return `<a class="room-option" data-room-panel-action="${escape(option.id)}" href="${escape(option.href)}" target="_blank" rel="noopener noreferrer">
    <span class="room-option-symbol">${icon(option.icon)}</span>
    <span class="room-option-copy"><strong>${escape(option.title)}</strong><small>${escape(option.detail)}</small></span>
    ${icon('external', 'room-option-arrow')}<span class="sr-only">Opens in a new tab</span>
  </a>`;
}

/** Native content revealed after the camera reaches the selected screen. */
export function renderPanelOptions(index) {
  const panel = getRoomPanel(index), selected = ROOM_PANELS.indexOf(panel);
  const upcoming = panel.upcoming.length ? `<ul class="room-upcoming-list">${panel.upcoming.map(project => `<li>
      <span class="room-option-symbol">${icon(project.icon)}</span>
      <span><strong>${escape(project.name)}</strong><small>${escape(project.description)}</small></span>
      <span class="room-upcoming-status">Coming soon</span>
    </li>`).join('')}</ul>` : '';
  const about = panel.paragraphs.length ? `<div class="room-about-copy">${panel.paragraphs.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</div>` : '';
  const options = `<div class="room-option-list">${panel.options.map(optionLink).join('')}</div>`;
  return `<div class="room-options-topline"><span class="room-options-number">0${selected + 1} / DXT</span><button class="room-options-close" type="button" data-close-panel data-room-panel-action="back" aria-label="Back to showroom">${icon('arrow')}<span>Back</span></button></div>
    <h2 id="room-options-title" tabindex="-1">${escape(panel.title)}</h2>
    <p id="room-options-description" class="room-options-description">${escape(panel.description)}</p>
    ${upcoming}${about}${options}`;
}

export function home() {
  return `<div class="home-page room-home">
    <section class="hero room-hero" aria-labelledby="room-title" data-active-panel="0">
      <h1 id="room-title" class="sr-only">DXT — Creator. Drifter. Builder.</h1>
      <p id="room-instructions" class="sr-only">Explore the DXT showroom. Move the mouse to look around, touch and drag on mobile, or use the arrow keys. Home resets the view. Use Tab to reach the five project panels. Activate a panel to travel through its portal to a dedicated page. Use Tab to explore page links and Enter to open them. Escape returns to the showroom.</p>
      <div class="room-loading" role="status" aria-live="polite">
        ${logo('dxt', 'room-loading-logo')}
        <span class="room-loading-line" aria-hidden="true"></span>
        <span class="room-loading-caption">Opening the showroom</span>
      </div>
      <div class="room-unavailable-message" role="status" aria-live="polite" aria-atomic="true">
        <span class="room-unavailable-eyebrow">3D showroom unavailable</span>
        <h2>Keep exploring.</h2>
        <p data-room-status>This browser couldn’t start the 3D scene. Every part of DXT is still open below.</p>
      </div>
      <canvas id="hero-canvas" tabindex="0" aria-label="Interactive DXT showroom" aria-describedby="room-instructions"></canvas>
      <nav class="room-panel-targets" aria-label="Explore DXT">
        ${ROOM_PANELS.map((panel, index) => `<button class="room-panel-link" type="button" data-panel="${index}" data-open-panel="${index}" data-panel-title="${escape(panel.title)}" aria-controls="room-section-page" aria-label="Explore ${escape(panel.title)}">${panelCopy(panel, index)}</button>`).join('')}
        ${ROOM_PANELS.map((panel, index) => `<a class="room-panel-fallback-link" data-fallback-panel="${index}" href="${pathForPanel(index)}" aria-label="${escape(panel.title)}">${panelCopy(panel, index)}</a>`).join('')}
      </nav>
      <div class="room-mobile-context" aria-label="Selected panel">
        <span class="room-mobile-number" data-active-panel-number aria-hidden="true">01 <span>/ 05</span></span>
        <span class="room-mobile-title" data-active-panel-title aria-live="polite" aria-atomic="true">Berserk Drift X</span>
        <button id="room-open-panel" class="room-mobile-open" type="button" data-active-panel-open data-open-panel="0" aria-controls="room-section-page" aria-label="Explore Berserk Drift X"><span>Explore</span>${icon('external')}</button>
      </div>
      <section id="room-panel-options" class="room-panel-options" data-panel-options hidden role="dialog" aria-modal="true" aria-labelledby="room-options-title" aria-describedby="room-options-description" tabindex="-1"></section>
    </section>
  </div>`;
}
