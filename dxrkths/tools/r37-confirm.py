from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(file,old,new):
 p=root/file;s=p.read_text();assert s.count(old)==1,(file,s.count(old));p.write_text(s.replace(old,new))
edit('src/scene/room-scene.js','if (!this.panelLinks || this.settings.mobileDevice || this.width<=740) return;','if (!this.panelLinks || this.width<=740 || (this.settings.mobileDevice && this.width<=1024)) return;')
edit('tests/low-mobile-r37.test.mjs','const view={settings:{mobileDevice:true},panelLinks:[{}]','const view={settings:{mobileDevice:true},width:390,panelLinks:[{}]')
p=root/'tests/low-mobile-r37.test.mjs';p.write_text(p.read_text()+'''
test('large touch viewports retain projected navigation outside the mobile dock breakpoint',()=>{
 const camera=new T.PerspectiveCamera(45,1366/1024,.1,100);camera.position.z=5;camera.updateMatrixWorld();
 const view={settings:{mobileDevice:true},width:1366,height:1024,camera,panelLinks:[{style:{}}],panels:[{corners:[new T.Vector3(-1,1,0),new T.Vector3(1,1,0),new T.Vector3(1,-1,0),new T.Vector3(-1,-1,0)]}]};
 HeroScene.prototype.updateLinkProjection.call(view);
 assert.ok(parseFloat(view.panelLinks[0].style.width)>0);assert.match(view.panelLinks[0].style.clipPath,/^polygon\\(/);
});
''')
p=root/'tests/mobile-r35-browser.cjs';s=p.read_text();a=s.index("async function imageReady(");b=s.index('async function swipe(',a);assert a>=0 and b>a
replacement='''async function imageReady(selector='[data-project-stage] img'){
 // Decode can be aborted when SectionMedia commits even the same selected URL.
 // Validate identity, decode and presentation atomically; a genuinely broken
 // image still fails the bounded wait rather than being treated as a pass.
 await page.waitForFunction(async selector=>{
  const image=document.querySelector(selector);
  if(!image||!image.complete||!image.naturalWidth)return false;
  const source=image.src;
  const selected=selector==='[data-gallery-main]'?document.querySelector('[data-gallery-select][aria-pressed="true"] img'):null;
  if(selected&&source!==selected.src)return false;
  try{await image.decode();}catch{return false;}
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return image.isConnected&&image.src===source&&image.complete&&image.naturalWidth>0&&(!selected||image.src===selected.src);
 },selector,{timeout:15000});
}
'''
p.write_text(s[:a]+replacement+s[b:])
print('Scoped invisible-target bypass to actual mobile CSS breakpoints and fixed decode test race')
