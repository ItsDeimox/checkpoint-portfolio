import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const modulePath=new URL('../src/scene/room-quality.js',import.meta.url);
async function load(){assert.ok(existsSync(modulePath),'quality changes are not serialized');return import(modulePath);}
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
test('quality transaction parks frame submission before GPU allocation and coalesces rapid requests',async()=>{
 const {QualityTransition}=await load(),blocked=gate(),events=[];
 const view={settings:{quality:'low'},appliedQuality:'low',workController:new AbortController(),
  sleep(){events.push('sleep');},wake(){events.push('wake');},callbacks:{},
  gpuFrameGate:{async wait(){events.push('wait');await blocked.promise;}},renderer:{getContext:()=>({})},
  async applyQuality(value){events.push(value);view.settings.quality=value;},optics:{resetHistory(){}},
  render(){events.push('render');},framePacer:{reset(){}}};
 const q=new QualityTransition(view),first=q.request('auto');q.request('high');
 assert.equal(view.qualityChanging,true);assert.deepEqual(events,['sleep']);
 await new Promise(r=>setTimeout(r,10));assert.ok(!events.includes('high'),'allocated before GPU completion');
 blocked.resolve();await first;
 assert.deepEqual(events.filter(e=>['low','auto','high'].includes(e)),['high']);
 assert.equal(view.appliedQuality,'high');assert.equal(view.qualityChanging,false);assert.equal(events.at(-1),'wake');
});
test('cancelled quality work never resumes or reallocates a disposed scene',async()=>{
 const {QualityTransition}=await load(),blocked=gate();let changes=0,wakes=0;
 const view={settings:{quality:'low'},appliedQuality:'low',workController:new AbortController(),sleep(){},wake(){wakes++;},callbacks:{},
  gpuFrameGate:{async wait(signal){await blocked.promise;signal.throwIfAborted();}},renderer:{getContext:()=>({})},
  applyQuality(){changes++;},optics:{resetHistory(){}},framePacer:{reset(){}}};
 const q=new QualityTransition(view),pending=q.request('high');
 view.disposed=true;view.workController.abort();blocked.resolve();await pending;
 assert.equal(changes,0);assert.equal(wakes,0);assert.equal(view.qualityChanging,false);
});
test('restoration warms the real shadow/geometry paths even behind a parked page, then restores it',async()=>{
 const {warmInteractivePaths}=await load(),draws=[],sizes=[],smoke={visible:false};
 const renderer={shadowMap:{enabled:false},getSize:v=>v.set(900,600),getPixelRatio:()=>.82,setPixelRatio(){},setSize:(w,h)=>sizes.push([w,h]),getContext:()=>({})};
 const view={renderer,pageActive:true,smokes:[smoke],optics:{sceneTarget:{},resize(){},resetHistory(){}},
  panelEnergy:{prime(){},clear(){}},render(){assert.equal(view.pageActive,false);draws.push({shadow:renderer.shadowMap.enabled,smoke:smoke.visible});},bannerPortal:{async prepareScene(){}}};
 await warmInteractivePaths(view,new AbortController().signal);
 assert.deepEqual(draws,[{shadow:true,smoke:true},{shadow:false,smoke:true}]);
 assert.equal(view.pageActive,true);assert.equal(smoke.visible,false);assert.equal(renderer.shadowMap.enabled,false);
 assert.deepEqual(sizes.at(-1),[900,600]);
});
test('failed allocation restores the last applied quality instead of keeping a half-applied profile',async()=>{
 const {QualityTransition}=await load(),changes=[],errors=[];
 const view={settings:{quality:'low'},appliedQuality:'low',ready:true,workController:new AbortController(),sleep(){},wake(){},
  callbacks:{onQualityError:e=>errors.push(e.message)},renderer:{getContext:()=>({})},optics:{resetHistory(){}},render(){},
  async applyQuality(value){changes.push(value);this.settings.quality=value;if(value==='high')throw Error('allocation failed');}};
 await new QualityTransition(view).request('high');
 assert.deepEqual(changes,['high','low']);assert.deepEqual(errors,['allocation failed']);
 assert.equal(view.appliedQuality,'low');assert.equal(view.settings.quality,'low');assert.equal(view.qualityChanging,false);
});
