import {ROOM_PANELS} from './room-panel-data.js';
import {CONTENT} from '../content.js';
import {icon} from '../ui/icons.js';
import {BERSERK_MEDIA,BERSERK_CONTROLS} from './berserk-media.js';
export const SECTION_PATHS=Object.freeze(['/berserk','/groups','/projects','/about','/contact']);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tags=['CARS / CREATIVITY / NO LIMITS','COMMUNITY / EVENTS / PLAY','BIGGER ROADS AHEAD','CREATOR / DRIFTER / BUILDER','LET’S STAY CONNECTED'];
const crops=[[26,95,306,450],[365,215,270,330],[688,257,315,230],[1040,214,265,345],[1350,121,280,413]];
export const sectionHost=()=>'<section id="room-section-page" class="section-page" aria-label="DXT section" hidden></section>';
function art(index){
 if(index===3)return '<div class="section-avatar-art"><img class="section-avatar" src="/assets/images/avatar.webp" alt="DXT’s Roblox avatar" width="256" height="256"><img class="section-personal-mark" src="/assets/icons/dxt.webp" alt="DXT" width="144" height="96"></div>';
 if(index===1)return '<div class="section-studio-marks"><img src="/assets/icons/revline.webp" alt="RevLine Entertainment’s" width="240" height="160"><span></span><img src="/assets/icons/frost.webp" alt="Frost Mammoth Games" width="170" height="170"></div>';
 const [x,y,w,h]=crops[index];return `<svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escape(ROOM_PANELS[index].title)} artwork"><image href="/assets/images/showroom-reference.png" width="1672" height="941"/></svg>`;
}
function action(option,index){return `<a class="section-action" href="${escape(option.href)}" target="_blank" rel="noopener noreferrer"><span class="section-action-number">0${index+1}</span><span class="section-action-copy"><strong>${escape(option.title)}</strong><span>${escape(option.detail)}</span></span>${icon(option.icon||'external')}</a>`;}
function groupTiles(){return `<div class="section-groups section-group-tiles">${CONTENT.groups.map(group=>`<a class="section-group-tile group-${escape(group.key)}" href="${escape(CONTENT.links[group.key])}" target="_blank" rel="noopener noreferrer"><img class="section-group-banner" src="/assets/images/${group.key==='revline'?'revline-pattern':'frost-card'}.webp" alt="" aria-hidden="true" width="640" height="320"><img class="section-group-logo" src="/assets/icons/${escape(group.key)}.webp" alt="" width="80" height="80"><span class="section-group-copy"><strong>${escape(group.name)}</strong><span>${escape(group.text)}</span><span class="section-group-open">VIEW ON ROBLOX ${icon('external')}</span></span></a>`).join('')}</div>`;}
function gameGallery(){const first=BERSERK_MEDIA[0];return `<section class="game-gallery" data-game-gallery aria-label="Berserk Drift X game gallery" aria-roledescription="carousel">
 <div class="game-gallery-heading"><div><p class="section-kicker">INSIDE BERSERK</p><h2>The game, in frames.</h2></div><span class="game-image-count" data-gallery-count aria-live="polite" aria-atomic="true">01 / 05</span></div>
 <figure class="game-gallery-view"><img id="game-selected-image" data-gallery-main src="${first.src}" alt="${escape(first.alt)}" width="768" height="432" decoding="async"><figcaption><span>BERSERK DRIFT X</span><a data-gallery-original href="${first.src}" target="_blank" rel="noopener noreferrer" aria-label="Open selected game image in a new tab">VIEW IMAGE ${icon('external')}</a></figcaption><div class="gallery-controls"><button type="button" data-gallery-step="-1" aria-label="Previous game image">${icon('arrow')}</button><button type="button" data-gallery-step="1" aria-label="Next game image">${icon('arrow')}</button></div></figure>
 <div class="game-gallery-thumbs" role="group" aria-label="Choose a game image">${BERSERK_MEDIA.map((item,index)=>`<button type="button" data-gallery-select="${index}" aria-pressed="${index===0}" aria-label="Show game image ${index+1}" aria-controls="game-selected-image"><img src="${item.src}" alt="" width="192" height="108" loading="lazy" decoding="async"><span>${String(index+1).padStart(2,'0')}</span></button>`).join('')}</div>
 <p class="game-gallery-note">Official project images from the game’s Roblox page. The project is in development.</p>
 </section>`;}
