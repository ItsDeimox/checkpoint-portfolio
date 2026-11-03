import {chromium as pw} from 'playwright-core';
import chromium from '@sparticuz/chromium';
import {mkdir} from 'node:fs/promises';
const base=process.env.BASE_URL??'http://localhost:4173/';
const dest=process.env.ANGLE_SWEEP_DIR??'/tmp/spacex-angle-sweep';
await mkdir(dest,{recursive:true});
const b=await pw.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--enable-unsafe-swiftshader'],headless:true});
const p=await b.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});
p.setDefaultTimeout(65000);
try{
 for(const [id,part] of [['falcon-9','tanks'],['falcon-9','fairing'],['falcon-heavy','tanks'],['starship','tanks'],['starship','fairing'],['starship','interstage']]){
  await p.goto(base+'?qa&inside='+id+'/'+part);
  await p.waitForFunction(()=>window.__SPACEX_QA__?.stats()?.internalProgress===1);
  for(const yaw of [0,0.7,1.45,2.3,3.14,4.0,4.75,5.55]){
   await p.evaluate(y=>__SPACEX_QA__.yaw(y),yaw);
   await p.waitForTimeout(90);
   await p.screenshot({path:dest+'/'+id+'-'+part+'-'+yaw.toFixed(2)+'.png'});
  }
  console.log('INSPECTED',id,part);
 }
}finally{await b.close();}
