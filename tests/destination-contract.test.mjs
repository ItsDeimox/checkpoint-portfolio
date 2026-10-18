import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSectionPage} from '../src/pages/section-pages.js';
const data=await import('../src/pages/destination-data.js').catch(()=>({}));
const energy=await import('../src/ui/energy-network.js').catch(()=>({}));
test('five destination identities use the requested red, white, purple, orange and ice blue',()=>{
 assert.ok(data.DESTINATION_THEMES,'destination palette is not implemented');
 assert.deepEqual(data.DESTINATION_THEMES.map(t=>t.key),['berserk','groups','projects','about','contact']);
 assert.deepEqual(data.DESTINATION_THEMES.map(t=>t.color),['#ff2348','#eef4ff','#a66bff','#ff913d','#79d8ff']);
});
test('Berserk retains its play destination and gallery but no community block',()=>{
 const html=renderSectionPage(0);assert.match(html,/PLAY NOW/);assert.match(html,/data-game-gallery/);
 assert.doesNotMatch(html,/JOIN THE COMMUNITY/);
 assert.match(html,/data-energy-button/);
});
test('the authored biography appears with a frameless avatar',()=>{
 const html=renderSectionPage(3);assert.match(html,/tenho 22 anos/);assert.match(html,/único desenvolvedor/);
 assert.match(html,/data-portrait/);assert.doesNotMatch(html,/class="section-art-frame"/);
});
test('the future page contains a real render surface and the complete seven-item catalogue',()=>{
 const html=renderSectionPage(2);assert.match(html,/data-covered-car/);
 for(const label of ['BERSERK DRIFT: RALLY','Unnamed Drift Game','Right Cut!','Procedural Tiremark Generator','Procedural Vegetation Placer','Drift Judge Score System','FFB System'])assert.ok(html.includes(label),label);
});
test('groups are scroll controlled, with non-link game media and no invented release list',()=>{
 const html=renderSectionPage(1);assert.match(html,/data-group-track/);assert.match(html,/data-group-slide/);
 assert.ok(data.GROUP_GAMES,'group game configuration missing');assert.deepEqual(data.GROUP_GAMES.frost,[]);
 assert.doesNotMatch(html,/<a[^>]+data-group-game/);
});
test('pointer energy spreads to neighbours and decays after input stops',()=>{
 assert.equal(typeof energy.EnergyNetwork,'function');
 const grid=new energy.EnergyNetwork(18,6);grid.inject(.5,.5,1);
 const before=grid.total();for(let i=0;i<12;i++)grid.step(1/60);
 assert.ok(grid.activeCount()>1);assert.ok(grid.total()<before*1.2);
 for(let i=0;i<900;i++)grid.step(1/60);assert.ok(grid.total()<.01);
});
