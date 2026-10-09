const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const base=process.env.DXT_BASE_URL||'http://127.0.0.1:3000',out=path.resolve('previews');fs.mkdirSync(out,{recursive:true});const checks=[],errors=[];
function check(name,pass,detail){checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)throw Error(name+' '+JSON.stringify(detail));}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1648,height:928}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({quality:'low',paused:true})));
 await page.goto(base+'/?debug',{waitUntil:'load'});await page.waitForFunction(()=>window.__DXT__?.cards()?.ready&&__DXT__.scene()?.frames>0,null,{polling:100,timeout:60000});
 await page.waitForFunction(()=>__DXT__.scene().environmentReady,null,{polling:100,timeout:30000});
 check('actual HDR environment loaded into the material lighting',await page.evaluate(()=>__DXT__.scene().environmentReady));
 check('six independent cards share exactly one optical canvas',await page.evaluate(()=>__DXT__.cards().cards.length===6&&document.querySelectorAll('.card-optics').length===1));
 check('card and hero GLSL programs compile and draw without WebGL error',await page.evaluate(()=>__DXT__.cards().gl.getError()===0&&__DXT__.scene().gl.getError()===0));
 check('original car geometry is preserved',await page.evaluate(()=>__DXT__.scene().inspect().carTriangles===109992));
 check('native captions remain above the optical layer',await page.evaluate(()=>{let c=document.querySelector('.face-caption'),r=c.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.perspective-card')!=null}));
 const geometry=await page.evaluate(async()=>{
  const {projectCard}=await import('/src/ui/card-projection.js');const optic=__DXT__.cards();let max=0,projective=true;const corners=[];
  for(const c of optic.cards){projective&&=Math.abs(c.matrix[3])>0.0001&&Math.abs(c.matrix[7])>0.0001;const w=c.face.clientWidth,h=c.face.clientHeight;
   for(const [x,y]of[[0,0],[w,0],[w,h],[0,h]]){const marker=document.createElement('i');Object.assign(marker.style,{position:'absolute',width:'0',height:'0',left:(x-1)+'px',top:(y-1)+'px'});c.face.append(marker);const actual=marker.getBoundingClientRect(),q=projectCard(c.matrix,x-c.size[0]/2,y-c.size[1]/2),expected=[c.viewportCenter[0]+q[0],c.viewportCenter[1]+q[1]];max=Math.max(max,Math.hypot(actual.left-expected[0],actual.top-expected[1]));marker.remove();corners.push(expected);}
  }return{max,projective,corners};
 });check('faces have actual projective foreshortening rather than skew',geometry.projective);check('24 HTML corners match GLSL projection within 2px',geometry.max<2,geometry.max);
 check('hero CTA is visible and clickable above the diagonal band',await page.locator('.hero-actions .primary').evaluate(e=>{const r=e.getBoundingClientRect(),h=e.closest('.hero').getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.bottom<h.bottom-6&&e.contains(hit);}));
 const layout=await page.evaluate(()=>Object.fromEntries(['.hero','.games-band','.projects-band','.biography-strip','.contact-strip'].map(q=>{let r=document.querySelector(q).getBoundingClientRect();return[q,{top:r.top,height:r.height,bottom:r.bottom}]})));
 check('hero occupies the measured reference proportion',layout['.hero'].height>=285&&layout['.hero'].height<=305,layout);
 check('diagonal bands overlap without whitespace gaps',layout['.games-band'].top<layout['.hero'].bottom&&layout['.projects-band'].top<layout['.games-band'].bottom);
 check('biography band is straight as requested',await page.locator('.biography-strip').evaluate(e=>getComputedStyle(e).transform==='none'));
 check('document has no desktop horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 await page.screenshot({path:path.join(out,'desktop-r3-rest.png'),fullPage:true});await page.locator('.hero').screenshot({path:path.join(out,'hero-r3.png')});
 const screen=await page.evaluate(()=>__DXT__.cards().cards[0].viewportCenter);
 await page.mouse.move(screen[0]-80,screen[1]);await page.mouse.move(...screen,{steps:6});
 await page.waitForFunction(()=>__DXT__.cards().cards[0].hover>.90,null,{polling:100,timeout:15000});
 check('hover advances and rotates selected plane',await page.evaluate(()=>{const c=__DXT__.cards().cards[0];return c.hover>.9&&c.matrix[14]>25&&document.querySelector('.card-face').style.transform.startsWith('matrix3d')}));
 check('cursor movement injects finite shader waves',await page.evaluate(()=>__DXT__.cards().cards[0].pulse.some((v,i)=>i%4===3&&v>0)));
 await page.screenshot({path:path.join(out,'desktop-r3-hover.png'),fullPage:true});await page.locator('.games-band').screenshot({path:path.join(out,'cards-r3.png')});
 await page.mouse.move(80,200);await page.waitForFunction(()=>__DXT__.cards().cards.every(c=>c.hover<.003)&&!__DXT__.cards().raf,null,{polling:100,timeout:15000});
 check('hover and illumination settle back to rest',await page.evaluate(()=>__DXT__.cards().cards[0].hover<.003));
 const frames=await page.evaluate(()=>__DXT__.cards().frames);await page.waitForTimeout(300);check('optics sleep after impulses dissipate',await page.evaluate(n=>__DXT__.cards().frames===n,frames));
 await page.locator('.perspective-card').nth(3).focus();await page.waitForFunction(()=>__DXT__.cards().cards[3].hover>.9,null,{polling:100,timeout:15000});check('keyboard focus uses the same 3D response',await page.evaluate(()=>__DXT__.cards().cards[3].hover>.9));
 check('Berserk project destination preserved',await page.locator('.perspective-card').first().getAttribute('href').then(x=>x.includes('136449173422746')));
 await page.locator('header nav a[href="/groups"]').click();check('route change disposes previous optics',await page.evaluate(()=>__DXT__.cards()===null&&document.querySelectorAll('.card-optics').length===0));
 for(const route of['groups','projects','about','contact']){await page.goto(base+'/'+route+'?debug');await page.waitForFunction(()=>window.__DXT__,null,{polling:100,timeout:30000});check(route+' content accessible',await page.locator('h1').isVisible());check(route+' no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 for(const width of[390,320]){
  await page.setViewportSize({width,height:844});await page.goto(base+'/?debug');await page.waitForFunction(()=>__DXT__.cards()?.ready,null,{polling:100,timeout:60000});await page.locator('.games-band').scrollIntoViewIfNeeded();await page.waitForTimeout(350);
  check('phone '+width+' card is readable-sized',await page.locator('.perspective-card').first().evaluate(e=>e.clientWidth>180));check('phone '+width+' has native gallery pan',await page.locator('.perspective-gallery').first().evaluate(e=>getComputedStyle(e).overflowX==='auto'&&e.scrollWidth>e.clientWidth));
  await page.locator('.perspective-gallery').first().evaluate(e=>e.scrollLeft=170);await page.waitForTimeout(450);check('phone '+width+' optics track gallery pan',await page.evaluate(()=>{const c=__DXT__.cards().cards[0],b=c.el.getBoundingClientRect();return Math.abs(c.viewportCenter[0]-(b.left+b.width/2))<2}));
  check('phone '+width+' no document overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,'mobile-r3-'+width+'.png'),fullPage:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);await page.evaluate(()=>__DXT__.cards().wake());await page.waitForFunction(()=>!__DXT__.cards().raf,null,{polling:100,timeout:6000});check('reduced motion avoids perpetual rendering',await page.evaluate(()=>!__DXT__.cards().raf));
 const fallback=await browser.newPage({viewport:{width:1000,height:760}});await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=new Proxy(HTMLCanvasElement.prototype.getContext,{apply(t,el,args){return String(args[0]).includes('webgl')?null:Reflect.apply(t,el,args)}})});await fallback.goto(base+'/?debug');await fallback.waitForTimeout(700);check('WebGL fallback keeps artwork and perspective',await fallback.locator('.surface-image').first().evaluate(e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).opacity!=='0'));check('fallback project links work',await fallback.locator('.perspective-card').first().getAttribute('href').then(x=>x.startsWith('https://')));
 check('no JavaScript or shader errors in tested routes',errors.length===0,errors);
 fs.writeFileSync(path.join(out,'reference-browser.json'),JSON.stringify({browser:browser.version(),checks,errors,layout,geometry},null,2));await browser.close();console.log('TOTAL',checks.length);
})().catch(e=>{console.error(e.stack);fs.writeFileSync(path.join(out,'reference-browser.json'),JSON.stringify({checks,errors,error:e.stack},null,2));process.exit(1)});
