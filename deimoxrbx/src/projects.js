/** Original portfolio videos supplied by Deimox. */
const VIDEO_BASE='https://deimoxrbx-31qavotx8-itsdeimoxs-projects.vercel.app/assets/videos/';
export const projects=[
 {id:'roblox-vfx',title:'Roblox VFX',subtitle:'Experimento visual',tags:['VFX','PARTÍCULAS','SHADERS'],src:VIDEO_BASE+'roblox-vfx.mp4',poster:'assets/posters/roblox-vfx.webp'},
 {id:'space-fabric',title:'Space Fabric',subtitle:'Distorção de malha · Script',tags:['AMBIENTE','SISTEMAS','SCRIPT'],src:VIDEO_BASE+'space-fabric.mp4',poster:'assets/posters/space-fabric.webp'},
 {id:'flame-dash',title:'Flame Dash',subtitle:'Habilidade · VFX',tags:['HABILIDADES','VFX','MOVIMENTO'],src:VIDEO_BASE+'flame-dash.mp4',poster:'assets/posters/flame-dash.webp'},
 {id:'scythe-vfx',title:'Scythe VFX',subtitle:'Combate · VFX',tags:['COMBATE','VFX','PARTÍCULAS'],src:VIDEO_BASE+'scythe-vfx.mp4',poster:'assets/posters/scythe-vfx.webp'},
 {id:'procedural-worm',title:'Procedural Worm',subtitle:'Script + VFX',tags:['PROCEDURAL','SCRIPT','VFX'],src:VIDEO_BASE+'procedural-worm.mp4',poster:'assets/posters/procedural-worm.webp'},
 {id:'vfx-script',title:'VFX + Script',subtitle:'Sistema visual · Luau',tags:['LUAU','SISTEMAS','VFX'],src:VIDEO_BASE+'vfx-script.mp4',poster:'assets/posters/vfx-script.webp'},
 {id:'red-hole',title:'Red Hole',subtitle:'VFX experimental',tags:['VFX','SHADER','PARTÍCULAS'],src:VIDEO_BASE+'red-hole.mp4',poster:'assets/posters/vfx-script.webp'},
 {id:'purple-hole',title:'Purple Hole',subtitle:'VFX experimental',tags:['VFX','SHADER','PARTÍCULAS'],src:VIDEO_BASE+'purple-hole.mp4',poster:'assets/posters/scythe-vfx.webp'}
].map(p=>({...p,poster:(globalThis.__INLINE_ASSETS__?.[p.poster] ?? p.poster)}));
export const pairs=[[0,1],[2,3],[4,5],[6,7]];
export const contact={discord:'itsdeimox_',youtube:'https://www.youtube.com/@ItsDeimox',portfolio:'https://deimox.vercel.app/'};
