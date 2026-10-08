import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../src/styles-glsl-ui.css',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../src/ui/shader-ui.js',import.meta.url),'utf8');
test('modal shader overlay anchors to dialog, not screen',()=>{
 assert.match(css,/\.sheet\s*>\s*\.glsl-ui-layer\s*\{[^}]*position:\s*absolute/s);
 assert.doesNotMatch(css,/\.sheet\s*>\s*\.glsl-ui-layer\s*\{[^}]*position:\s*fixed/s);
});
test('dialog uses a single canvas, not one WebGL context per button',()=>{
 assert.equal((source.match(/getContext\(\s*['"]webgl2['"]/g)||[]).length,1);
 assert.doesNotMatch(source,/\bnew\s+Surface\(target/);
});
test('GL shader has transparent off-pixels and context-loss handling',()=>{
 assert.match(source,/alpha:\s*true/);
 assert.match(source,/webglcontextlost/);
 assert.match(source,/uniform\s+vec4\s+uRects\[\d+\]/);
});
test('dialog buttons remain keyboard accessible, backdrop remains visible',()=>{
 assert.match(css,/\.sheet::backdrop/);
 assert.match(css,/pointer-events:\s*none/);
 assert.match(css,/\.sheet\s+\.button:focus-visible/);
});
