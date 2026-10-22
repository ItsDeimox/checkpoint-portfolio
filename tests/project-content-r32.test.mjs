import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {FUTURE_PROJECTS} from '../src/pages/destination-data.js';
import {getFutureProject} from '../src/pages/future-project-details.js';
import {projectDialogContent} from '../src/ui/future-project-dialog.js';
import {DestinationGraphics} from '../src/scene/destination-graphics.js';
import {RUNTIME_FILES} from '../tools/build.mjs';
const projects=()=>FUTURE_PROJECTS.flatMap((group,i)=>group.items.map((item,j)=>getFutureProject(`${i}-${j}`)));

test('R32 removes only Rally and keeps all other catalogue identities paired with their details',()=>{
 const items=FUTURE_PROJECTS.flatMap(g=>g.items.map(item=>item[0]));
 assert.deepEqual(items,['Unnamed Drift Game','Right Cut!','Procedural Tiremark Generator','Procedural Vegetation Placer','Drift Judge Score System','FFB System']);
 assert.deepEqual(projects().map(p=>p.name),items);
 assert.equal(getFutureProject('0-2'),null);
 for(const project of projects().slice(2)){
  assert.equal(project.description.length,0);assert.equal(project.media.length,0);
 }
});
test('Right Cut receives its English description, developer credit, development notice and three supplied images',()=>{
 const project=projects().find(p=>p.name==='Right Cut!');
 assert.deepEqual(project.collaborators,['DXT','OhTaldoPedro']);
 assert.match(project.description.join(' '),/percentage/i);
 assert.match(project.description.join(' '),/highest score wins/i);
 assert.match(project.description.join(' '),/Fruit Ninja/i);
 assert.match(project.disclaimer,/do not represent the final game/i);
 assert.equal(project.media.length,3);
 assert.ok(project.media.every(m=>m.type==='image'&&m.src.startsWith('/assets/projects/right-cut/')));
 const html=projectDialogContent(project);
 assert.match(html,/Collaborators/);assert.match(html,/OhTaldoPedro/);assert.match(html,/do not represent the final game/);
});
test('Unnamed Drift Game keeps planned scope and modding intent in English with the correct screenshots',()=>{
 const project=projects().find(p=>p.name==='Unnamed Drift Game');
 assert.deepEqual(project.collaborators,['DXT','Xablow']);
 const text=project.description.join(' ');
 for(const word of ['street','mountain','professional','limited','mods','community'])assert.ok(text.toLowerCase().includes(word),word);
 assert.equal(project.media.length,3);
 assert.ok(project.media.every(m=>m.type==='image'&&m.src.startsWith('/assets/projects/unnamed-drift/')));
 assert.match(projectDialogContent(project),/Xablow/);
});
test('all six owner-supplied images are local, byte-verified WebP files included in the production allowlist',()=>{
 const hashes={
  'right-cut/cover.webp':'cb530e90542a4a96ac643bf2ee2af5b5dcf91e0ab49b822fac73ae4e23ee3ee2',
  'right-cut/precision-cut.webp':'e36e5aebc8648feee5bf6da88d95d5bb2dc63e75fc0f5147d11408f3df4a07c3',
  'right-cut/fruit-mode.webp':'139e64d0f55d4b191df6b7d9d9e238eba05f35adac4f535c9b2ecb42e68e4165',
  'unnamed-drift/car-selection.webp':'13e5d445172b747aa96a510d820f89d1ad4b931d3180185862e60b0175b56e7e',
  'unnamed-drift/drift-gameplay.webp':'0eeb1b22868688818055da0b8f8ccfbe19e1e60a391072b8d1279b4696653163',
  'unnamed-drift/drift-transition.webp':'2e3aba4574486149bae207f778d96394a4d0ed5c6560579ff942309e3d6493a9'
 };
 const media=projects().flatMap(p=>p.media);
 assert.equal(media.length,6);
 for(const [name,hash] of Object.entries(hashes)){
  const file='assets/projects/'+name;
  assert.ok(RUNTIME_FILES.includes(file),file);
  assert.ok(media.some(m=>m.src==='/'+file),file);
  const bytes=fs.readFileSync(new URL('../'+file,import.meta.url));
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
 }
});
test('covered-car camera has a modest larger sway without changing the reduced-motion home view',()=>{
 const state={mode:'car',ready:true,disposed:false,carScene:{},renderer:{render(){}},carCamera:{position:{set(...args){state.position=args;}},lookAt(...args){state.target=args;}}};
 const draw=(time,reduced=false)=>{DestinationGraphics.prototype.draw.call(state,1/30,time,reduced);return [...state.position];};
 assert.deepEqual(draw(0),[5.6,3.4,6.8]);
 const moved=draw(Math.PI/(2*.19));
 const displacement=Math.hypot(moved[0]-5.6,moved[2]-6.8);
 assert.ok(displacement>.4&&displacement<.65,`bounded camera sway ${displacement}`);
 assert.deepEqual(draw(200,true),[5.6,3.4,6.8]);assert.deepEqual(state.target,[0,.7,0]);
});
test('only the marked decorative line is removed; the soft overhead light remains',()=>{
 const css=fs.readFileSync(new URL('../src/styles-sections.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/\.future-car-stage::before\s*\{/);
 assert.match(css,/\.future-car-light\s*\{[^}]*conic-gradient/);
});
