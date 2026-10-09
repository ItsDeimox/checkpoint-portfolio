/** Run with Playwright installed externally and the site served on DXT_BASE_URL. */
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');
const BASE=process.env.DXT_BASE_URL||'http://127.0.0.1:5186';const OUT=process.env.DXT_TEST_OUT||path.resolve('previews');fs.mkdirSync(OUT,{recursive:true});
const checks=[],errors=[];function check(name,pass,data){checks.push({name,pass:!!pass,data});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)throw Error(name+' '+JSON.stringify(data));}
async function ready(p,type){await p.waitForFunction(t=>__DXT__.inspect().scene?.type===t&&__DXT__.inspect().scene.frames>0,type,{polling:100,timeout:60000});}
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1440,height:950}});p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({quality:'auto',paused:true})));
await p.goto(BASE+'/?debug',{waitUntil:'load'});await ready(p,'artwork-relief');
check('home mounts the actual WebGL2 relief scene',await p.evaluate(()=>__DXT__.scene().gl instanceof WebGL2RenderingContext));
check('hero GLSL compiles without GL errors',await p.evaluate(()=>__DXT__.scene().gl.getError()===0));
check('hero renders a nonempty image',await p.evaluate(()=>{const s=__DXT__.scene();s.frame(performance.now());const g=s.gl,a=new Uint8Array(s.canvas.width*s.canvas.height*4);g.readPixels(0,0,s.canvas.width,s.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);let lit=0;for(let i=0;i<a.length;i+=64)if(a[i]+a[i+1]+a[i+2]>75)lit++;return lit>1000;}));
check('hero art uses the supplied race image and depth map',await p.evaluate(()=>!!__DXT__.scene().image.texture&&!!__DXT__.scene().depth.texture));
check('header and footer retain compact geometry',await p.evaluate(()=>document.querySelector('#header').offsetHeight<90&&document.querySelector('#footer').offsetHeight<90));
check('Berserk CTA points to the exact provided game',await p.locator('.hero-actions a.primary').getAttribute('href')==='https://www.roblox.com/pt/games/136449173422746/BERSERK-DRIFT-X-WIP');
await p.screenshot({path:path.join(OUT,'desktop.png'),fullPage:true});
await p.mouse.move(950,300);await p.mouse.down();await p.mouse.move(1120,330,{steps:8});await p.mouse.up();check('hero drag releases pointer capture',await p.evaluate(()=>!__DXT__.scene().drag.active));
await p.locator('#quality').click();await p.waitForFunction(()=>__DXT__.inspect().settings.quality==='low',null,{polling:100});await p.waitForTimeout(350);
check('low quality stays within its pixel budget',await p.evaluate(()=>{let a=__DXT__.inspect().scene.size;return a[0]*a[1]<=850000;}));
check('quality preference is saved',await p.evaluate(()=>JSON.parse(localStorage.getItem('dxt-settings')).quality==='low'));
await p.locator('#quality').click();await p.waitForTimeout(350);check('high quality is selectable',await p.evaluate(()=>__DXT__.inspect().settings.quality==='high'));
await p.locator('#quality').click();await p.waitForTimeout(250);
for(const r of ['groups','projects','about','contact']){
 await p.locator(`header nav a[href="/${r}"]`).click();await p.waitForFunction(r=>__DXT__.inspect().route===r,r,{polling:100});
 check(r+' navigates to its own route',new URL(p.url()).pathname==='/'+r);
 check(r+' has one active navigation item',await p.locator('nav [aria-current="page"]').count()===1);
 check(r+' has one primary heading',await p.locator('main h1').count()===1);
 check(r+' has no desktop horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(r==='about'){await ready(p,'glb-mesh');check('About renders the original 3D mesh',await p.evaluate(()=>__DXT__.inspect().scene.triangles===3104));check('logo GLSL has no GL errors',await p.evaluate(()=>__DXT__.scene().gl.getError()===0));
 await p.screenshot({path:path.join(OUT,'about.png'),fullPage:true});const box=await p.locator('#logo-canvas').boundingBox();const rotation=await p.evaluate(()=>__DXT__.scene().target[0]);await p.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await p.mouse.down();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.5,{steps:8});await p.mouse.up();check('logo rotates by horizontal dragging',await p.evaluate(r=>Math.abs(__DXT__.scene().target[0]-r)>.2,rotation));await p.locator('#logo-canvas').focus();await p.keyboard.press('ArrowUp');check('3D logo supports keyboard rotation',await p.evaluate(()=>__DXT__.scene().target[1]<.1));
 check('avatar source is local fallback or trusted Roblox CDN',await p.locator('[data-avatar]').evaluate(e=>e.src.includes('/assets/images/avatar.webp')||new URL(e.src).hostname.endsWith('.rbxcdn.com')));
 }
}
check('all provided socials are real clickable links',await p.locator('.contact-row').count()===4);
check('external links use safe target behavior',await p.locator('a[target="_blank"]').evaluateAll(es=>es.every(e=>e.rel.includes('noopener'))));
await p.goBack();await p.waitForFunction(()=>__DXT__.inspect().route==='about',null,{polling:100});check('browser Back restores the previous page',new URL(p.url()).pathname==='/about');
await p.goForward();await p.waitForFunction(()=>__DXT__.inspect().route==='contact',null,{polling:100});check('browser Forward restores contact',new URL(p.url()).pathname==='/contact');
await p.mouse.move(1300,200);await p.waitForTimeout(400);const control=p.locator('.contact-row').first(),box=await control.boundingBox();await p.mouse.move(box.x+120,box.y+35);await p.waitForTimeout(100);const early=await control.evaluate(e=>Number(e.style.getPropertyValue('--glow')));await p.waitForTimeout(500);const late=await control.evaluate(e=>Number(e.style.getPropertyValue('--glow')));check('hover light interpolates instead of snapping',early>0&&early<late&&late>.8,{early,late});
await p.mouse.move(1300,200);await p.waitForTimeout(700);check('hover light fades after leaving',await control.evaluate(e=>Number(e.style.getPropertyValue('--glow'))<.02));
check('no unsupplied email or fictional metrics in pages',await p.evaluate(()=>!document.querySelector('a[href^="mailto:"]')&&!/100K\+|1\.2M\+|50\+ CARS/.test(document.body.innerText)));
for(const [w,h]of[[390,844],[320,640]]){
 await p.setViewportSize({width:w,height:h});for(const r of ['home','groups','projects','about','contact']){
  await p.goto(BASE+(r==='home'?'/':'/'+r)+'?debug',{waitUntil:'load'});await p.waitForFunction(r=>window.__DXT__?.inspect().route===r,r,{polling:100});
  check(r+' fits '+w+'px',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(r==='home'&&w===390){await ready(p,'artwork-relief');await p.screenshot({path:path.join(OUT,'mobile.png'),fullPage:true});}
 }
 await p.locator('.menu-toggle').click();check('mobile menu expands at '+w+'px',await p.locator('.menu-toggle').getAttribute('aria-expanded')==='true');await p.keyboard.press('Escape');check('Escape collapses mobile navigation at '+w+'px',await p.locator('.menu-toggle').getAttribute('aria-expanded')==='false');
}
const rm=await browser.newPage({viewport:{width:900,height:700},reducedMotion:'reduce'});await rm.goto(BASE+'/?debug');await ready(rm,'artwork-relief');await rm.waitForTimeout(600);let frames=await rm.evaluate(()=>__DXT__.inspect().scene.frames);await rm.waitForTimeout(500);check('reduced motion leaves the renderer asleep when idle',await rm.evaluate(n=>__DXT__.inspect().scene.frames===n,frames));await rm.close();
const fallback=await browser.newPage({viewport:{width:390,height:844}});await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...a){return type==='webgl2'?null:get.call(this,type,...a)}});await fallback.goto(BASE+'/?debug');await fallback.waitForTimeout(600);check('no-WebGL fallback keeps original artwork and links',await fallback.locator('.hero-fallback').isVisible()&&await fallback.locator('.hero-actions a').count()===2);await fallback.locator('.menu-toggle').click();await fallback.locator('header nav a[href="/contact"]').click();check('fallback navigation remains functional',await fallback.locator('.contact-row').count()===4);await fallback.close();
check('tested routes/interactions have no JavaScript errors',errors.length===0,errors);
fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({browser:browser.version(),backend:'ANGLE SwiftShader',checks,errors},null,2));await browser.close();console.log('TOTAL',checks.length);
})().catch(e=>{console.error(e.stack);fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({checks,errors,error:e.stack},null,2));process.exit(1)});
