const fs=require('node:fs'),{execFileSync}=require('node:child_process');
function replaceOnce(source,from,to){if(source.split(from).length!==2)throw Error('QA anchor changed: '+from);return source.replace(from,to);}
let gpu=fs.readFileSync('tests/hover-gpu-browser.cjs','utf8');
const extra=`
const propagation=[],frames=[];
function renderPixels(){renderer.setRenderTarget(target);renderer.render(probeScene,orthographic);renderer.readRenderTargetPixels(target,0,0,256,256,buffer);}
function footprint(baseline,span){
 let total=0,moment=0,outside=0;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const k=(y*256+x)*4,energy=Math.max(0,buffer[k]+buffer[k+1]+buffer[k+2]-baseline[k]-baseline[k+1]-baseline[k+2]);
  const dx=((x+.5)/256-.5)*span[0],dy=((y+.5)/256-.5)*span[1],r2=dx*dx+dy*dy;
  total+=energy;moment+=energy*r2;if(r2>.045)outside+=energy;
 }
 return {radius:Math.sqrt(moment/Math.max(1,total)),outside,total};
}
for(let index=0;index<5;index++){
 view.panelEnergy.clear();view.hoverPanel=index;view.identity.update(0,true);quad.material=panels[index].material;
 renderPixels();const baseline=buffer.slice(),entry=view.panelEnergy.entries[index];
 view.panelEnergy.point(index,new T.Vector2(.5,.5),100);view.panelEnergy.release();view.panelEnergy.update(1/60);
 renderPixels();const early=footprint(baseline,entry.field.span),impulses=entry.field.impulses;
 for(let i=0;i<36;i++)view.panelEnergy.update(1/60);
 renderPixels();const later=footprint(baseline,entry.field.span);
 propagation.push({index,early,later,impulses:entry.field.impulses,pass:later.radius>early.radius*1.3&&later.outside>early.outside+100&&entry.field.impulses===impulses});
 renderer.setRenderTarget(null);renderer.render(probeScene,orthographic);
 frames.push({name:'propagation-card-'+index+'.png',data:renderer.domElement.toDataURL('image/png')});
}
`;
gpu=replaceOnce(gpu,'const g=Object.create(DestinationGraphics.prototype);',extra+'\nconst g=Object.create(DestinationGraphics.prototype);');
gpu=replaceOnce(gpu,'return {orientation:results,cta:levels,','return {propagation,frames,orientation:results,cta:levels,');
gpu=replaceOnce(gpu,'});await page.screenshot(',"});for(const frame of result.frames)fs.writeFileSync(path.join(out,frame.name),Buffer.from(frame.data.split(',')[1],'base64'));delete result.frames;await page.screenshot(");
gpu=replaceOnce(gpu,'if(!result.allOriented||','if(!result.propagation.every(x=>x.pass)||!result.allOriented||');
fs.writeFileSync('tests/.propagation-gpu.cjs',gpu);
execFileSync(process.execPath,['tests/.propagation-gpu.cjs'],{stdio:'inherit'});
// Run the existing native suite's first destination without altering input,
// RAF, camera or simulation. Quality and unrelated pages are outside this edit.
let native=fs.readFileSync('tests/stability-browser.cjs','utf8');
native=replaceOnce(native,'for(let i=0;i<6;i++){','for(let i=0;i<0;i++){');
native=replaceOnce(native,'for(const index of[0,1,2,3,4]){','for(const index of[0]){');
native=replaceOnce(native,"   await phase('entry-'+index);","   await page.screenshot({path:path.join(out,'native-card-hover.png')});\n   await phase('entry-'+index);");
const start=native.indexOf("  await phase('resolution-quality');"),end=native.indexOf("  await phase('reduced-motion');",start);
if(start<0||end<start)throw Error('Native subset boundary changed');
native=native.slice(0,start)+native.slice(end);
fs.writeFileSync('tests/.propagation-native.cjs',native);
execFileSync(process.execPath,['tests/.propagation-native.cjs'],{stdio:'inherit'});
