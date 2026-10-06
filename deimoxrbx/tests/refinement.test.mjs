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
test('video hover remains visibly emissive above the bloom threshold, with a bounded peak',()=>{
 const settings=glassModule.GLASS_HOVER;
 assert.ok(settings,'glass hover response is exported for verification');
 assert.ok(settings.gain>0 && settings.gain<=1);
 assert.ok(settings.limit>0 && settings.limit<=2.5);
 // The blue channel is 1.8; the optical prefilter clips each channel at .78.
 // The old .22 gain / 1.2 clamp peaked at .4752, so hover contributed no bloom.
 const peakBlue=1.8*settings.gain*settings.limit;
 assert.ok(peakBlue>1.5,'hover must exceed the .78 bloom threshold with usable headroom');
 assert.ok(peakBlue<=4,'peak stays far below the original 24.48 blue radiance');
 assert.ok(.9*settings.gain*1.8>.78,'a normal stroke also blooms, not only a saturated swipe');
});
test('weak propagated cells fade out optically without changing mesh density or physics',()=>{
 const settings=glassModule.GLASS_HOVER;
 assert.ok(Number.isFinite(settings.onset) && settings.onset>=.1 && settings.onset<=.3);
 assert.ok(Number.isFinite(settings.full) && settings.full>=.6 && settings.full<=1);
 assert.ok(settings.full>settings.onset,'the GLSL smoothstep must have a valid increasing interval');
});
