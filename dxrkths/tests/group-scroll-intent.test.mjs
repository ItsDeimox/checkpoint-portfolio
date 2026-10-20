import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DestinationExperience} from '../src/ui/destination-experience.js';
import {renderSectionPage} from '../src/pages/section-pages.js';

function rig(){
 const events=[],classes=new Set(),slides=[{offsetLeft:0},{offsetLeft:1028}];
 const track={clientWidth:1000,scrollWidth:2100,scrollLeft:0,captured:false,
  querySelectorAll:selector=>selector==='[data-group-slide]'?slides:[],
  classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},
  scrollTo(options){events.push(options);this.scrollLeft=options.left;},
  setPointerCapture(){this.captured=true;},hasPointerCapture(){return this.captured;},releasePointerCapture(){this.captured=false;}};
 const target={closest:selector=>selector==='[data-group-track]'?track:null};
 const page=Object.create(DestinationExperience.prototype);
 page.root={inert:false};page.reduced={matches:false};page.window={performance:{now:()=>1000}};
 let prevented=0;
 const wheel=(props={})=>({target,deltaX:0,deltaY:230,deltaMode:0,
  shiftKey:false,ctrlKey:false,preventDefault(){prevented++;},...props});
 const pointer=(props={})=>({target,pointerType:'mouse',button:0,pointerId:17,
  clientX:750,clientY:250,cancelable:true,type:'pointermove',preventDefault(){prevented++;},...props});
 return {page,track,target,events,classes,wheel,pointer,get prevented(){return prevented;}};
}

test('ordinary vertical wheel always belongs to the document even mid horizontal-snap cooldown',()=>{
 const f=rig();f.page.groupWheelUntil=2000;
 f.page.wheel(f.wheel());f.page.wheel(f.wheel({deltaY:-120,deltaMode:1}));
 assert.equal(f.prevented,0);assert.equal(f.events.length,0);
 assert.equal(f.page.wheelAmount,0);
 // Native horizontal trackpad input remains browser-owned (including diagonals).
 f.page.wheel(f.wheel({shiftKey:true,deltaX:270,deltaY:90}));
 f.page.wheel(f.wheel({shiftKey:true,ctrlKey:true}));
 assert.equal(f.prevented,0);assert.equal(f.events.length,0);
});
test('Shift + vertical wheel intentionally changes carousel once, preserving boundary and cooldown behavior',()=>{
 const f=rig();f.page.wheel(f.wheel({shiftKey:true,deltaY:20}));
 assert.equal(f.prevented,1);assert.equal(f.events.length,0,'small wheel deltas accumulate');
 f.page.wheel(f.wheel({shiftKey:true,deltaY:24}));
 assert.equal(f.events.length,1);assert.equal(f.track.scrollLeft,1028);
 assert.equal(f.events[0].behavior,'smooth');
 f.page.wheel(f.wheel({shiftKey:true,deltaY:220}));
 assert.equal(f.events.length,1,'successive Shift events must not skip a slide');
 const before=f.prevented;
 f.page.wheel(f.wheel({shiftKey:false,deltaY:250}));
 assert.equal(f.prevented,before,'plain page scroll is never trapped by the cooldown');
 f.page.window.performance.now=()=>3000;
 f.page.wheel(f.wheel({shiftKey:true,deltaY:250}));
 assert.equal(f.events.length,1,'outward Shift gesture at the last group must not scroll further');
 assert.equal(f.prevented,before,'boundary wheel must be left to browser');
 f.page.wheel(f.wheel({shiftKey:true,deltaY:-100}));
 assert.equal(f.events.at(-1).left,0,'reverse Shift changes to the previous group');
 f.page.reduced.matches=true;f.page.window.performance.now=()=>4000;
 f.page.wheel(f.wheel({shiftKey:true,deltaY:200}));
 assert.equal(f.events.at(-1).behavior,'instant','reduced motion avoids smooth snap');
});
test('horizontal mouse drag captures only after intent threshold and snaps to a real slide',()=>{
 const f=rig();
 f.page.groupPointerStart(f.pointer({type:'pointerdown'}));
 assert.ok(f.page.groupDrag);assert.equal(f.track.captured,false);
 f.page.groupPointerMove(f.pointer({clientX:747,clientY:248}));
 assert.equal(f.track.captured,false);assert.equal(f.prevented,0);
 f.page.groupPointerMove(f.pointer({clientX:700,clientY:247}));
 assert.equal(f.track.captured,true);assert.ok(f.classes.has('is-dragging'));
 f.page.groupPointerMove(f.pointer({clientX:10,clientY:247}));
 assert.ok(f.track.scrollLeft>700);
 f.page.groupPointerEnd(f.pointer({type:'pointerup',clientX:10,clientY:247}));
 assert.equal(f.track.captured,false);assert.ok(!f.classes.has('is-dragging'));
 assert.equal(f.events.at(-1).left,1028,'release snaps to closest group');
 assert.equal(f.page.groupDrag,null);
});
test('vertical pointer intent, touch swipes and links are not captured by mouse drag',()=>{
 const f=rig();
 f.page.groupPointerStart(f.pointer({type:'pointerdown',pointerType:'touch'}));assert.equal(f.page.groupDrag,undefined);
 f.page.groupPointerStart(f.pointer({type:'pointerdown',target:{closest(sel){return sel==='[data-group-track]'?f.track:sel.startsWith('a,')?{}:null;}}}));
 assert.equal(f.page.groupDrag,undefined,'native outgoing group link stays clickable');
 f.page.groupPointerStart(f.pointer({type:'pointerdown'}));
 f.page.groupPointerMove(f.pointer({clientX:740,clientY:215}));
 assert.equal(f.page.groupDrag,null,'vertical gesture drops the drag candidate');
 assert.equal(f.prevented,0);assert.ok(!f.classes.has('is-dragging'));
});
test('group page advertises true navigation gestures and keeps native horizontal touch scrolling',()=>{
 const html=renderSectionPage(1),css=readFileSync(new URL('../src/styles-sections.css',import.meta.url),'utf8');
 assert.match(html,/DRAG \/ SWIPE · SHIFT \+ SCROLL/);
 assert.match(html,/Normal vertical scrolling moves the page/);
 assert.match(css,/\.group-track\{[^}]*overflow-x:auto[^}]*scroll-snap-type:x mandatory/);
 assert.match(css,/\.group-track\.is-dragging\{[^}]*scroll-snap-type:none/);
 assert.doesNotMatch(css,/\.group-track[^\n]*touch-action:none/);
});
