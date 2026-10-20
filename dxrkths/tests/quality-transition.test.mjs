import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const modulePath=new URL('../src/scene/room-quality.js',import.meta.url);
async function load(){assert.ok(existsSync(modulePath),'quality changes are not serialized');return import(modulePath);}
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function browserFrames(t,onFrame){
 const saved={requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 globalThis.requestAnimationFrame=callback=>setTimeout(()=>{onFrame();callback(performance.now());},0);
 globalThis.cancelAnimationFrame=id=>clearTimeout(id);
 t.after(()=>{for(const [key,value]of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
}
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
test('restoration warms the real paths without resetting an unchanged viewport',async()=>{
 const {warmInteractivePaths}=await load(),draws=[],sizes=[],opticalSizes=[],smoke={visible:false};
 const renderer={shadowMap:{enabled:false},getSize:v=>v.set(900,600),getPixelRatio:()=>.82,setPixelRatio:r=>sizes.push(['ratio',r]),setSize:(w,h)=>sizes.push([w,h]),setDrawingBufferSize:(w,h,r)=>sizes.push([w,h,r]),getContext:()=>({})};
 const view={renderer,pageActive:true,smokes:[smoke],optics:{sceneTarget:{},resize:(...args)=>opticalSizes.push(args),resetHistory(){}},
  panelEnergy:{prime(){},clear(){}},render(){assert.equal(view.pageActive,false);assert.deepEqual(renderer.getSize({set:(...args)=>args}),[900,600]);assert.equal(renderer.getPixelRatio(),.82);draws.push({shadow:renderer.shadowMap.enabled,smoke:smoke.visible});},bannerPortal:{async prepareScene(){}}};
 await warmInteractivePaths(view,new AbortController().signal);
 assert.deepEqual(draws,[{shadow:true,smoke:true},{shadow:false,smoke:true}]);
 assert.equal(view.pageActive,true);assert.equal(smoke.visible,false);assert.equal(renderer.shadowMap.enabled,false);
 assert.deepEqual(sizes,[],'same-size canvas resets discard the warmed drawing buffer');
 assert.deepEqual(opticalSizes,[],'unchanged optics must retain their prepared targets');
});
test('a real viewport resize remains consistent after completed or failed warmup',async t=>{
 const [{warmInteractivePaths},{HeroScene},{RoomCamera},{PerspectiveCamera,Vector2}]=await Promise.all([
  load(),import('../src/scene/room-scene.js'),import('../src/scene/room-camera.js'),import('three'),
 ]);
 const priorRatio=globalThis.devicePixelRatio;globalThis.devicePixelRatio=1;
 t.after(()=>{if(priorRatio===undefined)delete globalThis.devicePixelRatio;else globalThis.devicePixelRatio=priorRatio;});
 for(const fails of [false,true]){
  const rasterWrites=[],opticalSizes=[],smoke={visible:false},host={clientWidth:900,clientHeight:600};
  let width=900,height=600,ratio=1,historyResets=0;
  const renderer={shadowMap:{enabled:false},getSize:v=>v.set(width,height),getPixelRatio:()=>ratio,getContext:()=>({}),
   setPixelRatio(r){ratio=r;},setSize(w,h){rasterWrites.push([w,h,ratio]);width=w;height=h;},
   setDrawingBufferSize(w,h,r){rasterWrites.push([w,h,r]);width=w;height=h;ratio=r;}};
  const camera=new PerspectiveCamera(42,1.5,.08,100),cameraRig=new RoomCamera(camera,900);
  const optics={sceneTarget:{},resize:(...args)=>opticalSizes.push(args),resetHistory(){historyResets++;}};
  const view=Object.create(HeroScene.prototype);
  Object.assign(view,{renderer,optics,camera,cameraRig,host,settings:{quality:'high'},reduced:{matches:false},
   pageActive:true,smokes:[smoke],panelEnergy:{prime(){},clear(){}},render(){},wake(){},
   ground:{getRenderTarget:()=>({setSize(){}}),material:{uniforms:{reflectionResolution:{value:new Vector2()}}}},
   bannerPortal:{async prepareScene(){
    // The existing ResizeObserver can deliver this while restoration yields.
    host.clientWidth=390;host.clientHeight=844;view.resize();
    if(fails)throw Error('portal preparation failed');
   }},
  });
  view.resize();rasterWrites.length=opticalSizes.length=0;
  const pending=warmInteractivePaths(view,new AbortController().signal);
  if(fails)await assert.rejects(pending,/portal preparation failed/);else await pending;
  assert.deepEqual(rasterWrites,[[390,844,1]],'warmup must not rewind a real viewport resize');
  assert.deepEqual(opticalSizes,[[390,844,1]]);
  assert.deepEqual([width,height],[view.width,view.height]);
  assert.equal(camera.aspect,width/height);assert.equal(cameraRig.width,width);
  assert.equal(view.viewportKey,'390:844:1:1024');
  view.resize();assert.equal(rasterWrites.length,1,'the cached viewport remains consistent on the next observer callback');
  assert.equal(view.camera,camera);assert.equal(view.optics,optics);assert.equal(view.host,host);
  assert.equal(historyResets,1);assert.equal(view.pageActive,true);assert.equal(smoke.visible,false);assert.equal(renderer.shadowMap.enabled,false);
 }
});
test('cheap target preparation shares browser frames and still waits for the GPU',async t=>{
 const {prepareQualityTargets}=await load(),targets=Array.from({length:20},()=>({})),initialized=[],paintedAt=[];
 let submitted=false,completed=false,polls=0,deleted=0;
 t.mock.method(performance,'now',()=>0);
 browserFrames(t,()=>{paintedAt.push(initialized.length);if(submitted)completed=true;});
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,TIMEOUT_EXPIRED:2,CONDITION_SATISFIED:3,
  fenceSync(){submitted=true;assert.equal(initialized.length,targets.length);return{};},flush(){},
  clientWaitSync(_f,flags,timeout){assert.equal(flags,0);assert.equal(timeout,0);polls++;return completed?3:2;},deleteSync(){deleted++;}};
 const renderer={initRenderTarget:target=>initialized.push(target),getContext:()=>gl};
 const view={renderer,optics:{sceneTarget:targets[0],composer:{readBuffer:targets[1],writeBuffer:targets[2]},bloomPass:{targets:[...targets.slice(3),targets[0]]}}};
 await prepareQualityTargets(view,new AbortController().signal);
 assert.deepEqual(initialized,targets,'every unique attachment still initializes exactly once');
 assert.ok(paintedAt.length>1&&paintedAt.length<targets.length/2,'cheap attachments still consume one display frame each');
 assert.ok(paintedAt.some(count=>count<targets.length),'preparation must let the page paint before the batch finishes');
 assert.equal(completed,true);assert.ok(polls>=2);assert.equal(deleted,1);
});
test('an expensive target yields before more storage is initialized',async t=>{
 const {prepareQualityTargets}=await load(),targets=[{},{},{}],paintedAt=[];let clock=0,initialized=0;
 t.mock.method(performance,'now',()=>clock);
 browserFrames(t,()=>paintedAt.push(initialized));
 const view={renderer:{initRenderTarget(){initialized++;clock+=5;},getContext:()=>({})},optics:{bloomPass:{targets}}};
 await prepareQualityTargets(view,new AbortController().signal);
 assert.equal(initialized,3);assert.deepEqual(paintedAt,[1,2],'slow allocations must not accumulate into one long task');
});
test('cancellation between preparation batches stops the remaining allocations',async t=>{
 const {prepareQualityTargets}=await load(),signal=new AbortController(),targets=Array.from({length:20},()=>({}));let initialized=0;
 t.mock.method(performance,'now',()=>0);
 browserFrames(t,()=>signal.abort());
 const view={renderer:{initRenderTarget(){initialized++;},getContext:()=>({})},optics:{bloomPass:{targets}}};
 await assert.rejects(prepareQualityTargets(view,signal.signal),{name:'AbortError'});
 assert.ok(initialized>0&&initialized<targets.length,'cancelled preparation must stop before another batch');
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
