import test from 'node:test';
import assert from 'node:assert/strict';
import {Color,Scene,Group,Mesh,PlaneGeometry,ShaderMaterial,MeshBasicMaterial,PointLight} from 'three';
import {RoomWorldTheme} from '../src/scene/room-world-theme.js';
import {MusicLights} from '../src/scene/room-music-lights.js';
import {PAGE_THEMES} from '../src/world-themes.js';
function setup(){
 const scene=new Scene(),carPivot=new Group();scene.add(carPivot);
 const paint=new MeshBasicMaterial({color:0xff1133});carPivot.add(new Mesh(new PlaneGeometry(),paint));
 const shared=new MeshBasicMaterial({color:new Color(4,.02,.05)});
 const panels=Array.from({length:5},(_,index)=>{
  const frame=new Group();frame.add(new Mesh(new PlaneGeometry(),shared));scene.add(frame);
  return {index,frame,material:new ShaderMaterial({fragmentShader:'void main(){vec3 c=vec3(1.);gl_FragColor=vec4(c,1.);}'})};
 });
 const light=new PointLight(0xff0022,10),studio=new PointLight(0xffffff,7);scene.add(light,studio);
 const ceiling=new MeshBasicMaterial({color:new Color(3,3,3)});scene.add(new Mesh(new PlaneGeometry(),ceiling));
 const beam=new Group();beam.visible=true;
 const portal={active:false,interior:false,fullMaterial:new ShaderMaterial({fragmentShader:'void main(){gl_FragColor=vec4(1.);}'}),effects:{group:new Group()}};
 const view={scene,panels,carPivot,screenLight:new PointLight(0xff1133,0),bannerPortal:portal,hoverPanel:-1,reduced:{matches:false},beams:[beam],smokes:[],wake(){},reflectionBudget:{invalidate(){}},optics:{gradePass:{uniforms:{uBloomStrength:{value:.5}}}}};
 const theme=new RoomWorldTheme(view);view.worldTheme=theme;theme.attachAtmosphere();
 return {view,theme,paint,shared,light,studio,ceiling,beam,dispose(){theme.dispose();const materials=new Set();scene.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});for(const p of panels)materials.add(p.material);materials.add(portal.fullMaterial);materials.add(shared);materials.forEach(m=>m.dispose());}};
}
test('idle neons are dim neutral, overhead cone is off, car paint and studio key remain unchanged',()=>{
 const f=setup();try{
  assert.equal(f.theme.selected,-1);assert.equal(f.theme.level,.035);
  assert.equal(f.paint.color.getHex(),0xff1133);assert.equal(f.studio.intensity,7);assert.equal(f.beam.visible,false);
  assert.ok(f.ceiling.color.r<.15);assert.ok(f.light.intensity<.5);
 }finally{f.dispose();}
});
test('hover isolates each panel and reuses shader programs and rigid geometry',()=>{
 const f=setup();try{
  const versions=f.view.panels.map(p=>p.material.version),positions=f.view.panels.map(p=>p.frame.position.clone());
  for(let index=0;index<5;index++){
   f.view.hoverPanel=index;for(let i=0;i<120;i++)f.theme.update(1/60);
   assert.equal(f.theme.selected,index);
   const color=new Color(PAGE_THEMES[index].hex);assert.ok(Math.abs(f.theme.color.r-color.r)<.002&&Math.abs(f.theme.color.g-color.g)<.002&&Math.abs(f.theme.color.b-color.b)<.002);
   for(const p of f.view.panels){
    assert.equal(p.material.version,versions[p.index]);assert.ok(p.frame.position.equals(positions[p.index]));
    if(p.index===index)assert.ok(p.material.uniforms.dxtBrightness.value>1);
    else assert.ok(p.material.uniforms.dxtBrightness.value<.11);
   }
  }
  assert.equal(f.paint.color.getHex(),0xff1133);
 }finally{f.dispose();}
});
test('portal travel keeps the destination color locked when pointer hover is cleared',()=>{
 const f=setup();try{
  f.view.bannerPortal.active=true;f.view.bannerPortal.panel=f.view.panels[4];f.view.hoverPanel=0;f.theme.update(0,true);
  assert.equal(f.theme.selected,4);assert.equal(f.theme.color.getHexString(),'70d5ff');
  f.view.bannerPortal.active=false;f.view.hoverPanel=-1;f.theme.update(0,true);assert.equal(f.theme.selected,-1);
 }finally{f.dispose();}
});
test('audio reactivity finds initially neutral neon sources and restores the selected theme',()=>{
 const f=setup();try{
  const music=new MusicLights(f.view);assert.ok(music.lights.length);assert.ok(music.materials.length);
  f.view.hoverPanel=4;f.theme.update(0,true);
  const color=f.ceiling.color.clone(),power=f.light.intensity;
  music.apply({bass:1,treble:.5},.85);assert.ok(f.light.intensity>power);assert.ok(f.ceiling.color.b>color.b);
  music.restore();assert.equal(f.light.intensity,power);assert.ok(f.ceiling.color.equals(color));assert.equal(f.paint.color.getHex(),0xff1133);
 }finally{f.dispose();}
});
