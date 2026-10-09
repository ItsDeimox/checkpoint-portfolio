import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {home} from '../src/pages/templates.js';
test('correct reference uses separate diagonal groups and projects ribbons',()=>{const h=home();assert.match(h,/games-band/);assert.match(h,/projects-band/);assert.doesNotMatch(h,/class="overview"/);});
test('three-dimensional car geometry has its own authored scene module',()=>{assert.ok(fs.existsSync(new URL('../src/scene/car.js',import.meta.url)));});
test('hero has accessible drag controls and a reset action',()=>{const h=home();assert.match(h,/id="reset-view"/);assert.match(h,/id="hero-canvas"[^>]*tabindex="0"/);});
test('concept statistics are never fabricated',()=>{assert.doesNotMatch(home(),/15\.4K|100K\+|87%|92%|10M\+/);});
test('all original social destinations stay present',()=>{const h=home();assert.match(h,/matheus.dxt/);assert.match(h,/xaudriy/);assert.match(h,/H6pwAwjzcW/);assert.doesNotMatch(h,/@dxt\.com|mailto:/);});