function gameDetails(){return `<section class="game-details" aria-labelledby="game-details-title"><div><p class="section-kicker">THE PROJECT</p><h2 id="game-details-title">Built for the drive.</h2><p>Berserk Drift X is DXT’s main automotive project on Roblox. A new game, with its own development journey.</p><p>The game is still in development, so features may change and bugs can occur.</p></div><div class="game-controls"><p class="section-kicker">PC CONTROLS</p>${BERSERK_CONTROLS.map(c=>`<div><span>${c.keys.map(k=>`<kbd>${escape(k)}</kbd>`).join('<span class="key-plus">+</span>')}</span><span>${c.label}</span></div>`).join('')}<p>Controls listed on the official game page.</p></div></section>`;}
function playDock(){return `<aside class="berserk-play-dock" aria-label="Play Berserk Drift X"><a class="berserk-play-button" href="${escape(CONTENT.links.game)}" target="_blank" rel="noopener noreferrer">${icon('roblox')}<span><strong>PLAY NOW</strong><small>BERSERK DRIFT X · ROBLOX</small></span>${icon('external')}</a></aside>`;}
export function renderSectionPage(index){
 if(!Number.isInteger(index)||index<0||index>4)throw new RangeError('Unknown section');
 const panel=ROOM_PANELS[index],game=index===0,about=index===3;
 const descriptions=panel.paragraphs.length?panel.paragraphs:[panel.description];
 const upcoming=panel.upcoming.length?`<div class="section-upcoming">${panel.upcoming.map(item=>`<div><span class="section-kicker">${escape(item.type)}</span><h2>${escape(item.name)}</h2><p>${escape(item.description)}</p><span class="section-pending">Not announced</span></div>`).join('')}</div>`:'';
 // Keep the physical showroom screen data unchanged. These are editorial page-only filters.
 const options=game?panel.options.filter(o=>o.id!=='revline'&&o.id!=='game'):panel.options;
 const background=game?'<div class="section-photo-backdrop" aria-hidden="true"><img src="/assets/images/race.webp" alt="" width="1649" height="928"></div>':about?'<div class="section-dxt-wall" aria-hidden="true"><img src="/assets/images/pattern-dark.webp" alt="" width="1649" height="928"></div>':'';
 return `${background}<article class="section-layout section-${index}${game?' section-berserk':''}${about?' section-personal':''}" data-section-index="${index}">
  <div class="section-top"><a href="/" data-return-showroom class="section-return">${icon('arrow')}<span>Back to showroom</span></a><span class="section-coordinate">DESTINATION / 0${index+1}</span></div>
  <div class="section-hero"><div class="section-intro-copy"><p class="section-kicker">${tags[index]}</p><h1 id="section-title" tabindex="-1">${escape(panel.title)}</h1>${panel.status?`<span class="section-status"><i></i>${escape(panel.status)}</span>`:''}${descriptions.map(text=>`<p class="section-lead">${escape(text)}</p>`).join('')}<div class="section-rule"></div><span class="section-caption">SAME PASSION. DIFFERENT ROADS.</span></div>
   ${game?'<div class="berserk-hero-signature" aria-hidden="true"><img src="/assets/icons/berserk.webp" alt="" width="520" height="320"><span>DXT / MAIN PROJECT</span></div>':`<div class="section-art"><div class="section-art-frame">${art(index)}</div><span class="section-art-label">DXT / 0${index+1}</span></div>`}</div>
  ${index===1?groupTiles():''}${upcoming}${game?gameGallery()+gameDetails():''}
  ${index===1?'':`<div class="section-links"><p class="section-kicker">${index===4?'FIND ME HERE':index===2?'STAY IN THE LOOP':game?'JOIN THE COMMUNITY':'EXPLORE FURTHER'}</p><div class="section-actions">${options.map(action).join('')}</div></div>`}
  <nav class="section-navigation" aria-label="DXT sections">${ROOM_PANELS.map((p,i)=>`<a href="${SECTION_PATHS[i]}" data-section-route="${i}" ${i===index?'aria-current="page"':''}><span>0${i+1}</span>${escape(p.title)}</a>`).join('')}</nav>
  <footer class="section-footer"><span>DXT</span><span>BUILT DIFFERENT</span></footer>
 </article>${game?playDock():''}`;
}
