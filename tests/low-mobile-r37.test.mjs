import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {renderBudget} from '../src/scene/room-core.js';
import {ReflectionBudget} from '../src/scene/room-reflection-budget.js';
import {HeroScene} from '../src/scene/room-scene.js';
import {PortalEffects,PORTAL_FX_PROFILES} from '../src/scene/room-portal-effects.js';
import {PortalShutterPass} from '../src/scene/room-portal-optics.js';
import {RoomPanelEnergy} from '../src/scene/room-panel-energy.js';
import {DestinationExperience} from '../src/ui/destination-experience.js';
import {warmInteractivePaths} from '../src/scene/room-quality.js';

test('Low raises compact phone sharpness a little while capping fill-rate and skipping reflections',()=>{
 for(const [w,h,dpr] of [[390,844,3],[844,390,2],[320,568,3]]){
  const b=renderBudget(w,h,dpr,'low');assert.ok(b.ratio>1&&b.ratio<=1.12);assert.ok(b.width*b.height<=540000);assert.equal(b.reflection,1);
 }
 for(const [w,h,dpr] of [[768,1024,2],[2560,1440,1],[5120,2160,2]]){
  const b=renderBudget(w,h,dpr,'low');assert.ok(b.ratio<=1);assert.ok(b.width*b.height<=450000);assert.equal(b.reflection,1);
 }
 assert.equal(renderBudget(2560,1440,2,'high').reflection,1024);
 assert.equal(renderBudget(2560,1440,2,'high').width,2560);
});
test('Low never captures a planar reflection even when the camera or car moves, High still does',()=>{
 let draws=0;const target=new T.WebGLRenderTarget(8,8);
 const ground={material:{uniforms:{lowQuality:{value:0}}},getRenderTarget:()=>target,onBeforeRender(){draws++;}};
 const camera=new T.PerspectiveCamera(),view={ground,settings:{quality:'low'},smokes:[],beams:[],turntable:{angle:0}};
 const budget=new ReflectionBudget(view);budget.configure('low');
 for(let i=0;i<4;i++){camera.position.x=i;camera.updateMatrixWorld();view.turntable.angle=i;budget.invalidate();budget.advance(.1);ground.onBeforeRender({}, {},camera);}
 assert.equal(draws,0);assert.equal(ground.material.uniforms.lowQuality.value,1);
 budget.configure('high');ground.onBeforeRender({}, {},camera);
 assert.equal(draws,1);assert.equal(ground.material.uniforms.lowQuality.value,0);target.dispose();
});
test('Low removes smoke and dust but keeps a dim car beam; High restores the original atmosphere',()=>{
 const view={settings:{quality:'low'},smokes:Array.from({length:20},()=>({visible:true,material:{uniforms:{smokeDetail:{value:4}}}})),beams:[{visible:true}],dust:{visible:true,geometry:{setDrawRange(a,n){this.count=n;}}}};
 HeroScene.prototype.applyAtmosphereQuality.call(view);
 assert.equal(view.smokes.filter(s=>s.visible).length,0);assert.equal(view.beams[0].visible,true);assert.equal(view.dust.visible,false);assert.equal(view.dust.geometry.count,0);
 view.settings.quality='high';HeroScene.prototype.applyAtmosphereQuality.call(view);
 assert.equal(view.smokes.filter(s=>s.visible).length,20);assert.equal(view.beams[0].visible,true);assert.equal(view.dust.visible,true);assert.equal(view.dust.geometry.count,160);
});
test('Low keeps portal geometry/navigation but disables burst and full-screen shutter effects',()=>{
 const fx=new PortalEffects(new T.Scene());fx.update(.3,.1,'low',true,false);
 assert.equal(fx.group.visible,false);assert.equal(PORTAL_FX_PROFILES.low.smoke,0);assert.equal(PORTAL_FX_PROFILES.low.sparks,0);
 fx.update(.3,.1,'high',true,false);assert.equal(fx.group.visible,true);assert.equal(fx.smoke.geometry.instanceCount,24);
 const shutter=new PortalShutterPass();shutter.enabled=true;
 shutter.update(new T.PerspectiveCamera(),{}, {active:true,quality:'low'});
 assert.equal(shutter.enabled,false);assert.equal(shutter.uniforms.uShutter.value,0);fx.dispose();shutter.dispose();
});
test('Low does not advance or upload inactive panel energy fields',()=>{
 let steps=0;const field={awake:true,version:1,clear(){this.awake=false;this.version++;},step(){steps++;},release(){}};
 const energy=Object.create(RoomPanelEnergy.prototype);energy.view={settings:{quality:'low'}};energy.selected=-1;
 const texture={needsUpdate:false};energy.entries=[{field,texture,version:1,panel:{material:{uniforms:{uReduced:{value:0},uEnergyActive:{value:1}}}}}];
 energy.update(1/30);assert.equal(steps,0);assert.equal(field.awake,false);
 texture.needsUpdate=false;energy.update(1/30);assert.equal(texture.needsUpdate,false);assert.equal(steps,0);
});
test('Low warmup does not reactivate discarded smoke, shadows, particles or hover simulation',async()=>{
 const frames=[];let primed=0;
 const renderer={shadowMap:{enabled:false},getSize(){},getContext:()=>({})};
 const view={settings:{quality:'low'},renderer,optics:{sceneTarget:{},resetHistory(){}},smokes:[{visible:false}],dust:{geometry:{drawRange:{count:0},setDrawRange(a,count){this.drawRange.count=count;}}},
  panelEnergy:{prime(){primed++;},clear(){}},bannerPortal:{async prepareScene(){}},render(){frames.push({shadow:renderer.shadowMap.enabled,smoke:view.smokes[0].visible,dust:view.dust.geometry.drawRange.count});}};
 await warmInteractivePaths(view,new AbortController().signal);
 assert.deepEqual(frames,[{shadow:false,smoke:false,dust:0}]);assert.equal(primed,0);
});
test('Low covered-car page draws a static frame and requests no perpetual RAF',()=>{
 const page=Object.create(DestinationExperience.prototype);let requests=0;
 Object.assign(page,{settings:{quality:'low'},root:{hidden:false,inert:false},document:{hidden:false},window:{performance:{now:()=>0},requestAnimationFrame(){requests++;return 1;}},gpuReady:true,visible:true,reduced:{matches:false},surface:{dataset:{destinationSurface:'car'}}});
 page.wake();assert.equal(requests,0);
 page.settings.quality='high';page.wake();assert.equal(requests,1);
});
test('hidden mobile panel projection never allocates or reads the desktop target geometry',()=>{
 const view={settings:{mobileDevice:true},width:390,panelLinks:[{}],panels:[{get corners(){throw Error('projecting invisible targets');}}]};
 assert.doesNotThrow(()=>HeroScene.prototype.updateLinkProjection.call(view));
});

test('large touch viewports retain projected navigation outside the mobile dock breakpoint',()=>{
 const camera=new T.PerspectiveCamera(45,1366/1024,.1,100);camera.position.z=5;camera.updateMatrixWorld();
 const view={settings:{mobileDevice:true},width:1366,height:1024,camera,panelLinks:[{style:{}}],panels:[{corners:[new T.Vector3(-1,1,0),new T.Vector3(1,1,0),new T.Vector3(1,-1,0),new T.Vector3(-1,-1,0)]}]};
 HeroScene.prototype.updateLinkProjection.call(view);
 assert.ok(parseFloat(view.panelLinks[0].style.width)>0);assert.match(view.panelLinks[0].style.clipPath,/^polygon\(/);
});
