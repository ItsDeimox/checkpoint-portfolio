from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/styles-mobile.css';s=p.read_text();a='    display: grid;\n    grid-template-columns: repeat(2, minmax(0, 1fr));';b='    display: grid;\n    align-items: stretch;\n    grid-template-columns: repeat(2, minmax(0, 1fr));';assert s.count(a)==2;s=s.replace(a,b,1);p.write_text(s)
p=root/'tests/mobile-r35-browser.cjs';s=p.read_text();a="async function imageReady(selector='[data-project-stage] img'){await page.locator(selector).evaluate(async i=>{await i.decode();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}"
b="""async function imageReady(selector='[data-project-stage] img'){
 // Selection changes before its async preloader replaces the main image.
 // Wait for the selected source, then decode and presentation frames.
 await page.waitForFunction(selector=>{
  const i=document.querySelector(selector);
  if(!i||!i.complete||i.naturalWidth===0)return false;
  if(selector==='[data-gallery-main]'){
   const selected=document.querySelector('[data-gallery-select][aria-pressed=\"true\"] img');
   if(selected&&i.src!==selected.src)return false;
  }
  return true;
 },selector);
 await page.locator(selector).evaluate(async i=>{
  await i.decode();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 });
}"""
assert s.count(a)==1;s=s.replace(a,b)
s=s.replace('[[320,568],[360,740],[390,844],[430,932],[768,1024],[844,390]]','[[320,568],[360,740],[390,844],[430,932],[768,1024],[844,390],[568,320]]')
p.write_text(s)
