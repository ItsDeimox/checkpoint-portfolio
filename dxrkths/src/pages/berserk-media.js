/** Approved images from the game's public Roblox media list, checked 2026-10-16.
 * These are project media, not new/generated concept art. See docs/section-media-sources.json.
 * The game intro has not been supplied: do not use showroom screen recordings as gameplay.
 */
export const BERSERK_MEDIA=Object.freeze([120558937499804,77601213613523,100155597934050,95744883265536,90776538793181].map((asset,index)=>Object.freeze({
 src:`/assets/images/berserk/game-${index+1}.webp`,
 alt:`Berserk Drift X · official game image ${String(index+1).padStart(2,'0')}`,
 asset,width:768,height:432,
})));
export const BERSERK_CONTROLS=Object.freeze([
 Object.freeze({keys:['V'],label:'Change view'}),
 Object.freeze({keys:['F'],label:'Exit the car'}),
 Object.freeze({keys:['Shift','B'],label:'Cinematic camera'}),
]);
export function galleryIndex(index,length=BERSERK_MEDIA.length){
 if(!Number.isInteger(index)||!Number.isInteger(length)||length<1)throw new RangeError('Invalid gallery index');
 return ((index%length)+length)%length;
}
