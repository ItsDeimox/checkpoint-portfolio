import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { transform } from 'esbuild';
import * as homePage from '../src/pages/home-room.js';
import * as roomShell from '../src/ui/room-visitor-shell.js';
import * as visitorSettings from '../src/ui/room-visitor-settings.js';
import * as introModule from '../src/ui/room-intro.js';
import * as navigation from '../src/ui/room-navigation.js';
import * as musicSettings from '../src/scene/room-music-settings.js';
import * as visualSettings from '../src/scene/room-visual-settings.js';

// Run the real entrypoint and real HTML/data renderers. Only browser transport,
// focus/event dispatch, storage, bundle loading and the GPU scene are controlled.
const source = await transform(await readFile(new URL('../src/main.js', import.meta.url), 'utf8'), {
  format: 'cjs', supported: { 'dynamic-import': false },
});
const css = await readFile(new URL('../src/styles-room.css', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const decode = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, key) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[key]);
const dataKey = name => name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

class ElementStub {
  constructor(tagName, document) {
    this.tagName = tagName.toLowerCase(); this.ownerDocument = document;
    this.children = []; this.parentElement = null; this.attributes = new Map();
    this.dataset = {}; this.style = {}; this.listeners = new Map(); this.inert = false;
    this._text = ''; this._html = ''; this.value = ''; this.scrollTop = 0;
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle(name, force) { const active = force ?? !classes.has(name); active ? classes.add(name) : classes.delete(name); return active; },
      reset: value => { classes.clear(); value.split(/\s+/).filter(Boolean).forEach(name => classes.add(name)); },
    };
  }
  get id() { return this.getAttribute('id') ?? ''; }
  get hidden() { return this.attributes.has('hidden'); }
  set hidden(value) { value ? this.attributes.set('hidden', '') : this.attributes.delete('hidden'); }
  get disabled() { return this.attributes.has('disabled'); }
  set disabled(value) { value ? this.attributes.set('disabled', '') : this.attributes.delete('disabled'); }
  get open() { return this.attributes.has('open'); }
  set open(value) { value ? this.attributes.set('open', '') : this.attributes.delete('open'); }
  get isConnected() { return this === this.ownerDocument || Boolean(this.parentElement?.isConnected); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.children.forEach(child => { child.parentElement = null; }); this.children = []; }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'class') this.classList.reset(value);
    if (name.startsWith('data-')) this.dataset[dataKey(name)] = String(value);
    if (name === 'value') this.value = String(value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  append(child) { child.parentElement = this; this.children.push(child); }
  contains(element) { return element === this || this.children.some(child => child.contains(element)); }
  matches(selector) {
    return selector.split(',').some(part => {
      let value = part.trim();
      if (value.endsWith(':not([disabled])')) {
        if (this.disabled) return false;
        value = value.slice(0, -':not([disabled])'.length);
      }
      const attribute = value.match(/\[([^=\]]+)(?:="([^"]*)")?\]/);
      if (attribute && (!this.attributes.has(attribute[1]) || (attribute[2] !== undefined && this.getAttribute(attribute[1]) !== attribute[2]))) return false;
      value = value.replace(/\[[^\]]*\]/g, '');
      if (!value) return true;
      if (value[0] === '#') return this.id === value.slice(1);
      if (value[0] === '.') return this.classList.contains(value.slice(1));
      return this.tagName === value.toLowerCase();
    });
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  getClientRects() {
    for (let element = this; element; element = element.parentElement) if (element.hidden) return [];
    return this.isConnected ? [{}] : [];
  }
  focus() {
    for (let element = this; element; element = element.parentElement) if (element.inert || element.hidden) return;
    const previous = this.ownerDocument.activeElement;
    if (previous === this || !this.isConnected) return;
    this.ownerDocument.activeElement = this;
    if (previous) fire(previous, 'focusout', { relatedTarget: this });
    fire(this, 'focusin', { relatedTarget: previous });
  }
  addEventListener(name, handler) { this.listeners.set(name, [...(this.listeners.get(name) ?? []), handler]); }
  get innerHTML() { return this._html; }
  set innerHTML(html) {
    if (this.contains(this.ownerDocument.activeElement)) this.ownerDocument.activeElement = this.ownerDocument.body;
    this.children.forEach(child => { child.parentElement = null; });
    this.children = []; this._text = ''; this._html = html;
    const stack = [this], voidTags = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);
    // This fixture parses the application's static fragments, not browser CSS
    // or layout. Keeping their authored attributes makes selector mistakes fail.
    for (const token of html.match(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g) ?? []) {
      if (token.startsWith('<!--')) continue;
      if (token.startsWith('</')) {
        const tag = token.slice(2, -1).trim().toLowerCase();
        const index = stack.findLastIndex(element => element.tagName === tag);
        if (index > 0) stack.length = index;
      } else if (token.startsWith('<')) {
        const tag = token.match(/^<([^\s/>]+)/)[1].toLowerCase();
        const element = new ElementStub(tag, this.ownerDocument);
        const attributes = token.slice(tag.length + 1).replace(/\/?\s*>$/, '');
        for (const match of attributes.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
          element.setAttribute(match[1], decode(match[2] ?? match[3] ?? match[4] ?? ''));
        }
        stack.at(-1).append(element);
        if (!voidTags.has(tag) && !token.endsWith('/>')) stack.push(element);
      } else stack.at(-1)._text += decode(token);
    }
  }
}

