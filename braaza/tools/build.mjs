import {readFile,writeFile,cp,mkdir,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await rm('dist',{recursive:true,force:true});await mkdir('dist');for(const f of ['index.html','src','assets'])await cp(f,'dist/'+f,{recursive:true});
const sources={};for(const f of (await readdir('src')).sort())sources[f]=createHash('sha256').update(await readFile('src/'+f)).digest('hex');
await writeFile('dist/build-info.json',JSON.stringify({version:'braaza-forge-1.1',commit:process.env.VERCEL_GIT_COMMIT_SHA??null,sources},null,2));
console.log('BRAAZA: static build complete. Native WebGL2; no runtime dependencies.');
