import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Forge} from '../src/engine.js';
import {Motion,wrap} from '../src/core.js';
const world=Object.create(Forge.prototype);world.makeWorld();
test('secondary chains have complete even loops, not 17 links on a 20-link period',()=>{
 const groups=[false,true].map(secondary=>world.chains.filter(l=>l.secondary===secondary&&l.side===1));
 assert.equal(groups[0].length,groups[1].length);assert.equal(groups[1].length%2,0);
});
test('chain recycle interval extends past the visible scene on both ends',()=>{
 assert.equal(typeof world.linkPose,'function');
 for(const t of [-50,-.001,0,.6,1,50])for(const secondary of [false,true]){
  const ys=world.chains.filter(l=>l.secondary===secondary&&l.side===1).map(l=>world.linkPose(l,t).pos[1]).sort((a,b)=>a-b);
  assert.ok(ys[0]<-9);assert.ok(ys.at(-1)>29);
  for(let i=1;i<ys.length;i++)assert.ok(Math.abs(ys[i]-ys[i-1]-.88)<1e-6);
 }
});
test('chain phases survive long-session motion rebasing',()=>{
 const m=new Motion(4);m.value=1000.25;m.target=1000.25;m.step(0);
 assert.ok(Math.abs(m.value)<1000);assert.equal(m.travel,1000.25);
 m.reset();assert.equal(m.travel,0);
});
test('alternating links twist around the same path tangent',()=>{
 const a=world.linkPose({side:1,i:2,secondary:false},0).model,b=world.linkPose({side:1,i:3,secondary:false},0).model;
 for(const j of [4,5,6])assert.ok(Math.abs(a[j]-b[j])<1e-6);
});
test('glass sidewall normals face away from the panel center',async()=>{
 const {glassPanel}=await import('../src/geometry.js');const g=glassPanel();
 assert.ok(g.positions.some((v,i)=>i%3===2&&v<-.09));
 for(let i=12;i<g.positions.length;i+=3)assert.ok(g.positions[i]*g.normals[i]+g.positions[i+1]*g.normals[i+1]>0);
});
