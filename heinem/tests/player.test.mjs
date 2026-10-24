import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the actual controller against deterministic DOM/provider boundaries.
// Network audio and visual placement are covered separately in browser QA.
const interactionSource = stripTypeScriptTypes(
  readFileSync(new URL('../src/lib/disc-interaction.ts', import.meta.url), 'utf8'),
).replace('export function initDiscInteraction', 'function initDiscInteraction');
const source = interactionSource + '\n' + stripTypeScriptTypes(
  readFileSync(new URL('../src/lib/player.ts', import.meta.url), 'utf8'),
).replace(/import \{ initDiscInteraction \} from '.\/disc-interaction';/, '')
  .replace(/import \{ createSoundCloudCovers \} from '.\/soundcloud-covers';/, '')
  .replace('export function initPlayer', 'function initPlayer');

class Element extends EventTarget {
  constructor(id = '') {
    super();
    this.id = id;
    this.dataset = {};
    this.attributes = {};
    this.style = {
      setProperty: (key, value) => { this.style[key] = value; },
      removeProperty: (key) => { delete this.style[key]; },
    };
    this.classes = new Set();
    this.classList = {
      toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name),
    };
    this.value = '0';
    this.children = [];
    this.hidden = false;
    this.disabled = false;
    this.clientWidth = 1000;
    this.clientHeight = 400;
    this.captured = new Set();
  }
  querySelector() { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
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

function createPlayer({ withAPI = true, withMiniPlay = false, reducedMotion = true } = {}) {
  const ids = [
    'listening-room', 'disc-button', 'next-track', 'previous-track', 'seek', 'volume',
    'elapsed', 'duration', 'track-title', 'track-credit', 'track-counter',
    'track-external', 'player-kicker', 'disc-hint', 'player-message', 'embed-mount',
  ];
  if (withMiniPlay) ids.push('mini-play');
  const elements = Object.fromEntries(ids.map((id) => [id, new Element(id)]));
  elements.volume.value = '70';
  const rows = [0, 1, 2, 3, 4, 5].map((index) => {
    const row = new Element();
    row.dataset.track = String(index);
    return row;
  });
  const artwork = new Element();
  const stage = new Element('stage');
  elements['listening-room'].querySelector = (selector) => selector === '.jewel-stage' ? stage : artwork;
  elements['listening-room'].querySelectorAll = () => rows;
  const head = new Element();
  const widgets = [];
  const timers = new Map();
  let nextTimer = 0;
  let clock = 0;
  const motion = new EventTarget();
  motion.matches = reducedMotion;

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
  const document = Object.assign(new EventTarget(), {
      getElementById: (id) => elements[id] ?? null,
      createElement: () => new Element(),
      head, hidden: false,
  });
  const window = Object.assign(new EventTarget(), {
    ...(withAPI ? { SC: { Widget: factory } } : {}),
    matchMedia: (query) => query.includes('reduced-motion') ? motion : { matches: false },
  });
  const context = vm.createContext({
    document, window,
    // Artwork requests are a separate lazy browser boundary. Unit tests
    // exercise only the carousel/player transport and must remain offline.
    createSoundCloudCovers: () => ({ show() {}, destroy() {} }),
    URLSearchParams, AbortController,
    performance: { now: () => clock },
    requestAnimationFrame(callback) {
      const id = ++nextTimer;
      timers.set(id, { callback: () => callback(clock), delay: 16, at: clock + 16 });
      return id;
    },
    cancelAnimationFrame: (id) => timers.delete(id),
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, delay, at: clock + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  vm.runInContext(source, context);
  const controller = vm.runInContext('initPlayer()', context);
  return {
    controller, elements, rows, widgets, timers, head, motion, stage,
    room: elements['listening-room'],
    advance(milliseconds) {
      const until = clock + milliseconds;
      let pending;
      while ((pending = [...timers].filter(([, timer]) => timer.at <= until)
        .sort((a, b) => a[1].at - b[1].at)[0])) {
        const [id, { callback, at }] = pending;
        clock = at;
        timers.delete(id);
        callback();
      }
      clock = until;
    },
    fireTimeouts() {
      for (const [id, { callback }] of [...timers]) {
        timers.delete(id);
        callback();
      }
    },
  };
}

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

const pointer = (stage, type, x, y, extra = {}) => {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0,
    clientX: x, clientY: y, ...extra });
  stage.dispatchEvent(event);
  return event;
};

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
  assert.deepEqual(p.rows.map((row) => row.dataset.position), ['active', 'next', 'hidden', 'hidden', 'hidden', 'previous']);
  p.elements['previous-track'].click();
  assert.equal(p.room.dataset.activeTrack, '5');
  assert.equal(p.elements['track-title'].textContent, 'Seven Lions × Brieanna Grace');
  assert.deepEqual(p.rows.map((row) => row.dataset.position), ['next', 'hidden', 'hidden', 'hidden', 'previous', 'active']);
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

test('covers begin moving together with insertion and audio selection changes while concealed', () => {
  const p = createPlayer({ reducedMotion: false });
  const incoming = p.rows[1].style.transform;
  p.elements['next-track'].click();
  assert.equal(p.room.dataset.discPhase, 'inserting');
  p.advance(64);
  assert.notEqual(p.rows[1].style.transform, incoming, 'incoming case starts before concealment');
  assert.equal(p.room.dataset.activeTrack, '0');
  p.advance(64);
  assert.equal(p.room.dataset.discPhase, 'swapping');
  assert.equal(p.elements['disc-button'].style.visibility, 'hidden');
  p.advance(32);
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.room.dataset.discPhase, 'swapping');
  p.advance(64);
  assert.equal(p.room.dataset.discPhase, 'ejecting');
  p.advance(400);
  assert.equal(p.room.dataset.discPhase, 'idle');
  assert.equal(p.widgets.length, 0);
  assert.equal(p.head.children.length, 0);
  assert.equal(p.timers.size, 0);
  p.controller.destroy();
});

