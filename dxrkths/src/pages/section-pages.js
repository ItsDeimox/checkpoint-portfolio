import {ROOM_PANELS} from './room-panel-data.js';
import {CONTENT} from '../content.js';
import {icon} from '../ui/icons.js';
export const SECTION_PATHS=Object.freeze(['/berserk','/groups','/projects','/about','/contact']);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tags=['CARS / CREATIVITY / NO LIMITS','COMMUNITY / EVENTS / PLAY','BIGGER ROADS AHEAD','CREATOR / DRIFTER / BUILDER','LET’S STAY CONNECTED'];
const crops=[[26,95,306,450],[365,215,270,330],[688,257,315,230],[1040,214,265,345],[1350,121,280,413]];
export const sectionHost=()=>'<section id="room-section-page" class="section-page" aria-label="DXT section" hidden></section>';
function art(index){const [x,y,w,h]=crops[index];return `<svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escape(ROOM_PANELS[index].title)} artwork"><image href="/assets/images/showroom-reference.png" width="1672" height="941"/></svg>`;}
function action(option,index){return `<a class="section-action" href="${escape(option.href)}" target="_blank" rel="noopener noreferrer"><span class="section-action-number">0${index+1}</span><span class="section-action-copy"><strong>${escape(option.title)}</strong><span>${escape(option.detail)}</span></span>${icon(option.icon||'external')}</a>`;}
export function renderSectionPage(index){
 if(!Number.isInteger(index)||index<0||index>4)throw new RangeError('Unknown section');
 const panel=ROOM_PANELS[index];
 const descriptions=panel.paragraphs.length?panel.paragraphs:[panel.description];
 const upcoming=panel.upcoming.length?`<div class="section-upcoming">${panel.upcoming.map(item=>`<div><span class="section-kicker">${escape(item.type)}</span><h2>${escape(item.name)}</h2><p>${escape(item.description)}</p><span class="section-pending">Not announced</span></div>`).join('')}</div>`:'';
 const groups=index===1?`<div class="section-groups">${CONTENT.groups.map(group=>`<a href="${escape(CONTENT.links[group.key])}" target="_blank" rel="noopener noreferrer"><img src="/assets/icons/${group.key}.webp" alt="" width="80" height="80"><span><strong>${escape(group.name)}</strong><span>${escape(group.text)}</span></span>${icon('external')}</a>`).join('')}</div>`:'';
 return `<article class="section-layout section-${index}" data-section-index="${index}">
  <div class="section-top"><a href="/" data-return-showroom class="section-return">${icon('arrow')}<span>Back to showroom</span></a><span class="section-coordinate">DESTINATION / 0${index+1}</span></div>
  <div class="section-hero"><div class="section-intro-copy"><p class="section-kicker">${tags[index]}</p><h1 id="section-title" tabindex="-1">${escape(panel.title)}</h1>${panel.status?`<span class="section-status"><i></i>${escape(panel.status)}</span>`:''}${descriptions.map(text=>`<p class="section-lead">${escape(text)}</p>`).join('')}<div class="section-rule"></div><span class="section-caption">SAME PASSION. DIFFERENT ROADS.</span></div>
   <div class="section-art"><div class="section-art-frame">${art(index)}</div><span class="section-art-label">DXT / 0${index+1}</span></div></div>
  ${groups}${upcoming}
  <div class="section-links"><p class="section-kicker">${index===4?'FIND ME HERE':index===2?'STAY IN THE LOOP':'EXPLORE FURTHER'}</p><div class="section-actions">${panel.options.map(action).join('')}</div></div>
  <nav class="section-navigation" aria-label="DXT sections">${ROOM_PANELS.map((p,i)=>`<a href="${SECTION_PATHS[i]}" data-section-route="${i}" ${i===index?'aria-current="page"':''}><span>0${i+1}</span>${escape(p.title)}</a>`).join('')}</nav>
  <footer class="section-footer"><span>DXT</span><span>BUILT DIFFERENT</span></footer>
 </article>`;
}
