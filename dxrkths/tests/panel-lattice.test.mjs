import test from 'node:test';
import assert from 'node:assert/strict';
import {ShaderMaterial,Vector2,Group} from 'three';
import {PanelEnergyField,PANEL_LATTICE} from '../src/scene/panel-energy-field.js';
import {RoomPanelEnergy} from '../src/scene/room-panel-energy.js';
import {createFixedPanelLayout} from '../src/scene/room-environment.js';
import {roomVertex,displayFragment} from '../src/scene/room-shaders.js';
import {configurePanelHologram} from '../src/scene/room-hologram.js';

function fixture(){
 const panels=createFixedPanelLayout().map(p=>{
  const material=new ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,uniforms:{hover:{value:1},hoverUv:{value:new Vector2(.5,.5)}}});
  const panel={...p,frame:new Group(),material};configurePanelHologram(panel);return panel;
 });
 const view={panels,cameraRig:{mode:'overview'},bannerPortal:{active:false,interior:false},reduced:{matches:false}};
 const hover=new RoomPanelEnergy(view);
 return {view,hover,dispose(){hover.dispose();for(const p of panels)p.material.dispose();}};
}
function spread(field){
 let total=0,second=0,outside=0;
 for(let i=0;i<field.count;i++){
  const [x,y]=field.vertices[i],g=field.glow[i],r2=x*x+y*y;
  total+=g;second+=r2*g;if(r2>.18)outside+=g;
 }
 return {radius:Math.sqrt(second/Math.max(total,1e-12)),outside};
}

test('the planar graph has connected three-way junctions and only its real springs are sent to the shader',()=>{
 const field=new PanelEnergyField(),width=field.textureWidth,degree=new Uint8Array(field.count);
 const links=new Set(),adjacency=Array.from({length:field.count},()=>[]);
 for(const [a,b,w] of field.edges){
  assert.ok(Number.isFinite(w)&&w>0);degree[a]++;degree[b]++;
  links.add(`${a}:${b}`);adjacency[a].push(b);adjacency[b].push(a);
  const channel=b===a+1?1:b===a+width?2:0;
  assert.ok(channel,'there are no invisible diagonal shortcuts');
  assert.ok(Math.abs(field.data[a*4+channel]-w)<1e-7);
 }
 for(let r=0;r<field.textureHeight;r++)for(let c=0;c<width;c++){
  const id=r*width+c;
  assert.equal(field.data[id*4+1]>0,links.has(`${id}:${id+1}`));
  assert.equal(field.data[id*4+2]>0,links.has(`${id}:${id+width}`));
  if(r>0&&r<field.textureHeight-1&&c>0&&c<width-1)assert.equal(degree[id],3);
 }
 const visited=new Set([0]),queue=[0];
 for(let i=0;i<queue.length;i++)for(const next of adjacency[queue[i]])if(!visited.has(next)){visited.add(next);queue.push(next);}
 assert.equal(visited.size,field.count);
 assert.ok(field.count<1100&&field.edges.length<1600,'a card must not carry six faces of simulation');
 assert.ok(field.data.length<4500,'the card atlas must only contain planar nodes and its edge guard');
});

test('a wave splits around a six-sided chevron and reaches the rejoining node through actual springs',()=>{
 const f=new PanelEnergyField(),w=f.textureWidth,row=10,col=10,a=row*w+col;
 const loop=[a,a+1,a+2,a+2+w,a+1+w,a+w];
 const links=new Set(f.edges.map(([from,to])=>`${Math.min(from,to)}:${Math.max(from,to)}`));
 for(let i=0;i<loop.length;i++){
  const p=loop[i],q=loop[(i+1)%loop.length];
  assert.ok(links.has(`${Math.min(p,q)}:${Math.max(p,q)}`));
 }
 f.height[a]=.04;f.awake=true;f.step(f.fixedStep);
 assert.ok(f.glow[loop[1]]>0&&f.glow[loop[5]]>0,'the junction must energize both branches');
 assert.equal(f.glow[loop[3]],0,'energy cannot skip two intervening junctions');
 f.step(f.fixedStep);assert.equal(f.glow[loop[3]],0);
 f.step(f.fixedStep);assert.ok(f.glow[loop[3]]>0,'the paths must rejoin after three graph steps');
});

test('one released mouse impulse spreads into unvisited material and leaves a fading afterglow',()=>{
 const field=new PanelEnergyField();field.point(.5,.5,100);field.release();field.step(1/60);
 const early=spread(field),peak=field.peak,impulses=field.impulses;
 for(let i=0;i<40;i++)field.step(1/60);
 const later=spread(field);
 assert.ok(later.radius>early.radius*3,JSON.stringify({early,later}));
 assert.ok(later.outside>early.outside+10,'a static hit must propagate well beyond its input footprint');
 assert.ok(field.peak<peak*.3&&field.peak>.05,'the front must fade without vanishing immediately');
 assert.equal(field.impulses,impulses);
 assert.ok(field.glow.some((g,i)=>g>field.data[i*4+3]+.01),'older junctions must retain an afterglow');
 for(let i=0;i<240;i++)field.step(1/60);
 assert.equal(field.awake,false);assert.equal(field.total(),0);
});

