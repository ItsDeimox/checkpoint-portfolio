const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const base=process.env.DXT_BASE_URL||'http://127.0.0.1:3000',output=path.resolve('previews/editorial');fs.mkdirSync(output,{recursive:true});
const checks=[],errors=[];function check(name,ok,detail){checks.push({name,pass:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name);if(!ok)throw Error(name+' '+JSON.stringify(detail));}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({quality:'low',qualityPreference:'manual'})));
 async function open(route){await page.goto(base+route+'?debug',{waitUntil:'load'});await page.locator('#intro-enter').click();await page.waitForFunction(()=>!document.body.classList.contains('intro-pending'),null,{polling:100,timeout:60000});await page.waitForTimeout(700);}
 await open('/berserk');await page.waitForFunction(()=>__DXT__.inspect().brand?.ready,null,{polling:100,timeout:40000});
 check('direct page preserves the persistent 3D header logo',await page.evaluate(()=>__DXT__.inspect().brand.ready));
 check('direct page does not boot the GPU showroom behind the content',await page.evaluate(()=>__DXT__.inspect().scene===null));
 check('header exposes independent native return arrow and spin button',await page.evaluate(()=>{const b=document.querySelector('#brand-spin'),a=document.querySelector('.room-brand-arrow');return b.tagName==='BUTTON'&&b.hasAttribute('data-spin-logo')&&a.tagName==='A'&&a.pathname==='/'&&a.hasAttribute('data-return-showroom');}));
 check('destination navbar extends to the viewport top',await page.locator('#header').evaluate(e=>{const r=e.getBoundingClientRect();return r.top===0&&r.left===0&&Math.abs(r.width-innerWidth)<1&&getComputedStyle(e).backgroundImage!=='none';}));
 check('Berserk removes the redundant RevLine destination',await page.evaluate(()=>![...document.querySelectorAll('#room-section-page a')].some(a=>a.href.includes('/35542723/'))));
 const play=page.locator('.berserk-play-button');check('Play opens only the supplied Roblox game',await play.evaluate(e=>e.href==='https://www.roblox.com/pt/games/136449173422746/BERSERK-DRIFT-X-WIP'&&e.target==='_blank'&&e.rel.includes('noopener')));
 async function checkDock(name){const b=await play.boundingBox(),v=page.viewportSize();check(name,Math.abs(b.x+b.width/2-v.width/2)<2&&b.y+b.height<=v.height-10&&b.y>v.height-110,{box:b,viewport:v});check(name+' is not covered',await play.evaluate(e=>{let b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}));}
 await checkDock('desktop bottom-centered Play');
 check('right photo is translucent and cannot intercept clicks',await page.locator('.section-photo-backdrop').evaluate(e=>+getComputedStyle(e).opacity<=.22&&getComputedStyle(e).pointerEvents==='none'));
 check('no concept crop is presented as game media',await page.evaluate(()=>!document.querySelector('#room-section-page image[href*="showroom-reference"]')));
 check('all five official game thumbnails load',await page.locator('.game-gallery-thumbs img').evaluateAll(imgs=>imgs.length===5&&imgs.every(i=>i.complete&&i.naturalWidth>0)));
 await page.locator('[data-game-gallery]').scrollIntoViewIfNeeded();
 for(let i=0;i<5;i++){await page.locator(`[data-gallery-select="${i}"]`).click();await page.waitForFunction(i=>document.querySelector('[data-gallery-main]').src.endsWith(`/game-${i+1}.webp`),i,{polling:50,timeout:5000});check('gallery image '+(i+1)+' swaps with one selected thumbnail',await page.evaluate(i=>document.querySelectorAll('[data-gallery-select][aria-pressed="true"]').length===1&&document.querySelector(`[data-gallery-select="${i}"]`).getAttribute('aria-pressed')==='true'&&document.querySelector('[data-gallery-main]').naturalWidth===768,i));}
 await page.locator('[data-gallery-step="1"]').click();await page.waitForFunction(()=>document.querySelector('[data-gallery-main]').src.endsWith('/game-1.webp'),null,{polling:50});check('Next wraps to the first image',true);
 await page.locator('[data-gallery-select="0"]').focus();await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('[data-gallery-main]').src.endsWith('/game-5.webp'),null,{polling:50});check('keyboard End selects and focuses the final image',await page.evaluate(()=>document.activeElement.dataset.gallerySelect==='4'));
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('[data-gallery-main]').src.endsWith('/game-1.webp'),null,{polling:50});check('keyboard gallery navigation wraps and keeps focus',await page.evaluate(()=>document.activeElement.dataset.gallerySelect==='0'));
 await page.locator('[data-gallery-select="2"]').click();await page.locator('[data-gallery-select="4"]').click();await page.locator('[data-gallery-select="1"]').click();await page.waitForFunction(()=>document.querySelector('[data-gallery-main]').src.endsWith('/game-2.webp'),null,{polling:50});check('rapid selection resolves to the last request',true);
 check('no unprovided intro is embedded as a fake trailer',await page.locator('#room-section-page iframe,#room-section-page video').count()===0);
 check('verified V, F and Shift+B controls are readable',await page.locator('.game-controls kbd').allTextContents().then(x=>x.join(',')==='V,F,Shift,B'));
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await checkDock('Play remains centered after scrolling');
 check('footer has enough space above the Play dock',await page.locator('.section-footer').evaluate(e=>e.getBoundingClientRect().top<innerHeight-130));
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'berserk-desktop.png')});
 await page.locator('.game-gallery').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'berserk-gallery.png')});
 await page.locator('a[data-section-route="3"]').click();await page.waitForTimeout(800);
 check('About uses the original black DXT wall',await page.locator('.section-dxt-wall img').evaluate(e=>e.src.endsWith('/pattern-dark.webp')&&e.naturalWidth>0));
 check('About keeps its biography and supplied avatar',await page.locator('.section-personal').textContent().then(t=>t.includes('I’m DXT'))&&await page.locator('.section-avatar').evaluate(e=>e.complete&&e.naturalWidth>0));
 check('Play is absent on non-game sections',await page.locator('.berserk-play-dock').count()===0);await page.screenshot({path:path.join(output,'about-desktop.png')});
 await page.locator('a[data-section-route="1"]').click();await page.waitForTimeout(800);
 check('RevLine button uses the supplied repeating banner',await page.locator('.group-revline .section-group-banner').evaluate(i=>i.src.endsWith('/revline-pattern.webp')&&i.naturalWidth>0));
 check('Frost button uses the supplied mammoth artwork',await page.locator('.group-frost .section-group-banner').evaluate(i=>i.src.endsWith('/frost-card.webp')&&i.naturalWidth>0));
 check('group destination buttons are unique and native external links',await page.locator('.section-group-tile').evaluateAll(es=>es.length===2&&es.every(e=>e.tagName==='A'&&e.target==='_blank'&&e.href.includes('roblox.com'))));
 await page.locator('.section-group-tiles').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'groups-desktop.png')});
 for(const width of[390,320]){await page.setViewportSize({width,height:844});for(const index of[0,3,1,2,4]){await page.locator(`a[data-section-route="${index}"]`).click();await page.waitForTimeout(300);check('section '+index+' has no overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(index===0){check('mobile '+width+' return arrow stays inside the viewport',await page.locator('.room-brand-arrow').evaluate(e=>{const b=e.getBoundingClientRect(),l=document.querySelector('.room-brand-logo').getBoundingClientRect();return b.left>=2&&b.right<=l.left;}));await checkDock('mobile '+width+' Play');check('mobile '+width+' thumbnails retain touch targets',await page.locator('[data-gallery-select]').first().evaluate(e=>e.getBoundingClientRect().height>=44));await page.screenshot({path:path.join(output,`berserk-mobile-${width}.png`),fullPage:true});}if(index===3)await page.screenshot({path:path.join(output,`about-mobile-${width}.png`),fullPage:true});}
 }
 await page.setViewportSize({width:1440,height:960});await page.locator('a[data-section-route="0"]').click();await page.waitForTimeout(300);
 const prior=await page.evaluate(()=>__DXT__.inspect().brand.frames);await page.locator('#quality').click();check('quality refresh preserves arrow and logo spin independently',await page.locator('.room-brand-arrow').getAttribute('data-return-showroom')!==null&&await page.locator('#brand-spin').getAttribute('data-spin-logo')!==null);
 // Software WebGL portal validation uses the low preset at 900px; page layout was tested above at 1440px.
 await page.setViewportSize({width:900,height:650});
 for(let i=0;i<3&&await page.locator('#quality strong').textContent()!=='Low';i++)await page.locator('#quality').click();
 await page.locator('#brand-spin').click();
 check('internal logo still spins without navigating',await page.evaluate(()=>location.pathname==='/berserk'&&__DXT__.inspect().brand.spinning));
 await page.locator('.room-brand-arrow').click();await page.waitForFunction(()=>location.pathname==='/'&&!document.body.classList.contains('section-active')&&!document.body.classList.contains('portal-travelling'),null,{polling:200,timeout:90000});
 check('return arrow completes the existing reverse journey to showroom',await page.evaluate(()=>__DXT__.inspect().selectedPanel===null&&__DXT__.inspect().scene?.ready));
 check('home brand restores spin instead of another return',await page.locator('#brand-spin').getAttribute('data-spin-logo')!==null);
 check('persistent brand survives the return',await page.evaluate(p=>__DXT__.inspect().brand.ready&&__DXT__.inspect().brand.frames>=p,prior));
 await page.locator('#brand-spin').click();check('home logo spin request is still available',await page.evaluate(()=>__DXT__.inspect().brand.spinning));
 // Close the GPU-heavy full showroom before testing the CPU-only fallback.
 await page.close();
 // A second page without GPU verifies native navigation is never dependent on logo readiness.
 const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await fallback.addInitScript(()=>{const f=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:f.call(this,type,...args);};});
 await fallback.goto(base+'/berserk?debug');await fallback.locator('#intro-enter').click();await fallback.waitForTimeout(900);check('no-WebGL still exposes a standalone return arrow',await fallback.locator('.room-brand-arrow').evaluate(e=>e.tagName==='A'&&!e.hasAttribute('disabled')));await fallback.locator('.room-brand-arrow').click();await fallback.waitForFunction(()=>location.pathname==='/',null,{polling:100});check('no-WebGL header logo returns home',true);
 check('no JavaScript errors in the tested flows',errors.length===0,errors);
 fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({browser:browser.version(),renderer:'ANGLE SwiftShader',checks,errors},null,2));await browser.close();console.log('TOTAL',checks.length);
})().catch(e=>{console.error(e.stack);fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({checks,errors,error:e.stack},null,2));process.exit(1);});
