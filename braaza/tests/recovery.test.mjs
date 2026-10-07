import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
test('recovered renderer dependencies exist',async()=>{for(const p of ['src/engine.js','src/world/scene.js','src/world/chains.js','src/render/targets.js','src/render/camera.js','src/render/graph.js'])assert.ok((await stat(new URL(p,root)).catch(()=>null))?.isFile(),p+' missing');});
test('approved reference provenance and packed asset are frozen',async()=>{const m=JSON.parse(await readFile(new URL('assets/world/manifest.json',root),'utf8'));assert.equal(m.sourceSha256,'0c2703d7c141a1d3de109e419eff48137bd90ab7e2a97d5ab7d4716cb4bf5261');const parts=await Promise.all(Array.from({length:8},(_,i)=>readFile(new URL('tools/packed-vista/'+String(i).padStart(2,'0')+'.txt',root),'utf8')));assert.equal(createHash('sha256').update(Buffer.from(parts.join(''),'base64')).digest('hex'),m.sha256);});
