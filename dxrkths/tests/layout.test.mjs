import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderRoomHeader, renderRoomFooter} from '../src/ui/room-shell.js';

const css = fs.readFileSync(new URL('../src/styles-room.css', import.meta.url), 'utf8');
test('room brand has an explicit compact size instead of its source-image width', () => {
  assert.match(css, /\.room-brand-logo\s*\{[^}]*width:\s*87px/);
  assert.match(css, /\.room-brand-logo\s*\{[^}]*height:\s*49px/);
  assert.match(renderRoomHeader(), /class="logo room-brand-logo"/);
});
test('quality and pause live in the same accessible room settings panel', () => {
  const header = renderRoomHeader({quality: 'low', paused: true});
  assert.match(header, /<details class="room-settings">/);
  assert.match(header, /id="quality"[^>]*aria-label="Rendering quality: low/);
  assert.match(header, /id="pause"[^>]*aria-pressed="true"/);
  assert.match(header, /data-reset-room aria-label="Reset showroom camera"/);
});
test('room navigation and five panel controls keep native keyboard targets', () => {
  const header = renderRoomHeader(), footer = renderRoomFooter();
  assert.match(header, /aria-label="Main navigation"/);
  assert.match(header, /data-open-panel="3"[^>]*aria-haspopup="dialog"/);
  assert.doesNotMatch(header, /header-socials|menu-toggle|data-route/);
  assert.equal((footer.match(/data-focus-panel="/g) || []).length, 5);
  assert.match(footer, /aria-label="Showroom panels"/);
});
