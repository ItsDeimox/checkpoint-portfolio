import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
const bands=await import('../src/scene/room-audio-bands.js').catch(()=>({}));
const spin=await import('../src/scene/room-logo-spin.js').catch(()=>({}));
const reactive=await import('../src/scene/room-music-lights.js').catch(()=>({}));
test('bass and treble are separated in hertz at both common sample rates',()=>{
 assert.equal(typeof bands.BandEnvelope,'function');
 for(const rate of [44100,48000]){const env=new bands.BandEnvelope(rate,2048),data=new Float32Array(1024).fill(-Infinity);data[Math.round(80*2048/rate)]=-18;let value;for(let i=0;i<30;i++)value=env.update(data,1/30);assert.ok(value.bass>.1);assert.equal(value.treble,0);env.reset();data.fill(-Infinity);data[Math.round(6000*2048/rate)]=-22;for(let i=0;i<30;i++)value=env.update(data,1/30);assert.equal(value.bass,0);assert.ok(value.treble>.01);data.fill(NaN);for(let i=0;i<100;i++)env.update(data,1/30);assert.ok(value.bass<.001 && value.treble<.001);}
});
test('logo spins exactly once then returns head-on, ignoring click spam and invalid delta',()=>{
 assert.equal(typeof spin.LogoSpin,'function');for(const fps of [24,60,144]){const s=new spin.LogoSpin();assert.equal(s.angle,0);assert.equal(s.request(),true);assert.equal(s.request(),false);let maximum=0;for(let i=0;i<fps*3;i++){s.update(1/fps);maximum=Math.max(maximum,s.angle);}assert.ok(maximum>6);assert.equal(s.angle,0);assert.equal(s.active,false);assert.equal(s.request(true),false);s.request();s.update(NaN);assert.ok(Number.isFinite(s.angle));s.update(1/60,true);assert.equal(s.active,false);}}
);
test('reactivity modulates only existing red sources and restores exact baselines without drift',()=>{
 assert.equal(typeof reactive.MusicLights,'function');const scene=new T.Scene(),red=new T.PointLight(0xff1020,4),white=new T.PointLight(0xffffff,2);scene.add(red,white);const material=new T.MeshBasicMaterial({color:new T.Color(8,.01,.02)});scene.add(new T.Mesh(new T.BoxGeometry(),material));const holo={value:0},bloom={value:.65};const view={scene,screenLight:new T.PointLight(),panels:[{material:{uniforms:{musicTreble:holo}}}],optics:{gradePass:{uniforms:{uBloomStrength:bloom}}}};
 const fx=new reactive.MusicLights(view),original=material.color.clone();for(let i=0;i<100;i++){fx.apply({bass:1,treble:1},1);assert.ok(red.intensity>4 && red.intensity<=7);assert.equal(white.intensity,2);assert.ok(bloom.value>.65 && bloom.value<.9);fx.restore();assert.equal(red.intensity,4);assert.equal(bloom.value,.65);assert.ok(material.color.equals(original));assert.equal(holo.value,0);}fx.apply({bass:1,treble:1},0);assert.equal(red.intensity,4);fx.restore();assert.equal(scene.children.length,3);
});
