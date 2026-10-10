import {normalizeMusicSettings,DEFAULT_MUSIC_SETTINGS} from '../scene/room-music-settings.js';
export const VISITOR_PRESET='showroom-intro-v1';
// 'auto' is the renderer's existing middle budget, not an extra public mode.
export const QUALITY_VALUES=Object.freeze(['low','auto','high']);
export const qualityLabel=value=>({low:'Low',auto:'Medium',high:'High'})[value]??'Medium';
export function restoreVisitorSettings(stored={}){
 const source=stored&&typeof stored==='object'?stored:{};
 const current=source.visitorPreset===VISITOR_PRESET;
 return {
  visitorPreset:VISITOR_PRESET,
  quality:current&&QUALITY_VALUES.includes(source.quality)?source.quality:'auto',
  music:normalizeMusicSettings(current?source.music:DEFAULT_MUSIC_SETTINGS),
 };
}
