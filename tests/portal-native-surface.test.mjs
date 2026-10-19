import test from 'node:test';
import assert from 'node:assert/strict';
const module=await import('../src/ui/portal-page-surface.js').catch(()=>({}));
function style(){const data=new Map();return {setProperty:(k,v)=>data.set(k,String(v)),getPropertyValue:k=>data.get(k)||'',getPropertyPriority:()=>'',removeProperty:k=>data.delete(k)};}
function fixture(){
 const root={style:style(),clientWidth:1185,scrollTop:0},html={style:style(),classList:{add(){},remove(){}}},header={style:style()},brand={style:style()};
 let resolve,complete,update,skipped=0;
 const doc={documentElement:html,defaultView:{innerWidth:1200,innerHeight:800,scrollTo(){}},querySelector:s=>s==='#header'?header:brand,
  startViewTransition(callback){update=callback;return {ready:new Promise(r=>resolve=r),finished:new Promise(r=>complete=r),skipTransition(){skipped++;}};}};
 return {root,doc,html,header,brand,update:()=>update(),ready:()=>resolve(),end:()=>complete(),skipped:()=>skipped};
}
test('native surface hides only after browser capture, waits for ready and restores its own styles',async()=>{
 assert.equal(typeof module.PortalPageSurface,'function');const f=fixture(),s=new module.PortalPageSurface(f.doc,f.root);
 f.root.style.setProperty('visibility','visible');
 const pending=s.capture({scroll:140,reverse:true});assert.equal(s.active,true);assert.equal(f.root.scrollTop,140);
 assert.equal(f.root.style.getPropertyValue('visibility'),'visible');
 f.update();assert.equal(f.root.style.getPropertyValue('visibility'),'hidden');f.ready();assert.equal(await pending,true);
 s.update({transform:'matrix3d(example)',opacity:.7,clip:'inset(1%)'});
 assert.equal(f.html.style.getPropertyValue('--portal-surface-transform'),'matrix3d(example)');
 s.finish();assert.equal(s.active,false);assert.equal(f.skipped(),1);assert.equal(f.root.style.getPropertyValue('visibility'),'visible');
 assert.equal(f.root.style.getPropertyValue('position'),'');assert.equal(f.header.style.getPropertyValue('view-transition-name'),'');
});
test('capture retains the scrollbar gutter and puts the independent WebGL logo above the page',async()=>{
 const f=fixture(),s=new module.PortalPageSurface(f.doc,f.root),pending=s.capture({reverse:true});
 assert.equal(f.root.style.getPropertyValue('width'),'1185px');
 assert.equal(f.brand.style.getPropertyValue('view-transition-name'),'portal-brand');
 f.update();f.ready();await pending;s.finish();assert.equal(f.brand.style.getPropertyValue('view-transition-name'),'');
});
test('browser-initiated completion restores live DOM without resetting its current camera pose',async()=>{
 const f=fixture(),s=new module.PortalPageSurface(f.doc,f.root),pending=s.capture();f.update();f.ready();await pending;
 f.root.style.setProperty('transform','matrix3d(current-pose)');f.root.style.setProperty('opacity','.4');
 f.end();await Promise.resolve();await Promise.resolve();
 assert.equal(s.active,false);assert.equal(f.root.style.getPropertyValue('visibility'),'');
 assert.equal(f.root.style.getPropertyValue('transform'),'matrix3d(current-pose)');assert.equal(f.root.style.getPropertyValue('opacity'),'.4');
});
test('cancelled native capture cannot hide a new page or restart a journey',async()=>{
 assert.equal(typeof module.PortalPageSurface,'function');const f=fixture(),s=new module.PortalPageSurface(f.doc,f.root);
 const pending=s.capture({scroll:0,reverse:false});s.finish();f.update();f.ready();
 assert.equal(await pending,false);assert.equal(f.root.style.getPropertyValue('visibility'),'');assert.equal(s.active,false);
});
