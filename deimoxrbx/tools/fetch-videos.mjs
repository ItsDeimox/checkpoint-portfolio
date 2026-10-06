import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'assets','videos');
await fs.mkdir(out,{recursive:true});

const videos={
 'roblox-vfx.mp4':'VIDEO_ROBLOX_VFX',
 'space-fabric.mp4':'VIDEO_SPACE_FABRIC',
 'flame-dash.mp4':'VIDEO_FLAME_DASH',
 'scythe-vfx.mp4':'VIDEO_SCYTHE_VFX',
 'procedural-worm.mp4':'VIDEO_PROCEDURAL_WORM',
 'vfx-script.mp4':'VIDEO_VFX_SCRIPT',
 'red-hole.mp4':'VIDEO_RED_HOLE',
 'purple-hole.mp4':'VIDEO_PURPLE_HOLE'
};

for(const [name,key] of Object.entries(videos)){
 const url=process.env[key];
 if(!url) throw new Error(`Missing ${key}`);
 const res=await fetch(url);
 if(!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
 await fs.writeFile(path.join(out,name),Buffer.from(await res.arrayBuffer()));
 console.log(`Fetched ${name}`);
}
