
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,access,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const tools = await import('../tools/prepare-music.mjs').catch(()=>({}));
test('published Lagoon is the transcoded user-supplied recording with pinned integrity', async()=>{
  assert.equal(tools.MUSIC_SOURCE?.bytes,3068947);
  assert.equal(tools.MUSIC_SOURCE?.sha256,'77d1a3e4509d6dcb8b867d7f7065c4b45c4e94940eda33b208b4edb55788b8c3');
  const song=await readFile(new URL('../assets/audio/lagoon.mp3',import.meta.url));
  assert.equal(song.length,tools.MUSIC_SOURCE.bytes);
  assert.equal(createHash('sha256').update(song).digest('hex'),tools.MUSIC_SOURCE.sha256);
});
test('a corrupt remote recording fails closed without publishing an invalid MP3',async()=>{
  assert.equal(typeof tools.ensureMusicAsset,'function');
  const directory=await mkdtemp(path.join(os.tmpdir(),'dxt-lagoon-corrupt-'));
  try{
    await assert.rejects(tools.ensureMusicAsset({directory,fetcher:async()=>({ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer})}),/integrity|size|hash/i);
    await assert.rejects(access(path.join(directory,'assets/audio/lagoon.mp3')));
  }finally{await rm(directory,{recursive:true,force:true});}
});