test('rapid arrows retain one latest destination and reversing before concealment springs back', () => {
  const p = createPlayer({ reducedMotion: false });
  p.elements['next-track'].click();
  p.elements['next-track'].click();
  p.advance(1200);
  assert.equal(p.room.dataset.activeTrack, '2');
  p.elements['previous-track'].click();
  p.elements['next-track'].click();
  p.elements['previous-track'].click();
  p.advance(1100);
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.room.dataset.discPhase, 'idle');
  p.elements['next-track'].click();
  p.advance(64);
  p.elements['previous-track'].click();
  p.advance(600);
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.room.dataset.discPhase, 'idle');
  assert.equal(p.timers.size, 0);
  p.controller.destroy();
});

test('horizontal drag scrubs cases and CD before committing and suppresses its synthetic click', () => {
  const p = createPlayer({ reducedMotion: false });
  const initial = p.rows[1].style.transform;
  pointer(p.stage, 'pointerdown', 600, 180);
  pointer(p.stage, 'pointermove', 530, 180);
  p.advance(16);
  const first = p.rows[1].style.transform;
  assert.notEqual(first, initial);
  assert.equal(p.room.dataset.activeTrack, '0', 'drag previews do not load or select audio');
  const transfer = new Event('lostpointercapture');
  Object.defineProperty(transfer, 'target', { value: p.rows[0] });
  Object.assign(transfer, { pointerId: 1 });
  p.stage.dispatchEvent(transfer);
  assert.equal(p.stage.dataset.dragging, 'true', 'implicit touch capture transfers from child to stage');
  pointer(p.stage, 'pointermove', 440, 180);
  p.advance(16);
  assert.notEqual(p.rows[1].style.transform, first);
  assert.equal(p.elements['disc-button'].style.visibility, 'hidden');
  assert.equal(p.room.dataset.activeTrack, '0');
  assert.equal(p.stage.hasPointerCapture(1), true);
  pointer(p.stage, 'pointerup', 440, 180);
  assert.equal(p.stage.hasPointerCapture(1), false);
  const click = new Event('click', { cancelable: true });
  Object.assign(click, { detail: 1 });
  p.stage.dispatchEvent(click);
  assert.equal(click.defaultPrevented, true, 'release cannot accidentally play/select the cover under it');
  p.advance(400);
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.room.dataset.discPhase, 'idle');
  assert.equal(p.widgets.length, 0);
  assert.equal(p.head.children.length, 0);
  p.controller.destroy();
});

