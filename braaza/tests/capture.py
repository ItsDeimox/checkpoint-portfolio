import os,json,sys,threading,http.server,functools
from pathlib import Path
from playwright.sync_api import sync_playwright
from support import load
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'previews';OUT.mkdir(exist_ok=True)
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT));server=http.server.ThreadingHTTPServer(('127.0.0.1',5192),handler);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':int(os.environ.get('WIDTH',1672)),'height':int(os.environ.get('HEIGHT',941))},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:print(m.type,m.text,flush=True) if m.type in ['error','warning'] else None)
 page.evaluate('window.requestAnimationFrame=()=>0; window.__TEST__=true;')
 load(page)
 print('ERRORS',errors,flush=True)
 if not page.evaluate('!!window.__BRAAZA__'):
  print(page.locator('body').inner_text());page.screenshot(path=str(OUT/'failed.png'));b.close();sys.exit(1)
 page.evaluate('''()=>{const f=__BRAAZA__.get();f.paused=true;f.time=3;f.motion.reset();f.clear();f.update(0);f.render();f.gl.finish();}''')
 page.wait_for_function("getComputedStyle(document.querySelector('#loader')).opacity==='0'",polling=100)
 page.screenshot(path=str(OUT/(os.environ.get('CAPTURE','recovered')+'.png')),timeout=120000)
 print(json.dumps(page.evaluate('__BRAAZA__.inspect()'),indent=2),flush=True);print('GL',page.evaluate('__BRAAZA__.get().gl.getError()'),flush=True)
 b.close();server.shutdown()
