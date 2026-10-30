import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IntroGate,mountIntro} from '../src/ui/room-intro.js';

function fixture(options={}){
 const events=[];const handlers={};const classes=new Set(['intro-pending']);
 const el=id=>({id,hidden:false,inert:false,disabled:true,dataset:{},textContent:'',attrs:{},
  setAttribute(n,v){this.attrs[n]=v;},focus(){},closest(selector){return selector==='#'+id?this:null;}});
 const primary=el('intro-enter'),showroom=el('intro-showroom'),status=el('intro-status');
 const underlay=[el('header'),el('main'),el('footer')];const root=el('room-intro');
 root.querySelector=q=>({'#intro-enter':primary,'#intro-showroom':showroom,'#intro-status':status}[q]);
 root.addEventListener=(type,fn)=>handlers[type]=fn;root.removeEventListener=type=>delete handlers[type];
 const document={body:{classList:{add(...ns){ns.forEach(n=>classes.add(n));},remove(...ns){ns.forEach(n=>classes.delete(n));}}},
 querySelector:q=>q==='#room-intro'?root:underlay.find(x=>q==='#'+x.id)};
 const gate=mountIntro(document,{onActivate:d=>events.push(['activate',d]),onBeforeDismiss:d=>events.push(['prepare',d]),onDismiss:d=>events.push(['release',d]),...options});
 function click(target){const event={target,button:0,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};handlers.click(event);return event;}
 return {gate,root,primary,showroom,status,underlay,events,click,handlers,classes};
}

test('Enter BDX bypasses showroom readiness and records the requested destination once',()=>{
 const calls=[];const gate=new IntroGate({onActivate:d=>calls.push(['audio',d]),onDismiss:d=>calls.push(['dismiss',d])});
 gate.activate('berserk');
 assert.equal(gate.dismissed,true,'the game page must not wait for WebGL');
 assert.equal(gate.destination,'berserk');assert.deepEqual(calls,[['audio','berserk'],['dismiss','berserk']]);
 gate.activate('showroom');gate.ready();assert.equal(calls.length,2,'loading or duplicate taps cannot redirect the entry');
});
test('only the separate showroom action waits for prepared 3D; loading alone never enters',()=>{
 const gate=new IntroGate();gate.ready();assert.equal(gate.dismissed,false);
 const waiting=new IntroGate();waiting.activate('showroom');assert.equal(waiting.dismissed,false);
 waiting.ready();assert.equal(waiting.dismissed,true);assert.equal(waiting.destination,'showroom');
});
test('clicks on the intro background, title and music control never choose a destination',()=>{
 const f=fixture();try{
  f.gate.ready();
  for(const target of [f.root,{closest:()=>null},{closest:q=>q==='#intro-sound-toggle'?{}:null}])f.click(target);
  assert.equal(f.gate.activated,false);assert.deepEqual(f.events,[]);
 }finally{f.gate.dispose();}
});
test('primary action prepares BDX below the cover and keeps underlying controls inert until release',()=>{
 const f=fixture();try{
  assert.equal(f.primary.textContent,'Enter BDX');const event=f.click(f.primary);
  assert.equal(event.stopped,true);assert.equal(event.prevented,true);
  assert.equal(f.gate.dismissed,true);assert.equal(f.gate.released,false);
  assert.ok(f.underlay.every(x=>x.inert));assert.deepEqual(f.events.slice(0,2),[['activate','berserk'],['prepare','berserk']]);
  f.handlers.transitionend({target:f.root,propertyName:'opacity'});
  assert.equal(f.gate.released,true);assert.ok(f.underlay.every(x=>!x.inert));assert.equal(f.root.hidden,true);
  assert.deepEqual(f.events.at(-1),['release','berserk']);
 }finally{f.gate.dispose();}
});
test('showroom button alone starts preparation and displays a loading label',()=>{
 const f=fixture();try{
  f.click(f.showroom);assert.equal(f.gate.destination,'showroom');assert.equal(f.gate.dismissed,false);
  assert.equal(f.root.attrs['aria-busy'],'true');assert.match(f.showroom.textContent,/Preparing/);
  f.gate.ready();assert.equal(f.gate.dismissed,true);
 }finally{f.gate.dispose();}
});
test('direct page entry keeps its destination and contextual label',()=>{
 const f=fixture({primaryDestination:'page',primaryLabel:'Continue to Future Projects',showShowroom:false});try{
  assert.equal(f.primary.textContent,'Continue to Future Projects');assert.equal(f.showroom.hidden,true);
  f.click(f.primary);assert.equal(f.gate.destination,'page');assert.equal(f.gate.dismissed,true);
 }finally{f.gate.dispose();}
});
test('no guessed auto-entry timer or whole-screen action is needed for game entry',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/>Enter BDX<\/button>/);assert.match(html,/id="intro-showroom"/);
 assert.match(main,/destination==='berserk'[^\n]*sections\.open\(0,[^\n]*true\)/);
 assert.doesNotMatch(main,/else\{setLocation\(null,'none'\);preloadTask=Promise\.all/,'home must not synchronously queue the entire 3D scene before a choice');
});
