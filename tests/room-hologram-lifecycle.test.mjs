import test from 'node:test';import assert from 'node:assert/strict';
import {HeroScene} from '../src/scene/room-hologram-scene.js';
import {HeroScene as BaseScene} from '../src/scene/room-scene.js';

test('a failed optional logo preparation keeps the established showroom available',async()=>{
 const prepare=BaseScene.prototype.prepareEnvironment;let basePrepared=0,restored=0;
 BaseScene.prototype.prepareEnvironment=async()=>{basePrepared++;};
 const view=Object.create(HeroScene.prototype);
 Object.assign(view,{scene:{environment:{}},brandModelTask:Promise.resolve({}),brandLogo:{ready:true,prepare:async()=>{throw Error('logo preparation failed');},restoreFallback(){restored++;}}});
 try{await assert.doesNotReject(view.prepareEnvironment(new AbortController().signal));
  assert.equal(basePrepared,1);assert.equal(view.brandLogo.ready,false);assert.equal(restored,1);assert.match(view.brandError,/preparation failed/);
 }finally{BaseScene.prototype.prepareEnvironment=prepare;}
});
test('a failed logo composite restores its fallback without interrupting the main frame',()=>{
 const render=BaseScene.prototype.render;let rendered=0,restored=0;
 BaseScene.prototype.render=()=>{rendered++;};
 const view=Object.create(HeroScene.prototype);
 Object.assign(view,{reduced:{matches:false},settings:{paused:false},cameraRig:{yaw:0,pitch:0},brandLogo:{ready:true,render(){throw Error('composite failed');},restoreFallback(){restored++;}}});
 try{assert.doesNotThrow(()=>view.render(1/60,0));assert.equal(rendered,1);assert.equal(restored,1);assert.equal(view.brandLogo.ready,false);}
 finally{BaseScene.prototype.render=render;}
});
