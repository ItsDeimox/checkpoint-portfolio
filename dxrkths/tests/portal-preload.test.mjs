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
  // R22 replaces the photographed reference crop with actual identity artwork.
  for(const asset of ['icons/dxt.webp','images/avatar.webp','images/pattern-dark.webp','images/revline-pattern.webp','images/frost-card.webp'])assert.ok(started.some(src=>src.includes(asset)),`Page artwork must be decoded: ${asset}`);
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
