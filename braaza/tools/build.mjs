import './restore-assets.mjs';
import {readFile,writeFile,cp,mkdir,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {VERSION} from '../src/render/contracts.js';
await rm('dist',{recursive:true,force:true});await mkdir('dist');for(const f of['index.html','src','assets'])await cp(f,'dist/'+f,{recursive:true});
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const sources={};let bytes=0;for(const file of['index.html',...await walk('src'),...await walk('assets')].sort()){const data=await readFile(file);sources[file]=createHash('sha256').update(data).digest('hex');bytes+=data.length;}
await writeFile('dist/build-info.json',JSON.stringify({version:VERSION,commit:process.env.VERCEL_GIT_COMMIT_SHA??process.env.BRAAZA_COMMIT??null,sources,bytes},null,2));console.log(`${VERSION}: ${Object.keys(sources).length} files; ${bytes} bytes.`);
