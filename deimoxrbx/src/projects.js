/** Posters: extracted from the supplied recording, never passed off as source videos.
 * Put the corresponding originals in assets/videos and set `src` to their relative URL.
 * A local video can also be attached with the player. It never leaves the browser.
 */
export const projects=[
 {id:'roblox-vfx',title:'Roblox VFX',subtitle:'Experimento visual',tags:['VFX','PARTÍCULAS','SHADERS'],src:null},
 {id:'space-fabric',title:'Space Fabric',subtitle:'Distorção de malha · Script',tags:['AMBIENTE','SISTEMAS','SCRIPT'],src:null},
 {id:'flame-dash',title:'Flame Dash',subtitle:'Habilidade · VFX',tags:['HABILIDADES','VFX','MOVIMENTO'],src:null},
 {id:'scythe-vfx',title:'Scythe VFX',subtitle:'Combate · VFX',tags:['COMBATE','VFX','PARTÍCULAS'],src:null},
 {id:'procedural-worm',title:'Procedural Worm',subtitle:'Script + VFX',tags:['PROCEDURAL','SCRIPT','VFX'],src:null},
 {id:'vfx-script',title:'VFX + Script',subtitle:'Sistema visual · Luau',tags:['LUAU','SISTEMAS','VFX'],src:null}
].map(p=>({...p,poster:(globalThis.__INLINE_ASSETS__?.[`assets/posters/${p.id}.webp`] ?? `assets/posters/${p.id}.webp`)}));
export const pairs=[[0,1],[2,3],[4,5]];
export const contact={discord:'itsdeimox_',youtube:'https://www.youtube.com/@ItsDeimox',portfolio:'https://deimox.vercel.app/'};
