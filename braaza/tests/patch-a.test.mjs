import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {qualityProfile} from '../src/render/quality.js';
test('ultra remains a bounded opt-in quality profile',()=>{const p=qualityProfile('ultra',false,1,0);assert.ok(p.scale>=1.2&&p.scale<=1.45);assert.ok(p.memoryBudget<=384*1024**2);assert.ok(p.shadow>=2048);});
test('high remains sharper than auto at DPR1',()=>{const a=qualityProfile('auto',false,1,0),h=qualityProfile('high',false,1,0);assert.ok(h.scale>a.scale&&h.scale<=1.2);});
test('glass and depth passes consume the same panel-local dissolve function',()=>{for(const name of['crystal.frag','depth.frag']){const s=fs.readFileSync(new URL('../src/glsl/glass/'+name,import.meta.url),'utf8');assert.match(s,/#include "glass\/lifecycle.glsl"/);assert.match(s,/forgeLifecycle\(vLocal.xy,uCardY,uIndex\)/);}});
test('transmission source no longer multiplies the dissolve opacity twice',()=>{const s=fs.readFileSync(new URL('../src/glsl/glass/media.frag',import.meta.url),'utf8');assert.doesNotMatch(s,/uBurn|uReveal|coverage/);assert.match(s,/outColor=vec4\(max\(col,0.\),1.\)/);});
test('final optics retains edge-aware AA',()=>{const s=fs.readFileSync(new URL('../src/glsl/optics/output.frag',import.meta.url),'utf8');assert.match(s,/fxaa/i);assert.match(s,/uAaStrength/);});
