"""Freeze real Braaza frames for the scoped visual audit."""
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(os.environ.get('BRAAZA_ROOT', Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(root / 'tests'))
from support import load

out = Path(os.environ.get('BRAAZA_AUDIT_OUT', root / 'previews/audit'))
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=False, args=['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'])
    for label, width, height in [('desktop', 1440, 900), ('mobile', 390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
        page.evaluate('window.requestAnimationFrame=()=>0')
        load(page)
        page.wait_for_function("getComputedStyle(document.querySelector('#loader')).opacity==='0'", polling=50)
        page.evaluate('''()=>{const f=window.__BRAAZA__.get();f.paused=true;f.time=3;f.clear();f.motion.reset();f.update(0);f.render();}''')
        page.screenshot(path=str(out / f'{label}.png'))
        if label == 'desktop':
            page.evaluate('''()=>{const f=window.__BRAAZA__.get();f.quality='low';f.render();}''')
            page.screenshot(path=str(out / 'desktop-no-dof.png'))
            page.evaluate('''()=>{const f=window.__BRAAZA__.get();f.quality='auto';f.hover=1;f.cards[1].pointer=[.5,.035];f.cards[1].hover=1;f.update(0);f.render();}''')
            page.screenshot(path=str(out / 'hover-lower.png'))
            page.evaluate('''()=>{const f=window.__BRAAZA__.get();f.cards[1].pointer=[.5,.965];f.update(0);f.render();}''')
            page.screenshot(path=str(out / 'hover-upper.png'))
        print(label, page.evaluate('window.__BRAAZA__.inspect()'), flush=True)
        page.close()
    browser.close()
