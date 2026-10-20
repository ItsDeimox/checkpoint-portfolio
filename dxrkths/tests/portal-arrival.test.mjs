import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {BannerPortal} from '../src/scene/room-portal.js';import {RoomCamera} from '../src/scene/room-camera.js';import {createFixedPanelLayout} from '../src/scene/room-environment.js';import {SectionRoutes} from '../src/ui/room-section-routes.js';
function journey(){
 const camera=new T.PerspectiveCamera(48,1.5,.08,100),cameraRig=new RoomCamera(camera,900);
 const panels=createFixedPanelLayout().map(p=>({...p,material:new T.ShaderMaterial({uniforms:{artwork:{value:null},projection:{value:new T.Matrix3()}},fragmentShader:'void main(){vec2 p=vec2(0.);vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}'})}));
 const optics={bloomPass:'bloom',composer:{passes:['bloom'],insertPass(p,i){this.passes.splice(i,0,p);}},resetHistory(){}};
 const view={camera,cameraRig,panels,scene:new T.Scene(),ready:true,settings:{quality:'low'},reduced:{matches:false},optics,release(){},clearHover(){},hidePanelContent(){},wake(){}};
 const portal=new BannerPortal(view);
 return {view,portal,drawFrame(dt=1/60){cameraRig.update(dt);portal.prepareFrame(dt);},dispose(){if(portal.attached)portal.shutter.dispose();portal.dispose();panels.forEach(p=>p.material.dispose());}};
}
function routes(){const element=()=>{const attrs=new Map(),classes=new Set(),props=new Map();return{hidden:false,inert:false,writes:0,_html:'',get innerHTML(){return this._html},set innerHTML(v){this.writes++;this._html=v},style:{setProperty:(k,v)=>props.set(k,v),removeProperty:k=>props.delete(k),getPropertyValue:k=>props.get(k)||''},classList:{add:(...ns)=>ns.forEach(n=>classes.add(n)),remove:(...ns)=>ns.forEach(n=>classes.delete(n)),contains:n=>classes.has(n)},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),getAttribute:k=>attrs.get(k)??null,querySelector:()=>null,focus(){},getBoundingClientRect:()=>({top:0})}};const root=element(),host=element(),body=element(),canvas=element(),footer=element();const scene={ready:true,reduced:{matches:false},cancelPortal(){},parkSection(){this.parked=true},resumeShowroom(){},enterPortal(i,done,progress){this.done=done;this.progress=p=>progress(p,{visible:true,width:900,height:600,contentWidth:900,quad:[[0,0],[1,0],[1,1],[0,1]]});return true}};const r=new SectionRoutes({document:{body,defaultView:{scrollTo(){}}},root,host,canvas,footer,getScene:()=>scene,getPhase:()=> 'ready',entered:()=>true,setLocation(){},onSelect(){},onRefresh(){}});return {r,root,host,scene,body};}
test('page opacity is driven by the drawn camera progress before completion',()=>{const f=journey(),events=[];f.portal.enter(0,()=>events.push({done:true}),p=>events.push({progress:p}));for(let i=0;i<260;i++)f.drawFrame();const values=events.filter(e=>e.progress!==undefined).map(e=>e.progress);assert.ok(values.some(p=>p>.5&&p<.95),'missing page preview during corridor flight');assert.equal(values.at(-1),1);assert.equal(events.at(-1).done,true);assert.ok(values.every((p,i)=>!i||p>=values[i-1]));f.dispose();});
test('outbound corridor retains radiance instead of closing to black',()=>{const s=fs.readFileSync(new URL('../src/scene/room-portal-shader.js',import.meta.url),'utf8');assert.doesNotMatch(s,/return color\*\(1\.-smoothstep\(\.84,1\.,portalProgress\)\)/);assert.match(s,/portalReturn/);});
test('destination markup is prepared once and becomes visible before arriving',()=>{const f=routes();f.r.open(0);assert.equal(typeof f.scene.progress,'function');assert.equal(f.root.hidden,false);assert.equal(f.root.inert,true);assert.equal(f.root.getAttribute('aria-hidden'),'true');assert.ok(f.root.innerHTML.includes('Berserk Drift X'));f.scene.progress(.8);assert.ok(+f.root.style.getPropertyValue('--arrival-opacity')>0);assert.equal(f.host.hidden,false);assert.equal(f.scene.parked,undefined);const writes=f.root.writes;f.scene.progress(1);f.scene.done();assert.equal(f.root.writes,writes,'must not recreate content on arrival');assert.equal(f.root.inert,false);assert.equal(f.root.hidden,false);assert.equal(f.host.hidden,true);assert.equal(f.root.getAttribute('aria-hidden'),null);});
test('the DOM preview follows the portal opening while flight progress is still zero',()=>{const f=routes();f.r.open(0);f.r.revealArrival(0,f.r.token,0,{visible:true,width:900,height:600,contentWidth:900,quad:[[.3,.3],[.7,.3],[.7,.7],[.3,.7]],clip:[.25,.25,.75,.75],opacity:1});assert.equal(f.root.style.opacity,'1');assert.equal(f.root.style.clipPath,'inset(25% 25% 25% 25%)');assert.match(f.root.style.transform,/^matrix3d\(/);assert.equal(f.root.inert,true);assert.equal(f.r.page,false);});
test('Escape cancels the prepared destination and all late reveal callbacks',()=>{const f=routes();f.r.open(2);assert.equal(typeof f.scene.progress,'function');const old=f.scene.progress,done=f.scene.done;old(.8);f.r.close('none',true);old(.98);done();assert.equal(f.root.hidden,true);assert.equal(f.root.innerHTML,'');assert.equal(f.r.index,null);assert.equal(f.body.classList.contains('section-arriving'),false);});
test('history supersession cannot reveal the wrong preloaded destination',()=>{const f=routes();f.r.open(0);assert.equal(typeof f.scene.progress,'function');const old=f.scene.progress,done=f.scene.done;f.r.open(3,null,'none',true);old(1);done();assert.equal(f.r.index,3);assert.ok(f.root.innerHTML.includes('I’m DXT'));assert.equal(f.root.inert,false);assert.equal(f.body.classList.contains('section-arriving'),false);});
test('direct entry does not flash a corridor preview or delay interactivity',()=>{const f=routes();f.r.open(1,null,'none',true);assert.equal(f.root.inert,false);assert.equal(f.root.hidden,false);assert.equal(f.r.page,true);assert.equal(f.body.classList.contains('section-arriving'),false);});
test('cancelled 3D journey cannot keep updating an old preview',()=>{const f=journey();let updates=0;f.portal.enter(2,()=>{},()=>updates++);for(let i=0;i<90;i++)f.drawFrame();assert.ok(updates>0);f.portal.cancel();const n=updates;for(let i=0;i<260;i++)f.drawFrame();assert.equal(updates,n);f.dispose();});
import {arrivalVisual} from '../src/ui/portal-arrival.js';
test('camera blend is bounded, monotonic and at full opacity before the handoff',()=>{let prev=0;for(let i=0;i<=1000;i++){const s=arrivalVisual(i/1000);assert.ok(s.opacity>=prev-1e-10&&s.opacity<=1.00000001);prev=s.opacity;}assert.equal(arrivalVisual(0).opacity,0);assert.equal(arrivalVisual(.1).opacity,1);assert.equal(arrivalVisual(.98).opacity,1);for(const n of[NaN,Infinity,-10])assert.equal(arrivalVisual(n).opacity,0);});
test('portal direction state resets when returning and starting another journey',()=>{const f=journey();f.portal.enter(1,()=>{});assert.equal(f.view.panels[1].portalUniforms.portalReturn.value,0);for(let i=0;i<260;i++)f.view.cameraRig.update(1/60);f.portal.returnToShowroom(1,()=>{});assert.equal(f.view.panels[1].portalUniforms.portalReturn.value,1);f.portal.cancel();f.portal.enter(4,()=>{});assert.equal(f.view.panels[4].portalUniforms.portalReturn.value,0);f.dispose();});
test('arriving does not schedule a second CSS entrance animation on return',()=>{const f=routes();f.r.open(0);f.scene.progress(1);f.scene.done();assert.equal(f.root.getAttribute('data-portal-arrival'),'arrived');f.r.close('none',true);assert.equal(f.root.getAttribute('data-portal-arrival'),'arrived');});
test('a destination preview cannot be interacted with even when almost opaque',()=>{const f=routes();f.r.open(4);f.scene.progress(.98);assert.equal(+f.root.style.getPropertyValue('--arrival-opacity'),1);assert.equal(f.root.inert,true);assert.equal(f.root.getAttribute('aria-hidden'),'true');assert.equal(f.r.page,false);f.scene.done();assert.equal(f.r.page,true);assert.equal(f.root.inert,false);});
test('a short page on a tall viewport does not reserve a nonexistent scrollbar',()=>{const f=routes();f.r.document.createElement=()=>({style:{},offsetWidth:100,clientWidth:85,remove(){}});f.r.document.body.append=()=>{};f.root.clientHeight=1800;f.root.scrollHeight=1800;f.r.open(2);assert.equal(f.root.style.getPropertyValue('--arrival-gutter'),'0px');f.root.clientHeight=480;f.root.scrollHeight=950;f.r.fitArrivalViewport();assert.equal(f.root.style.getPropertyValue('--arrival-gutter'),'15px');});

test('precomputed page gutter avoids first-click forced DOM layout',()=>{
 const f=routes();
 f.r.document.defaultView.innerWidth=900;f.r.document.defaultView.innerHeight=600;
 f.r.pageCache.set(0,{viewport:{width:900,height:600,gutter:15}});
 f.r.arrival={index:0,token:f.r.token};
 Object.defineProperty(f.root,'scrollHeight',{get(){throw Error('Forced synchronous page layout');}});
 Object.defineProperty(f.root,'clientHeight',{get(){throw Error('Forced synchronous page layout');}});
 assert.doesNotThrow(()=>f.r.fitArrivalViewport());
 assert.equal(f.root.style.getPropertyValue('--arrival-gutter'),'15px');
 assert.equal(f.r.arrival.viewport.contentWidth,885);
});

test('Back waits for a quality transaction instead of drawing into reallocating targets',async()=>{
 const f=routes();f.r.open(2,null,'none',true);let done,returns=0;
 f.scene.qualityChanging=true;f.scene.qualityTask=new Promise(resolve=>done=resolve);
 f.scene.returnPortal=()=>{returns++;return true;};
 f.r.close();assert.equal(returns,0,'Back submitted a frame while attachments were changing');assert.equal(f.r.page,true);
 f.scene.qualityChanging=false;done();await f.scene.qualityTask;await Promise.resolve();
 assert.equal(returns,1);assert.equal(f.r.returning,true);
});
test('superseding a deferred Back prevents a late quality callback from closing the new page',async()=>{
 const f=routes();f.r.open(2,null,'none',true);let done,returns=0;
 f.scene.qualityChanging=true;f.scene.qualityTask=new Promise(resolve=>done=resolve);
 f.scene.returnPortal=()=>{returns++;return true;};
 f.r.close();f.r.open(4,null,'none',true);
 f.scene.qualityChanging=false;done();await f.scene.qualityTask;await Promise.resolve();
 assert.equal(returns,0);assert.equal(f.r.index,4);assert.equal(f.r.page,true);
});
