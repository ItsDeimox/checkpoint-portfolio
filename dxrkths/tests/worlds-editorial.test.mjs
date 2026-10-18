import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSectionPage} from '../src/pages/section-pages.js';
import {PROJECT_CATALOG,ABOUT_PARAGRAPHS} from '../src/pages/world-content.js';
import {CONTENT} from '../src/content.js';
test('the community invitation is only on Groups, while Play Now keeps its real game URL',()=>{
 const game=renderSectionPage(0),groups=renderSectionPage(1);
 assert.doesNotMatch(game,/JOIN THE COMMUNITY|Join the community/);assert.match(groups,/JOIN THE COMMUNITY/);
 assert.equal(game.split(CONTENT.links.game).length-1,1);assert.match(game,/data-world-graphic="energy"/);
});
test('group artwork is a non-navigating gallery and only View on Roblox opens the group',()=>{
 const html=renderSectionPage(1);
 assert.match(html,/data-group-track/);assert.equal((html.match(/data-group-slide/g)||[]).length,2);
 assert.match(html,/<figure><img[^>]*berserk\/game-1.webp/);assert.doesNotMatch(html,/<a[^>]*><img[^>]*berserk\/game-/);
 for(const key of ['revline','frost'])assert.equal(html.split(CONTENT.links[key]).length-1,1);
 assert.ok(!html.includes(CONTENT.links.game));
});
test('About preserves the supplied Portuguese biography and uses an unframed large avatar',()=>{
 const html=renderSectionPage(3);assert.match(html,/lang="pt-BR"/);assert.match(html,/tenho 22 anos/);assert.match(html,/franquia BERSERK DRIFT \(1, 2, X\)/);
 assert.match(html,/class="about-avatar"/);assert.doesNotMatch(html,/section-art-frame/);assert.equal(ABOUT_PARAGRAPHS.length,4);
});
test('all seven announced project names appear under the three requested categories',()=>{
 const html=renderSectionPage(2);assert.equal(PROJECT_CATALOG.flatMap(x=>x.items).length,7);
 for(const section of PROJECT_CATALOG)for(const item of section.items)assert.ok(html.includes(item.name),item.name);
 assert.match(html,/data-world-graphic="future"/);assert.match(html,/data-roadmap-scroll/);assert.equal((html.match(/data-world-reveal/g)||[]).length,3);
 assert.doesNotMatch(html,/No new projects|Not announced/);
});
test('Socials replaces the photographed crop with the actual identity and blue signal paths',()=>{
 const html=renderSectionPage(4);assert.match(html,/contact-signal-art/);assert.match(html,/assets\/icons\/dxt.webp/);assert.doesNotMatch(html,/showroom-reference.png/);
});