test('short or cancelled drags return to the original pose without loading audio', () => {
  const p = createPlayer({ reducedMotion: false });
  const initial = p.rows[0].style.transform;
  pointer(p.stage, 'pointerdown', 500, 180);
  pointer(p.stage, 'pointermove', 450, 180);
  p.advance(160); // A held short drag is not a velocity flick.
  pointer(p.stage, 'pointerup', 450, 180);
  p.advance(400);
  assert.equal(p.rows[0].style.transform, initial);
  assert.equal(p.room.dataset.activeTrack, '0');
  pointer(p.stage, 'pointerdown', 300, 180);
  pointer(p.stage, 'pointermove', 650, 180);
  p.advance(16);
  pointer(p.stage, 'pointercancel', 650, 180);
  p.advance(500);
  assert.equal(p.rows[0].style.transform, initial);
  assert.equal(p.room.dataset.discPhase, 'idle');
  assert.equal(p.widgets.length, 0);
  assert.equal(p.timers.size, 0);
  p.controller.destroy();
});


// A single hold is allowed to orbit multiple times. Neither the selected
// player track nor the active SoundCloud transport changes until release.
test('long drag crosses multiple sleeves seamlessly and selects its final stop once', async () => {
  const p = createPlayer({ reducedMotion: false });
  const old = await start(p);
  const coordinates = element => element.style.transform.slice('translate3d('.length)
    .split(')')[0].split(',').map(Number.parseFloat);
  const startX = 840;
  pointer(p.stage, 'pointerdown', startX, 180);
  pointer(p.stage, 'pointermove', startX - 300 * .995, 180);
  p.advance(16);
  const before = [...p.rows, p.elements['disc-button']].map(coordinates);
  pointer(p.stage, 'pointermove', startX - 300 * 1.005, 180);
  p.advance(16);
  const after = [...p.rows, p.elements['disc-button']].map(coordinates);
  for (let i = 0; i < before.length; i++) {
    const delta = Math.hypot(...before[i].map((value, axis) => value - after[i][axis]));
    assert.ok(delta < 8, `carousel boundary cannot teleport item ${i}: ${delta}px`);
  }
  pointer(p.stage, 'pointermove', startX - 300 * 2.18, 180);
  p.advance(160); // The released gesture is no longer a flick.
  assert.equal(p.stage.dataset.dragging, 'true');
  assert.equal(p.room.dataset.activeTrack, '0', 'sweeping multiple covers must not reload music');
  assert.equal(p.widgets.length, 1);
  assert.equal(old.pauses, 0);
  pointer(p.stage, 'pointerup', startX - 300 * 2.18, 180);
  p.advance(650);
  await flush();
  assert.equal(p.room.dataset.activeTrack, '2');
  assert.equal(p.elements['track-title'].textContent, 'Show Me Love');
  assert.equal(p.widgets.length, 2, 'only the final release starts a new provider');
  assert.equal(old.pauses, 1);
  assert.equal(p.room.dataset.discPhase, 'idle');
  assert.equal(p.stage.dataset.dragging, 'false');
  p.controller.destroy();
});

test('continuous carousel wraps beyond three steps and reverses during one hold', () => {
  const p = createPlayer({ reducedMotion: false });
  pointer(p.stage, 'pointerdown', 900, 180);
  pointer(p.stage, 'pointermove', -330, 180); // 4.1 steps in a single hold.
  p.advance(160);
  assert.equal(p.room.dataset.activeTrack, '0');
  pointer(p.stage, 'pointerup', -330, 180);
  p.advance(650);
  assert.equal(p.room.dataset.activeTrack, '4');
  assert.equal(p.room.dataset.discPhase, 'idle');
  // One hold reverses direction through the origin and keeps moving.
  pointer(p.stage, 'pointerdown', 550, 180);
  pointer(p.stage, 'pointermove', -160, 180);
  p.advance(16);
  pointer(p.stage, 'pointermove', 880, 180);
  p.advance(180);
  assert.equal(p.room.dataset.activeTrack, '4');
  pointer(p.stage, 'pointerup', 880, 180);
  p.advance(650);
  assert.equal(p.room.dataset.activeTrack, '3', 'reversing the drag moves to the previous of six albums');
  assert.equal(p.timers.size, 0);
  assert.equal(p.widgets.length, 0);
  p.controller.destroy();
});

