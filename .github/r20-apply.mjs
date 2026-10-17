import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline='fa05cce396ba8639fe471ecbf68c3528e2d3d1a2';
const original=p=>execFileSync('git',['show',baseline+':dxrkths/'+p],{encoding:'utf8',maxBuffer:8000000});
function once(s,a,b){if(s.split(a).length!==2)throw Error('Patch anchor changed: '+a);return s.replace(a,b);}
function save(path,apply){fs.writeFileSync('dxrkths/'+path,apply(original(path)));}
save('src/scene/room-portal.js',s=>{
 s="import {projectPortalExit} from './room-portal-exit.js';\n"+s;
 s=once(s,'portalMix:{value:0},portalReturn:', 'portalMix:{value:0},portalExitDepth:{value:28},portalExitHalf:{value:new T.Vector2(1,1)},portalExitOffset:{value:0},portalReturn:');
 s=once(s,' enter(index,onComplete,onProgress=null){',' enter(index,onComplete,onProgress=null,getArrivalViewport=null){');
 s=once(s,'this.onProgress=onProgress;panel.portalUniforms.portalReturn.value=0;', 'this.onProgress=onProgress;this.getArrivalViewport=getArrivalViewport;panel.portalUniforms.portalReturn.value=0;this.sampleExit();');
 s=once(s,' /** Start behind the doorway and rewind the same camera path and shader clock. */',` sampleExit(){
  if(!this.basis||!this.panel)return null;
  const view=this.view,width=view.width??view.cameraRig.width??900,height=view.height??width/view.camera.aspect;
  const frame=projectPortalExit(view.camera,this.basis,portalTravelPose(this.basis,1),this.getArrivalViewport?.()??{width,height,contentWidth:width});
  if(frame.visible){const u=this.panel.portalUniforms;u.portalExitDepth.value=frame.exitDepth;u.portalExitHalf.value.fromArray(frame.exitHalf);u.portalExitOffset.value=frame.exitOffset;}
  this.exitFrame=frame;return frame;
 }
 /** Start behind the doorway and rewind the same camera path and shader clock. */`);
 s=once(s,'   this.onProgress?.(t);','   this.onProgress?.(t,this.sampleExit());');
 s=once(s,'  this.onProgress?.(1);this.onProgress=null;','  this.onProgress?.(1,this.sampleExit());this.onProgress=null;');
 s=once(s,"this.stage='idle';this.onComplete=null;this.onProgress=null;", "this.stage='idle';this.onComplete=null;this.onProgress=null;this.getArrivalViewport=null;this.exitFrame=null;");
 return s;
});
save('src/scene/room-portal-scene.js',s=>once(s,' enterPortal(index,onComplete,onProgress){return this.bannerPortal.enter(index,onComplete,onProgress);}', ' enterPortal(index,onComplete,onProgress,getArrivalViewport){return this.bannerPortal.enter(index,onComplete,onProgress,getArrivalViewport);}'));
save('src/scene/room-portal-shader.js',s=>{
 s=once(s,'uniform vec2 portalHalf;', 'uniform vec2 portalHalf;uniform float portalExitDepth;uniform vec2 portalExitHalf;uniform float portalExitOffset;');
 s=once(s,'  float wall=min(min(tx,ty),110.);vec3 hit=door+rd*wall;',`  float wall=min(min(tx,ty),110.);
  float endT=(portalExitDepth-door.z)/rd.z;
  bool endWall=portalReturn<.5&&endT>0.&&endT<wall;
  if(endWall)wall=endT;
  vec3 hit=door+rd*wall;`);
 s=once(s,'  float first=floor(max(ro.z,0.)/2.35);',`  if(endWall){
   // The actual HTML is projected onto this aperture, not blended over the walls.
   vec2 q=abs(hit.xy-vec2(portalExitOffset,0.))-portalExitHalf;
   float edge=max(q.x,q.y);
   float aa=max(fwidth(edge),.004);
   float core=exp(-pow((edge-.018)/max(.008,aa),2.));
   float halo=exp(-abs(edge-.018)*24.);
   color=vec3(.012,.003,.007)+vec3(3.4,.018,.055)*(core*.65+halo*.15);
  }
  float first=floor(max(ro.z,0.)/2.35);`);
 s=once(s,'   float z=(first+float(i)+1.)*2.35;', '   float z=(first+float(i)+1.)*2.35;\n   if(portalReturn<.5&&z>=portalExitDepth)break;');
 return s;
});
save('src/ui/room-section-routes.js',s=>{
 s=once(s,"import {arrivalVisual,destinationGutter}","import {arrivalVisual,arrivalTransform,destinationGutter}");
 s=once(s,"['--arrival-opacity','--arrival-scale','--arrival-gutter']", "['--arrival-opacity','--arrival-transform','--arrival-gutter']");
 s=once(s,' revealArrival(index,token,progress){',` arrivalViewport(){
  const win=this.document.defaultView,width=win?.innerWidth??this.canvas.clientWidth??1,height=win?.innerHeight??this.canvas.clientHeight??1;
  return {width,height,contentWidth:this.root.clientWidth||width};
 }
 revealArrival(index,token,progress,frame){`);
 s=once(s,'  const visual=arrivalVisual(progress);\n  this.root.style.setProperty(\'--arrival-opacity\',String(visual.opacity));\n  this.root.style.setProperty(\'--arrival-scale\',String(visual.scale));',`  const transform=arrivalTransform(frame,this.root.clientWidth||frame?.contentWidth,this.root.clientHeight||frame?.height);
  if(!transform){this.root.style.setProperty('--arrival-opacity','0');return;}
  this.root.style.setProperty('--arrival-transform',transform);
  this.root.style.setProperty('--arrival-opacity',String(arrivalVisual(progress).opacity));`);
 s=once(s,'p=>this.revealArrival(index,token,p));', '(p,frame)=>this.revealArrival(index,token,p,frame),()=>this.arrivalViewport());');
 return s;
});
save('src/styles-sections.css',s=>{
 s=once(s,'transform: scale(var(--arrival-scale,.72));','transform: var(--arrival-transform,scale(.001));');
 return once(s,'transform-origin: 50% 50%;\n pointer-events: none;\n will-change: opacity,transform;', 'transform-origin: 0 0;\n pointer-events: none;\n will-change: transform;');
});
save('tests/portal-arrival.test.mjs',s=>{
 // Existing lifecycle tests keep exercising the same conditions with a projected frame.
 s=once(s,'this.progress=progress;return true', 'this.progress=p=>progress(p,{visible:true,width:900,height:600,contentWidth:900,quad:[[0,0],[1,0],[1,1],[0,1]]});return true');
 s=s.replace('assert.ok(s.scale>=.72&&s.scale<=1.00000001);','');
 s=s.replace('assert.equal(arrivalVisual(.3).opacity,0);','assert.equal(arrivalVisual(0).opacity,0);assert.equal(arrivalVisual(.1).opacity,1);');
 return s;
});
save('tools/build.mjs',s=>s.replaceAll('dxt-showroom-r19-seamless','dxt-showroom-r20-exit-plane'));
save('tests/entrypoints.test.mjs',s=>s.replaceAll('dxt-showroom-r19-seamless','dxt-showroom-r20-exit-plane'));
console.log('Applied physical exit plane patch to known R19 sources.');
