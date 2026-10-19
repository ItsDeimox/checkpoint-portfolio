/** Browser regression for state that a DOM clone alone cannot preserve. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:process.env.DXT_BROWSER_CHANNEL||'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:600,height:400}});
  const base=process.env.DXT_BASE_URL||'http://127.0.0.1:5187';
  await page.route('**/capture-fixture',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><style>
   *{box-sizing:border-box}body{margin:0}section{height:900px;background:#101010;position:relative}
   .track{display:flex;overflow:auto;width:200px;height:100px;position:absolute;top:300px;left:40px}
   .track>div{flex:0 0 200px;height:100px;background:#f00}.track>div+div{background:#0f0}
   .dock{position:fixed;bottom:20px;left:50px;width:100px;height:50px;background:#00f}
   </style><section><div class="track"><div></div><div></div></div><div class="dock"></div></section>`}));
  await page.goto(base+'/capture-fixture');
  const result=await page.evaluate(async()=>{
   const {capturePagePreview}=await import('/src/render/showroom.bundle.js');
   const root=document.querySelector('section'),track=document.querySelector('.track');
   track.scrollLeft=200;scrollTo(0,200);await new Promise(requestAnimationFrame);
   const canvas=await capturePagePreview(root,null,{height:innerHeight,scroll:scrollY});
   const ctx=canvas.getContext('2d'),pixel=(x,y)=>[...ctx.getImageData(x,y,1,1).data];
   const state={slide:pixel(80,140),fixed:pixel(80,350),background:pixel(300,100),scroll:scrollY,slideScroll:track.scrollLeft,
    markers:document.querySelectorAll('[data-dxt-capture]').length,width:canvas.width,height:canvas.height};
   const controller=new AbortController();controller.abort();
   try{await capturePagePreview(root,controller.signal);state.aborted=false;}catch(e){state.aborted=e.name==='AbortError';}
   return state;
  });
  assert.deepEqual(result.slide,[0,255,0,255],'capture must retain the selected horizontally scrolled slide');
  assert.deepEqual(result.fixed,[0,0,255,255],'fixed dock must retain viewport coordinates on a scrolled page');
  assert.deepEqual(result.background,[16,16,16,255]);
  assert.equal(result.scroll,200);assert.equal(result.slideScroll,200);assert.equal(result.markers,0);assert.equal(result.aborted,true);
  assert.equal(result.height,400);assert.ok(result.width*result.height<=3686400);
  console.log('PASS scrolling, fixed dock, bounded viewport, unchanged live page and cancellation',result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
