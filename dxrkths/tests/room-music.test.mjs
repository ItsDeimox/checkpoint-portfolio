import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/scene/room-music.js').catch(()=>({}));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(){
 assert.equal(typeof api.RoomMusic,'function','streamed music controller must exist');
 const calls=[],events=[];let nodes=0,contexts=0,reads=0;
 const node=()=>({connect(n){calls.push(['connect',n]);return n;},disconnect(){},gain:{value:1,setTargetAtTime(v){this.value=v;}}});
 const element=new EventTarget();Object.assign(element,{paused:true,readyState:4,currentTime:12,muted:false,volume:1,loop:false,preload:'',src:'',playGate:null,play(){calls.push(['play']);this.paused=false;return this.playGate?.promise??Promise.resolve();},pause(){calls.push(['pause']);this.paused=true;},load(){},removeAttribute(key){if(key==='src')this.src='';}});
 const context={state:'suspended',sampleRate:48000,currentTime:0,destination:node(),resume(){calls.push(['resume']);this.state='running';return Promise.resolve();},suspend(){this.state='suspended';return Promise.resolve();},close(){this.state='closed';return Promise.resolve();},createMediaElementSource(){nodes++;return node();},createGain:node,createAnalyser(){const a=node();a.frequencyBinCount=1024;a.getFloatFrequencyData=data=>{reads++;data.fill(-Infinity);data[3]=-17;data[250]=-30;};return a;}};
 const revoked=[];
 const music=new api.RoomMusic({defaultTrack:{url:'/test-lagoon.mp3',title:'Test track'},createAudio:()=>element,createContext:()=>{contexts++;return context;},onState:s=>events.push(s),createURL:()=> 'blob:local-song',revokeURL:url=>revoked.push(url)});
 return {music,element,context,calls,events,revoked,get nodes(){return nodes;},get contexts(){return contexts;},get reads(){return reads;}};
}
test('music is lazy and one source/context are reused across repeated toggles',async()=>{
 const f=fixture();assert.equal(f.contexts,0);assert.equal(f.element.src,'');
 const promise=f.music.setEnabled(true);assert.ok(f.calls.some(c=>c[0]==='play'),'play must start inside the trusted gesture, before awaiting');
 assert.equal(await promise,true);assert.equal(f.element.preload,'none');assert.equal(f.element.loop,true);assert.match(f.element.src,/lagoon\.mp3$/);
 await f.music.setEnabled(false);assert.equal(f.element.paused,true);assert.equal(f.element.currentTime,12);
 await f.music.setEnabled(true);assert.equal(f.contexts,1);assert.equal(f.nodes,1);await f.music.close();
});
test('spectrum sampling is capped at 30 Hz, reuses its output and stops on pause',async()=>{
 const f=fixture();await f.music.setEnabled(true);const output=f.music.update(1/60,true);
 for(let i=0;i<60;i++)assert.equal(f.music.update(1/60,true),output);
 assert.ok(f.reads<=31 && f.reads>=29);assert.ok(output.bass>0 && output.treble>0);
 const reads=f.reads;f.music.update(1/60,false);assert.equal(f.reads,reads);assert.equal(output.bass,0);
 await f.music.setEnabled(false);f.music.update(1/60,true);assert.equal(f.reads,reads);await f.music.close();
});
test('late play completion cannot revive audio after a rapid stop',async()=>{
 const f=fixture();f.element.playGate=deferred();const pending=f.music.setEnabled(true);await f.music.setEnabled(false);f.element.playGate.resolve();await pending;
 assert.equal(f.element.paused,true);assert.equal(f.music.inspect().enabled,false);await f.music.close();
});
test('blocked or failed playback reports failure without unhandled rejection',async()=>{
 const f=fixture();f.element.playGate=deferred();const pending=f.music.setEnabled(true);f.element.playGate.reject(new Error('blocked'));
 assert.equal(await pending,false);assert.equal(f.music.inspect().enabled,false);assert.ok(f.music.inspect().error);await f.music.close();
});
test('background suspension preserves intent/time and explicit mute wins over resume',async()=>{
 const f=fixture();await f.music.setEnabled(true);await f.music.suspend();assert.equal(f.element.paused,true);assert.equal(f.music.inspect().enabled,true);await f.music.resume();assert.equal(f.element.paused,false);
 await f.music.setEnabled(false);await f.music.resume();assert.equal(f.element.paused,true);assert.equal(f.element.currentTime,12);await f.music.close();
});
test('local tracks never upload and object URLs are revoked on replacement and disposal',async()=>{
 const f=fixture();const invalid={type:'text/plain',size:4,name:'bad.txt'};
 assert.throws(()=>f.music.selectFile(invalid));assert.equal(f.element.src,'');
 await f.music.selectFile({type:'audio/wav',size:1000,name:'test.wav'});assert.equal(f.element.src,'blob:local-song');assert.equal(f.contexts,0);assert.equal(f.element.paused,true);
 await f.music.useDefault();assert.deepEqual(f.revoked,['blob:local-song']);await f.music.close();await f.music.close();assert.equal(f.music.inspect().enabled,false);
});

test('empty music configuration is silent and does not allocate a context',async()=>{
 const f=fixture();await f.music.selectTrack({url:'',title:'Choose a track'});
 assert.equal(await f.music.setEnabled(true),false);assert.equal(f.contexts,0);assert.equal(f.music.inspect().enabled,false);await f.music.close();
});
test('volume zero and effect strength zero suspend spectrum reads without changing playback intent',async()=>{
 const f=fixture();await f.music.setEnabled(true);f.music.update(1/30);const reads=f.reads;
 f.music.setSettings({volume:0});f.music.update(1/30);assert.equal(f.reads,reads);assert.equal(f.music.inspect().enabled,true);
 f.music.setSettings({volume:.4,reactivity:0});f.music.update(1/30);assert.equal(f.reads,reads);assert.equal(f.media?.paused??f.element.paused,false);await f.music.close();
});

test('repeated disposal waits for the same in-flight AudioContext close',async()=>{
 const f=fixture();await f.music.setEnabled(true);const gate=deferred();f.context.close=()=>gate.promise;
 const first=f.music.close();let completed=false;const second=f.music.close().then(()=>{completed=true;});
 await Promise.resolve();await Promise.resolve();assert.equal(completed,false);gate.resolve();await Promise.all([first,second]);assert.equal(completed,true);
});
