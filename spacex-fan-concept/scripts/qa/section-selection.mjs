import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import binary from '@sparticuz/chromium';
import sharp from 'sharp';

const mobile=process.env.SCREEN==='touch';
const tier=process.env.TIER||(mobile?'low':'high');
const viewport=mobile?{width:390,height:844}:{width:1366,height:768};
const output=process.env.SECTION_IMAGES;
if(output)await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||await binary.executablePath(),args:[...binary.args,'--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport,hasTouch:mobile,reducedMotion:process.env.MOTION==='normal'?'no-preference':'reduce'});
 page.setDefaultTimeout(60000);
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const press=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
 const settled=()=>page.waitForFunction(()=>!__SPACEX_QA__.stats().transition&&!__SPACEX_QA__.stats().retiring);
 async function pick(part,point){
  const {x,y}=point??await page.evaluate(k=>__SPACEX_QA__.point(k),part);
  assert.equal(await page.evaluate(([x,y])=>document.elementFromPoint(x,y)?.id,[x,y]),'viewer','model must be reachable from the viewport');
  if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
  await page.waitForFunction(k=>__SPACEX_QA__.state().part===k,part,{timeout:12000});
  await settled();
 }
 async function capture(name){
  if(!mobile)await page.mouse.move(5,100);
  // Only sample the 3D stage. Titles, selected tabs and other UI are outside this crop.
  const clip=mobile?{x:38,y:90,width:314,height:342}:{x:215,y:68,width:615,height:633};
  const png=await page.screenshot({clip});
  if(output)await writeFile(path.join(output,name+'.png'),png);
  return sharp(png).resize(200,200,{fit:'fill'}).removeAlpha().raw().toBuffer();
 }
 function visiblyDifferent(a,b,label){
  let changed=0;
  for(let i=0;i<a.length;i+=3){
   if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>18)changed++;
  }
  const fraction=changed/(a.length/3);
  assert.ok(fraction>.004,label+' changes too few model pixels: '+fraction);
  console.log(label,(fraction*100).toFixed(1)+'% of stage crop changes');
 }
 async function view(mode){
  await page.waitForFunction(n=>__SPACEX_QA__.stats().internalProgress===n,mode,{timeout:18000});
  return page.evaluate(()=>__SPACEX_QA__.inspection());
 }

 const url=new URL(process.env.BASE_URL||'http://localhost:4173');
 url.searchParams.set('qa','');
 await page.goto(url.href);
 await page.waitForFunction(()=>window.__SPACEX_QA__);
 await page.locator('#loading').waitFor({state:'hidden'});
 await press('.menu-button');await page.selectOption('#quality',tier);await press('#menu-dialog .close-button');
 for(const index of [1,2,3]){
  if(index>1)await press('#next');
  await page.waitForFunction(({index,tier})=>__SPACEX_QA__.state().index===index&&__SPACEX_QA__.assets()[index]==='licensed-'+(tier==='high'?'high':'eco'),{index,tier});
  await settled();
  await pick('tanks');
  const open=await view(1);
  assert.ok(open.internalMeshes>0);
  const tankOpen=await capture(index+'-tanks-open');
  await press('#view-exterior');const tanks=await view(0);
  const tankClosed=await capture(index+'-tanks-assembled');
  visiblyDifferent(tankOpen,tankClosed,index+' tanks open/assembled');
  await press('#view-cutaway');await view(1);
  await press('#parts-nav [data-part="interstage"]');await settled();
  const ring=await view(0);
  const dy=b=>b.max[1]-b.min[1];
  assert.ok(dy(ring.bounds)<dy(tanks.bounds)*.65,'interstage retains a tank-sized body');
  if(index===3){
   const [dx,,dz]=ring.bounds.max.map((v,i)=>v-ring.bounds.min[i]);
   assert.ok(dy(ring.bounds)<2&&Math.max(dx,dz)<2.25,'hot-staging ring contains booster fins or upper-stage shell');
  }
  const stage=await capture(index+'-interstage');
  visiblyDifferent(tankClosed,stage,index+' tanks/interstage');
  await press('#back');await settled();await pick('interstage');
  if(index===3){
   await press('#view-cutaway');await view(1);const inner=await capture(index+'-interstage-open');
   visiblyDifferent(stage,inner,'Starship assembled/open ring');
   await press('#view-exterior');await view(0);
  }
  await press('#back');await settled();
  if(index===2){
   // On the standing Heavy the booster nose flanks the central interstage.
   const nose=await page.evaluate(()=>{
    const qa=__SPACEX_QA__,coupling=qa.point('interstage');
    return {x:coupling.x+.13*(qa.point('tanks').y-qa.point('fairing').y),y:coupling.y};
   });
   await pick('tanks',nose);await view(1);await press('#back');await settled();
   for(const part of ['engines','fairing']){
    await pick(part);const section=await view(0);
    assert.ok(dy(section.bounds)<4.0,part+' retains a whole core');
    await press('#back');await settled();
   }
  }
  console.log('PASS',index,tier,mobile?'touch':'mouse');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
