from pathlib import Path
p=Path(__file__).resolve().parents[1]/'tests/mobile-r35-browser.cjs'
s=p.read_text()
a="const y=await page.evaluate(()=>scrollY);await l.tap();await page.waitForTimeout(300);check('project '+i+' opens without page jump',await page.locator('#future-project-dialog').evaluate(e=>e.open)&&Math.abs(await page.evaluate(()=>scrollY)-y)<2);"
b="""const y=await page.evaluate(()=>scrollY),rect=await l.boundingBox();
    // A real finger taps the already-validated visible target. Locator.tap's
    // automatic scrollIntoView can itself reposition the document before the
    // click handler, which would incorrectly blame the modal's scroll lock.
    await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
    await page.waitForTimeout(300);
    const modalState=await page.locator('#future-project-dialog').evaluate(e=>({open:e.open,y:scrollY}));
    check('project '+i+' opens without page jump',modalState.open&&Math.abs(modalState.y-y)<2,{before:y,after:modalState.y,open:modalState.open});"""
assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
