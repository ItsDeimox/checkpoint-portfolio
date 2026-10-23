import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the actual controller against deterministic DOM/provider boundaries.
// Network audio and visual placement are covered separately in browser QA.
const source = stripTypeScriptTypes(
  readFileSync(new URL('../src/lib/player.ts', import.meta.url), 'utf8'),
).replace('export function initPlayer', 'function initPlayer');

class Element extends EventTarget {
  constructor(id = '') {
    super();
    this.id = id;
    this.dataset = {};
    this.attributes = {};
    this.style = { setProperty: (key, value) => { this.style[key] = value; } };
    this.classes = new Set();
    this.classList = {
      toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name),
    };
    this.value = '0';
    this.children = [];
    this.hidden = false;
    this.disabled = false;
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(child) { this.children.push(child); child.parent = this; }
  replaceChildren(...children) {
    this.children = children;
    for (const child of children) child.parent = this;
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
  }
  click() { this.dispatchEvent(new Event('click')); }
}

function createPlayer({ withAPI = true, withMiniPlay = false } = {}) {
  const ids = [
    'listening-room', 'disc-button', 'next-track', 'previous-track', 'seek', 'volume',
    'elapsed', 'duration', 'track-title', 'track-credit', 'track-counter',
    'track-external', 'player-kicker', 'disc-hint', 'player-message', 'embed-mount',
  ];
  if (withMiniPlay) ids.push('mini-play');
  const elements = Object.fromEntries(ids.map((id) => [id, new Element(id)]));
  elements.volume.value = '70';
  const rows = [0, 1, 2].map((index) => {
    const row = new Element();
    row.dataset.track = String(index);
    return row;
  });
  const artwork = new Element();
  elements['listening-room'].querySelector = () => artwork;
  elements['listening-room'].querySelectorAll = () => rows;
  const head = new Element();
  const widgets = [];
  const timers = new Map();
  let nextTimer = 0;

  const factory = (iframe) => {
    const callbacks = new Map();
    const widget = {
      iframe, callbacks, plays: 0, pauses: 0, seeks: [],
      bind: (event, callback) => callbacks.set(event, callback),
      unbind: (event) => callbacks.delete(event),
      play() { this.plays++; },
      pause() { this.pauses++; },
      seekTo(value) { this.seeks.push(value); },
      setVolume(value) { this.volume = value; },
      getDuration() {},
      emit(event, data) { callbacks.get(event)?.(data); },
    };
    widgets.push(widget);
    return widget;
  };
  factory.Events = {
    READY: 'ready', PLAY: 'play', PAUSE: 'pause', FINISH: 'finish',
    PLAY_PROGRESS: 'progress', SEEK: 'seek', ERROR: 'error',
  };
  const context = vm.createContext({
    document: {
      getElementById: (id) => elements[id] ?? null,
      createElement: () => new Element(),
      head,
    },
    window: withAPI ? { SC: { Widget: factory } } : {},
    URLSearchParams, AbortController,
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  vm.runInContext(source, context);
  const controller = vm.runInContext('initPlayer()', context);
  return {
    controller, elements, rows, widgets, timers, head,
    room: elements['listening-room'],
    fireTimeouts() {
      for (const [id, { callback }] of [...timers]) {
        timers.delete(id);
        callback();
      }
    },
  };
}

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

async function start(player) {
  player.elements['disc-button'].click();
  await flush();
  const widget = player.widgets.at(-1);
  widget.emit('ready');
  widget.emit('play');
  return widget;
}

test('carousel initializes without mini-play and browsing covers does not request audio', () => {
  const p = createPlayer();
  assert.equal(p.room.dataset.activeTrack, '0');
  assert.equal(p.elements['track-credit'].textContent, 'HEINEM x Hyru Remix');
  assert.equal(p.elements['track-credit'].attributes.title, 'Aye Bay · HEINEM x Hyru Remix');
  assert.match(p.rows[0].attributes['aria-label'], /Aye Bay/);
  assert.match(p.elements['track-external'].attributes['aria-label'], /Aye Bay/);
  assert.deepEqual(p.rows.map((row) => row.dataset.position), ['active', 'next', 'previous']);
  p.elements['previous-track'].click();
  assert.equal(p.room.dataset.activeTrack, '2');
  assert.equal(p.elements['track-title'].textContent, 'Show Me Love');
  assert.deepEqual(p.rows.map((row) => row.dataset.position), ['next', 'previous', 'active']);
  p.elements['next-track'].click();
  p.rows[1].click();
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.elements['track-title'].textContent, 'MHA 50k DROP');
  assert.equal(p.rows[1].attributes['aria-pressed'], 'true');
  assert.equal(p.room.dataset.state, 'idle');
  assert.equal(p.widgets.length, 0);
  assert.equal(p.head.children.length, 0);
  assert.equal(p.elements['embed-mount'].children.length, 0);
  p.controller.destroy();
});

test('disc state waits for real PLAY and paused navigation never starts a new track', async () => {
  const p = createPlayer();
  p.elements['disc-button'].click();
  await flush();
  let widget = p.widgets.at(-1);
  assert.match(widget.iframe.src, /auto_play=false/);
  assert.equal(widget.plays, 0);
  widget.emit('ready');
  assert.equal(widget.plays, 1);
  assert.equal(p.room.dataset.state, 'loading');
  widget.emit('play');
  assert.equal(p.room.dataset.state, 'playing');
  p.elements['disc-button'].click();
  widget.emit('pause');
  p.elements['next-track'].click();
  await flush();
  widget = p.widgets.at(-1);
  widget.emit('ready');
  assert.equal(widget.plays, 0);
  assert.equal(p.room.dataset.state, 'paused');
  p.elements['disc-button'].click();
  assert.equal(widget.plays, 1);
  assert.equal(p.room.dataset.state, 'loading');
  widget.emit('play');
  assert.equal(p.room.dataset.state, 'playing');
  p.controller.destroy();
});

test('playing navigation continues and stale events cannot rotate the new selection', async () => {
  const p = createPlayer();
  const oldWidget = await start(p);
  const oldPlay = oldWidget.callbacks.get('play');
  p.elements['next-track'].click();
  await flush();
  const current = p.widgets.at(-1);
  oldPlay();
  assert.equal(p.room.dataset.state, 'loading');
  current.emit('ready');
  assert.equal(current.plays, 1);
  current.emit('play');
  p.rows[1].click();
  assert.equal(p.widgets.at(-1), current, 'active cover is selection, not a play toggle');
  assert.equal(current.pauses, 0);
  assert.equal(p.room.dataset.state, 'playing');
  p.controller.destroy();
});

test('a pending pause is respected when moving to the next track', async () => {
  const p = createPlayer();
  await start(p);
  p.elements['disc-button'].click();
  // The provider has not emitted PAUSE yet, but the user's pause intent wins.
  p.elements['next-track'].click();
  await flush();
  const widget = p.widgets.at(-1);
  widget.emit('ready');
  assert.equal(widget.plays, 0);
  assert.equal(p.room.dataset.state, 'paused');
  p.controller.destroy();
});

test('cancelling a pending play request stays paused when the provider becomes ready', async () => {
  const p = createPlayer();
  p.elements['disc-button'].click();
  assert.equal(p.elements['disc-button'].attributes['aria-label'], 'Cancel loading Memories Of You');
  p.elements['disc-button'].click();
  assert.equal(p.room.dataset.state, 'paused');
  assert.equal(p.elements['disc-button'].attributes['aria-label'], 'Play Memories Of You');
  await flush();
  const widget = p.widgets.at(-1);
  assert.match(widget.iframe.title, /Aye Bay/);
  widget.emit('ready');
  assert.equal(widget.plays, 0);
  assert.equal(p.room.dataset.state, 'paused');
  p.elements['disc-button'].click();
  assert.equal(widget.plays, 1);
  assert.equal(p.elements['disc-button'].attributes['aria-label'], 'Cancel loading Memories Of You');
  p.controller.destroy();
});

test('play intent survives rapid selection; pressing CD during a silent load requests play', async () => {
  const p = createPlayer();
  p.elements['disc-button'].click();
  p.elements['next-track'].click();
  await flush();
  let widget = p.widgets.at(-1);
  widget.emit('ready');
  assert.equal(widget.plays, 1);
  widget.emit('play');
  p.elements['disc-button'].click();
  widget.emit('pause');
  p.elements['next-track'].click();
  await flush();
  widget = p.widgets.at(-1);
  assert.equal(p.elements['disc-button'].attributes['aria-label'], 'Play Show Me Love');
  p.elements['disc-button'].click();
  assert.equal(widget.plays, 0);
  assert.equal(p.elements['disc-button'].attributes['aria-label'], 'Cancel loading Show Me Love');
  widget.emit('ready');
  assert.equal(widget.plays, 1);
  widget.emit('play');
  assert.equal(p.room.dataset.activeTrack, '2');
  p.controller.destroy();
});

test('provider progress, seek and finish preserve existing stop-and-replay behavior', async () => {
  const p = createPlayer({ withMiniPlay: true });
  const widget = await start(p);
  widget.emit('progress', { currentPosition: 114116 });
  assert.equal(p.elements.elapsed.textContent, '1:54');
  assert.equal(p.elements.seek.value, '500');
  p.elements.seek.value = '250';
  p.elements.seek.dispatchEvent(new Event('input'));
  assert.equal(widget.seeks.at(-1), 228233 / 4);
  widget.emit('finish');
  assert.equal(p.room.dataset.state, 'paused');
  assert.equal(p.room.dataset.activeTrack, '0');
  assert.equal(p.elements.elapsed.textContent, '3:48');
  p.elements['mini-play'].click();
  assert.equal(widget.seeks.at(-1), 0);
  assert.equal(widget.plays, 2);
  p.controller.destroy();
});

test('timeout keeps provider fallback; retry and destruction clean up correctly', async () => {
  const p = createPlayer({ withAPI: false });
  p.elements['disc-button'].click();
  assert.equal(p.head.children.length, 1);
  assert.ok([...p.timers.values()].every(({ delay }) => delay === 12000));
  p.fireTimeouts();
  await flush();
  assert.equal(p.room.dataset.state, 'error');
  assert.equal(p.head.children.length, 0);
  assert.equal(p.elements['embed-mount'].children.length, 1);
  assert.match(p.elements['track-external'].href, /memories-of-you/);
  p.elements['disc-button'].click();
  assert.equal(p.head.children.length, 1);
  p.controller.destroy();
  await flush();
  assert.equal(p.head.children.length, 0);
  assert.equal(p.timers.size, 0);
  assert.equal(p.elements['embed-mount'].children.length, 0);
  p.elements['next-track'].click();
  assert.equal(p.room.dataset.activeTrack, '0', 'destroy removes navigation listeners');
});
