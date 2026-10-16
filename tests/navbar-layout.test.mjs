import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const css=fs.readFileSync(new URL('../src/styles-sections.css',import.meta.url),'utf8');
test('approved floating header geometry is not overridden for destination pages',()=>{assert.doesNotMatch(css,/body\[data-page="home"\]\.section-active #header\s*\{/);assert.doesNotMatch(css,/body\[data-page="home"\]\.section-returning #header/);});
test('no added navbar border, shadow or material blur replaces the prior gradient',()=>{const rules=[...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].filter(m=>/#header(?:\s|::before)/.test(m[1]));for(const m of rules)assert.doesNotMatch(m[2],/border-bottom:|box-shadow:|backdrop-filter:/);});
test('reduced motion bypasses the opacity-only header fade',()=>{assert.match(css,/@media\(prefers-reduced-motion:reduce\)[^{]*\{[\s\S]*#header::before/);});
