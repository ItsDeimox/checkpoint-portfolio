import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cardLifecycle,createCardWrapState,wrapCardVisualY} from '../src/render/card-lifecycle.js';
import {qualityProfile} from '../src/render/quality.js';

test('card is fully dissolved before the logical top slot wraps',()=>{
 const life=cardLifecycle(11.20);assert.ok(life.exitBurn>.99);assert.ok(life.visibility<.01);
});
test('card is hidden below the lower forge and fully readable at the first slot',()=>{
 assert.ok(cardLifecycle(-1.2).visibility<.01);assert.ok(cardLifecycle(1.7).visibility>.99);
});
test('recycled card gets a long lower entry corridor instead of popping into view',()=>{
 const state=createCardWrapState();let r=wrapCardVisualY(1.72,11.28,11.40,1/60,false,state);
 for(let i=0;i<24&&!r.wrapped;i++)r=wrapCardVisualY(1.72,1.72,r.visualY,1/60,false,state);
 assert.equal(r.wrapped,true);assert.ok(r.visualY<-4);
 for(let i=0;i<8;i++)r=wrapCardVisualY(1.72,1.72,r.visualY,1/60,false,state);
 assert.ok(r.visualY<-1.2);assert.equal(cardLifecycle(r.visualY).visibility,0);
});
test('top recycle finishes exiting before teleporting below the forge',()=>{
 const state=createCardWrapState();let r=wrapCardVisualY(1.72,11.12,10.35,1/60,false,state);
 assert.equal(r.wrapped,false);assert.ok(r.visualY>10.35);
 let wrapped=false;for(let i=0;i<30;i++){r=wrapCardVisualY(1.72,1.72,r.visualY,1/60,false,state);if(r.wrapped){wrapped=true;assert.ok(r.visualY<-1);break;}}
 assert.ok(wrapped);
});
test('reverse recycle exits through the lower forge before entering from the top',()=>{
 const state=createCardWrapState();let r=wrapCardVisualY(11.25,1.72,1.75,1/60,false,state);
 assert.equal(r.wrapped,false);assert.ok(r.visualY<1.75);
 let wrapped=false;for(let i=0;i<30;i++){r=wrapCardVisualY(11.25,11.25,r.visualY,1/60,false,state);if(r.wrapped){wrapped=true;assert.ok(r.visualY>12);break;}}
 assert.ok(wrapped);
});
test('auto quality uses modest supersampling and high/ultra remain explicit',()=>{
 const auto=qualityProfile('auto',false,1,0),high=qualityProfile('high',false,1,0),ultra=qualityProfile('ultra',false,1,0);
 assert.ok(auto.scale>=1.08&&auto.scale<=1.14);assert.ok(high.scale>auto.scale);assert.ok(ultra.scale>high.scale);assert.ok(auto.aaStrength>=.9);
});
test('glass passes use shared soft lifecycle coverage rather than abrupt center reconstruction',async()=>{
 const [glass,media]=await Promise.all([readFile(new URL('../src/glsl/glass/crystal.frag',import.meta.url),'utf8'),readFile(new URL('../src/glsl/glass/media.frag',import.meta.url),'utf8')]);
 for(const shader of [glass,media]){assert.match(shader,/exitCoverage/);assert.match(shader,/revealCoverage/);assert.doesNotMatch(shader,/centerY=vWorld/);}
});
