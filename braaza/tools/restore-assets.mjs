import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
/** Transport-safe source packing; the deployed file is the original WebP, byte-for-byte. */
export async function restoreAssets(){
 const base=new URL('../',import.meta.url),manifest=JSON.parse(await readFile(new URL('assets/world/manifest.json',base),'utf8'));
 const pieces=await Promise.all(Array.from({length:8},(_,i)=>readFile(new URL('packed-vista/'+String(i).padStart(2,'0')+'.txt',import.meta.url),'utf8')));
 const bytes=Buffer.from(pieces.join(''),'base64');
 if(createHash('sha256').update(bytes).digest('hex')!==manifest.sha256)throw Error('Vista integrity check failed');
 await mkdir(new URL('assets/world/',base),{recursive:true});await writeFile(new URL('assets/'+manifest.asset,base),bytes);
}
await restoreAssets();
