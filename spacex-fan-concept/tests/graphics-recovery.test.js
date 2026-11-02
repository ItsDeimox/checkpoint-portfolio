import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
const url=new URL('../src/platform/graphics-recovery.js',import.meta.url);
test('graphics-context recovery lifecycle exists',()=>assert.ok(fs.existsSync(url)));
if(fs.existsSync(url)){
 const{createGraphicsRecovery}=await import(url);
 test('restoration rebuilds once and resumes only after completion',async()=>{let finish,done=0,calls=0;const r=createGraphicsRecovery({rebuild:()=>{calls++;return new Promise(resolve=>finish=resolve);},complete:()=>done++,fail(){}});r.lose();const p=r.restore();await r.restore();assert.equal(calls,1);assert.equal(r.blocked,true);finish();await p;assert.equal(r.blocked,false);assert.equal(done,1);});
 test('stale restore cannot revive a newly lost or disposed context',async()=>{const resolvers=[];let done=0;const r=createGraphicsRecovery({rebuild:()=>new Promise(resolve=>resolvers.push(resolve)),complete:()=>done++,fail(){}});r.lose();const a=r.restore();r.lose();resolvers[0]();await a;assert.equal(done,0);assert.equal(r.blocked,true);const b=r.restore();r.dispose();resolvers[1]();await b;assert.equal(done,0);assert.equal(r.blocked,true);});
 test('rebuild failure retains the error state and supports another restoration',async()=>{let attempts=0,failed=0,done=0;const r=createGraphicsRecovery({rebuild:async()=>{if(++attempts===1)throw Error('restore failed');},complete:()=>done++,fail:()=>failed++});r.lose();await r.restore();assert.equal(r.blocked,true);assert.equal(failed,1);await r.restore();assert.equal(done,1);assert.equal(r.blocked,false);});
}
if(fs.existsSync(url)){
 const{createGraphicsRecovery}=await import(url);
 test('GPU resources release during loss, before the replacement context exists',async()=>{const events=[];const r=createGraphicsRecovery({release:()=>events.push('release'),rebuild:async()=>events.push('rebuild'),complete:()=>events.push('complete'),fail(){}});r.lose();assert.deepEqual(events,['release']);await r.restore();assert.deepEqual(events,['release','rebuild','complete']);});
}
