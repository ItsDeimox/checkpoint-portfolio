import test from 'node:test';
import assert from 'node:assert/strict';
import {renderBudget} from '../src/scene/room-core.js';
import {HeroScene} from '../src/scene/room-scene.js';
import {floorFragment} from '../src/scene/room-shaders.js';

function atmosphere(quality) {
 const light={visible:false,material:{uniforms:{beamStrength:{value:.19},beamSamples:{value:16}}}};
 const smokes=[{visible:true,material:{uniforms:{smokeDetail:{value:4}}}}];
 const dust={visible:true,geometry:{setDrawRange(start,count){this.count=count;}}};
 return {settings:{quality},beams:[light],smokes,dust,light};
}

test('Low phone modestly sharpens the picture while keeping the fill-rate bounded',()=>{
 for(const [w,h] of [[390,844],[430,932],[844,390],[320,568]]) {
  const budget=renderBudget(w,h,3,'low');
  assert.ok(budget.ratio>1&&budget.ratio<=1.12+1e-6,`Low DPR should only receive a restrained lift: ${w}x${h}`);
  assert.ok(budget.width*budget.height<=540000,`Low still needs a hard fill budget: ${w}x${h}`);
  assert.equal(budget.reflection,1,'raising resolution must not re-enable expensive planar reflections');
 }
 const large=renderBudget(2560,1440,2,'low');
 assert.ok(large.width*large.height<=450000,'desktop Low retains the previous raster ceiling');
 assert.equal(renderBudget(390,844,3,'high').maxPixels,3686400);
 assert.equal(renderBudget(390,844,3,'auto').maxPixels,1900000);
});

test('Low restores one restrained cone above the car without restoring smoke or particles',()=>{
 const v=atmosphere('low');
 HeroScene.prototype.applyAtmosphereQuality.call(v);
 assert.equal(v.light.visible,true,'showroom spot beam should return on Low');
 assert.ok(v.light.material.uniforms.beamStrength.value>=.07&&v.light.material.uniforms.beamStrength.value<=.11,'return at about half intensity');
 assert.ok(v.light.material.uniforms.beamSamples.value<=8,'restore the cone with a small GPU sample count');
 assert.equal(v.smokes[0].visible,false);
 assert.equal(v.dust.visible,false);
 assert.equal(v.dust.geometry.count,0);
 v.settings.quality='high';HeroScene.prototype.applyAtmosphereQuality.call(v);
 assert.equal(v.light.visible,true);
 assert.equal(v.light.material.uniforms.beamStrength.value,.19,'High still uses the original lighting');
 assert.equal(v.light.material.uniforms.beamSamples.value,24);
 assert.equal(v.smokes[0].visible,true);
 assert.equal(v.dust.visible,true);
});

test('switching Low → Medium → Low preserves original mid settings and the dim Low profile',()=>{
 const v=atmosphere('low');const apply=()=>HeroScene.prototype.applyAtmosphereQuality.call(v);
 apply();const lowStrength=v.light.material.uniforms.beamStrength.value;
 v.settings.quality='auto';apply();
 assert.equal(v.light.material.uniforms.beamStrength.value,.19);
 assert.equal(v.light.material.uniforms.beamSamples.value,16);
 v.settings.quality='low';apply();
 assert.equal(v.light.material.uniforms.beamStrength.value,lowStrength);
 assert.ok(v.light.material.uniforms.beamSamples.value<=8);
});

test('Low restores a faint practical-light pool without bringing back planar floor sampling',()=>{
 const low=floorFragment.split('if(lowQuality>.5){')[1]?.split('return;')[0];
 assert.ok(low,'Low matte floor fast path exists');
 assert.match(low,/practicalLight/,'car spotlight must softly light the floor again');
 assert.doesNotMatch(low,/texture2D\s*\(\s*tDiffuse/,'localized light must not reactivate floor reflection sampling');
});
