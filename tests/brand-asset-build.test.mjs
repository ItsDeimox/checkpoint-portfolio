import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {ensureBrandAsset} from '../tools/prepare-brand.mjs';

test('brand preparation verifies the original attachment and then builds from its local cache',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dxt-brand-'));
 const original=await fs.readFile(new URL('../assets/models/DXTlogoPrinted.glb',import.meta.url));let downloads=0;
 try{
  const target=await ensureBrandAsset({directory,fetcher:async()=>{downloads++;return new Response(original);}});
  assert.deepEqual(await fs.readFile(target),original);
  assert.equal(await ensureBrandAsset({directory,fetcher:()=>{throw Error('cache must not download');}}),target);
  assert.equal(downloads,1);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('invalid remote logo bytes cannot overwrite a local asset',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dxt-brand-integrity-'));
 try{
  await assert.rejects(ensureBrandAsset({directory,fetcher:async()=>new Response('wrong model')}),/integrity/);
  await assert.rejects(fs.access(path.join(directory,'assets/models/DXTlogoPrinted.glb')),{code:'ENOENT'});
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
