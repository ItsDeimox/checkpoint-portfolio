const fs=require('fs'),{createHash}=require('crypto'),{chromium}=require('playwright');
const base='https://dxrkths.vercel.app/',expected='7ee85756dbf07a98cfe3213775c66d83503376f6';
(async()=>{
 const info=await(await fetch(base+'build-info.json?verify='+expected)).json();
 if(info.commit!==expected)throw Error('Unexpected live commit: '+info.commit);
 const tested=JSON.parse(fs.readFileSync('dxrkths/docs/r20/tested-build.json','utf8')),mismatch=[];
 await Promise.all(Object.entries(tested.files).map(async([path,hash])=>{const r=await fetch(base+path+'?verify='+expected),b=Buffer.from(await r.arrayBuffer());if(!r.ok||info.files[path]!==hash||createHash('sha256').update(b).digest('hex')!==hash)mismatch.push(path);}));
 if(mismatch.length)throw Error('Published bytes differ: '+mismatch.join(', '));
 console.log('VERIFIED FILES',Object.keys(tested.files).length);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),p=await browser.newPage({viewport:{width:600,height:480}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>localStorage.setItem('dxt-settings',JSON.stringify({quality:'low',qualityPreference:'manual'})));
 try{
 await p.goto(base+'?debug',{waitUntil:'load',timeout:30000});await p.locator('#intro-enter').click();await p.waitForFunction(()=>__DXT__.inspect().phase==='ready'&&!document.body.classList.contains('intro-pending'),null,{polling:100,timeout:60000});
 await p.evaluate(()=>{window.__samples=[];window.__capture=true;const tick=()=>{if(!__capture)return;const r=document.querySelector('#room-section-page'),b=r.getBoundingClientRect();__samples.push({width:b.width,opacity:+getComputedStyle(r).opacity,hidden:r.hidden,host:document.querySelector('.room-hero').hidden,preview:r.dataset.portalArrival});requestAnimationFrame(tick);};tick();});
 await p.locator('header [data-open-panel="3"]').click();await p.waitForFunction(()=>__DXT__.inspect().section.active&&location.pathname==='/about',null,{polling:100,timeout:100000});
 const samples=await p.evaluate(()=>{__capture=false;return __samples;}),small=samples.find(f=>f.preview==='preview'&&!f.hidden&&f.opacity===1&&f.width>15&&f.width<160),large=samples.find(f=>f.preview==='preview'&&!f.hidden&&f.width>450);
 if(!small||!large||samples.some(f=>f.host&&(f.hidden||f.opacity<.999))||errors.length)throw Error('Live transition did not satisfy physical zoom invariants');
 const result={commit:info.commit,version:info.version,verifiedFiles:Object.keys(tested.files).length,mismatches:mismatch,browser:browser.version(),smallDestination:small,nearDestination:large,samples:samples.length,errors};
 fs.writeFileSync('dxrkths/docs/r20/live-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exit(1);});
