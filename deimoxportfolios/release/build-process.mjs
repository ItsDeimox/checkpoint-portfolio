/** Keep tracked overrides authoritative even when expanding the historical source snapshot. */
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const paths=['src/shaders/cube.frag','src/shaders/orbit.frag','src/shaders/line.frag','src/shaders/output.frag','src/shaders/background.frag','src/shaders/process.frag','src/core/process-surface.js','src/ui/process-cards.js','src/rendering/process-pass.js','src/styles-process.css','src/ui/modal-material.js','src/styles-modal-material.css','src/shaders/modal-material.frag','src/shaders/modal-output.frag'];
const overrides=new Map(await Promise.all(paths.map(async path=>[path,await readFile(path)])));
const run=path=>execFileSync(process.execPath,[path],{stdio:'inherit'});
run('release/assemble.mjs');
for(const [path,bytes] of overrides){await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);}
run('release/process-stage4.mjs');
run('release/modal-material.mjs');
await mkdir('assets/icons',{recursive:true});
await writeFile('assets/icons/brand.svg',await readFile('release/deimox-logo.svg'));
execFileSync(process.execPath,['--test','tests/modal-material.test.mjs','tests/process-surface.test.mjs'],{stdio:'inherit'});
run('tools/build.mjs');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});let result=[];for(const e of entries){const p=dir+'/'+e.name;result.push(...(e.isDirectory()?await files(p):[p]));}return result.sort();}
const sourceFiles={};for(const path of ['index.html',...await files('src')])sourceFiles[path]=sha(await readFile(path));
const info={version:'modal-material-r4',commit:process.env.VERCEL_GIT_COMMIT_SHA??null,sourceSha256:sha(JSON.stringify(sourceFiles)),sourceFiles,processShaderSha256:sourceFiles['src/shaders/process.frag'],cubeShaderSha256:sourceFiles['src/shaders/cube.frag']};
await writeFile('dist/build-info.json',JSON.stringify(info,null,2)+'\n');console.log('Verified modal-material-r4: '+info.sourceSha256);
