import {CONTENT} from '../content.js';

const option = (id, title, detail, icon = 'external') => Object.freeze({
  id, kind: 'link', title, detail, icon, href: CONTENT.links[id], external: true,
});

export const BACK_ACTION = Object.freeze({id: 'back', kind: 'back', title: 'Back', detail: 'Return to the showroom', icon: 'arrow'});

/** One source of destinations for the physical screens and native controls. */
export const ROOM_PANELS = Object.freeze([
  {
    title: 'Berserk Drift X', action: 'Explore', href: CONTENT.links.game, external: true,
    description: 'The main project. A space for cars, creativity and the community around them.',
    status: 'In development',
    options: [
      option('game', 'Berserk Drift X', 'Open the game on Roblox · In development', 'game'),
      option('discord', 'Join the community', 'The Berserk community on Discord', 'discord'),
      option('revline', 'RevLine Entertainment’s', 'Home of Berserk Drift X on Roblox', 'roblox'),
    ],
  },
  {
    title: 'Groups & Games', action: 'Join the crew', href: '/groups',
    description: 'Two communities for the things DXT builds on Roblox.',
    options: CONTENT.groups.map(group => option(group.key, group.name, group.text, 'roblox')),
  },
  {
    title: 'Future Projects', action: 'See what’s next', href: '/projects',
    description: 'No new projects have been announced yet. Follow along for future games, addons and systems.',
    upcoming: CONTENT.upcoming,
    options: [option('youtube', 'Follow on YouTube', 'Keep up with what comes next', 'youtube')],
  },
  {
    title: 'About DXT', action: 'Our story', href: '/about',
    description: 'A creator with cars on the mind and projects in the making.',
    paragraphs: [
      'I’m DXT, the developer behind Berserk Drift X. This is my personal space for the things I create, the communities around them and the ideas I’m exploring.',
      'My main project lives on Roblox. What comes next can go beyond it: games, addons, systems and new experiments.',
    ],
    screenCopy: [
      'I’m DXT, the developer behind Berserk Drift X.',
      'My main project lives on Roblox. What comes next: games, addons, systems and new experiments.',
    ],
    options: [option('roblox', 'Meet me on Roblox', 'DXT’s profile', 'roblox')],
  },
  {
    title: 'Socials & Contact', action: 'Get in touch', href: '/contact',
    description: 'A project, an idea, or just a conversation. Find DXT here.',
    options: [
      option('discord', 'Discord', 'Berserk community', 'discord'),
      option('instagram', 'Instagram', '@matheus.dxt', 'instagram'),
      option('youtube', 'YouTube', '@xaudriy', 'youtube'),
      option('roblox', 'Roblox', 'DXT’s profile', 'roblox'),
    ],
  },
].map(panel => Object.freeze({
  ...panel,
  options: Object.freeze(panel.options),
  paragraphs: Object.freeze(panel.paragraphs || []),
  screenCopy: Object.freeze(panel.screenCopy || []),
  upcoming: Object.freeze((panel.upcoming || []).map(item => Object.freeze({...item}))),
})));

export function getRoomPanel(index) {
  const selected = typeof index === 'number' || typeof index === 'string' ? Number(index) : NaN;
  return Number.isInteger(selected) && selected >= 0 && selected < ROOM_PANELS.length ? ROOM_PANELS[selected] : ROOM_PANELS[0];
}
