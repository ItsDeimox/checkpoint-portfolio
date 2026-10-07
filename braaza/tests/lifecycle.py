"""Real context restoration, texture lifetime, optical history and 8-bit compatibility."""
import json,sys,os
from playwright.sync_api import sync_playwright
from support import ROOT,load
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'pass':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name+' '+json.dumps(detail),flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('BRAAZA_CHROMIUM','/usr/bin/chromium'),headless=False,args=['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':900,'height':600});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.evaluate('window.requestAnimationFrame=()=>0');load(page)
 page.evaluate('__BRAAZA__.get().frozenQuality=true')
 states=page.evaluate('''()=>{const f=__BRAAZA__.get(),g=f.gl,create=g.createTexture.bind(g),del=g.deleteTexture.bind(g),live=new Set();g.createTexture=()=>{const t=create();live.add(t);return t;};g.deleteTexture=t=>{live.delete(t);return del(t);};window.__textureLife=live;const result=[];for(const name of['low','high','auto','low','high','auto']){f.quality=name;f.resize();result.push({name,bytes:f.pool.bytes+f.mediaPool.bytes,live:live.size,targets:f.targets.length,error:g.getError()});}return result;}''')
 check('quality reallocations keep constant live-texture count',len(set(s['live'] for s in states))==1,states)
 check('reallocations stay within attachment budget and GL0',all(s['bytes']<192*1024**2 and s['error']==0 for s in states))
 motion=page.evaluate('''()=>{const f=__BRAAZA__.get(),g=f.gl;f.paused=false;f.motion.reset();f.update(0);f.render();f.motion.advance(.7);f.update(.04);f.render();f.setTarget(f.velocityTarget);const a=new Float32Array(f.velocityTarget.w*f.velocityTarget.h*4);g.readPixels(0,0,f.velocityTarget.w,f.velocityTarget.h,g.RGBA,g.FLOAT,a);let nonzero=0,maximum=0;for(let i=0;i<a.length;i+=4){const m=Math.hypot(a[i],a[i+1]);if(m>1e-5)nonzero++;maximum=Math.max(maximum,m);}const valid=f.historyValid;f.motion.reset();f.update(0);const reset=!f.historyValid;f.render();return{nonzero,maximum,valid,reset,error:g.getError()};}''')
 check('independent card and chain motion writes velocity',motion['nonzero']>100 and motion['maximum']>1e-4 and motion['valid'],motion)
 check('Home invalidates optical history',motion['reset'] and motion['error']==0)
 page.evaluate('''()=>{window.__oldForge=__BRAAZA__.get();const ext=__oldForge.gl.getExtension('WEBGL_lose_context');ext.loseContext();setTimeout(()=>ext.restoreContext(),250);}''')
 page.wait_for_function('__BRAAZA__.get()!==window.__oldForge&&__BRAAZA__.get().ready===true',polling=50,timeout=120000)
 check('actual context restoration constructs fresh renderer',page.evaluate('!__BRAAZA__.get().contextLost&&!document.querySelector("#scene").hidden&&__BRAAZA__.get().gl.getError()===0'))
 page.evaluate('__BRAAZA__.get().dispose()');check('renderer disposed tracked resize textures',page.evaluate('__textureLife.size')==0,page.evaluate('__textureLife.size'))
 check('no lifecycle JS errors',not errors,errors);page.close()
 # Only extension availability is simulated. Every shader and draw is production code.
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''()=>{window.requestAnimationFrame=()=>0;const real=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(name){return name==='EXT_color_buffer_float'?null:real.call(this,name);};}''');load(page)
 result=page.evaluate('''()=>{const f=__BRAAZA__.get(),g=f.gl;f.frozenQuality=true;f.quality='high';f.resize();f.update(0);f.render();const a=new Uint8Array(f.canvas.width*f.canvas.height*4);g.readPixels(0,0,f.canvas.width,f.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);let lit=0;for(let i=0;i<a.length;i+=4)if(a[i]+a[i+1]+a[i+2]>50)lit++;return{hdr:f.hdr,lit,bytes:f.pool.bytes+f.mediaPool.bytes,error:g.getError()};}''')
 check('8-bit path renders nonempty scene with GL0',not result['hdr'] and result['lit']>1000 and result['error']==0,result)
 check('portrait DPR2 high mode within mobile budget',result['bytes']<72*1024**2)
 check('no 8-bit path JavaScript errors',not errors,errors);b.close()
(ROOT/'docs/verification/lifecycle.json').write_text(json.dumps(checks,indent=2));print('TOTAL',len(checks),'FAILED',sum(not c['pass'] for c in checks),flush=True);sys.exit(0 if all(c['pass'] for c in checks) else 1)
