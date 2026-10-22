import test from 'node:test';
import assert from 'node:assert/strict';
import {FutureProjectDialog} from '../src/ui/future-project-dialog.js';

/** A faithful route/DOM contract without booting the heavy WebGL room. */
function styles(values={}){
 const map=new Map(Object.entries(values));
 return {
  setProperty(name,value){map.set(name,String(value));},
  removeProperty(name){map.delete(name);},
  getPropertyValue(name){return map.get(name)||'';},
  getPropertyPriority(){return ''},
 };
}
function fixture({htmlOverflow='',bodyOverflow='',top=1630}={}){
 const html={style:styles(htmlOverflow?{overflow:htmlOverflow}:{}),clientWidth:1183};
 const classes=new Set();
 const body={style:styles(bodyOverflow?{overflow:bodyOverflow}:{}),classList:{
  add(name){classes.add(name);},remove(name){classes.delete(name);},
  contains(name){return classes.has(name)}
 }};
 const root={hidden:false,inert:false};
 const scrollCalls=[],focusCalls=[];
 const win={innerWidth:1200,scrollX:0,scrollY:top,
  getComputedStyle(){return {paddingRight:'0px'};},
  scrollTo(...args){scrollCalls.push(args);},
  clearTimeout(){}};
 const modal={open:false,classList:{add(){},remove(){}},
  showModal(){this.open=true;},close(){this.open=false;},replaceChildren(){},
  querySelectorAll(){return [];},querySelector(){return {focus(options){focusCalls.push(options);}}}};
 const controller=Object.create(FutureProjectDialog.prototype);
 Object.assign(controller,{
  root,document:{body,documentElement:html},window:win,disposed:false,active:null,
  createDialog(){this.dialog=modal;return modal;},
  select(){},getProject(){return{name:'Example',platform:'Roblox',category:'Games',media:[],description:[]};}
 });
 const opener={isConnected:true,focus(options){focusCalls.push(options);}};
 return {controller,modal,root,win,body,html,opener,scrollCalls,focusCalls};
}

test('opening a project never changes the HTML scroll root or the page offset',()=>{
 const f=fixture({htmlOverflow:'visible',top:1820});
 assert.equal(f.controller.open('0-0',f.opener),true);
 assert.equal(f.html.style.getPropertyValue('overflow'),'visible','document scroll root cannot be replaced during modal opening');
 assert.equal(f.body.style.getPropertyValue('overflow'),'hidden','modal still locks background wheel and touch scrolling');
 assert.equal(f.win.scrollY,1820);
 assert.equal(f.controller.saved.y,1820);
 assert.equal(f.root.inert,true);
 assert.equal(f.modal.open,true);
 assert.ok(f.body.classList.contains('project-dialog-open'));
 f.controller.finishClose(true);
 assert.equal(f.html.style.getPropertyValue('overflow'),'visible');
 assert.equal(f.body.style.getPropertyValue('overflow'),'');
 assert.equal(f.root.inert,false);
 assert.equal(f.modal.open,false);
 assert.equal(f.scrollCalls.length,0,'closing must not issue a redundant scrollTo that flickers the page');
 assert.ok(f.focusCalls.every(options=>options?.preventScroll),'focus must not move the page');
});

test('modal releases an existing body overflow value exactly',()=>{
 const f=fixture({htmlOverflow:'clip',bodyOverflow:'auto',top:2380});
 f.controller.open('0-0',f.opener);
 assert.equal(f.html.style.getPropertyValue('overflow'),'clip');
 f.controller.finishClose(true);
 assert.equal(f.body.style.getPropertyValue('overflow'),'auto');
 assert.equal(f.html.style.getPropertyValue('overflow'),'clip');
 assert.equal(f.scrollCalls.length,0);
});

test('if an external event actually changes the page offset, closing restores it only once',()=>{
 const f=fixture({top:1710});f.controller.open('0-0',f.opener);
 f.win.scrollY=0;
 f.controller.finishClose(true);
 assert.deepEqual(f.scrollCalls,[[0,1710]]);
});

test('closing without focus restoration never scrolls on history navigation',()=>{
 const f=fixture({top:1820});f.controller.open('0-0',f.opener);
 f.win.scrollY=0;
 f.controller.finishClose(false);
 assert.equal(f.scrollCalls.length,0);
 assert.equal(f.body.style.getPropertyValue('overflow'),'');
 assert.equal(f.root.inert,false);
});
