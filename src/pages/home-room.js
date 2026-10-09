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

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function panelCopy(panel, index) {
  return `<span class="room-panel-copy"><span class="room-panel-number">0${index + 1}</span><strong>${escape(panel.title)}</strong><span class="room-panel-action">${escape(panel.action)} ${icon('external')}</span></span>`;
}

function optionLink(key, title, detail, symbol = 'external') {
  return `<a class="room-option" href="${escape(CONTENT.links[key])}" target="_blank" rel="noopener noreferrer">
    <span class="room-option-symbol">${icon(symbol)}</span>
    <span class="room-option-copy"><strong>${escape(title)}</strong><small>${escape(detail)}</small></span>
    ${icon('external', 'room-option-arrow')}<span class="sr-only">Opens in a new tab</span>
  </a>`;
}

/** Native content revealed after the camera reaches the selected screen. */
export function renderPanelOptions(index) {
  const selected = Number.isInteger(Number(index)) && Number(index) >= 0 && Number(index) < ROOM_PANELS.length ? Number(index) : 0;
  const panel = ROOM_PANELS[selected];
  const descriptions = [
    'The main project. A space for cars, creativity and the community around them.',
    'Two communities for the things DXT builds on Roblox.',
    'No new projects have been announced yet. Follow along for future games, addons and systems.',
    'A creator with cars on the mind and projects in the making.',
    'A project, an idea, or just a conversation. Find DXT here.',
  ];
  const bodies = [
    `<div class="room-option-list">
      ${optionLink('game', 'Berserk Drift X', 'Open the game on Roblox · In development', 'game')}
      ${optionLink('discord', 'Join the community', 'The Berserk community on Discord', 'discord')}
      ${optionLink('revline', 'RevLine Entertainment’s', 'Home of Berserk Drift X on Roblox', 'roblox')}
    </div>`,
    `<div class="room-option-list">${CONTENT.groups.map(group => optionLink(group.key, group.name, group.text, 'roblox')).join('')}</div>`,
    `<ul class="room-upcoming-list">${CONTENT.upcoming.map(project => `<li>
      <span class="room-option-symbol">${icon(project.icon)}</span>
      <span><strong>${escape(project.name)}</strong><small>${escape(project.description)}</small></span>
      <span class="room-upcoming-status">Coming soon</span>
    </li>`).join('')}</ul>
    <div class="room-option-list">${optionLink('youtube', 'Follow on YouTube', 'Keep up with what comes next', 'youtube')}</div>`,
    `<div class="room-about-copy">
      <p>I’m DXT, the developer behind <strong>Berserk Drift X</strong>. This is my personal space for the things I create, the communities around them and the ideas I’m exploring.</p>
      <p>My main project lives on Roblox. What comes next can go beyond it: games, addons, systems and new experiments.</p>
    </div><div class="room-option-list">${optionLink('roblox', 'Meet me on Roblox', 'DXT’s profile', 'roblox')}</div>`,
    `<div class="room-option-list">
      ${optionLink('discord', 'Discord', 'Berserk community', 'discord')}
      ${optionLink('instagram', 'Instagram', '@matheus.dxt', 'instagram')}
      ${optionLink('youtube', 'YouTube', '@xaudriy', 'youtube')}
      ${optionLink('roblox', 'Roblox', 'DXT’s profile', 'roblox')}
    </div>`,
  ];
  return `<div class="room-options-topline"><span class="room-options-number">0${selected + 1} / DXT</span><button class="room-options-close" type="button" data-close-panel aria-label="Back to showroom">${icon('arrow')}<span>Back</span></button></div>
    <h2 id="room-options-title" tabindex="-1">${escape(panel.title)}</h2>
    <p id="room-options-description" class="room-options-description">${descriptions[selected]}</p>
    ${bodies[selected]}`;
}

export function home() {
  return `<div class="home-page room-home">
    <section class="hero room-hero" aria-labelledby="room-title" data-active-panel="0">
      <h1 id="room-title" class="sr-only">DXT — Creator. Drifter. Builder.</h1>
      <p id="room-instructions" class="sr-only">Explore the DXT showroom. Drag to look around, or use the arrow keys. Home resets the view. Use Tab to reach the five project panels. Activate a panel to move closer and see its options. Escape returns to the showroom.</p>
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
        ${ROOM_PANELS.map((panel, index) => `<button class="room-panel-link" type="button" data-panel="${index}" data-open-panel="${index}" data-panel-title="${escape(panel.title)}" aria-haspopup="dialog" aria-controls="room-panel-options" aria-label="Explore ${escape(panel.title)}">${panelCopy(panel, index)}</button>`).join('')}
        ${ROOM_PANELS.map((panel, index) => `<a class="room-panel-fallback-link" data-fallback-panel="${index}" href="${escape(panel.href)}" ${panel.external ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="${escape(panel.title)}${panel.external ? ' on Roblox (opens in a new tab)' : ''}">${panelCopy(panel, index)}</a>`).join('')}
      </nav>
      <div class="room-mobile-context" aria-label="Selected panel">
        <span class="room-mobile-number" data-active-panel-number aria-hidden="true">01 <span>/ 05</span></span>
        <span class="room-mobile-title" data-active-panel-title aria-live="polite" aria-atomic="true">Berserk Drift X</span>
        <button id="room-open-panel" class="room-mobile-open" type="button" data-active-panel-open data-open-panel="0" aria-haspopup="dialog" aria-controls="room-panel-options" aria-label="Explore Berserk Drift X"><span>Explore</span>${icon('external')}</button>
      </div>
      <section id="room-panel-options" class="room-panel-options" data-panel-options hidden role="dialog" aria-modal="true" aria-labelledby="room-options-title" aria-describedby="room-options-description" tabindex="-1"></section>
    </section>
  </div>`;
}