function fire(target, type, values = {}) {
  const event = { type, target, button: 0, defaultPrevented: false, ...values,
    preventDefault() { this.defaultPrevented = true; } };
  for (let element = target; element; element = element.parentElement) {
    for (const handler of element.listeners.get(type) ?? []) handler(event);
  }
  return event;
}

function harness({ path = '/', stored = {}, bundleError = null } = {}) {
  const document = new ElementStub('document'); document.ownerDocument = document;
  document.body = new ElementStub('body', document); document.append(document.body);
  document.activeElement = document.body;
  document.body.innerHTML = '<header id="header"></header><main id="main"></main><footer id="footer"></footer><div id="announcer"></div>';
  const window = { listeners: new Map(), addEventListener: ElementStub.prototype.addEventListener };
  const writes = [], visits = [], opened = [], calls = [];
  const location = { pathname: path, search: '?debug', assign: href => visits.push({ assign: href }) };
  const storage = new Map([['dxt-settings', JSON.stringify(stored)]]);
  const localStorage = { getItem: key => storage.get(key), setItem(key, value) { storage.set(key, value); writes.push(JSON.parse(value)); } };
  const history = Object.fromEntries(['pushState', 'replaceState'].map(method => [method, (state, title, path) => {
    visits.push({ method, state, path }); location.pathname = path;
  }]));
  window.open = (...args) => { opened.push(args); return null; };
  let scene;
  class PageMusic {
    constructor({settings,onState}){this.settings=settings;this.onState=onState;this.enabled=false;this.status='idle';}
    setEnabled(value){this.enabled=value;this.status=value?'playing':'paused';this.onState(this.inspect());return Promise.resolve(value);}
    inspect(){return {enabled:this.enabled,status:this.status,title:'DJ ROOTS - Lagoon',hasTrack:true,error:null};}
    setSettings(values){this.settings=values;calls.push({music:{...values}});}
    suspend(){calls.push({audioSuspend:true});return Promise.resolve();}
    resume(){calls.push({audioResume:true});return Promise.resolve();}
    close(){calls.push({audioClose:true});return Promise.resolve();}
  }
  class HeroScene {
    constructor(canvas, settings, callbacks) {
      scene = this;
      Object.assign(this, { canvas, settings, callbacks, ready: false, disposed: false, lost: false,
        brandLogo: {ready:true}, cameraRig: { mode: 'overview' }, approaches: [], resets: [], startup: deferred() });
      this.readyPromise = this.startup.promise;
    }
    approach(index, complete) { this.cameraRig.mode = 'approaching'; this.approaches.push({ index, complete }); return this.ready; }
    reset(complete) { this.cameraRig.mode = 'returning'; this.resets.push(complete); }
    showPanelContent(index) { this.contentPanel = index; calls.push({ show: index }); }
    focusAction(id) { calls.push({ focus: id }); }
    focusPanel(index) { calls.push({ focusPanel: index }); }
    setVisualSettings(values) { calls.push({ visual: { ...values } }); }
    setSettings() { calls.push({ settings: true }); }
    setSound(value) { this.callbacks.onMusicState({enabled:value,status:value?'playing':'paused',title:'Track',hasTrack:true,error:null});return Promise.resolve(value); }
    spinLogo() {calls.push({spin:true});return true;}
    setMusicSettings(values) {calls.push({music:{...values}});}
    sleep() { calls.push({ sleep: true }); }
    wake() { calls.push({ wake: true }); }
    inspect() { return { ready: this.ready }; }
    dispose() { this.disposed = true; this.ready = false; calls.push({ dispose: true }); return Promise.resolve(); }
  }
  const dependencies = {
    './pages/home-room.js': homePage, './ui/room-visitor-shell.js': roomShell, './ui/room-intro.js':introModule, './ui/room-visitor-settings.js':visitorSettings, './scene/room-music.js':{RoomMusic:PageMusic},
    './ui/room-navigation.js': navigation, './scene/room-visual-settings.js': visualSettings, './scene/room-music-settings.js': musicSettings,
  };
  runInNewContext(source.code, {
    document, window, location, history, localStorage,
    Element: ElementStub, HTMLElement: ElementStub, URLSearchParams, setTimeout, clearTimeout,
    console: { warn: (...values) => calls.push({ warning: values }) },
    require(name) {
      if (name === './render/showroom.bundle.js') {
        calls.push({ download: true });
        if (bundleError) throw bundleError;
        return { HeroScene };
      }
      assert.ok(name in dependencies, `Unexpected entrypoint dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: 'main.js' });
  const get = selector => document.querySelector(selector);
  const ready = async () => {
    await settle();
    scene.ready = true; scene.lost = false;
    get('.room-hero').classList.remove('scene-unavailable'); get('.room-hero').classList.add('scene-ready');
    scene.callbacks.onReady(); scene.startup.resolve(scene); await settle();
  };
  const arrive = (index = scene.approaches.length - 1) => {
    scene.cameraRig.mode = 'focused'; scene.approaches[index].complete();
  };
  const pop = path => { location.pathname = path; fire(window, 'popstate'); };
  return { document, window, location, writes, visits, opened, calls, storage, get, ready, arrive, pop,
    get scene() { return scene; }, inspect: () => window.__DXT__.inspect() };
}

test('focused 3D content keeps the canvas interactive and native actions accessible without a modal focus trap', async () => {
  const f = harness(); await f.ready();
  f.scene.callbacks.onPanelRequest(4, f.get('[data-open-panel="4"]'));
  assert.equal(f.get('#room-panel-options').hidden, true, 'Options must wait for the camera');
  f.arrive();
  const options = f.get('#room-panel-options');
  assert.equal(options.hidden, false); assert.equal(options.getAttribute('role'), 'group');
  assert.equal(options.getAttribute('aria-modal'), null);
  assert.ok(options.classList.contains('is-world-content'));
  assert.equal(options.inert, false);
  for (const selector of ['#hero-canvas', '#header', '#footer']) assert.equal(f.get(selector).inert, false, selector);
  for (const selector of ['.room-panel-targets', '.room-mobile-context']) assert.equal(f.get(selector).inert, true, selector);
  assert.equal(f.document.activeElement, options.querySelector('h2'));
  assert.ok(f.calls.some(call => call.show === 4));
  assert.match(css, /\.room-panel-options\.is-world-content\s*\{[^}]*width:\s*1px;[^}]*clip-path:\s*inset\(50%\)/);
  const action = options.querySelector('[data-room-panel-action="instagram"]');
  action.focus(); assert.equal(f.calls.at(-1).focus, 'instagram');
  assert.equal(fire(action, 'click').defaultPrevented, false, 'Native links retain browser activation');
  assert.equal(f.opened.length, 0, 'The document handler must not duplicate native link opening');
  const last = options.querySelectorAll('a[href]').at(-1); last.focus();
  assert.equal(fire(last, 'keydown', { key: 'Tab' }).defaultPrevented, false);
  f.get('#hero-canvas').focus(); assert.equal(f.calls.at(-1).focus, null);
  assert.equal(fire(f.get('#hero-canvas'), 'keydown', { key: 'Escape' }).defaultPrevented, true);
  assert.equal(options.hidden, true); assert.equal(f.inspect().selectedPanel, null);
  f.scene.resets.at(-1)(); assert.equal(f.document.activeElement, f.get('#hero-canvas'));
});

test('download failure opens the native modal, traps Tab and restores the actual fallback trigger on Escape', async () => {
  const f = harness({ bundleError: new Error('Bundle unavailable') }); await settle();
  assert.equal(f.inspect().phase, 'unavailable');
  const trigger = f.get('[data-fallback-panel="1"]'); trigger.focus();
  assert.equal(fire(trigger, 'click', { ctrlKey: true }).defaultPrevented, false);
  assert.equal(fire(trigger, 'click').defaultPrevented, true);
  const options = f.get('#room-panel-options'), controls = options.querySelectorAll('a[href], button:not([disabled])');
  assert.equal(options.hidden, false); assert.equal(options.getAttribute('role'), 'dialog');
  assert.equal(options.getAttribute('aria-modal'), 'true');
  assert.equal(options.classList.contains('is-world-content'), false);
  for (const selector of ['#header', '#footer', '#hero-canvas', '.room-panel-targets']) assert.equal(f.get(selector).inert, true, selector);
  assert.equal(fire(f.document.activeElement, 'keydown', { key: 'Tab', shiftKey: true }).defaultPrevented, true);
  assert.equal(f.document.activeElement, controls.at(-1));
  assert.equal(fire(f.document.activeElement, 'keydown', { key: 'Tab' }).defaultPrevented, true);
  assert.equal(f.document.activeElement, controls[0]);
  fire(f.document.activeElement, 'keydown', { key: 'Escape' });
  assert.equal(options.hidden, true); assert.equal(f.document.activeElement, trigger);
  for (const selector of ['#header', '#footer', '#hero-canvas', '.room-panel-targets']) assert.equal(f.get(selector).inert, false, selector);
});

test('context restoration and route changes cannot reveal an obsolete approach callback', async () => {
  const f = harness({ path: '/contact' });
  assert.equal(f.inspect().selectedPanel, 4); assert.equal(f.get('#room-panel-options').hidden, true);
  await f.ready(); assert.equal(f.scene.approaches[0].index, 4);
  f.scene.callbacks.onPanelRequest(0, f.get('[data-open-panel="0"]'));
  f.arrive(0); assert.equal(f.get('#room-panel-options').hidden, true);
  f.arrive(1); assert.equal(f.get('#room-panel-options').getAttribute('role'), 'group');
  f.scene.ready = false; f.scene.lost = true;
  f.scene.callbacks.onUnavailable(new Error('Context lost'));
  assert.equal(f.get('#room-panel-options').getAttribute('role'), 'dialog');
  assert.equal(f.get('#hero-canvas').inert, true);
  await f.ready();
  const restored = f.scene.approaches.length - 1;
  assert.equal(f.get('#room-panel-options').hidden, true);
  assert.equal(f.get('#hero-canvas').inert, false);
  const visits = f.visits.length;
  f.pop('/groups'); const latest = f.scene.approaches.length - 1;
  f.arrive(restored); assert.equal(f.get('#room-panel-options').hidden, true);
  f.arrive(latest);
  assert.equal(f.inspect().selectedPanel, 1);
  assert.equal(f.get('#room-panel-options').getAttribute('role'), 'group');
  assert.match(f.document.title, /^Groups & Games/);
  assert.equal(f.visits.length, visits, 'popstate must not push another history entry');
  f.pop('/'); f.arrive(latest);
  assert.equal(f.inspect().selectedPanel, null); assert.equal(f.get('#room-panel-options').hidden, true);
});

test('closing the fallback during context loss restores the overview instead of reopening its old content', async () => {
  const f = harness(); await f.ready();
  f.scene.callbacks.onPanelRequest(2, f.get('[data-open-panel="2"]')); f.arrive();
  f.scene.ready = false; f.scene.lost = true; f.scene.callbacks.onUnavailable(new Error('Context lost'));
  fire(f.get('[data-room-panel-action="back"]'), 'click');
  assert.equal(f.inspect().selectedPanel, null);
  const previous = f.scene.approaches.length;
  await f.ready();
  assert.equal(f.scene.approaches.length, previous);
  assert.equal(f.scene.resets.length, 1);
  assert.equal(f.get('#room-panel-options').hidden, true);
  assert.equal(f.get('#hero-canvas').inert, false);
});

test('surface links authorize cloned bundle actions by authored id and href and open synchronously once', async () => {
  const f = harness(); await f.ready();
  f.scene.callbacks.onPanelRequest(4, f.get('[data-open-panel="4"]')); f.arrive();
  const authored = homePage.ROOM_PANELS[4].options[1], clone = JSON.parse(JSON.stringify(authored));
  assert.notEqual(clone, authored);
  f.scene.callbacks.onPanelAction(clone);
  assert.equal(f.opened.length, 1, 'No asynchronous handoff may consume browser user activation');
  assert.deepEqual(f.opened[0], [authored.href, '_blank', 'noopener,noreferrer']);
  f.scene.callbacks.onPanelAction({ ...clone, href: 'https://unrelated.invalid/' });
  f.scene.callbacks.onPanelAction({ ...homePage.ROOM_PANELS[0].options[0] });
  assert.equal(f.opened.length, 1);
  f.scene.callbacks.onPanelAction({ id: 'back', kind: 'back' });
  assert.equal(f.inspect().selectedPanel, null); assert.equal(f.get('#room-panel-options').hidden, true);
  f.scene.callbacks.onPanelAction(clone); assert.equal(f.opened.length, 1);
});

test('visitor controls preserve approved optics and cycle exactly Medium, High and Low',async()=>{
  const f=harness({stored:{quality:'high',paused:true,visual:{exposure:1.2,bloom:0}}});await f.ready();
  assert.equal(f.get('#visual-exposure'),null);assert.equal(f.get('.room-settings'),null);
  assert.equal(f.inspect().settings.quality,'auto');assert.equal(f.inspect().settings.music.volume,.2);assert.equal(f.inspect().settings.music.reactivity,.85);
  assert.equal(f.inspect().settings.visual.exposure,1.2);assert.equal(f.inspect().settings.visual.bloom,0);
  const menu=f.get('.room-audio-menu');menu.open=true;
  for(const quality of ['high','low','auto']){
    const button=f.get('#quality');button.focus();fire(button,'click');
    assert.equal(f.inspect().settings.quality,quality);assert.equal(f.document.activeElement,f.get('#quality'));
    assert.equal(f.inspect().settings.visual.exposure,1.2);
  }
  const reloaded=harness({stored:f.writes.at(-1)});await settle();assert.equal(reloaded.inspect().settings.quality,'auto');
});

test('page lifecycle sleeps a cached scene and disposes only a noncached exit', async () => {
  const f = harness(); await f.ready();
  fire(f.window, 'pagehide', { persisted: true }); assert.ok(f.calls.some(c=>c.sleep));assert.ok(f.calls.some(c=>c.audioSuspend));
  assert.equal(f.scene.disposed, false);
  fire(f.window, 'pageshow'); assert.ok(f.calls.some(c=>c.wake));assert.ok(f.calls.some(c=>c.audioResume));
  fire(f.window, 'pagehide', { persisted: false }); assert.equal(f.scene.disposed, true);
});

test('logo click is independent of Home and never resets an open panel',async()=>{
 const f=harness();await f.ready();fire(f.get('[data-open-panel="3"]'),'click');f.arrive();
 const path=f.location.pathname,resets=f.scene.resets.length;
 fire(f.get('[data-spin-logo]'),'click');assert.equal(f.calls.at(-1).spin,true);assert.equal(f.location.pathname,path);assert.equal(f.scene.resets.length,resets);assert.equal(f.scene.contentPanel,3);
});
test('music controls keep the active slider, persist only controls and render file names as text',async()=>{
 const f=harness();await f.ready();const slider=f.get('#music-volume');slider.focus();slider.value='.72';fire(slider,'input');
 assert.equal(f.document.activeElement,slider);assert.equal(f.calls.findLast(c=>c.music).music.volume,.72);assert.equal(f.get('[data-music-value="volume"]').textContent,'72%');
 fire(slider,'change');assert.equal(f.writes.at(-1).music.volume,.72);
 f.scene.callbacks.onMusicState({enabled:true,status:'playing',title:'<img src=x onerror=alert(1)>',hasTrack:true,error:null});
 assert.equal(f.get('[data-music-title]').textContent,'<img src=x onerror=alert(1)>');assert.equal(f.get('[data-music-title]').children.length,0);
 assert.equal(f.get('#sound-toggle').getAttribute('aria-pressed'),'true');fire(f.get('#sound-toggle'),'click');await settle();assert.equal(f.get('#sound-toggle').getAttribute('aria-pressed'),'false');
 assert.equal(f.writes.at(-1).music.title,undefined);
});
