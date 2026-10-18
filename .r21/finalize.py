from pathlib import Path
r=Path('dxrkths');p=r/'src/ui/room-section-routes.js';s=p.read_text()
a='  this.clearArrival(this.page);\n  const token=++this.token,scene=this.getScene();'
b='''  // Preserve the exact visible pose if a direct-page entrance is still
  // settling when Back is pressed. Do not snap that content to its final pose.
  const layout=fromPage&&!immediate?this.root.querySelector('.section-layout'):null;
  const pose=layout?this.document.defaultView?.getComputedStyle?.(layout):null;
  const freeze=pose?{transform:pose.transform,opacity:pose.opacity}:null;
  this.clearArrival(this.page);
  if(layout&&freeze){layout.style.transform=freeze.transform;layout.style.opacity=freeze.opacity;}
  const token=++this.token,scene=this.getScene();'''
if a in s:s=s.replace(a,b)
p.write_text(s)
p=r/'tests/portal-wall-browser.cjs';s=p.read_text()
a="const scroll=await p.evaluate(()=>({y:scrollY,top:document.querySelector('.game-gallery').getBoundingClientRect().top}));await p.evaluate(()=>__WALL__.routes().close());const restored=await p.evaluate(()=>({y:document.querySelector('#room-section-page').scrollTop,top:document.querySelector('.game-gallery').getBoundingClientRect().top}));"
b="const {scroll,restored}=await p.evaluate(()=>{const scroll={y:scrollY,top:document.querySelector('.game-gallery').getBoundingClientRect().top};__WALL__.routes().close();return{scroll,restored:{y:document.querySelector('#room-section-page').scrollTop,top:document.querySelector('.game-gallery').getBoundingClientRect().top}};});"
if a in s:s=s.replace(a,b)
s=s.replace("records.push({index:i,a,b,c,late,end,start,back,away});", "records.push({index:i,a,b,c,late,end,start,back,away});if(i===0)await p.screenshot({path:path.join(out,'return-wall.png')});")
p.write_text(s)
