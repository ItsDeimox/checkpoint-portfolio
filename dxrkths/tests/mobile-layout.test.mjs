import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {home,ROOM_PANELS} from '../src/pages/home-room.js';
import {RUNTIME_FILES} from '../tools/build.mjs';
const cssURL=new URL('../src/styles-mobile.css',import.meta.url);
const css=fs.existsSync(cssURL)?fs.readFileSync(cssURL,'utf8'):'';

test('mobile showroom offers all five real destinations as immediately available labelled buttons',()=>{
 const html=home();
 const native=html.match(/<nav class="room-mobile-context"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.ok(native,'mobile destinations have their own named navigation region');
 assert.equal((native.match(/data-mobile-panel=/g)||[]).length,5);
 for(let i=0;i<ROOM_PANELS.length;i++){
  assert.match(native,new RegExp(`data-mobile-panel="${i}" data-open-panel="${i}"`));
  assert.ok(native.includes(ROOM_PANELS[i].title.replaceAll('&','&amp;')));
 }
 assert.doesNotMatch(native,/data-active-panel-open|text-overflow:ellipsis/);
 assert.equal((html.match(/class="room-panel-link"/g)||[]).length,5,'approved desktop projection controls remain');
 assert.equal((html.match(/data-fallback-panel=/g)||[]).length,5,'WebGL-unavailable paths remain available');
});
test('mobile corrections have a production stylesheet with bounded portrait and touch-landscape scope',()=>{
 assert.ok(RUNTIME_FILES.includes('src/styles-mobile.css'));
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/href="\/src\/styles-mobile.css"/);
 assert.match(css,/@media\s*\(max-width:\s*740px\),\s*\(pointer:\s*coarse\)\s*and\s*\(max-width:\s*1024px\)/);
 assert.match(css,/\.room-mobile-card\s*\{[^}]*min-height:\s*48px/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.section-navigation\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
 assert.match(css,/\.fp-arrow[^}]*min-width:\s*44px/);
});
