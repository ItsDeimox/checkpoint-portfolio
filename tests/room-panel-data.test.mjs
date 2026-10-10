import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTENT} from '../src/content.js';
import {ROOM_PANELS, BACK_ACTION, getRoomPanel} from '../src/pages/room-panel-data.js';
import {renderPanelOptions} from '../src/pages/home-room.js';

test('physical panel actions preserve every existing destination without invented links', () => {
  assert.deepEqual(ROOM_PANELS.map(panel => panel.title), ['Berserk Drift X', 'Groups & Games', 'Future Projects', 'About DXT', 'Socials & Contact']);
  assert.deepEqual(ROOM_PANELS.map(panel => panel.options.length), [3, 2, 1, 1, 4]);
  const existing = new Set(Object.values(CONTENT.links));
  for (const panel of ROOM_PANELS) {
    assert.ok(Object.isFrozen(panel) && Object.isFrozen(panel.options));
    assert.equal(new Set(panel.options.map(action => action.id)).size, panel.options.length);
    for (const action of panel.options) {
      assert.ok(Object.isFrozen(action));
      assert.equal(action.kind, 'link');
      assert.notEqual(action.id, BACK_ACTION.id);
      assert.ok(action.title && action.detail);
      assert.ok(existing.has(action.href), action.href);
      assert.equal(new URL(action.href).protocol, 'https:');
      assert.equal(action.external, true);
    }
  }
  assert.equal(BACK_ACTION.kind, 'back');
  assert.equal(BACK_ACTION.href, undefined);
});

test('future and about panels retain their truthful informational content', () => {
  assert.deepEqual(getRoomPanel(2).upcoming, CONTENT.upcoming);
  assert.match(getRoomPanel(2).description, /No new projects have been announced/);
  assert.equal(getRoomPanel(3).paragraphs.length, 2);
  assert.match(getRoomPanel(3).paragraphs.join(' '), /developer behind Berserk Drift X/);
  assert.match(getRoomPanel(3).paragraphs.join(' '), /games, addons, systems and new experiments/);
  assert.equal(getRoomPanel('4'), ROOM_PANELS[4]);
  for (const invalid of [-1, 5, NaN, 'missing']) assert.equal(getRoomPanel(invalid), ROOM_PANELS[0]);
});

test('native fallback uses the same action ids, labels and destinations as the physical panel', () => {
  for (const [index, panel] of ROOM_PANELS.entries()) {
    const html = renderPanelOptions(index);
    assert.match(html, /data-close-panel/);
    assert.match(html, /data-room-panel-action="back"/);
    for (const action of panel.options) {
      assert.ok(html.includes('data-room-panel-action="' + action.id + '"'), action.id);
      assert.ok(html.includes('href="' + action.href.replaceAll('&', '&amp;') + '"'), action.href);
    }
    assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, panel.options.length);
  }
  const future = renderPanelOptions(2), about = renderPanelOptions(3);
  for (const item of CONTENT.upcoming) assert.ok(future.includes(item.name) && future.includes(item.description));
  assert.match(about, /This is my personal space/);
  assert.match(about, /My main project lives on Roblox/);
});
