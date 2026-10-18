import {CONTENT} from '../content.js';
import {ROOM_PANELS} from './room-panel-data.js';
import {icon} from '../ui/icons.js';
import {PAGE_THEMES} from '../world-themes.js';
import {ABOUT_PARAGRAPHS,PROJECT_CATALOG,GROUP_GAMES} from './world-content.js';
import {renderSectionPage as legacy,SECTION_PATHS} from './section-pages-base.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const top=index=>`<div class="section-top"><a href="/" data-return-showroom class="section-return">${icon('arrow')}<span>Back to showroom</span></a><span class="section-coordinate">DESTINATION / 0${index+1}</span></div>`;
const end=index=>`<nav class="section-navigation" aria-label="DXT sections">${ROOM_PANELS.map((p,i)=>`<a href="${SECTION_PATHS[i]}" data-section-route="${i}" style="--nav-color:${PAGE_THEMES[i].hex}" ${i===index?'aria-current="page"':''}><span>0${i+1}</span>${escape(p.title)}</a>`).join('')}</nav><footer class="section-footer"><span>DXT</span><span>BUILT DIFFERENT</span></footer>`;
const header=(kicker,title,lead='')=>`<p class="section-kicker">${kicker}</p><h1 id="section-title" tabindex="-1">${title}</h1>${lead?`<p class="section-lead">${lead}</p>`:''}`;
const link=(option,i)=>`<a class="section-action" href="${escape(option.href)}" target="_blank" rel="noopener noreferrer"><span class="section-action-number">0${i+1}</span><span class="section-action-copy"><strong>${escape(option.title)}</strong><span>${escape(option.detail)}</span></span>${icon(option.icon||'external')}</a>`;
function groups(){
 return `<article class="section-layout section-1 world-groups" data-section-index="1">${top(1)}
  <div class="world-section-heading">${header('COMMUNITIES / WORLDS / CONNECTIONS','Groups &amp; Games','Different spaces. The same drive to create.')}</div>
  <section class="world-group-deck" data-group-deck aria-label="DXT groups" aria-roledescription="carousel">
   <div class="group-deck-tools"><span class="group-scroll-hint">SCROLL TO EXPLORE <i></i></span><span data-group-count aria-live="polite">01 / 02</span><div><button data-group-step="-1" type="button" aria-label="Previous group">${icon('arrow')}</button><button data-group-step="1" type="button" aria-label="Next group">${icon('arrow')}</button></div></div>
   <div class="group-deck-track" data-group-track tabindex="0" aria-label="Group slides. Use the left and right arrow keys.">
   ${CONTENT.groups.map((group,i)=>`<article class="world-group world-group-${escape(group.key)}" data-group-slide aria-label="${i+1} of 2: ${escape(group.name)}">
    <img class="world-group-background" src="/assets/images/${group.key==='revline'?'revline-pattern':'frost-card'}.webp" alt="" width="640" height="320">
    <div class="world-group-identity"><span class="world-group-number">0${i+1} / STUDIO</span><img class="world-group-logo" src="/assets/icons/${escape(group.key)}.webp" alt="" width="240" height="180"><h2>${escape(group.name)}</h2><p>${escape(group.text)}</p><a class="world-group-open" href="${escape(CONTENT.links[group.key])}" target="_blank" rel="noopener noreferrer">VIEW ON ROBLOX ${icon('external')}</a></div>
    <div class="world-group-games"><p class="section-kicker">THE GAMES</p><div class="world-game-images">${GROUP_GAMES[group.key]?.length?GROUP_GAMES[group.key].map(game=>`<figure><img src="${game.src}" alt="${escape(game.alt)}" width="768" height="432" decoding="async"><figcaption>${escape(game.name)}</figcaption></figure>`).join(''):'<div class="world-game-pending"><span>DXT / NEXT WORLDS</span><p>Game gallery coming soon.</p><i aria-hidden="true"></i></div>'}</div></div>
   </article>`).join('')}</div><div class="group-deck-progress" aria-hidden="true"><i></i></div>
  </section>
  <section class="world-community"><div><p class="section-kicker">JOIN THE COMMUNITY</p><h2>Keep the conversation going.</h2></div><a href="${escape(CONTENT.links.discord)}" class="world-community-link" target="_blank" rel="noopener noreferrer">${icon('discord')}<span>Join the community<small>The Berserk community on Discord</small></span>${icon('external')}</a></section>
  ${end(1)}</article>`;
}
function projects(){
 return `<article class="section-layout section-2 world-projects" data-section-index="2">${top(2)}
  <div class="section-hero future-hero"><div class="future-intro">${header('THE NEXT CHAPTER / STILL UNDER WRAPS','Future <br>Projects','Some ideas start with a spark. Others wait for the right road.')}<span class="future-status"><i></i> WHAT COMES NEXT</span><a href="#project-roadmap" class="world-scroll-cue" data-roadmap-scroll><span>SCROLL TO EXPLORE</span><i aria-hidden="true"></i>${icon('arrow')}</a></div>
  <div class="future-scene" data-world-graphic="future" role="img" aria-label="A covered sports car in a dark studio, lit from above"><div class="future-fallback" aria-hidden="true"><svg viewBox="0 0 700 430"><defs><radialGradient id="cover-light"><stop stop-color="#a9a3bf"/><stop offset="1" stop-color="#17131f"/></radialGradient></defs><ellipse cx="365" cy="332" rx="238" ry="35" fill="#000"/><path d="M115 318 134 250Q148 219 257 207L303 146Q371 118 439 157L490 213Q571 233 585 270L602 324Q515 348 396 335L285 335Q184 348 115 318Z" fill="url(#cover-light)"/><path d="m134 250 25 61m98-104 10 117m36-178 49 173m87-162 30 165m21-109 36 109m49-85 7 81" fill="none" stroke="#ded3f2" stroke-opacity=".10" stroke-width="3"/></svg></div><span class="future-scene-caption">UNDER WRAPS <b>01 / THE NEXT CHAPTER</b></span></div></div>
  <section id="project-roadmap" class="project-roadmap" aria-label="Future projects by category">${PROJECT_CATALOG.map((category,i)=>`<section class="project-category" data-world-reveal><div class="project-category-heading"><span>0${i+1}</span><div><p class="section-kicker">${category.label}</p><h2>${category.title}</h2></div></div><div class="project-category-list">${category.items.map((item,j)=>`<article class="project-line"><span class="project-line-number">0${j+1}</span><h3>${escape(item.name)}</h3><span class="project-platform">${item.platform}</span><span class="project-line-plus" aria-hidden="true">+</span></article>`).join('')}</div></section>`).join('')}</section>
  ${end(2)}</article>`;
}
function about(){
 return `<div class="world-about-backdrop" aria-hidden="true"><img src="/assets/images/pattern-dark.webp" alt="" width="1649" height="928"></div><article class="section-layout section-3 section-personal world-about" data-section-index="3">${top(3)}
  <div class="section-hero about-hero"><div class="about-copy">${header('CREATOR / DRIFTER / BUILDER','I’m DXT')}<div class="about-coordinates"><span>BRASIL</span><span>22 ANOS</span><span>SOLO DEVELOPER</span></div><div class="about-biography" lang="pt-BR">${ABOUT_PARAGRAPHS.map(p=>`<p>${escape(p)}</p>`).join('')}</div><p class="about-signature">Same Passion.<br><em>Different Roads.</em></p></div><div class="about-avatar-stage"><span class="avatar-coordinate" aria-hidden="true">DXT / 001</span><div class="avatar-ground" aria-hidden="true"></div><img class="about-avatar" src="/assets/images/avatar.webp" alt="DXT’s Roblox avatar" width="256" height="256"><span class="avatar-signature" aria-hidden="true">BUILT DIFFERENT</span></div></div>
  <div class="about-profile-link">${link({href:CONTENT.links.roblox,title:'Meet me on Roblox',detail:'DXT’s profile',icon:'roblox'},0)}</div>${end(3)}</article>`;
}
function contact(){
 return `<article class="section-layout section-4 world-contact" data-section-index="4">${top(4)}<div class="section-hero contact-hero"><div>${header('OPEN CHANNELS / LET’S CONNECT','Socials &amp; <br>Contact',ROOM_PANELS[4].description)}<div class="section-rule"></div><span class="section-caption">SAME PASSION. DIFFERENT ROADS.</span></div><div class="contact-signal-art" role="img" aria-label="DXT identity surrounded by connected blue signal paths"><svg viewBox="0 0 600 600" fill="none" aria-hidden="true"><g class="contact-orbit"><circle cx="300" cy="300" r="206"/><circle cx="300" cy="300" r="247" stroke-dasharray="3 18"/><path d="M300 53v41m206 206h41M300 506v41M53 300h41"/><path d="m154 154 38 38m216 216 38 38m0-292-38 38M192 408l-38 38"/></g><g class="contact-connections"><path d="M97 260h65l41-57h55m242 156h-70l-42 42h-44M352 96v63l42 40M223 501v-65l-44-32"/><circle cx="97" cy="260" r="5"/><circle cx="500" cy="359" r="5"/><circle cx="352" cy="96" r="5"/><circle cx="223" cy="501" r="5"/></g></svg><div class="contact-mark"><img src="/assets/icons/dxt.webp" alt="" width="264" height="168"><span>LET’S CONNECT</span></div><span class="contact-signal-label">SIGNAL / CONNECTED</span></div></div><div class="section-actions contact-actions">${ROOM_PANELS[4].options.map(link).join('')}</div>${end(4)}</article>`;
}
export function renderSectionPage(index){
 if(!Number.isInteger(index)||index<0||index>4)throw new RangeError('Unknown section');
 if(index===1)return groups();if(index===2)return projects();if(index===3)return about();if(index===4)return contact();
 let html=legacy(0);const start=html.indexOf('<div class="section-links">'),finish=html.indexOf('<nav class="section-navigation"',start);
 if(start>=0&&finish>start)html=html.slice(0,start)+html.slice(finish);
 return html.replace('section-berserk','section-berserk world-berserk').replace(/(<a class="berserk-play-button"[^>]*>)/,'$1<span class="play-energy-host" data-world-graphic="energy" aria-hidden="true"></span>');
}
