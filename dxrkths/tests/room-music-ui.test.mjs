import test from 'node:test';import assert from 'node:assert/strict';
import {renderRoomHeader} from '../src/ui/room-shell.js';
import {HeroScene} from '../src/scene/room-hologram-scene.js';
import {HeroScene as BaseScene} from '../src/scene/room-scene.js';
import {LogoSpin} from '../src/scene/room-logo-spin.js';

test('the brand is a native spin button, Home retains camera reset, and audio controls are labeled',()=>{
 const html=renderRoomHeader({music:{volume:.25,reactivity:.4}});
 assert.match(html,/<button[^>]+data-spin-logo[^>]+aria-label="Rotate DXT logo"/);
 assert.match(html,/<a[^>]+data-reset-room[^>]+room-home-link/);
 assert.match(html,/data-music-setting="volume"/);assert.match(html,/data-music-setting="reactivity"/);
 assert.match(html,/id="music-file"[^>]*type="file"/);assert.match(html,/data-music-default/);
});
test('spin completion can keep the same frame chain active even when ambience is paused',()=>{
 assert.equal(typeof HeroScene.prototype.spinLogo,'function');
 const original=BaseScene.prototype.updatePanels;BaseScene.prototype.updatePanels=()=>false;
 const view=Object.create(HeroScene.prototype);Object.assign(view,{ready:true,brandLogo:{ready:true},logoSpin:new LogoSpin(),reduced:{matches:false},settings:{paused:true},panels:[],camera:{position:{}},contentPanel:0,hoverPanel:-1,wake(){}});
 try{assert.equal(view.spinLogo(),true);assert.equal(view.updatePanels(1/60),true);assert.equal(view.spinLogo(),false);for(let i=0;i<100;i++)view.updatePanels(1/60);assert.equal(view.logoSpin.angle,0);}
 finally{BaseScene.prototype.updatePanels=original;}
});

test('paused music notifications cannot wake a sleeping scene',()=>{
 const original=globalThis.document;globalThis.document={hidden:false};
 const view=Object.create(HeroScene.prototype);let wakes=0;
 Object.assign(view,{settings:{sound:true},callbacks:{},ready:true,disposed:false,wake(){wakes++;}});
 try{const music=view.ensureMusic();music.suspended=true;music.notify();assert.equal(wakes,0);music.suspended=false;music.notify();assert.equal(wakes,1);}
 finally{globalThis.document=original;}
});
