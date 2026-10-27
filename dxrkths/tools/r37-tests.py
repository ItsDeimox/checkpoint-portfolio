from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(path,pairs):
 p=root/path;s=p.read_text()
 for old,new in pairs:
  assert s.count(old)==1,(path,s.count(old),old[:100])
  s=s.replace(old,new)
 p.write_text(s)
edit('tests/hover-regression.test.mjs',[("settings:{quality:'low'}","settings:{quality:'auto'}")])
edit('tests/portal-approach-wall.test.mjs',[(" const f=journey(),v=f.view,seen=[];"," const f=journey(),v=f.view,seen=[];v.settings.quality='auto';")])
edit('tests/room-lifecycle.test.mjs',[("test(`real frame loop delivers ${expected}","test(`moving frame loop delivers ${expected}"),("  await v.readyPromise;const start=v.last,initial=v.frames;let maximum=0;","  await v.readyPromise;v.cameraRig.update=()=>true;const start=v.last,initial=v.frames;let maximum=0;")])
p=root/'tests/room-lifecycle.test.mjs';p.write_text(p.read_text()+'''
test('Low stops its RAF when idle and wakes for interaction, High retains its ambient animation',async()=>{
 for(const quality of ['low','high']){
  const f=harness({settings:{quality,mobileDevice:true,paused:false}}),v=f.instance;
  try{
   await v.readyPromise;
   let now=v.last;
   for(let i=0;i<60&&f.frames.size;i++){
    const [id,callback]=f.frames.entries().next().value;f.frames.delete(id);now+=1000/30;callback(now);
   }
   assert.equal(f.frames.size,quality==='low'?0:1);
   v.sleep();v.wake();assert.equal(f.frames.size,1,'input can restart an idle Low scene');
  }finally{await v.dispose();}
 }
});
''')
edit('tests/room-optics.test.mjs',[("      assert.equal(bright.material.uniforms.tInput.value,optics.sceneTarget.texture);","      if(quality==='low')assert.equal(bright,undefined);\n      else assert.equal(bright.material.uniforms.tInput.value,optics.sceneTarget.texture);"),("test('low uses three bloom scales and no cinematic DOF, streak or moving-object capture'","test('low uses no bloom scales, cinematic DOF, streak or moving-object capture'"),("  assert.equal(optics.bloomPass.activeLevels,3);","  assert.equal(optics.bloomPass.activeLevels,0);")])
p=root/'tests/room-optics.test.mjs';p.write_text(p.read_text()+'''
test('R37 Low submits only scene, grade, tonemap and FXAA, even during continuous motion',()=>{
 const {optics,camera,scene,draws}=fixture();
 try{
  optics.setQuality('low');optics.setVisualSettings({bloom:1,depthOfField:1,motionBlur:1,lens:1,sharpness:1});
  for(let i=0;i<3;i++){
   camera.position.x+=.01;draws.length=0;optics.render(1/30,{motion:1});
   assert.equal(optics.bloomPass.enabled,false);assert.equal(optics.lensPass.enabled,false);assert.equal(optics.gradePass.uniforms.uSharpness.value,0);
   assert.equal(draws.length,4);assert.equal(draws.filter(d=>d.object===scene).length,1);
   assert.equal(draws.at(-1).material,optics.aaPass.material);
   assert.equal(draws.find(d=>d.material===optics.gradePass.material).input,optics.sceneTarget.texture);
   assert.ok(optics.bloomPass.targets.every(t=>t.width===1&&t.height===1));
   assert.equal(optics.previousValid,false,'Low avoids reprojection history work');
  }
  optics.setQuality('high');draws.length=0;optics.render(1/60);
  assert.equal(optics.bloomPass.enabled,true);assert.equal(optics.bloomPass.activeLevels,6);assert.equal(optics.sceneTarget.samples,4);assert.equal(optics.gradePass.uniforms.uSharpness.value,optics.visualSettings.sharpness);
 }finally{optics.dispose();}
});
''')
edit('tests/room-performance.test.mjs',[("test('compact retina low is sharper, while 2K and ultrawide stay within 900k pixels',()=>{\n for(const [w,h]of [[390,844],[844,390]]){const b=renderBudget(w,h,3,'low');assert.ok(b.ratio>=1.2);assert.ok(b.width*b.height<=900000);}\n for(const [w,h]of [[2560,1440],[5120,2160]]){const b=renderBudget(w,h,2,'low');assert.ok(b.width*b.height<=900000);}","test('compact Low uses native pixels, while 2K and ultrawide stay within 450k pixels',()=>{\n for(const [w,h]of [[390,844],[844,390]]){const b=renderBudget(w,h,3,'low');assert.equal(b.ratio,1);assert.ok(b.width*b.height<=450000);}\n for(const [w,h]of [[2560,1440],[5120,2160]]){const b=renderBudget(w,h,2,'low');assert.ok(b.width*b.height<=450000);}"),(" const view={ground,settings:{quality:'low'},camera:new T.PerspectiveCamera()"," const view={ground,settings:{quality:'auto'},camera:new T.PerspectiveCamera()"),("budget.configure('low');assert.equal(target.samples,0);","budget.configure('auto');assert.equal(target.samples,0);"),(" const view={settings:{quality:'low'},ground:{getRenderTarget:()=>target,onBeforeRender(){throw Error('lost');}}"," const view={settings:{quality:'auto'},ground:{getRenderTarget:()=>target,onBeforeRender(){throw Error('lost');}}"),("gate.configure('low');","gate.configure('auto');")])
edit('tests/room-portal-effects.test.mjs',[("effects.update(.3,0,'low',true,false);","effects.update(.3,0,'auto',true,false);"),("assert.ok(geometry.instanceCount<=8);","assert.equal(geometry.instanceCount,16);"),("{age:2,progress:.5,active:true,interior:true,quality:'low',dt:1/60}","{age:2,progress:.5,active:true,interior:true,quality:'auto',dt:1/60}"),("{age:2.017,progress:.504,active:true,interior:true,quality:'low',dt:1/60}","{age:2.017,progress:.504,active:true,interior:true,quality:'auto',dt:1/60}"),("assert.ok(pass.uniforms.uSamples.value<=6);","assert.equal(pass.uniforms.uSamples.value,9);"),("settings:{quality:'low'},reduced:{matches:false},optics","settings:{quality:'auto'},reduced:{matches:false},optics")])
edit('tests/room-portal-return.test.mjs',[(" const f=fixture();assert.equal(typeof f.portal.returnToShowroom,'function');f.portal.returnToShowroom(2,()=>{});const pass=f.portal.shutter;pass.setSize(960,640);"," const f=fixture();f.view.settings.quality='auto';assert.equal(typeof f.portal.returnToShowroom,'function');f.portal.returnToShowroom(2,()=>{});const pass=f.portal.shutter;pass.setSize(960,640);")])
print('Updated former Low-effect contracts to Medium; added strict Low regression coverage')