test('fast mouseup just past an integer sleeve does not overrun an extra album', () => {
  const p = createPlayer({ reducedMotion: false });
  pointer(p.stage, 'pointerdown', 720, 180);
  pointer(p.stage, 'pointermove', 399, 180); // 321px = 1.07 sleeves.
  p.advance(16);
  assert.equal(p.room.dataset.activeTrack, '0');
  pointer(p.stage, 'pointerup', 399, 180); // Immediate mouseup retains high velocity.
  p.advance(650);
  assert.equal(p.room.dataset.activeTrack, '1', 'near-boundary flick must not skip album 1');
  assert.equal(p.timers.size, 0);
  p.controller.destroy();
});

test('cancelling a multi-cover drag rewinds without intermediate track or network changes', () => {
  const p = createPlayer({ reducedMotion: false });
  const initial = p.rows.map(row => row.style.transform);
  pointer(p.stage, 'pointerdown', 900, 180);
  pointer(p.stage, 'pointermove', 120, 180); // 2.6 sleeves.
  p.advance(16);
  assert.equal(p.room.dataset.activeTrack, '0');
  pointer(p.stage, 'pointercancel', 120, 180);
  p.advance(900);
  assert.deepEqual(p.rows.map(row => row.style.transform), initial);
  assert.equal(p.room.dataset.activeTrack, '0');
  assert.equal(p.widgets.length, 0);
  assert.equal(p.timers.size, 0);
  p.controller.destroy();
});

test('vertical touch intent stays native and reduced motion commits swipes without animation', () => {
  const p = createPlayer();
  const initial = p.rows[0].style.transform;
  pointer(p.stage, 'pointerdown', 200, 100, { pointerType: 'touch' });
  const vertical = pointer(p.stage, 'pointermove', 204, 140, { pointerType: 'touch' });
  assert.equal(vertical.defaultPrevented, false);
  assert.equal(p.stage.hasPointerCapture(1), false);
  assert.equal(p.rows[0].style.transform, initial);
  pointer(p.stage, 'pointerdown', 500, 100, { pointerType: 'touch' });
  pointer(p.stage, 'pointermove', 250, 100, { pointerType: 'touch' });
  assert.equal(p.rows[0].style.transform, initial, 'reduced motion avoids the moving preview');
  pointer(p.stage, 'pointerup', 250, 100, { pointerType: 'touch' });
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.room.dataset.discPhase, 'idle');
  assert.equal(p.timers.size, 0);
  p.controller.destroy();
});

test('reduced-motion changes settle a pending exchange immediately and destroy cancels timers', () => {
  const p = createPlayer({ reducedMotion: false });
  p.elements['next-track'].click();
  p.motion.matches = true;
  p.motion.dispatchEvent(new Event('change'));
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.room.dataset.discPhase, 'idle');
  assert.equal(p.timers.size, 0);
  p.motion.matches = false;
  p.motion.dispatchEvent(new Event('change'));
  p.elements['next-track'].click();
  p.controller.destroy();
  p.advance(1000);
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.timers.size, 0);
});

test('keyboard play during a cover transition applies the latest selected release', async () => {
  const p = createPlayer({ reducedMotion: false });
  p.elements['next-track'].click();
  p.elements['disc-button'].click();
  await flush();
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.room.dataset.discPhase, 'idle');
  assert.match(p.widgets.at(-1).iframe.src, /1649117949/);
  p.widgets.at(-1).emit('ready');
  assert.equal(p.widgets.at(-1).plays, 1);
  assert.equal(p.room.dataset.state, 'loading');
  p.controller.destroy();
});

