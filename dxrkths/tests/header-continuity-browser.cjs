const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const base=process.env.DXT_BASE_URL||'http://127.0.0.1:3000',out=path.resolve('previews/header-r18');fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[];const check=(name,ok,detail)=>{checks.push({name,pass:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name);if(!ok)throw Error(name+' '+JSON.stringify(detail));};
const args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
(async()=>{
 const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars'],args}),page=await browser.newPage({viewport:{width:900,height:650}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('dxt-settings',JSON.stringify({quality:'low',qualityPreference:'manual'}));
  window.headerSample=()=>{const selectors=['#header','.room-brand-logo','.room-brand-roles','.room-header-nav','#quality','.dxt-persistent-brand'];const boxes={};for(const s of selectors){const e=document.querySelector(s);if(e){const r=e.getBoundingClientRect();boxes[s]=[r.x,r.y,r.width,r.height];}}return {t:performance.now(),classes:document.body.className,path:location.pathname,boxes,opacity:document.querySelector('#header')?getComputedStyle(document.querySelector('#header'),'::before').opacity:'0'};};
  window.startHeaderTrace=()=>{window.trace=[];window.captureHeader=true;const tick=()=>{if(!window.captureHeader)return;window.trace.push(headerSample());requestAnimationFrame(tick);};tick();};
  window.stopHeaderTrace=()=>{window.captureHeader=false;return window.trace;};
 });
 await page.goto(base+'/berserk?debug',{waitUntil:'load'});await page.locator('#intro-enter').click();await page.waitForFunction(()=>!document.body.classList.contains('intro-pending')&&__DXT__.inspect().brand?.ready,null,{polling:100,timeout:60000});await page.waitForTimeout(600);
 check('internal logo is one real home link with its original arrow and spin',await page.locator('#brand-spin').evaluate(e=>e.tagName==='A'&&e.pathname==='/'&&e.hasAttribute('data-return-showroom')&&e.hasAttribute('data-spin-logo')&&e.querySelector('.room-brand-arrow')?.tagName==='SPAN'));
 check('direct section does not render a hidden showroom',await page.evaluate(()=>__DXT__.inspect().scene===null));
 const stable=(trace,label)=>{
  const first=trace[0].boxes,delta={};for(const s of Object.keys(first)){delta[s]=Math.max(...trace.map(f=>Math.max(...first[s].map((x,i)=>Math.abs((f.boxes[s]||first[s])[i]-x)))));}
  check(label+' has no coordinate or size jump',Object.values(delta).every(x=>x<.1),delta);return delta;
 };
 const records={};
 const fade=await page.evaluate(async()=>{const header=document.querySelector('#header'),a=[];document.body.classList.remove('section-active');await new Promise(r=>setTimeout(r,650));document.body.classList.add('section-active');for(let i=0;i<35;i++){await new Promise(r=>requestAnimationFrame(r));a.push(+getComputedStyle(header,'::before').opacity);}return a;});
 check('background traverses intermediate opacity without moving controls',fade.some(x=>x>0&&x<1)&&fade.at(-1)===1,fade);

 for(const [width,height]of[[1440,900],[1280,800],[390,844],[320,640],[900,500]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const samples=await page.evaluate(async()=>{const initial=headerSample();document.body.classList.remove('section-active');await new Promise(r=>requestAnimationFrame(r));const room=headerSample();document.body.classList.add('section-active');await new Promise(r=>requestAnimationFrame(r));return[initial,room,headerSample()];});
  stable(samples,'shared layout '+width+'x'+height);
  check('preserved floating control origin '+width,samples[0].boxes['#header'][1]>0&&samples[0].boxes['#header'][0]>0,samples[0].boxes['#header']);
  check('no new rectangle/border/blur '+width,await page.locator('#header').evaluate(e=>{const s=getComputedStyle(e);return s.borderBottomWidth==='0px'&&s.boxShadow==='none'&&s.backdropFilter==='none'&&s.backgroundImage==='none';}));
  check('top protection extends to viewport without affecting hit targets '+width,await page.locator('#header').evaluate(e=>{const s=getComputedStyle(e,'::before');return s.position==='fixed'&&s.top==='0px'&&s.left==='0px'&&s.right==='0px'&&s.pointerEvents==='none'&&s.transitionProperty==='opacity';}));
  check('no horizontal overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'restored-desktop.png')});
 await page.evaluate(()=>scrollTo(0,420));await page.waitForTimeout(150);const scrolled=await page.evaluate(()=>headerSample());await page.screenshot({path:path.join(out,'scrolled-desktop.png')});
 check('scroll does not move fixed controls',scrolled.boxes['#header'][1]===Math.max(900*.0325,0));
 await page.setViewportSize({width:600,height:480});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);
 await page.evaluate(()=>{window.brandNode=document.querySelector('.dxt-persistent-brand');startHeaderTrace();});
 await page.locator('#brand-spin').click();
 check('one click starts spin and return together',await page.evaluate(()=>location.pathname==='/'&&__DXT__.inspect().section.returning&&__DXT__.inspect().brand.spinning));
 await page.waitForFunction(()=>!__DXT__.inspect().section.returning&&__DXT__.inspect().scene?.ready,null,{polling:150,timeout:120000});await page.waitForTimeout(500);
 records.returnDirect=await page.evaluate(()=>stopHeaderTrace());stable(records.returnDirect,'full reverse journey');
 check('the same 3D logo canvas survives navigation',await page.evaluate(()=>brandNode===document.querySelector('.dxt-persistent-brand')));
 await page.waitForFunction(()=>!__DXT__.inspect().brand.spinning,null,{polling:100,timeout:60000});
 check('spin completes at the original orientation',await page.evaluate(()=>Math.abs(__DXT__.inspect().brand.angle)<1e-4));
 await page.evaluate(()=>startHeaderTrace());await page.locator('header [data-open-panel="3"]').click();
 const monitor=setInterval(async()=>{try{const d=await page.evaluate(()=>__DXT__.inspect());console.log('ENTER STATE',JSON.stringify({phase:d.phase,index:d.selectedPanel,section:d.section,portal:d.scene?.portal,frames:d.scene?.frames}));}catch{}},10000);
 try{await page.waitForFunction(()=>document.body.classList.contains('section-active')&&location.pathname==='/about',null,{polling:150,timeout:120000});}finally{clearInterval(monitor);}await page.waitForTimeout(600);
 records.enter=await page.evaluate(()=>stopHeaderTrace());stable(records.enter,'full incoming portal journey');
 check('incoming page settles with its soft top protection enabled',+records.enter.at(-1).opacity===1);
 check('About content was not redesigned',await page.locator('.section-dxt-wall img').getAttribute('src')==='/assets/images/pattern-dark.webp');
 await page.locator('a[data-section-route="0"]').click();await page.waitForTimeout(500);const y=await page.evaluate(()=>scrollY);
 await page.locator('[data-gallery-select="2"]').click();await page.waitForFunction(()=>document.querySelector('[data-gallery-main]').src.endsWith('/game-3.webp'),null,{polling:100});check('Berserk gallery still works',true);
 check('Play retains its exact destination',await page.locator('.berserk-play-button').getAttribute('href')==='https://www.roblox.com/pt/games/136449173422746/BERSERK-DRIFT-X-WIP');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,240));await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'mobile.png')});
 await page.setViewportSize({width:600,height:480});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(250);
 await page.locator('#brand-spin').focus();await page.keyboard.press('Enter');check('keyboard Enter also spins and returns',await page.evaluate(()=>location.pathname==='/'&&__DXT__.inspect().brand.spinning));
 // Cancel the already-tested trip so reduced-motion/fallback checks do not compete with software rendering.
 await page.keyboard.press('Escape');await page.close();
 const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/.test(kind)?null:original.call(this,kind,...args);};});
 await fallback.goto(base+'/berserk?debug');await fallback.locator('#intro-enter').click();await fallback.waitForTimeout(700);await fallback.locator('#brand-spin').click();await fallback.waitForFunction(()=>location.pathname==='/'&&!document.body.classList.contains('section-active'),null,{polling:100,timeout:15000});check('native home navigation does not depend on WebGL',true);
 check('no JavaScript errors',errors.length===0,errors);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({browser:browser.version(),checks,errors,records},null,2));console.log('TOTAL',checks.length);await browser.close();
})().catch(e=>{console.error(e.stack);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors,error:e.stack},null,2));process.exit(1);});
