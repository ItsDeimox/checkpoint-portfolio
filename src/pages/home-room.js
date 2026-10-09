import { CONTENT } from '../content.js';
import { icon, logo } from '../ui/icons.js';

/** The same five destinations are used by the room meshes and native links. */
export const ROOM_PANELS = Object.freeze([
  { title: 'Berserk Drift X', action: 'Explore', href: CONTENT.links.game, external: true },
  { title: 'Groups & Games', action: 'Join the crew', href: '/groups' },
  { title: 'Future Projects', action: 'See what’s next', href: '/projects' },
  { title: 'About DXT', action: 'Our story', href: '/about' },
  { title: 'Socials & Contact', action: 'Get in touch', href: '/contact' },
]);

export function home() {
  return `<div class="home-page room-home">
    <section class="hero room-hero" aria-labelledby="room-title" data-active-panel="0">
      <h1 id="room-title" class="sr-only">DXT — Creator. Drifter. Builder.</h1>
      <p id="room-instructions" class="sr-only">Explore the DXT showroom. Drag to look around, or use the arrow keys. Home resets the view. Use Tab to reach the five project panels and Enter to open one.</p>
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
        ${ROOM_PANELS.map((panel, index) => `<a class="room-panel-link" data-panel="${index}" data-panel-title="${panel.title}" href="${panel.href}" ${panel.external ? 'target="_blank" rel="noopener noreferrer"' : 'data-route'} aria-label="${panel.title}${panel.external ? ' on Roblox (opens in a new tab)' : ''}">
          <span class="room-panel-copy"><span class="room-panel-number">0${index + 1}</span><strong>${panel.title}</strong><span class="room-panel-action">${panel.action} ${icon('external')}</span></span>
        </a>`).join('')}
      </nav>
      <div class="room-mobile-context" aria-label="Selected panel">
        <span class="room-mobile-number" data-active-panel-number aria-hidden="true">01 <span>/ 05</span></span>
        <span class="room-mobile-title" data-active-panel-title aria-live="polite" aria-atomic="true">Berserk Drift X</span>
        <a id="room-open-panel" class="room-mobile-open" data-active-panel-open href="${CONTENT.links.game}" target="_blank" rel="noopener noreferrer" aria-label="Explore Berserk Drift X on Roblox (opens in a new tab)"><span>Explore</span>${icon('external')}</a>
      </div>
    </section>
  </div>`;
}
