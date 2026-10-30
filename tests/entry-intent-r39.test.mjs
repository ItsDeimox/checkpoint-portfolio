import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountIntro} from '../src/ui/room-intro.js';
import {renderRoomHeader} from '../src/ui/room-visitor-shell.js';

function fixture(options={}) {
 const element=(id)=>({id,hidden:false,inert:false,disabled:false,textContent:'',dataset:{},attributes:{},listeners:new Map(),
  setAttribute(k,v){this.attributes[k]=v;},
  addEventListener(type,fn){this.listeners.set(type,fn);},
  removeEventListener(type,fn){if(this.listeners.get(type)===fn)this.listeners.delete(type);},
  focus(o){this.focusOptions=o;},closest(selector){return selector==='#'+id?this:null;},
  fire(type,event){this.listeners.get(type)?.(event);}
 });
 const root=element('room-intro'),button=element('intro-enter'),status=element('intro-status');
 const sound=element('intro-sound-toggle'),background=element('intro-background');
 root.querySelector=s=>s==='#intro-enter'?button:s==='#intro-status'?status:null;
 const underlay=['header','main','footer'].map(element),classes=new Set(['intro-pending']);
 const document={body:{classList:{add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));}}},querySelector(s){return s==='#room-intro'?root:underlay.find(x=>'#'+x.id===s);}};
 let plays=0,dismisses=0;
 const gate=mountIntro(document,{onActivate(){plays++;},onDismiss(){dismisses++;},...options});
 const click=(target,extra={})=>{const e={target,button:0,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra};root.fire('click',e);return e;};
 const end=()=>root.fire('transitionend',{target:root,propertyName:'opacity'});
 return {gate,root,button,status,sound,background,underlay,classes,click,end,get plays(){return plays;},get dismisses(){return dismisses;}};
}

test('idle readiness never enters by itself, and clicks outside the entry button do not queue a hidden entry',()=>{
 const f=fixture();try {
  f.click(f.background);f.click(f.status);f.click(f.sound);
  assert.equal(f.plays,0,'random intro clicks must not unlock music or queue entry');
  assert.equal(f.gate.activated,false);
  f.gate.ready();assert.equal(f.dismisses,0);assert.equal(f.gate.dismissed,false);
  f.click(f.background);assert.equal(f.gate.activated,false);
 }finally{f.gate.dispose();}
});
test('explicit entry before readiness activates audio synchronously and reveals the showroom exactly once',()=>{
 const f=fixture();try {
  const click=f.click(f.button);assert.equal(f.plays,1);assert.equal(f.gate.dismissed,false);
  assert.equal(click.prevented,true);assert.equal(click.stopped,true,'entry click cannot also reach page navigation');
  f.click(f.button);assert.equal(f.plays,1);
  f.gate.ready();assert.equal(f.dismisses,0,'fade keeps underlay protected');
  assert.ok(f.underlay.every(x=>x.inert));
  f.end();f.end();assert.equal(f.dismisses,1);assert.equal(f.root.hidden,true);
  assert.ok(f.underlay.every(x=>!x.inert));
 }finally{f.gate.dispose();}
});
test('an explicit click after readiness takes the same single-entry path',()=>{
 const f=fixture();try{f.gate.ready();f.click(f.button);f.end();assert.equal(f.plays,1);assert.equal(f.dismisses,1);}finally{f.gate.dispose();}
});
test('entry text names the actual destination instead of reusing Enter DXT for unrelated actions',()=>{
 for(const [destination,label] of [['Showroom','Enter Showroom'],['Berserk Drift X','Enter BDX'],['Future Projects','Continue to Future Projects']]){
  const f=fixture({destination});try{
   assert.equal(f.button.textContent,label);f.gate.ready();assert.equal(f.status.textContent,`${destination} ready`);
  }finally{f.gate.dispose();}
 }
});
test('modified clicks are ignored and nested button content still activates entry',()=>{
 const f=fixture();try{
  for(const extra of [{button:1},{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true}])f.click(f.button,extra);
  assert.equal(f.plays,0);
  f.click({closest:s=>s==='#intro-enter'?f.button:null});assert.equal(f.plays,1);
 }finally{f.gate.dispose();}
});
test('a WebGL failure remains explicit and usable, not a hidden automatic entrance',()=>{
 const f=fixture();try{
  f.gate.fail();f.click(f.background);assert.equal(f.dismisses,0);assert.equal(f.gate.activated,false);
  f.click(f.button);f.end();assert.equal(f.dismisses,1);assert.equal(f.plays,1);
 }finally{f.gate.dispose();}
});
test('the top Enter BDX action targets Berserk, not About DXT, in every header state',()=>{
 for(const nav of [{},{returnToShowroom:true}]){
  const html=renderRoomHeader({},nav);
  assert.match(html,/<button[^>]*data-open-panel="0"[^>]*class="room-enter"[^>]*aria-label="Enter BDX"/);
  assert.match(html,/<span>Enter BDX<\/span>/);assert.doesNotMatch(html,/Enter DXT/);
 }
});
test('intro fade remains a hit shield and the initial HTML uses unambiguous entry copy',()=>{
 const css=readFileSync(new URL('../src/styles-experience.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(css,/body\.intro-leaving #room-intro\{[^}]*pointer-events:none/);
 assert.match(html,/id="intro-enter"[^>]*>Enter Showroom<\/button>/);
 assert.match(html,/Use the button to enter/);
});
