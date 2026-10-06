/** Expand the byte-verified source snapshot. No runtime CDN dependencies. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(resolve(root,'release/manifest.json'),'utf8'));
const hash=data=>createHash('sha256').update(data).digest('hex');
const safe=name=>{const p=resolve(root,name);if(!p.startsWith(root+sep))throw Error('Unsafe release path');return p;};
const chunks=await Promise.all(manifest.parts.map(name=>readFile(safe(name),'utf8')));
const raw=brotliDecompressSync(Buffer.from(chunks.join(''),'base64'));
if(hash(raw)!==manifest.sha256)throw Error('Release checksum mismatch');
const files=JSON.parse(raw);
for(const [name,digest] of Object.entries(manifest.files)){
 const value=files[name];if(typeof value!=='string'||hash(value)!==digest)throw Error('Source mismatch: '+name);
 const p=safe(name);await mkdir(dirname(p),{recursive:true});await writeFile(p,value);
}
const snapshot=await readFile(safe('release/assets-snapshot.html'),'utf8');
const marker='window.__DEIMOX_ASSETS__=';const offset=snapshot.indexOf(marker);
if(offset<0)throw Error('Asset snapshot missing');
const tail=snapshot.slice(offset+marker.length);let depth=0,quoted=false,escaped=false,end=-1;
for(let i=0;i<tail.length;i++){
 const c=tail[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
 if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}
}
if(end<0)throw Error('Invalid asset snapshot');
const images=JSON.parse(tail.slice(0,end)).images;
for(const [name,digest] of Object.entries(manifest.assets)){
 const encoded=images[name];if(typeof encoded!=='string'||!encoded.startsWith('data:'))throw Error('Asset missing: '+name);
 const data=Buffer.from(encoded.slice(encoded.indexOf(',')+1),'base64');if(hash(data)!==digest)throw Error('Asset checksum mismatch: '+name);
 const p=safe(name);await mkdir(dirname(p),{recursive:true});await writeFile(p,data);
}
console.log('Verified release '+manifest.version+': '+Object.keys(manifest.files).length+' source files, '+Object.keys(manifest.assets).length+' assets.');
