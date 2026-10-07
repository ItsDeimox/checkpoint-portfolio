"""Load real on-disk modules/shaders/assets without requiring network navigation.
Only transport changes: Blob module imports and local payload-backed fetch/images.
No shader, renderer, frame, or interaction assertion is substituted.
BRAAZA_TEST_URL selects direct HTTP validation when browser policy permits it.
"""
import os,base64
from pathlib import Path
ROOT=Path(os.environ.get('BRAAZA_ROOT',Path(__file__).resolve().parents[1]))
def load(page):
    url=os.environ.get('BRAAZA_TEST_URL')
    if url:
        page.goto(url+'?debug&reference',wait_until='load',timeout=120000)
    else:
        html=(ROOT/'index.html').read_text().replace('<script type="module" src="src/main.js"></script>','')
        html=html.replace('<head>','<head><base href="https://braaza-test.invalid/">').replace('<link rel="stylesheet" href="src/style.css">','<style>'+(ROOT/'src/style.css').read_text()+'</style>')
        html=html.replace('assets/mark.svg','data:image/svg+xml;base64,'+base64.b64encode((ROOT/'assets/mark.svg').read_bytes()).decode())
        page.set_content(html)
        sources={str(p.relative_to(ROOT)):p.read_text() for p in (ROOT/'src').rglob('*.js')}
        shaders={str(p.relative_to(ROOT)):p.read_text() for p in (ROOT/'src/glsl').rglob('*') if p.is_file()}
        assets={str(p.relative_to(ROOT)):base64.b64encode(p.read_bytes()).decode() for p in (ROOT/'assets').rglob('*') if p.is_file()}
        page.evaluate(r'''async ({sources,shaders,assets})=>{
          window.__TEST__=true;
          const assetUrls={};for(const [name,encoded] of Object.entries(assets)){const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));assetUrls[name]=URL.createObjectURL(new Blob([bytes],{type:name.endsWith('.webp')?'image/webp':name.endsWith('.svg')?'image/svg+xml':'application/octet-stream'}));}
          const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{...descriptor,set(value){const path=String(value).replace('https://braaza-test.invalid/','');descriptor.set.call(this,assetUrls[path]||value);}});
          const nativeFetch=window.fetch;window.fetch=async(input,options)=>{const u=new URL(String(input),document.baseURI),path=u.pathname.slice(1);if(u.origin==='https://braaza-test.invalid'&&path in assets)return nativeFetch(assetUrls[path],options);if(u.origin==='https://braaza-test.invalid'&&path in shaders)return new Response(shaders[path],{status:200,headers:{'Content-Type':'text/plain'}});return nativeFetch(input,options);};
          const urls={},active=new Set(),resolve=(from,to)=>{const parts=from.split('/');parts.pop();for(const part of to.split('/')){if(part==='..')parts.pop();else if(part!=='.')parts.push(part);}return parts.join('/');};
          const build=name=>{if(urls[name])return urls[name];if(active.has(name)||!(name in sources))throw Error('Unresolvable module '+name);active.add(name);let text=sources[name].replace(/from\s+['"](\.[^'"]+)['"]/g,(_,id)=>'from '+JSON.stringify(build(resolve(name,id))));text=text.replaceAll('import.meta.url',JSON.stringify(new URL(name,document.baseURI).href));urls[name]=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));active.delete(name);return urls[name];};
          await import(build('src/main.js'));
        }''',{'sources':sources,'shaders':shaders,'assets':assets})
    page.wait_for_function('window.__BRAAZA__||!document.querySelector("#fallback").hidden',polling=100,timeout=120000)
