import test from 'node:test';import assert from 'node:assert/strict';import {PerspectiveCards} from '../src/ui/perspective-cards.js';
function mock(){const o=Object.create(PerspectiveCards.prototype);o.origin={left:0,top:0};o.reduced={matches:true};o.cards=[{viewportCenter:[100,100],size:[200,200],matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],clip:[80,0,200,200],lastPoint:null,goal:0}];o.wake=()=>{};return o;}
test('clipped card portion cannot activate a hidden hover',()=>{const o=mock();o.updatePointer({clientX:5,clientY:100,timeStamp:10});assert.equal(o.cards[0].goal,0);});
test('visible portion retains local cursor coordinates',()=>{const o=mock();o.updatePointer({clientX:120,clientY:100,timeStamp:10});assert.equal(o.cards[0].goal,1);assert.deepEqual(o.cards[0].target,[.6,.5]);});
