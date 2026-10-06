import json,re,base64,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ORDER=['core','math','shaders','geometry','gl','content','engine','main']
def load(page):
    html=(ROOT/'index.html').read_text().replace('<script type="module" src="src/main.js"></script>','')
    html=html.replace('<link rel="stylesheet" href="src/style.css">','<style>'+(ROOT/'src/style.css').read_text()+'</style>')
    html=html.replace('assets/mark.svg','data:image/svg+xml;base64,'+base64.b64encode((ROOT/'assets/mark.svg').read_bytes()).decode())
    page.set_content(html)
    page.evaluate('window.__TEST__=true')
    sources={n:(ROOT/f'src/{n}.js').read_text() for n in ORDER}
    page.evaluate(r'''async ({sources,order})=>{
      const urls={};
      for(const n of order){const s=sources[n].replace(/from ['"]\.\/([^'"]+)\.js['"]/g,(_,id)=>'from '+JSON.stringify(urls[id]));urls[n]=URL.createObjectURL(new Blob([s],{type:'text/javascript'}));}
      await import(urls.main);
    }''',{'sources':sources,'order':ORDER})
    page.wait_for_function('window.__BRAAZA__ || !document.querySelector("#fallback").hidden',timeout=45000)