test('wide and tall cards preserve cell dimensions, bottom-up pointer coordinates and valid edge texels',()=>{
 const baseline=new PanelEnergyField();
 for(const aspect of [.2,.93,1,1.09,5]){
  const field=new PanelEnergyField(aspect);
  assert.ok(Math.abs(field.span[0]/field.span[1]-aspect)<1e-12);
  assert.equal(field.pitchX,baseline.pitchX);assert.equal(field.pitchY,baseline.pitchY);
  field.point(.25,.85,100);assert.ok(field.previous.p[1]>0);
  for(let y=0;y<=32;y++)for(let x=0;x<=32;x++){
   const gx=x/32*field.grid[0]+1,gy=y/32*field.grid[1]+1,column=Math.floor(gx),t=gx-column;
   const left=(column%2)*PANEL_LATTICE.bend,right=PANEL_LATTICE.bend-left;
   const row=Math.floor(gy-(left+(right-left)*t));
   assert.ok(column>=0&&column+1<field.textureWidth&&row>=0&&row+1<field.textureHeight,'visible UVs must always have four real graph corners');
  }
  for(const [x,y] of [[0,0],[0,1],[1,0],[1,1]]){
   field.clear();field.inject(x,y,.4);field.step(1/60);const early=field.activeCount();
   for(let i=0;i<12;i++)field.step(1/60);
   assert.ok(field.activeCount()>early,'a hit at the edge must propagate back into the card');
  }
 }
});

test('input reuses its record, ignores stationary and invalid samples, and caps solver work after a stall',()=>{
 const field=new PanelEnergyField();field.point(.2,.8,100);const pointer=field.previous;
 const resources=[field.height,field.velocity,field.glow,field.force,field.data,field.edgeA,field.edgeB,field.edgeSpring];
 for(let i=0;i<30;i++)field.point(.2,.8,110+i*17);
 assert.equal(field.impulses,1);assert.equal(field.previous,pointer);
 for(const args of [[NaN,.5,1000],[.5,Infinity,1000],[.5,.5,NaN],[.5,.5,10]])assert.equal(field.point(...args),false);
 for(let i=0;i<300;i++){
  field.inject((i%19)/18,(i%23)/22,2);field.step(10);
  assert.ok(field.lastSubsteps<=8&&field.peak<=2.5);
 }
 assert.ok(field.height.every(Number.isFinite)&&field.velocity.every(Number.isFinite));
 assert.deepEqual([field.height,field.velocity,field.glow,field.force,field.data,field.edgeA,field.edgeB,field.edgeSpring].map((v,i)=>v===resources[i]),resources.map(()=>true));
 field.clear();const version=field.version;field.step(1/60);field.clear();assert.equal(field.version,version);
 field.inject(.5,.5);field.step(field.fixedStep/2);assert.equal(field.version,version,'substep accumulation must not upload identical data');
 field.step(field.fixedStep/2);assert.equal(field.version,version+1);
});

test('panel uploads follow packed versions and remain idle throughout portal and reduced-motion states',()=>{
 const f=fixture();try{
  const e=f.hover.entries[0],materialVersion=e.panel.material.version,texture=e.texture;
  const coldVersion=texture.version;f.hover.update(1/60);assert.equal(texture.version,coldVersion);
  f.hover.point(0,new Vector2(.3,.7),100);f.hover.update(1/60);assert.equal(texture.version,coldVersion+1);
  e.field.clear();f.hover.update(1/60);assert.equal(texture.version,coldVersion+2,'an external clear must upload even though the field is now asleep');
  for(const key of ['portal','reduced']){
   f.view.bannerPortal.active=false;f.view.reduced.matches=false;f.hover.prime();
   let steps=0;const saved=f.hover.entries.map(item=>item.field.step);
   f.hover.entries.forEach(item=>{item.field.step=()=>{steps++;};});
   if(key==='portal')f.view.bannerPortal.active=true;else f.view.reduced.matches=true;
   assert.equal(f.hover.update(1/60),false);const uploaded=f.hover.entries.map(item=>item.texture.version);
   for(let i=0;i<10;i++)assert.equal(f.hover.update(1/60),false);
   assert.equal(steps,0);assert.deepEqual(f.hover.entries.map(item=>item.texture.version),uploaded);
   assert.ok(f.hover.entries.every(item=>!item.field.awake&&item.panel.material.uniforms.uEnergyActive.value===0));
   f.hover.entries.forEach((item,i)=>{item.field.step=saved[i];});
  }
  assert.equal(e.texture,texture);assert.equal(e.panel.material.version,materialVersion);
  assert.ok(f.hover.entries.every(item=>item.panel.frame.children.length===0));
 }finally{f.dispose();}
});
