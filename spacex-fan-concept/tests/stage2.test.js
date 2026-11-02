import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createSession}from'../src/platform/session.js';import{vehicles,getPart}from'../src/data.js';
const reviewURL=new URL('../scripts/source-review.mjs',import.meta.url);
test('source metadata is checked independently of file hashes',()=>assert.ok(fs.existsSync(reviewURL)));
if(fs.existsSync(reviewURL)){
 const{readSourceJSON,reviewSource}=await import(reviewURL);
 const expected={author:'Example Artist',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/example-123'};
 const make=(extras={})=>({asset:{version:'2.0',extras:{author:'Example Artist (https://sketchfab.com/example)',license:'CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/)',source:expected.source,...extras}}});
 test('source review distinguishes matching metadata from engineering approval',()=>{const r=reviewSource(make(),expected);assert.equal(r.identityMatched,true);assert.equal(r.engineeringVerified,false);});
 test('wrong author, wrong source or a noncommercial license fail the source gate',()=>{for(const x of[{author:'Other Artist'},{source:'https://sketchfab.com/3d-models/another'},{license:'CC-BY-NC-4.0'},{license:undefined}])assert.throws(()=>reviewSource(make(x),expected));});
 test('missing metadata never silently inherits the configured attribution',()=>assert.throws(()=>reviewSource({asset:{version:'2.0'}},expected)));
 test('source reader rejects malformed GLB instead of parsing arbitrary bytes',()=>{assert.throws(()=>readSourceJSON(Buffer.from('bad'),'glb'));const b=Buffer.alloc(20);b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);b.writeUInt32LE(20,8);b.writeUInt32LE(99,12);b.writeUInt32LE(0x4e4f534a,16);assert.throws(()=>readSourceJSON(b,'glb'));});
}
test('session exposes content variant and the actual selected title for a capsule',()=>{const state={index:1,part:'fairing',payload:'dragon'};const s=createSession({catalog:vehicles,read:()=>state,dispatch(){},controls:{},describe:(state,v)=>getPart(v,state.part,state.payload)});const result=s.execute({type:'getState'}).state;assert.equal(result.variant,'dragon');assert.equal(result.partTitle,'DRAGON 2');});
test('default session retains vendor independence and supplies part titles',()=>{const s=createSession({catalog:[{id:'a',name:'A',parts:{body:{title:'Body'}}}],read:()=>({index:0,part:'body'}),dispatch(){},controls:{}});assert.equal(s.snapshot().partTitle,'Body');assert.equal(s.snapshot().variant,null);});
