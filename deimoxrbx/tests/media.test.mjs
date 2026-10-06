import test from 'node:test';
import assert from 'node:assert/strict';
import {projects,pairs} from '../src/projects.js';

test('all eight supplied videos are wired into four project pairs',()=>{
 assert.equal(projects.length,8);
 assert.deepEqual(pairs,[[0,1],[2,3],[4,5],[6,7]]);
 assert.equal(new Set(projects.map(p=>p.src)).size,8);
 for(const project of projects) assert.match(project.src,/^assets\/videos\/.+\.mp4$/);
});
