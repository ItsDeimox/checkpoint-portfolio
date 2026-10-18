import test from 'node:test';
import assert from 'node:assert/strict';
import {getSectionExperience,SectionExperience} from '../src/ui/world-experience.js';
function fixture(){
 const frames=new Map();let id=0;
 const view={performance:{now:()=>0},requestAnimationFrame:callback=>{frames.set(++id,callback);return id;},cancelAnimationFrame:key=>frames.delete(key)};
 const doc={defaultView:view,hidden:false,addEventListener(){},createElement:()=>({})};
 const root={ownerDocument:doc,hidden:false,inert:false,addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]};
 return {view,doc,root,frames};
}
test('page graphics singleton is shared by native and bundled consumers',async()=>{
 const {root}=fixture();const a=getSectionExperience(root),b=getSectionExperience(root);
 assert.equal(a,b);assert.equal(await a.prepare(),false);a.dispose();
});
test('unsupported canvas leaves page navigation usable instead of rejecting startup',async()=>{
 const {root}=fixture();const experience=new SectionExperience(root);
 assert.equal(await experience.prepare(),false);assert.equal(experience.root.hidden,false);experience.dispose();
});
test('the energy animation survives the first sub-30Hz frame, then sleeps after decay',()=>{
 const f=fixture(),experience=new SectionExperience(f.root);
 experience.ready=true;experience.host={dataset:{worldGraphic:'energy'},removeAttribute(){}};experience.energy=1;let draws=0;
 experience.draw=()=>{draws++;experience.energy=0;};
 experience.wake();assert.equal(f.frames.size,1);
 const run=now=>{const [id,callback]=f.frames.entries().next().value;f.frames.delete(id);callback(now);};
 run(16);assert.equal(draws,0);assert.equal(f.frames.size,1,'first callback must not drop the injected energy');
 run(34);assert.equal(draws,1);assert.equal(f.frames.size,0);experience.dispose();
});
test('hidden and inert destination pages cannot retain animation callbacks',()=>{
 const f=fixture(),experience=new SectionExperience(f.root);
 experience.ready=true;experience.host={dataset:{worldGraphic:'future'},removeAttribute(){}};
 f.root.inert=true;experience.wake();assert.equal(f.frames.size,0);
 f.root.inert=false;experience.wake();assert.equal(f.frames.size,1);
 experience.sleep();assert.equal(f.frames.size,0);
 f.root.hidden=true;experience.wake();assert.equal(f.frames.size,0);experience.dispose();
});
