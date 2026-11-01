import './refinement.css';
import './style.css';
import {RocketViewer} from './scene.js';
import {vehicles,partOrder,partLabels,getPart} from './data.js';
import {initialState,reduce} from './state.js';

const $=id=>document.getElementById(id);let state=initialState(),viewer,ready=false;
const dialogs=['search-dialog','menu-dialog','about-dialog'].map($);
const format=(node,text)=>{node.replaceChildren(...text.split('\n').flatMap((line,i)=>i?[document.createElement('br'),document.createTextNode(line)]:[document.createTextNode(line)]));};
const action=(event)=>{
  const next=reduce(state,event);if(next===state)return;state=next;render();if(ready)viewer.applyState(state);
};
function render(){
  const vehicle=vehicles[state.index],detail=state.part?getPart(vehicle,state.part,state.payload):null;
  $('app').classList.toggle('is-detail',Boolean(detail));$('hero-copy').hidden=Boolean(detail);$('detail-copy').hidden=!detail;$('back').hidden=!detail;$('parts-nav').hidden=!detail;
  $('vehicle-title').textContent=vehicle.name;format($('vehicle-subtitle'),vehicle.subtitle);$('explore').replaceChildren(document.createTextNode(`EXPLORE ${vehicle.name} `),Object.assign(document.createElement('span'),{className:'chevron'}));$('back-name').textContent=vehicle.name;
  $('model-status').textContent=viewer?.assetStates[state.index]==='loading'?'REFINING GEOMETRY':'';
  $('configuration').hidden=!vehicle.reference;$('configuration').textContent=vehicle.reference??'';
  for(const [id,offset] of [['previous',-1],['next',1]]){const neighbor=vehicles[state.index+offset],button=$(id);button.disabled=!neighbor;button.setAttribute('aria-label',neighbor?`Explore ${neighbor.name}`:offset<0?'First rocket':'Last rocket');button.querySelector('.neighbor-name').textContent=neighbor?.name??'';button.querySelector('.neighbor-years').textContent=neighbor?.years??'';}
  [...$('pagination').children].forEach((button,i)=>button.setAttribute('aria-current',String(i===state.index)));
  [...$('parts-nav').children].forEach(button=>button.setAttribute('aria-current',String(button.dataset.part===state.part)));
  $('rotate').setAttribute('aria-pressed',String(state.rotating));$('rotate').setAttribute('aria-label',state.rotating?'Pause automatic rotation':'Enable automatic rotation');
  $('interaction-hint').textContent=detail?'DRAG TO ROTATE · CLICK OUTSIDE TO RETURN':'DRAG TO ROTATE · SELECT TO EXPLORE';
  document.querySelectorAll('.primary-nav button').forEach(button=>button.classList.toggle('active',button.dataset.action===(state.payload==='dragon'?'dragon':state.index===3?'starship':'rockets')));
  if(detail){
    $('detail-parent').textContent=`${vehicle.name} / COMPONENT VIEW`;$('detail-title').textContent=detail.title;$('detail-kicker').textContent=detail.kicker;$('detail-description').textContent=detail.description;
    $('detail-specs').replaceChildren(...detail.specs.map(([label,value])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;div.append(dt,dd);return div;}));
    $('detail-source').href=state.payload==='dragon'&&state.part==='fairing'?'https://www.spacex.com/vehicles/dragon/':vehicle.source;
    $('detail-copy').scrollTop=0;
  }
  document.title=`${detail?.title??vehicle.name} | SpaceX Fan Concept`;
}
for(const [i,vehicle] of vehicles.entries()){
  const dot=document.createElement('button');dot.setAttribute('aria-label',`View ${vehicle.name}`);dot.innerHTML=`<span class="page-name">${vehicle.name}</span>`;dot.addEventListener('click',()=>action({type:'NAVIGATE',index:i}));$('pagination').append(dot);
  const item=document.createElement('button');item.innerHTML=`<small>0${i+1}</small>${vehicle.name}`;item.addEventListener('click',()=>{closeDialogs();action({type:'NAVIGATE',index:i});});$('menu-fleet').append(item);
  const source=document.createElement('a');source.href=vehicle.source;source.target='_blank';source.rel='noopener noreferrer';source.textContent=`${vehicle.name} ↗`;$('source-list').append(source);
}
for(const key of partOrder){const button=document.createElement('button');button.dataset.part=key;button.textContent=partLabels[key];button.addEventListener('click',()=>action({type:'FOCUS',part:key}));$('parts-nav').append(button);}
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
    case 'about':openDialog('about-dialog');break;
    case 'search':openDialog('search-dialog');break;
    case 'menu':openDialog('menu-dialog');break;
  }
}));
$('previous').addEventListener('click',()=>action({type:'NAVIGATE',index:state.index-1}));$('next').addEventListener('click',()=>action({type:'NAVIGATE',index:state.index+1}));
$('explore').addEventListener('click',()=>action({type:'FOCUS',part:'engines'}));$('rotate').addEventListener('click',()=>action({type:'ROTATE'}));
$('quality').addEventListener('change',event=>ready&&viewer.applyQuality(event.target.value));
$('reload').addEventListener('click',()=>location.reload());
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
    if(!q||v.name.toLowerCase().includes(q))results.push({name:v.name,label:'VEHICLE',index:i});
    if(q)for(const key of partOrder){const p=v.parts[key];if(`${v.name} ${p.title} ${partLabels[key]}`.toLowerCase().includes(q))results.push({name:p.title,label:v.name,index:i,part:key});}
  }
  if(q&&'crew dragon human spaceflight'.includes(q))results.push({name:'CREW DRAGON',label:'SPACECRAFT',dragon:true});
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
(async()=>{
  try{
    viewer=new RocketViewer($('viewer'),{onAction:action,onHover:hover,onProgress:(n,text)=>{$('loading-progress').style.width=`${n*100}%`;$('loading-caption').textContent=text;},onError:showError,onAssetStatus:(index,status)=>{if(index===state.index)$('model-status').textContent=status==='loading'?'REFINING GEOMETRY':status.includes('fallback')?'STANDARD MODEL':'';}});
    await viewer.initialize(state);ready=true;document.documentElement.dataset.ready='true';$('loading').classList.add('leaving');setTimeout(()=>$('loading').hidden=true,700);
    if(new URLSearchParams(location.search).has('qa'))window.__SPACEX_QA__={state:()=>({...state}),stats:()=>({...viewer.lastStats}),assets:()=>({...viewer.assetStates}),models:()=>viewer.models.map(m=>({name:m.group.name,source:m.source||'procedural',meshes:m.group.children.filter(o=>o.isMesh).length,parts:[...new Set(m.group.children.filter(o=>o.isMesh).map(o=>o.userData.part))]})),point:part=>viewer.projectPart(part),action};
  }catch(error){console.error('Showroom initialization failed:',error);showError('The 3D showroom could not start. Try reloading or enable hardware acceleration in your browser.');viewer?.dispose();}
})();
window.addEventListener('pagehide',event=>{if(!event.persisted)viewer?.dispose();});
