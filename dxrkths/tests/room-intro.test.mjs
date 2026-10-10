import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const intro=await import('../src/ui/room-intro.js').catch(()=>({}));
const visitor=await import('../src/ui/room-visitor-settings.js').catch(()=>({}));
const shell=await import('../src/ui/room-visitor-shell.js').catch(()=>({}));

test('first entry starts audio synchronously, only once, and waits for prepared geometry',()=>{
 assert.equal(typeof intro.IntroGate,'function');
 let plays=0,dismisses=0;
 const gate=new intro.IntroGate({onActivate:()=>{plays++;},onDismiss:()=>{dismisses++;}});
 gate.activate();assert.equal(plays,1);assert.equal(dismisses,0);gate.activate();assert.equal(plays,1);
 gate.ready();assert.equal(dismisses,1);gate.ready();assert.equal(dismisses,1);
});
test('a ready scene stays covered until entry; a failed scene still offers usable fallback',()=>{
 assert.equal(typeof intro.IntroGate,'function');let calls=0;
 const gate=new intro.IntroGate({onDismiss:()=>{calls++;}});gate.ready();assert.equal(calls,0);gate.activate();assert.equal(calls,1);
 const fallback=new intro.IntroGate({onDismiss:()=>{calls++;}});fallback.fail();assert.equal(calls,1);fallback.activate();assert.equal(calls,2);
});
test('visitor defaults migrate once to medium, 20 percent music, and 85 percent light response',()=>{
 assert.equal(typeof visitor.restoreVisitorSettings,'function');
 const result=visitor.restoreVisitorSettings({quality:'high',paused:true,music:{volume:.45,reactivity:.65}});
 assert.equal(result.quality,'auto');assert.deepEqual(result.music,{volume:.2,reactivity:.85});
 const saved=visitor.restoreVisitorSettings({...result,quality:'low',music:{volume:0,reactivity:.4}});
 assert.equal(saved.quality,'low');assert.deepEqual(saved.music,{volume:0,reactivity:.4});
 assert.deepEqual(visitor.QUALITY_VALUES,['low','auto','high']);assert.equal(visitor.qualityLabel('auto'),'Medium');
});
test('public header contains only music and three quality choices, not the developer controls',()=>{
 assert.equal(typeof shell.renderRoomHeader,'function');const html=shell.renderRoomHeader({quality:'auto',music:{volume:.2,reactivity:.85}});
 assert.match(html,/id="quality"/);assert.match(html,/>Medium</);assert.match(html,/id="sound-toggle"/);assert.match(html,/id="music-volume"/);assert.match(html,/value="0.2"/);
 assert.doesNotMatch(html,/room-settings|data-visual-setting|reset-visuals|id="pause"|music-file/);
});
test('intro is in the initial HTML, before the main application can flash native fallback links',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="room-intro"/);assert.match(html,/class="intro-pending"/);assert.match(html,/id="intro-enter"/);
 assert.match(html,/src\/styles-experience.css/);assert.match(html,/intro-title/);
});

test('audio refusal never blocks entry or causes a repeated auto-start',async()=>{
 let calls=0,closed=0;const gate=new intro.IntroGate({onActivate:()=>{calls++;return Promise.reject(new Error('blocked'));},onDismiss:()=>closed++});
 gate.ready();gate.activate();await Promise.resolve();assert.equal(closed,1);gate.activate();assert.equal(calls,1);
});
test('null and malformed visitor settings cannot produce extra quality modes',()=>{
 for(const value of [null,{},[],{visitorPreset:visitor.VISITOR_PRESET,quality:'ultra',music:{volume:NaN,reactivity:Infinity}}]){
  const restored=visitor.restoreVisitorSettings(value);assert.equal(restored.quality,'auto');assert.deepEqual(restored.music,{volume:.2,reactivity:.85});
 }
});
