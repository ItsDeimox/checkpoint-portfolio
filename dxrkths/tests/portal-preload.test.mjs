import test from 'node:test';
import assert from 'node:assert/strict';
import {SectionRoutes} from '../src/ui/room-section-routes.js';

class FakeElement {
 constructor(name='div'){
  this.tagName=name;this.parentNode=null;this.childNodes=[];this.hidden=false;this.inert=false;this.attributes=new Map();this.source='';
  const properties=new Map();
  this.style={setProperty:(k,v)=>properties.set(k,String(v)),removeProperty:k=>properties.delete(k),getPropertyValue:k=>properties.get(k)??''};
  const names=new Set();
  this.classList={add:(...values)=>values.forEach(v=>names.add(v)),remove:(...values)=>values.forEach(v=>names.delete(v))};
  this.offsetWidth=100;this.clientWidth=85;this.scrollHeight=1200;this.clientHeight=800;
 }
 get firstChild(){return this.childNodes[0]??null;}
 set innerHTML(value){
  FakeElement.parses++;this.childNodes.forEach(n=>n.parentNode=null);this.childNodes=[];
  this.source=String(value);
  if(this.source)this.append({parentNode:null,markup:this.source});
 }
 get innerHTML(){return this.childNodes.map(n=>n.markup??'').join('');}
 append(...nodes){
  for(const node of nodes){
   if(node.parentNode){
    const siblings=node.parentNode.childNodes;
    const index=siblings.indexOf(node);
    if(index>=0)siblings.splice(index,1);
   }
   node.parentNode=this;this.childNodes.push(node);
  }
 }
 appendChild(node){this.append(node);return node;}
 replaceChildren(...nodes){this.childNodes.forEach(node=>node.parentNode=null);this.childNodes=[];this.append(...nodes);}
 remove(){if(!this.parentNode)return;this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this),1);this.parentNode=null;}
 setAttribute(name,value){this.attributes.set(name,String(value));}
 removeAttribute(name){this.attributes.delete(name);}
 getAttribute(name){return this.attributes.get(name)??null;}
 getBoundingClientRect(){return {top:0,width:1200,height:800};}
 querySelectorAll(selector){
  if(selector!=='img[src],image[href]')return [];
  return [...this.source.matchAll(/(src|href)="(\/assets\/[^"]+)"/g)].map(([,name,url])=>({
   getAttribute:attribute=>attribute===name?url:null,
  }));
 }
}
FakeElement.parses=0;

function returnFixture(capture){
 const root=new FakeElement('section'),body=new FakeElement('body'),canvas=new FakeElement('canvas'),holder=new FakeElement();
 root.innerHTML='<article>current gallery</article>';root.querySelector=()=>null;root.clientWidth=1185;canvas.focus=()=>{};
 const original=root.firstChild,win={innerWidth:1200,innerHeight:800,scrollY:140,scrollTo(){}};
 const scene={ready:true,reduced:{matches:false},returnPortal(i,done){this.started=(this.started??0)+1;this.done=done;return true;},resumeShowroom(){}};
 const routes=new SectionRoutes({document:{body,defaultView:win},root,canvas,host:new FakeElement(),footer:new FakeElement(),getScene:()=>scene,getPhase:()=> 'ready',entered:()=>true,onSelect(){},setLocation(){}});
 routes.pageSurface={supported:true,active:false,width:1200,height:800,capture(options){this.active=true;return Promise.resolve(capture(options));},finish(){this.active=false;},update(){}};
 routes.page=true;routes.index=1;routes.mountedIndex=1;routes.pageCache.set(1,{holder,viewport:{width:1200,height:800,gutter:15}});
 return {routes,root,scene,holder,original};
}
const nextTask=()=>new Promise(resolve=>setImmediate(resolve));
test('return captures current scroll once while parked and releases the native surface on completion',async()=>{
 let resolve,calls=0;
 const f=returnFixture(options=>{calls++;assert.equal(options.scroll,140);assert.equal(options.reverse,true);return new Promise(r=>resolve=r);});
 f.routes.close();f.routes.close();await nextTask();
 assert.equal(calls,1);assert.equal(f.root.inert,true);assert.equal(f.scene.started,undefined);
 resolve(true);await nextTask();
 assert.equal(f.scene.started,1);assert.equal(f.root.firstChild,f.original);assert.equal(f.root.scrollTop,140);
 f.scene.done();assert.equal(f.holder.firstChild,f.original);assert.equal(f.routes.pageSurface.active,false);assert.equal(f.root.hidden,true);
});
test('cancelled return capture cannot start travel or overwrite navigation',async()=>{
 let resolve;
 const f=returnFixture(()=>new Promise(r=>resolve=r));f.routes.close();await nextTask();
 f.routes.close('none',true);resolve(true);await nextTask();
 assert.equal(f.scene.started,undefined);assert.equal(f.root.hidden,true);assert.equal(f.routes.pageSurface.active,false);
});

