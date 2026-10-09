import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {home} from '../src/pages/templates.js';
import {renderRoomHeader} from '../src/ui/room-shell.js';
test('circular showroom exposes five real destinations in one fullscreen scene',()=>{const h=home();assert.match(h,/room-home/);assert.match(h,/room-hero/);assert.equal((h.match(/data-panel="/g)||[]).length,5);assert.doesNotMatch(h,/games-band|projects-band/);});
test('three-dimensional car geometry has its own authored scene module',()=>{assert.ok(fs.existsSync(new URL('../src/scene/car.js',import.meta.url)));});
test('hero has accessible drag controls and a reset action',()=>{const h=home();assert.match(renderRoomHeader(),/id="reset-view"/);assert.match(h,/id="hero-canvas"[^>]*tabindex="0"/);});
test('concept statistics are never fabricated',()=>{assert.doesNotMatch(home(),/15\.4K|100K\+|87%|92%|10M\+/);});
test('all original social destinations remain available on the contact page',async()=>{const {contact}=await import('../src/pages/templates.js');const h=contact();assert.match(h,/matheus.dxt/);assert.match(h,/xaudriy/);assert.match(h,/H6pwAwjzcW/);assert.doesNotMatch(h,/@dxt\.com|mailto:/);});
