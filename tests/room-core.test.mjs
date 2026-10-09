import test from 'node:test';
import assert from 'node:assert/strict';
import {homography, applyHomography, panelIndex, renderBudget} from '../src/scene/room-core.js';

test('screen artwork maps all four corners without affine perspective drift',()=>{
 const corners=[[.04,.10],[.30,.22],[.29,.68],[.02,.73]], matrix=homography(corners);
 for(const [i,p] of [[0,[0,0]],[1,[1,0]],[2,[1,1]],[3,[0,1]]]){
  const result=applyHomography(matrix,p);
  assert.ok(Math.abs(result[0]-corners[i][0])<1e-10);
  assert.ok(Math.abs(result[1]-corners[i][1])<1e-10);
 }
});
test('panel selection wraps for repeated keyboard and swipe navigation',()=>{
 assert.equal(panelIndex(-1),4);assert.equal(panelIndex(5),0);assert.equal(panelIndex(12),2);
});
test('ultrawide and high-DPR views keep GPU targets within the declared budget',()=>{
 for(const q of ['low','auto','high'])for(const [w,h,dpr] of [[5120,2160,2],[390,844,3],[1672,941,1]]){
  const b=renderBudget(w,h,dpr,q);
  assert.ok(b.width*b.height<=b.maxPixels);
  assert.ok(b.ratio<=1.6);
  assert.ok(b.reflection<=1024);
 }
});
