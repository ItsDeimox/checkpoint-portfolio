import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {home, renderPanelOptions} from '../src/pages/home-room.js';
import {renderRoomHeader} from '../src/ui/room-shell.js';

test('circular showroom exposes five destinations in one fullscreen scene', () => {
  const html = home();
  assert.match(html, /room-home/);
  assert.match(html, /room-hero/);
  assert.equal((html.match(/data-panel="/g) || []).length, 5);
  assert.doesNotMatch(html, /games-band|projects-band/);
});
test('the room loads the prepared detailed car asset', () => {
  const loader = fs.readFileSync(new URL('../src/scene/room-car.js', import.meta.url), 'utf8');
  assert.match(loader, /nissan-s15-showroom\.glb/);
  assert.ok(fs.existsSync(new URL('../assets/models/nissan-s15-showroom.glb', import.meta.url)));
});
test('hero has accessible drag controls and a reset action', () => {
  assert.match(renderRoomHeader(), /id="reset-view"/);
  assert.match(home(), /id="hero-canvas"[^>]*tabindex="0"/);
});
test('concept statistics are never fabricated', () => {
  assert.doesNotMatch(home(), /15\.4K|100K\+|87%|92%|10M\+/);
});
test('original social destinations remain available in the room contact panel', () => {
  const html = renderPanelOptions(4);
  assert.match(html, /matheus.dxt/);
  assert.match(html, /xaudriy/);
  assert.match(html, /H6pwAwjzcW/);
  assert.doesNotMatch(html, /@dxt\.com|mailto:/);
});
