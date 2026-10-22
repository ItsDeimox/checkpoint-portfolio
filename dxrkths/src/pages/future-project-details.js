import {FUTURE_PROJECTS} from './destination-data.js';

/** Content is keyed by authored project identity, NOT the current card index.
 * Removing/reordering a catalogue item must never reassign another game's
 * screenshots or collaborators. Only owner-supplied project material is used. */
export const PROJECT_DETAILS = Object.freeze({
 'Unnamed Drift Game': {
  description: [
   'An upcoming vehicle simulation game focused on drifting, from illegal street drifting and mountain runs to professional drifting in extremely powerful cars.',
   'The game is planned to launch with a limited selection of cars and maps. The goal is to make mods easy to create and easy to play with, allowing the community to build its own cars and maps and keep expanding the game.',
   'Our role will be to maintain and update the core game, fix bugs and improve the experience over time.'
  ],
  collaborators: ['DXT', 'Xablow'],
  media: [
   {type:'image',src:'/assets/projects/unnamed-drift/car-selection.webp',alt:'Unnamed Drift Game development screenshot showing the vehicle selection screen and a blue Silvia S15 Spec-R.',caption:'Vehicle selection screen, development preview.'},
   {type:'image',src:'/assets/projects/unnamed-drift/drift-gameplay.webp',alt:'A blue Silvia S15 drifting around a marked course beside shipping containers.',caption:'Drifting gameplay, development preview.'},
   {type:'image',src:'/assets/projects/unnamed-drift/drift-transition.webp',alt:'A blue Silvia S15 changing drift direction with tire smoke and a transition score on the HUD.',caption:'Drift transition and scoring, development preview.'}
  ]
 },
 'Right Cut!': {
  description: [
   'Right Cut! is a game with multiple modes built around precise cutting.',
   'Its main mode, Right Cut, challenges you to slice each object as close as possible to the requested percentage. The closer your cut is to the target, the more points you earn. The player with the highest score wins.',
   'The game also features a Fruit Ninja-style mode.'
  ],
  disclaimer: 'All systems are still in development. These preview images do not represent the final game.',
  collaborators: ['DXT', 'OhTaldoPedro'],
  media: [
   {type:'image',src:'/assets/projects/right-cut/cover.webp',alt:'Right Cut! cover artwork showing a Roblox character slicing a watermelon into two equal halves.',caption:'Right Cut! cover artwork supplied by the creators.'},
   {type:'image',src:'/assets/projects/right-cut/precision-cut.webp',alt:'Right Cut! precision-cutting mode with a target split of 30 percent and 70 percent.',caption:'Precision-cutting mode, work in progress.'},
   {type:'image',src:'/assets/projects/right-cut/fruit-mode.webp',alt:'Right Cut! fruit-slicing mode with several fruit combos and a countdown timer.',caption:'Fruit-slicing mode, work in progress.'}
  ]
 },
 'Procedural Tiremark Generator': {description: [], media: []},
 'Procedural Vegetation Placer': {description: [], media: []},
 'Drift Judge Score System': {description: [], media: []},
 'FFB System': {description: [], media: []},
});

function mediaURL(value) {
 if (typeof value !== 'string' || /[\\\u0000-\u0020]/.test(value)) return null;
 try {
  const decoded = decodeURIComponent(value);
  if (decoded.includes('..') || decoded.includes('\\')) return null;
  if (value.startsWith('/assets/')) return value;
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
 } catch { return null; }
}

export function projectMedia(items) {
 if (!Array.isArray(items)) return [];
 return items.flatMap(item => {
  if (!item || !['image', 'video'].includes(item.type)) return [];
  const src = mediaURL(item.src);
  if (!src) return [];
  return [{type: item.type, src, alt: String(item.alt || ''),
   caption: String(item.caption || ''), poster: mediaURL(item.poster)}];
 });
}

export function getFutureProject(id) {
 if (typeof id !== 'string' || !/^\d+-\d+$/.test(id)) return null;
 const [groupIndex, itemIndex] = id.split('-').map(Number);
 const group = FUTURE_PROJECTS[groupIndex], item = group?.items[itemIndex];
 if (!item || !Object.hasOwn(PROJECT_DETAILS, item[0])) return null;
 const details = PROJECT_DETAILS[item[0]];
 return {id, name: item[0], platform: item[1], category: group.category,
  description: Array.isArray(details.description) ? details.description.filter(p => typeof p === 'string' && p.trim()) : [],
  collaborators: Array.isArray(details.collaborators) ? details.collaborators.filter(p => typeof p === 'string' && p.trim()) : [],
  disclaimer: typeof details.disclaimer === 'string' ? details.disclaimer : '',
  media: projectMedia(details.media)};
}
