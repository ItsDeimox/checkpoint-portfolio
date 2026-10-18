/** Shared identities for page CSS, physical panels and the portal. */
const make=(key,hex,rgb)=>Object.freeze({key,hex,rgb:Object.freeze(rgb)});
export const PAGE_THEMES=Object.freeze([
 make('berserk','#ff2849',[255,40,73]),
 make('groups','#f1f4f8',[241,244,248]),
 make('projects','#a879ff',[168,121,255]),
 make('about','#ff964b',[255,150,75]),
 make('contact','#70d5ff',[112,213,255]),
]);
export const NEUTRAL_THEME=make('idle','#dce1e9',[220,225,233]);
export const themeFor=index=>Number.isInteger(index)&&index>=0&&index<PAGE_THEMES.length?PAGE_THEMES[index]:NEUTRAL_THEME;
export function damp(value,target,delta,rate=7){
 const dt=Number.isFinite(delta)?Math.max(0,Math.min(delta,.1)):0;
 return value+(target-value)*(1-Math.exp(-rate*dt));
}
