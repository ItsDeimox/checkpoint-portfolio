export const DEFAULT_TRACK = Object.freeze({url:'',title:'Choose a local track'});
export const DEFAULT_MUSIC_SETTINGS = Object.freeze({volume:.45,reactivity:.65});
export function normalizeMusicSettings(input={}){
 const source=input && typeof input==='object'?input:{};
 return Object.fromEntries(Object.entries(DEFAULT_MUSIC_SETTINGS).map(([key,fallback])=>[key,Number.isFinite(source[key])?Math.max(0,Math.min(1,source[key])):fallback]));
}
