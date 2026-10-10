import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { DEFAULT_VISUAL_SETTINGS, restoreVisualSettings } from '../src/scene/room-visual-settings.js';
import { refineCarMaterials } from '../src/scene/room-materials.js';
const turntableModule = await import('../src/scene/room-turntable.js').catch(() => ({}));
const create = () => {
  assert.equal(typeof turntableModule.RoomTurntable, 'function', 'physical turntable controller must exist');
  return new turntableModule.RoomTurntable();
};

test('approved screenshot defaults replace the earlier experimental contrast', () => {
  assert.deepEqual(DEFAULT_VISUAL_SETTINGS, { exposure:1.13,bloom:.65,depthOfField:1.5,motionBlur:1,lens:1,contrast:1.26,sharpness:.35 });
  const restored = restoreVisualSettings({visualPreset:'dark-metal-v1',visual:{...DEFAULT_VISUAL_SETTINGS,exposure:1.15,contrast:1.74}});
  assert.equal(restored.exposure,1.13); assert.equal(restored.contrast,1.26);
});
test('turntable attaches only the car and platform without moving their initial world coordinates', () => {
  const rotor=create(),scene=new T.Scene(),car=new T.Group(),platform=new T.Group(),wall=new T.Group();
  car.position.set(-.67248,-.084365,1.28199);platform.position.set(0,.06,1.458534911);scene.add(car,platform,wall);
  scene.updateMatrixWorld(true);const before=car.matrixWorld.clone();
  rotor.mount(scene,[car,platform]);scene.updateMatrixWorld(true);
  assert.ok(car.matrixWorld.elements.every((x,i)=>Math.abs(x-before.elements[i])<1e-8));
  assert.equal(wall.parent,scene);assert.equal(car.parent,rotor.group);assert.equal(platform.parent,rotor.group);
  rotor.begin();rotor.movePixels(240,960,1/60);rotor.update(1/60);scene.updateMatrixWorld(true);
  assert.notDeepEqual(car.matrixWorld.elements,before.elements);assert.equal(wall.rotation.y,0);
});
test('rotation is bounded per frame, damped, and settles without accumulating drift', () => {
  const rotor=create();rotor.begin();rotor.movePixels(800,960,1/60);rotor.update(1/60);
  assert.ok(Math.abs(rotor.angle)>0);assert.ok(Math.abs(rotor.frameDelta)<.2);
  rotor.end();for(let i=0;i<240;i++)rotor.update(1/60);
  assert.equal(rotor.velocity,0);assert.equal(rotor.moving,false);
  const stopped=rotor.angle;rotor.update(1);assert.equal(rotor.angle,stopped);
});
test('cancel and paused/reduced-motion release stop inertia; invalid inputs are harmless', () => {
  const rotor=create();rotor.begin();rotor.movePixels(200,960,1/60);rotor.update(1/60);rotor.end(false);
  const angle=rotor.angle;rotor.update(1/60);assert.equal(rotor.angle,angle);
  rotor.movePixels(NaN,0,Infinity);rotor.update(NaN);assert.ok(Number.isFinite(rotor.angle));
});
test('polished red material preserves color and clearcoat with a nonzero roughness floor', () => {
  const material=new T.MeshPhysicalMaterial({name:'Body',color:0xc7081b,clearcoat:1});const car=new T.Group();car.add(new T.Mesh(new T.BoxGeometry(),material));
  refineCarMaterials(car);assert.equal(material.color.getHexString(),'c7081b');
  assert.ok(material.metalness>=.84 && material.metalness<=.9);assert.ok(material.roughness>=.09 && material.roughness<=.125);
  assert.equal(material.clearcoat,1);assert.ok(material.clearcoatRoughness>=.04);
});