test('resize during a native return restores the original scroll in the live DOM',async()=>{
 const f=returnFixture(()=>true);f.routes.close();await nextTask();
 f.routes.document.defaultView.innerWidth=900;f.routes.fitArrivalViewport();
 assert.equal(f.root.firstChild,f.original);assert.equal(f.root.scrollTop,140);
 f.scene.done();assert.equal(f.routes.pageSurface.active,false);
});
test('failed return snapshot falls back to the current DOM without a retry loop',async()=>{
 let calls=0;const f=returnFixture(()=>{calls++;return false;});
 f.routes.close();await nextTask();assert.equal(calls,1);assert.equal(f.scene.started,1);assert.equal(f.root.firstChild,f.original);f.scene.done();
});

test('bitmap travel preserves cached DOM, restores it on arrival and falls back after resize',()=>{
 const root=new FakeElement('section'),body=new FakeElement('body'),canvas=new FakeElement('canvas'),holder=new FakeElement();
 holder.innerHTML='<article>interactive page</article>';
 const original=holder.firstChild,preview=new FakeElement('canvas');preview.width=1200;preview.height=800;
 root.querySelector=()=>null;
 const win={innerWidth:1200,innerHeight:800,scrollTo(){}};
 const routes=new SectionRoutes({document:{body,defaultView:win},root,canvas,host:new FakeElement(),footer:new FakeElement(),getScene:()=>({parkSection(){}})});
 routes.pageCache.set(1,{holder,preview,viewport:{width:1200,height:800,gutter:15}});
 routes.index=1;routes.token=2;routes.prepareArrival(1,2);
 assert.equal(root.firstChild,preview);assert.equal(holder.firstChild,original);assert.equal(root.inert,true);
 routes.show(1,2);
 assert.equal(root.firstChild,original);assert.equal(root.inert,false);assert.equal(routes.previewIndex,null);
 assert.equal(routes.pageCache.get(1).preview,null,'discard the introductory bitmap before gallery or slider state can change');
 routes.prepareArrival(1,3);
 assert.equal(root.firstChild,original,'later visits must retain the live interactive state');
 routes.pageCache.get(1).preview=preview;routes.prepareArrival(1,3);
 assert.equal(root.firstChild,preview);assert.equal(holder.firstChild,original);
 win.innerWidth=900;routes.fitArrivalViewport();
 assert.equal(root.firstChild,original,'resize must use live responsive layout, not stretch a stale snapshot');
 routes.stashMounted();win.innerWidth=1200;routes.prepareArrival(1,4);routes.stashMounted();
 assert.equal(holder.firstChild,original,'cancellation must never stash the bitmap as page content');
 routes.dispose();assert.equal(preview.width,0);assert.equal(preview.height,0);
});

test('all five destinations are parsed, decoded, laid out and reused under the loading cover',async()=>{
 FakeElement.parses=0;
 const started=[],fonts=[];
 class ImageStub{
  set src(value){started.push(value);}
  decode(){return Promise.resolve();}
 }
 const body=new FakeElement('body'),root=new FakeElement('section'),host=new FakeElement('div');
 const doc={
  body,
  defaultView:{innerWidth:1200,innerHeight:800,Image:ImageStub,
   requestAnimationFrame(callback){return setTimeout(callback,0);}},
  fonts:{load(value){fonts.push(value);return Promise.resolve([]);},ready:Promise.resolve()},
  createElement:tag=>new FakeElement(tag),
 };
 const canvas=new FakeElement('canvas'),footer=new FakeElement('footer');
 const routes=new SectionRoutes({document:doc,host,root,canvas,footer,
  getScene:()=>null,getPhase:()=> 'ready',entered:()=>true,setLocation(){},onSelect(){}});
 try{
  assert.equal(await routes.preload(),true);
  assert.equal(routes.pageCache.size,5);
  assert.equal(FakeElement.parses,5,'all templates are built before the visitor can interact');
  assert.ok(started.some(src=>src.includes('avatar-cutout.webp')),'the frameless portrait must also be decoded');
  assert.ok(started.some(src=>src.includes('berserk/game-5.webp')),'lazy gallery images must be decoded');
  assert.equal(new Set(started).size,started.length,'preloading should not decode a URL twice');
  assert.ok(fonts.includes('500 64px "Barlow Condensed"'));
  assert.equal(body.childNodes.length,0,'temporary painted pages are removed before entry');
  const preserved=routes.pageCache.get(3).holder.firstChild;
  Object.defineProperty(root,'scrollHeight',{get(){throw Error('Late layout read on first click');}});
  Object.defineProperty(root,'clientHeight',{get(){throw Error('Late layout read on first click');}});
  routes.prepareArrival(3,1);
  assert.equal(root.firstChild,preserved,'the already-created DOM is used on the first click');
  assert.equal(root.style.getPropertyValue('--arrival-gutter'),'15px');
  routes.stashMounted();routes.prepareArrival(3,2);
  assert.equal(root.firstChild,preserved,'navigation does not reparse a destination');
  assert.equal(FakeElement.parses,5,'none of the five templates is rebuilt during entry');
 }finally{routes.dispose();}
});
