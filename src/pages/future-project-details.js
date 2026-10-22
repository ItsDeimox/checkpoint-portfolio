import {FUTURE_PROJECTS} from './destination-data.js';

/** Owner-authored details, keyed by category/item position in FUTURE_PROJECTS.
 * No screenshots, videos, release dates or feature claims have been supplied
 * for these seven projects. Do not reuse Berserk Drift X footage for Rally.
 * Add description paragraphs and real {type:'image'|'video',src,alt,caption,
 * poster?} entries here. See docs/FUTURE-PROJECT-DIALOG.md for the asset build. */
export const PROJECT_DETAILS = Object.freeze({
 '0-0': {description: [], media: []}, // BERSERK DRIFT: RALLY
 '0-1': {description: [], media: []}, // Unnamed Drift Game
 '0-2': {description: [], media: []}, // Right Cut!
 '1-0': {description: [], media: []}, // Procedural Tiremark Generator
 '1-1': {description: [], media: []}, // Procedural Vegetation Placer
 '2-0': {description: [], media: []}, // Drift Judge Score System
 '2-1': {description: [], media: []}, // FFB System
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
 if (typeof id !== 'string' || !Object.hasOwn(PROJECT_DETAILS, id)) return null;
 const [groupIndex, itemIndex] = id.split('-').map(Number);
 const group = FUTURE_PROJECTS[groupIndex], item = group?.items[itemIndex];
 if (!item) return null;
 const details = PROJECT_DETAILS[id];
 return {id, name: item[0], platform: item[1], category: group.category,
  description: Array.isArray(details.description) ? details.description.filter(p => typeof p === 'string' && p.trim()) : [],
  media: projectMedia(details.media)};
}
