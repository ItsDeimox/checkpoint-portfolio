import {normalizeMusicSettings,DEFAULT_MUSIC_SETTINGS} from '../scene/room-music-settings.js';
export const VISITOR_PRESET='showroom-intro-v1';
// 'auto' is the renderer's existing middle budget, not an extra public mode.
export const QUALITY_VALUES=Object.freeze(['low','auto','high']);
export const qualityLabel=value=>({low:'Low',auto:'Medium',high:'High'})[value]??'Medium';
export function deviceHints(host=globalThis){
 const nav=host.navigator??{},media=query=>host.matchMedia?.(query)?.matches??false;
 const short=Math.min(host.screen?.width||host.innerWidth||Infinity,host.screen?.height||host.innerHeight||Infinity);
 return {mobile:nav.userAgentData?.mobile===true||(media('(pointer: coarse)')&&!media('(any-pointer: fine)')&&short<=1024)};
}
export function restoreVisitorSettings(stored={},hints=deviceHints()){
 const source=stored&&typeof stored==='object'?stored:{};
 const current=source.visitorPreset===VISITOR_PRESET;
 return {
  visitorPreset:VISITOR_PRESET,
  qualityPreference:current&&(source.qualityPreference==='manual'||(!source.qualityPreference&&['low','high'].includes(source.quality)))?'manual':'device',
  quality:current&&QUALITY_VALUES.includes(source.quality)&&(source.qualityPreference==='manual'||(!source.qualityPreference&&source.quality!=='auto'))?source.quality:(hints.mobile?'low':'auto'),
  mobileDevice:Boolean(hints.mobile),
  music:normalizeMusicSettings(current?source.music:DEFAULT_MUSIC_SETTINGS),
 };
}
