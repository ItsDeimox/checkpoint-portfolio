import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {home,ROOM_PANELS} from '../src/pages/home-room.js';
const css=readFileSync(new URL('../src/styles-mobile.css',import.meta.url),'utf8');
const nav=()=>home().match(/<nav class="room-mobile-context"[\s\S]*?<\/nav>/)?.[0]||'';

test('mobile routes share the physical panels etched numbering and retain direct action',()=>{
 const html=nav();
 assert.equal((html.match(/data-mobile-panel=/g)||[]).length,5);
 for(let i=0;i<5;i++){
  assert.ok(html.includes(`data-mobile-panel="${i}" data-open-panel="${i}"`));
  assert.ok(html.includes(`<span class="room-mobile-index" aria-hidden="true">0${i+1}</span>`));
  assert.ok(html.includes(ROOM_PANELS[i].title.replaceAll('&','&amp;')));
 }
 assert.equal((html.match(/class="room-mobile-arrow"/g)||[]).length,5);
 assert.doesNotMatch(html,/aria-expanded|data-active-panel-open|<img/,'no hidden destinations, selection step or extra media');
});
test('mobile navigation uses a seamless neutral surface rather than coloured rounded cards',()=>{
 const frame=css.match(/\.scene-ready \.room-mobile-context\s*\{([^}]+)\}/)?.[1]||'';
 const button=css.match(/\.room-mobile-card\s*\{([^}]+)\}/)?.[1]||'';
 assert.match(frame,/border:\s*0/);assert.match(frame,/border-radius:\s*0/);
 assert.match(button,/min-height:\s*48px/);assert.match(button,/border-radius:\s*0/);
 assert.doesNotMatch(css,/--mobile-accent|#a66bff|#ff913d|#79d8ff/,'scene colours are not duplicated as a rainbow UI');
 assert.doesNotMatch(css,/backdrop-filter|requestAnimationFrame/,'do not add full-frame blur work to the live scene');
 assert.match(css,/\.room-mobile-context::before\s*\{[^}]*pointer-events:\s*none/);
 assert.match(css,/\.room-mobile-card\[data-mobile-panel="0"\]/);
});
test('touch and keyboard remain safe in reduced motion and short landscape',()=>{
 assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
 assert.match(css,/\.room-mobile-card:focus-visible/);
 assert.match(css,/max-height:\s*500px/);assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.room-mobile-card strong\s*\{[^}]*white-space:\s*normal/);
});