test('playing swaps retire the old provider only when the disc is concealed and ignore superseded frames', async () => {
  const p = createPlayer({ reducedMotion: false });
  const old = await start(p);
  const stalePlay = old.callbacks.get('play');
  p.elements['next-track'].click();
  p.advance(112);
  assert.equal(old.pauses, 0, 'audio does not stop just because the slide begins');
  assert.equal(p.widgets.length, 1);
  p.advance(48);
  await flush();
  assert.equal(old.pauses, 1);
  const intermediate = p.widgets.at(-1);
  const staleReady = intermediate.callbacks.get('ready');
  p.elements['next-track'].click();
  p.advance(600);
  await flush();
  const current = p.widgets.at(-1);
  stalePlay();
  staleReady();
  assert.equal(intermediate.plays, 0);
  assert.equal(p.room.dataset.state, 'loading');
  current.emit('ready');
  assert.equal(current.plays, 1);
  p.advance(400);
  current.emit('play');
  assert.equal(p.room.dataset.activeTrack, '2');
  assert.equal(p.room.dataset.discPhase, 'idle');
  assert.equal(p.room.dataset.state, 'playing');
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

test('six-track sleeve shows only adjacent covers, wraps, and stays network-idle', () => {
  const p = createPlayer();
  assert.equal(p.elements['track-counter'].textContent, '01 / 06');
  assert.deepEqual(p.rows.map(row => row.dataset.position),
    ['active', 'next', 'hidden', 'hidden', 'hidden', 'previous']);
  assert.deepEqual(p.rows.map(row => row.style.opacity),
    ['1.000', '1.000', '0.000', '0.000', '0.000', '1.000']);
  p.elements['previous-track'].click();
  assert.equal(p.room.dataset.activeTrack, '5');
  assert.equal(p.elements['track-counter'].textContent, '06 / 06');
  assert.equal(p.rows[4].dataset.position, 'previous');
  assert.equal(p.rows[0].dataset.position, 'next');
  p.elements['next-track'].click();
  assert.equal(p.room.dataset.activeTrack, '0');
  p.rows[3].click();
  assert.equal(p.room.dataset.activeTrack, '3');
  assert.equal(p.elements['track-title'].textContent, "Don't Let Me Fall");
  assert.equal(p.elements['duration'].textContent, '0:00', 'duration is unknown until SoundCloud resolves it');
  assert.equal(p.widgets.length, 0);
  assert.equal(p.head.children.length, 0);
  p.controller.destroy();
});
test('new releases use canonical SoundCloud permalinks rather than invented track IDs', async () => {
  for (const [index, url] of [
    [3, 'https://soundcloud.com/heinemstrange/dont-let-me-fall'],
    [4, 'https://soundcloud.com/heinemstrange/jvke-her-feat-annika-wells'],
    [5, 'https://soundcloud.com/heinemstrange/seven-lions-brieanna-grace'],
  ]) {
    const p = createPlayer();
    p.rows[index].click();
    p.elements['disc-button'].click();
    await flush();
    assert.equal(p.widgets.length, 1);
    const iframe = p.widgets[0].iframe;
    const actual = new URL(iframe.src).searchParams.get('url');
    assert.equal(actual, url);
    assert.equal(p.elements['track-external'].href, url);
    assert.equal(iframe.allow, 'autoplay; encrypted-media');
    p.controller.destroy();
  }
});
test('six-cover transition crossfades hidden neighbors without stacking extra covers', () => {
  const p = createPlayer({ reducedMotion: false });
  p.elements['next-track'].click();
  p.advance(260);
  const alpha = p.rows.map(row => Number(row.style.opacity));
  assert.equal(alpha[0], 1);
  assert.equal(alpha[1], 1);
  assert.ok(alpha[5] < 1, 'outgoing distant cover should fade');
  assert.ok(alpha[2] > 0, 'new nearby cover should enter');
  assert.equal(alpha[3], 0);
  assert.equal(alpha[4], 0);
  p.advance(500);
  assert.equal(p.room.dataset.activeTrack, '1');
  assert.equal(p.rows[5].style.opacity, '0.000');
  assert.equal(p.rows[2].style.opacity, '1.000');
  p.controller.destroy();
});
