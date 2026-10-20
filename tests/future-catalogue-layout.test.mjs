import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderSectionPage} from '../src/pages/section-pages.js';
import {renderRoomHeader} from '../src/ui/room-visitor-shell.js';
const css=readFileSync(new URL('../src/styles-sections.css',import.meta.url),'utf8');

test('future project category cards are truly adjacent on desktop and responsive without fake links',()=>{
 const page=renderSectionPage(2);
 assert.equal((page.match(/class="future-category"/g)||[]).length,3);
 assert.equal((page.match(/class="future-project" role="listitem"/g)||[]).length,7);
 assert.match(css,/\.future-project-list\s*\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:1160px\)[^{]*\{[^}]*\.future-category/);
 assert.match(css,/\.future-car-stage\{height:310px\}\.future-project-list\{grid-template-columns:1fr\}/);
 assert.doesNotMatch(page,/<a(?:\\s|>)[^>]*class="future-project"/,'unannounced projects are not fake links');
 for(const platform of ['Roblox','Steam','Blender'])assert.ok(page.includes(platform));
});

test('every page retains just the shared top-left native home navigation',()=>{
 for(let i=0;i<5;i++){
  const markup=renderSectionPage(i);
  assert.doesNotMatch(markup,/Back to showroom|class="section-return"|data-return-showroom/);
  assert.match(markup,new RegExp('class="section-coordinate">DESTINATION / 0'+(i+1)));
 }
 const header=renderRoomHeader({}, {returnToShowroom:true});
 assert.match(header,/id="brand-spin"[^>]*data-return-showroom/);
 assert.match(css,/\.section-top\{[^}]*justify-content:flex-end/);
});
