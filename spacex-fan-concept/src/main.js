import './style.css';
import './refinement.css';
import './platform/accessibility.css';
import {startProductLayer} from './platform/runtime.js';
import {siteConfig} from './platform/site-config.js';
import {vehicles,partOrder,partLabels,getPart} from './data.js';
import {initialState,reduce} from './state.js';
import {engineFor} from './engine-details.js';
import {usesSharedFalconHardware} from './source-assemblies.js';

const $=id=>document.getElementById(id),query=new URLSearchParams(location.search);
const cabinLink=query.get('reference')==='crew-dragon-cabin',insideLink=query.get('inside');
let state=cabinLink?reduce(initialState(),{type:'DRAGON'}):initialState(insideLink??query.get('section')),viewer,product,ready=false;
let pendingInterior=!cabinLink&&Boolean(insideLink&&state.part);
const dialogs=['search-dialog','menu-dialog','about-dialog','cabin-dialog'].map($);
const format=(node,text)=>{node.replaceChildren(...text.split('\n').flatMap((line,i)=>i?[document.createElement('br'),document.createTextNode(line)]:[document.createTextNode(line)]));};
const action=(event)=>{
  const next=reduce(state,event);
  if(next===state)return;
  const changedModule=next.index!==state.index||next.part!==state.part||next.payload!==state.payload;
  if(changedModule)pendingInterior=next.part==='tanks';
  state=next;
  if(ready)viewer.applyState(state);
  render();
  if(changedModule)$('detail-copy').scrollTop=0;
};
function render(){
  const vehicle=vehicles[state.index],detail=state.part?getPart(vehicle,state.part,state.payload):null;
  $('app').classList.toggle('is-detail',Boolean(detail));$('hero-copy').hidden=Boolean(detail);$('detail-copy').hidden=!detail;$('back').hidden=!detail;$('parts-nav').hidden=!detail;
  $('vehicle-title').textContent=vehicle.name;format($('vehicle-subtitle'),vehicle.subtitle);$('explore').replaceChildren(document.createTextNode(`EXPLORE ${vehicle.name} `),Object.assign(document.createElement('span'),{className:'chevron'}));$('back-name').textContent=vehicle.name;
  const engine=engineFor(vehicle.id,state.part),engineView=state.payload==='engine';
  const assetKey=engineView?engine?.family:state.payload==='dragon'?'dragon':state.index,assetStatus=viewer?.assetStates[assetKey];
  const hasModel=engineView?Boolean(viewer?.engineModels.has(engine?.family)):state.payload==='dragon'?Boolean(viewer?.dragonModel):viewer?.models[state.index]?.source==='licensed';
  $('model-status').textContent=assetStatus==='loading'?'LOADING AUTHORED MODEL':'';$('asset-notice').hidden=hasModel||!ready;
  $('asset-notice-text').textContent=assetStatus==='unavailable'?'THE SOURCE MODEL COULD NOT BE LOADED.':'LOADING SOURCE GEOMETRY';$('retry-model').hidden=assetStatus!=='unavailable';$('explore').disabled=!hasModel;
  if(pendingInterior&&ready&&viewer.inspection?.supportsInterior){
    pendingInterior=false;
    viewer.setCutaway(true);
  }
  const coverage=viewer?.inspection?.coverage,supported=Boolean(detail&&coverage?.supported),internal=Boolean(viewer?.cutaway&&supported);
  const sharedPending=usesSharedFalconHardware(state)&&!supported&&!viewer?.assetStates[1]?.startsWith('licensed');
  const retryShared=sharedPending&&viewer?.assetStates[1]==='unavailable';
  document.querySelector('.inspection-controls').hidden=!detail||(!supported&&!engine&&!sharedPending);
  $('view-cutaway').hidden=!supported&&!sharedPending;
  $('view-cutaway').disabled=!supported&&!retryShared;
  $('view-cutaway').textContent=retryShared?'RETRY INTERIOR':sharedPending?'LOADING INTERIOR':state.part==='tanks'?'OPEN TANKS':'INTERNAL STRUCTURE';
  $('view-engine').hidden=!engine;$('view-engine').setAttribute('aria-pressed',String(engineView));
  $('view-exterior').setAttribute('aria-pressed',String(!internal&&!engineView));$('view-cutaway').setAttribute('aria-pressed',String(internal));
  $('cabin-reference').hidden=state.payload!=='dragon'||state.part!=='fairing';
  $('interior-note').hidden=false;$('interior-note').textContent=engineView?'INDIVIDUAL ARTIST MODEL · INTERNAL CUTAWAY NOT SUPPLIED':sharedPending?(retryShared?'Shared Falcon hardware could not be loaded.':'Loading shared Falcon hardware…'):supported?coverage.summary:state.payload==='dragon'?'AUTHORED DOCKING HARDWARE AND HEAT SHIELD · CABIN NOT INCLUDED':viewer?.inspection?.contextual?'CONTINUOUS SOURCE SHELL RETAINED · NO ARTIFICIAL CUTS OR INTERNALS':'INTERNAL ASSEMBLY NOT AVAILABLE IN THIS SOURCE MODEL';
  const source=engineView?engine:supported?coverage:state.payload==='dragon'?{url:'https://sketchfab.com/3d-models/spacex-dragon-2-1b125e30a2cb442288580290536fbe5d',author:'KUBAHA'}:null;
  $('assembly-source').hidden=!source;if(source){$('assembly-source').href=source.url;$('assembly-source').textContent=`MODEL SOURCE · ${source.author} ↗`;}
  $('configuration').hidden=!vehicle.reference;$('configuration').textContent=vehicle.reference??'';
  for(const [id,offset] of [['previous',-1],['next',1]]){const candidate=vehicles[state.index+offset],neighbor=candidate?.available===false?null:candidate,button=$(id);button.disabled=!neighbor;button.setAttribute('aria-label',neighbor?`Explore ${neighbor.name}`:offset<0?'First rocket':'Last rocket');button.querySelector('.neighbor-name').textContent=neighbor?.name??'';button.querySelector('.neighbor-years').textContent=neighbor?.years??'';}
  [...$('pagination').children].forEach((button,i)=>button.setAttribute('aria-current',String(i===state.index)));
  [...$('parts-nav').children].forEach(button=>button.setAttribute('aria-current',String(button.dataset.part===state.part)));
  $('rotate').setAttribute('aria-pressed',String(state.rotating));$('rotate').setAttribute('aria-label',state.rotating?'Pause automatic rotation':'Enable automatic rotation');
  $('interaction-hint').textContent=detail?'DRAG X/Y · SCROLL / PINCH TO ZOOM · DOUBLE-CLICK TO RESET':'DRAG TO BROWSE · SELECT A PART · SHIFT + DRAG TO ROTATE';
  document.querySelectorAll('.primary-nav button').forEach(button=>button.classList.toggle('active',button.dataset.action===(state.payload==='dragon'?'dragon':state.index===3?'starship':'rockets')));
  if(detail){
    $('detail-parent').textContent=`${vehicle.name} / ${engineView?'ENGINE DETAIL':viewer?.inspection?.contextual?'ASSEMBLY VIEW':'COMPONENT VIEW'}`;$('detail-title').textContent=detail.title;$('detail-kicker').textContent=detail.kicker;$('detail-description').textContent=detail.description;
    $('detail-specs').replaceChildren(...detail.specs.map(([label,value])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;div.append(dt,dd);return div;}));
    $('detail-source').href=state.payload==='dragon'&&state.part==='fairing'?'https://www.spacex.com/vehicles/dragon/':vehicle.source;
  }
  document.title=`${detail?.title??vehicle.name} | ${siteConfig.demoTitle}`;product?.sync();
}
for(const [i,vehicle] of vehicles.entries()){
  const dot=document.createElement('button');dot.setAttribute('aria-label',`View ${vehicle.name}`);dot.innerHTML=`<span class="page-name">${vehicle.name}</span>`;dot.addEventListener('click',()=>action({type:'NAVIGATE',index:i}));dot.hidden=vehicle.available===false;dot.disabled=vehicle.available===false;$('pagination').append(dot);
  const item=document.createElement('button');item.innerHTML=`<small>0${i+1}</small>${vehicle.name}`;item.addEventListener('click',()=>{closeDialogs();action({type:'NAVIGATE',index:i});});item.disabled=vehicle.available===false;if(item.disabled){item.title='No verified reusable model is available';item.append(Object.assign(document.createElement('small'),{textContent:'MODEL UNAVAILABLE'}));}$('menu-fleet').append(item);
  const source=document.createElement('a');source.href=vehicle.source;source.target='_blank';source.rel='noopener noreferrer';source.textContent=`${vehicle.name} ↗`;$('source-list').append(source);
}
for(const key of partOrder){const button=document.createElement('button');button.dataset.part=key;button.textContent=partLabels[key];button.addEventListener('click',()=>action({type:'FOCUS',part:key}));$('parts-nav').append(button);}
function showCabinReference(film){
  $('cabin-photo').hidden=film;
  $('cabin-film').hidden=!film;
  $('cabin-photo-tab').setAttribute('aria-pressed',String(!film));
  $('cabin-film-tab').setAttribute('aria-pressed',String(film));
  const player=$('cabin-player'),photo=$('cabin-photo').querySelector('img');
  if(!film){
    player.replaceChildren();
    if(!photo.hasAttribute('src'))photo.src='/references/crew-8-cabin-eafda7f3.jpg';
  }else if(!player.firstChild){
    const frame=document.createElement('iframe');
    frame.title='Inside Crew Dragon Endurance in orbit, ESA and NASA 360-degree video';
    frame.allow='fullscreen; encrypted-media; accelerometer; gyroscope';
    frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.src='https://www.youtube-nocookie.com/embed/INHctrVOoQw?start=326&playsinline=1';
    player.append(frame);
  }
}
$('cabin-photo-tab').addEventListener('click',()=>showCabinReference(false));
$('cabin-film-tab').addEventListener('click',()=>showCabinReference(true));
$('cabin-dialog').addEventListener('close',()=>$('cabin-player').replaceChildren());
function closeDialogs(){dialogs.forEach(dialog=>dialog.open&&dialog.close());}
function openDialog(id){closeDialogs();$(id).showModal();if(id==='search-dialog'){$('search-input').value='';search('');$('search-input').focus();}}
for(const dialog of dialogs){
  dialog.querySelector('.close-button').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
}
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
  switch(button.dataset.action){
    case 'home':action({type:'NAVIGATE',index:1});break;
    case 'rockets':action({type:'BACK'});break;
    case 'starship':action({type:'NAVIGATE',index:3});break;
    case 'dragon':action({type:'DRAGON'});break;
    case 'back':action({type:'BACK'});break;
    case 'cabin-reference':showCabinReference(false);openDialog('cabin-dialog');break;
    case 'about':openDialog('about-dialog');break;
    case 'search':openDialog('search-dialog');break;
    case 'menu':openDialog('menu-dialog');break;
  }
}));
$('previous').addEventListener('click',()=>action({type:'NAVIGATE',index:state.index-1}));$('next').addEventListener('click',()=>action({type:'NAVIGATE',index:state.index+1}));
$('explore').addEventListener('click',()=>action({type:'FOCUS',part:'engines'}));$('rotate').addEventListener('click',()=>action({type:'ROTATE'}));
$('quality').addEventListener('change',event=>{if(ready){viewer.autoCap=null;viewer.frameBudget.reset();viewer.applyQuality(event.target.value);}});
for(const [id,enabled] of [['view-exterior',false],['view-cutaway',true]])$(id).addEventListener('click',()=>{if(!ready)return;pendingInterior=false;if(enabled&&usesSharedFalconHardware(state)&&!viewer.inspection?.supportsInterior){pendingInterior=true;viewer.loadLicensed(1);return;}if(!enabled&&state.payload==='engine'){action({type:'ENGINE_DETAIL',enabled:false});return;}if(viewer.setCutaway(enabled))render();});
$('view-engine').addEventListener('click',()=>action({type:'ENGINE_DETAIL',enabled:true}));
$('reload').addEventListener('click',()=>location.reload());$('retry-model').addEventListener('click',()=>viewer?.retryModel());
window.addEventListener('keydown',event=>{
  if(dialogs.some(dialog=>dialog.open)||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
  if(event.key==='Escape'){action({type:'BACK'});event.preventDefault();}
  if(event.key==='ArrowRight'){action({type:'NAVIGATE',index:state.index+1});event.preventDefault();}
  if(event.key==='ArrowLeft'){action({type:'NAVIGATE',index:state.index-1});event.preventDefault();}
  if(event.key==='/'&&!event.ctrlKey&&!event.metaKey){event.preventDefault();openDialog('search-dialog');}
});
function search(query){
  const q=query.trim().toLowerCase(),results=[];
  for(const [i,v] of vehicles.entries()){
    if(v.available===false)continue;
    if(!q||v.name.toLowerCase().includes(q))results.push({name:v.name,label:'VEHICLE',index:i});
    if(q)for(const key of partOrder){const p=v.parts[key];if(`${v.name} ${p.title} ${partLabels[key]}`.toLowerCase().includes(q))results.push({name:p.title,label:v.name,index:i,part:key});}
  }
  if(q&&'crew dragon 2 human spaceflight'.includes(q))results.push({name:'DRAGON 2',label:'CAPSULE / DOCKING',dragon:true});
  $('search-results').replaceChildren(...results.slice(0,20).map(result=>{
    const button=document.createElement('button'),span=document.createElement('span'),small=document.createElement('small');span.textContent=result.name;small.textContent=result.label;button.append(span,small);
    button.addEventListener('click',()=>{closeDialogs();if(result.dragon)action({type:'DRAGON'});else{action({type:'NAVIGATE',index:result.index});if(result.part)action({type:'FOCUS',part:result.part});}});return button;
  }));
  if(!results.length){const p=document.createElement('p');p.className='no-results';p.textContent='No matching rockets or components.';$('search-results').append(p);}
}
$('search-input').addEventListener('input',e=>search(e.target.value));
function showError(message){$('loading').hidden=true;$('error-message').textContent=message;$('error').hidden=false;}
function hover(part,point){
  $('hotspot').hidden=!part||Boolean(state.part);if(!part)return;
  $('hotspot-name').textContent=part==='engines'&&state.index===1?'MERLIN ENGINE CLUSTER':getPart(vehicles[state.index],part,state.payload).title;
  if(point)$('hotspot').style.transform=`translate(${point.x-32}px, ${point.y-98}px)`;
}
render();
if(cabinLink){showCabinReference(false);openDialog('cabin-dialog');}
(async()=>{
  try{
    const {RocketViewer}=await import('./scene.js');
    viewer=new RocketViewer($('viewer'),{onAction:action,onHover:hover,onProgress:(n,text)=>{$('loading-progress').style.width=`${n*100}%`;$('loading-caption').textContent=text;},onError:showError,onRecovered:()=>{$('error').hidden=true;},onAssetStatus:()=>{if(ready)render();}});
    await viewer.initialize(state);ready=true;product=startProductLayer({viewer,read:()=>state,dispatch:action,catalog:vehicles,describe:(state,vehicle)=>getPart(vehicle,state.part,state.payload),refresh:render});render();document.documentElement.dataset.ready='true';$('loading').classList.add('leaving');setTimeout(()=>$('loading').hidden=true,700);
    if(new URLSearchParams(location.search).has('qa'))window.__SPACEX_QA__={state:()=>({...state}),stats:()=>({...viewer.lastStats}),session:command=>product.session.execute(command),quality:mode=>viewer.applyQuality(mode),yaw:value=>{viewer.displayGroup().rotation.y=value;viewer.wake();},retry:()=>viewer.retryModel(),orientation:()=>viewer.displayGroup().rotation.y,quaternion:()=>viewer.displayGroup().quaternion.toArray(),motion:()=>({position:viewer.carousel.position,dragging:viewer.carousel.dragging,contextAlpha:viewer.contextAlpha,transition:Boolean(viewer.animation),rotation:viewer.displayGroup().quaternion.toArray(),inspectionOpacity:viewer.inspection?.fade.value??0,visibleFades:viewer.models.map(m=>m.fade?.value??0)}),zoom:value=>viewer.setZoom(value),framing:()=>{if(!viewer.inspection)return null;const b=viewer.inspection.bounds.clone().applyMatrix4(viewer.inspection.group.matrixWorld),p=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=b.min.clone().set(x,y,z).project(viewer.camera);p.push([(v.x+1)*viewer.width/2,(1-v.y)*viewer.height/2]);}return p;},inspection:()=>viewer.inspection?({key:viewer.inspectionKey,contextual:viewer.inspection.contextual,interiorVisible:viewer.cutaway,supportsInterior:viewer.inspection.supportsInterior,coverage:viewer.inspection.coverage,features:[...new Set(viewer.inspection.exterior.children.map(m=>m.userData.assemblyFeature).filter(Boolean))],internalMeshes:viewer.inspection.internalMeshes.size,exteriorCount:viewer.inspection.exterior.children.length,bounds:{min:viewer.inspection.bounds.min.toArray(),max:viewer.inspection.bounds.max.toArray()},originalsVisible:viewer.models.filter(m=>m.group.visible).length}):null,visible:()=>viewer.models.map(m=>m.group.visible),assets:()=>({...viewer.assetStates}),models:()=>viewer.models.map(m=>({name:m.group.name,source:m.source||'unavailable',meshes:m.group.children.filter(o=>o.isMesh).length,parts:[...new Set(m.group.children.filter(o=>o.isMesh).map(o=>o.userData.part))]})),point:part=>viewer.projectPart(part),action};
  }catch(error){console.error('Showroom initialization failed:',error);showError('The 3D showroom could not start. Try reloading or enable hardware acceleration in your browser.');viewer?.dispose();}
})();
window.addEventListener('pagehide',event=>{if(!event.persisted){product?.dispose();viewer?.dispose();}});
