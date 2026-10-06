import test from 'node:test';
import assert from 'node:assert/strict';
let viewportModule={},glassModule={};
try { viewportModule=await import('../src/core/viewport.js'); } catch {}
try { glassModule=await import('../src/scene/glass.js'); } catch {}
test('the floor viewport includes the floating footer without changing the hero aspect',()=>{
 assert.equal(typeof viewportModule.sceneViewport,'function');
 const result=viewportModule.sceneViewport(1672,715,226);
 assert.equal(result.width,1672);assert.equal(result.heroHeight,715);
 assert.equal(result.height,941);assert.equal(result.aspect,1672/715);
});
test('extended viewport handles hidden, fractional, and invalid layout dimensions',()=>{
 assert.equal(typeof viewportModule.sceneViewport,'function');
 const result=viewportModule.sceneViewport(0,0,-50);
 assert.equal(result.width,1);assert.equal(result.heroHeight,1);assert.equal(result.height,1);
 const hidden=viewportModule.sceneViewport(NaN,Infinity,NaN);
 assert.ok(Object.values(hidden).every(Number.isFinite));
});
test('video hover light has a bounded low HDR gain independently of mesh displacement',()=>{
 assert.ok(glassModule.GLASS_HOVER,'glass hover response is exported for verification');
 assert.ok(glassModule.GLASS_HOVER.gain>0 && glassModule.GLASS_HOVER.gain<=.25);
 assert.ok(glassModule.GLASS_HOVER.limit>0 && glassModule.GLASS_HOVER.limit<=1.2);
 assert.ok(glassModule.GLASS_HOVER.gain*glassModule.GLASS_HOVER.limit<.3);
});
