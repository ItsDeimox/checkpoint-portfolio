"""Read actual render targets; no assertion that a build proves graphics correctness."""
import json,os
from playwright.sync_api import sync_playwright
from support import load,ROOT
checks=[]
def check(name,ok,detail=None):
 checks.append(dict(name=name,passed=bool(ok),detail=detail));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1100,'height':740});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));load(page);page.wait_for_timeout(500)
 check('WebGL2 initialized',page.evaluate('!!window.__BRAAZA__'))
 f=page.evaluate('window.__BRAAZA__.inspect()');check('HDR media target enabled',f.get('artHdr',False))
 check('separate glass transmission target enabled',f.get('glassTransmission',False))
 stats=page.evaluate('''()=>{const f=window.__BRAAZA__.get(),g=f.gl;f.paused=true;f.render();const targets=[f.sceneTarget,...f.blooms.flat(),f.behindTarget].filter(Boolean);return targets.map(t=>{f.setTarget(t);let a=new Float32Array(t.w*t.h*4);g.readPixels(0,0,t.w,t.h,g.RGBA,g.FLOAT,a);let bad=0,max=0;for(let i=0;i<a.length;i+=4)for(let c=0;c<3;c++){if(!Number.isFinite(a[i+c])||a[i+c]<-.001)bad++;max=Math.max(max,a[i+c]);}return {bad,max};});}''')
 check('all scene, transmission and bloom texels finite and nonnegative',all(t['bad']==0 for t in stats),stats)
 check('HDR peak controlled below 40',max(t['max'] for t in stats)<40)
 preview=page.evaluate('''()=>{const f=window.__BRAAZA__.get(),g=f.gl,t=f.cards[0].demoTarget;f.setTarget(t);const a=f.artHdr?new Float32Array(t.w*t.h*4):new Uint8Array(t.w*t.h*4);g.readPixels(0,0,t.w,t.h,g.RGBA,f.artHdr?g.FLOAT:g.UNSIGNED_BYTE,a);let peak=0;for(let i=0;i<a.length;i+=4)peak=Math.max(peak,a[i],a[i+1],a[i+2]);return {peak:f.artHdr?peak:peak/255,error:g.getError()};}''')
 check('media retains emissive highlight above display white',preview['peak']>1.01,preview)
 check('popup preview supports HDR readback',page.evaluate('window.__BRAAZA__.get().preview(0).startsWith("data:image/png") && window.__BRAAZA__.get().gl.getError()===0'))
 if f.get('artHdr'):
  flame=page.evaluate('''()=>{const f=window.__BRAAZA__.get(),g=f.gl,t=f.cards[0].demoTarget,I=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);function sample(time){f.setTarget(t);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);f.programs.flame.use({uModel:I,uVP:I,uTime:time,uSeed:3,uOpacity:1});f.draw(f.meshes.plane);const a=new Float32Array(t.w*t.h*4);g.readPixels(0,0,t.w,t.h,g.RGBA,g.FLOAT,a);let bad=0,lit=0,edge=0,peak=0,hash=0;for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++){const i=(y*t.w+x)*4;for(let c=0;c<4;c++)if(!Number.isFinite(a[i+c])||a[i+c]<0)bad++;if(a[i+3]>.04)lit++;peak=Math.max(peak,a[i]);if(x<2||x>=t.w-2||y<2||y>=t.h-2)edge=Math.max(edge,a[i+3]);hash+=a[i]*(x%19+1);}return{bad,coverage:lit/(t.w*t.h),edge,peak,hash};}return [sample(1),sample(2)];}''')
  check('Perlin fire evolves between frames',abs(flame[0]['hash']-flame[1]['hash'])>1,flame)
  check('fire sheets fade to transparent borders',all(t['edge']<.035 for t in flame))
  check('fire silhouette has tongues, not a filled rectangle',all(.06<t['coverage']<.65 for t in flame))
  check('fire shader produces only finite positive values',all(t['bad']==0 for t in flame))
 check('no WebGL errors',page.evaluate('window.__BRAAZA__.get().gl.getError()')==0)
 check('no JavaScript errors',not errors,errors)
 b.close()
(ROOT/'docs'/os.getenv('REPORT','render.json')).write_text(json.dumps(checks,indent=2));raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
