import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('footer logo has an explicit compact size instead of its source-image width',()=>{assert.match(css,/\.footer-brand\s*\{[^}]*width:\s*42px/);assert.match(css,/\.footer-brand\s+img\s*\{[^}]*height:\s*28px/);});
test('quality and pause use the same styled toolbar control',()=>{assert.match(shell,/id="quality" class="tool quality-tool"/);assert.match(shell,/id="pause" class="tool"/);});
test('header CTA uses the standard bounded button component',()=>assert.match(shell,/class="button header-cta material"/));
