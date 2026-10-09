import {safeImageURL} from '../core.js';import {icon} from './icons.js';
const FALLBACK={displayName:'DXT',name:'Xaudriy',avatar:'https://tr.rbxcdn.com/30DAY-Avatar-E363B4D13953A1967CD9F17F2FAAA525-Png/420/420/Avatar/Png/noFilter',groups:[]};
let pending=null;
export async function hydrateProfile(root){
 const update=data=>{if(!root.isConnected)return;root.querySelectorAll('[data-profile-name]').forEach(e=>e.textContent=data.displayName||'DXT');root.querySelectorAll('[data-profile-handle]').forEach(e=>e.textContent='@'+(data.name||'Xaudriy'));const url=safeImageURL(data.avatar);if(url)root.querySelectorAll('[data-avatar]').forEach(el=>{el.onload=()=>el.classList.add('loaded');el.onerror=()=>{el.onerror=null;el.src='/assets/images/avatar.webp';};el.src=url;el.alt=`${data.displayName||'DXT'}’s Roblox avatar`;});
  for(const group of data.groups??[]){const host=root.querySelector(`[data-group="${Number(group.id)}"]`);if(!host)continue;for(const game of group.games??[]){if(!Number.isSafeInteger(game.id)||host.querySelector(`[data-game="${game.id}"]`)||host.textContent.includes(game.name.replace(' // WIP','')))continue;const a=document.createElement('a');a.href=`https://www.roblox.com/games/${game.id}`;a.target='_blank';a.rel='noopener noreferrer';a.className='game-row';a.dataset.game=String(game.id);a.innerHTML=icon('game');const span=document.createElement('span');span.textContent=game.name;a.append(span);a.insertAdjacentHTML('beforeend',icon('external'));host.append(a);}}
 };
 update(FALLBACK);if(!pending)pending=fetch('/api/roblox',{signal:AbortSignal.timeout(6500)}).then(r=>{if(!r.ok)throw Error('Profile API unavailable');return r.json();}).catch(()=>FALLBACK);update(await pending);
}
