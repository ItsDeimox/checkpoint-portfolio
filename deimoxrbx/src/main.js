import {PortfolioEngine} from './scene/engine.js';
import {projects,pairs,contact} from './projects.js';
const $=selector=>document.querySelector(selector);
const gallery=$('#gallery'), viewer=$('#viewer'), loader=$('#loader');
const localSources=new Map();let engine=null,video=null,previousFocus=null,toastTimer;
const toast=message=>{clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3600);};
const formatTime=seconds=>{if(!Number.isFinite(seconds))return '0:00';return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;};
function disposeVideo(){if(!video)return;video.pause();video.removeAttribute('src');video.load();video=null;}
function selectedProject(){return engine?.cards.panels[engine.motion.selected]?.project;}
function refreshMedia(){const project=selectedProject();if(!project)return;engine.cards.panels[engine.motion.selected].stop();disposeVideo();$('#mute-video').textContent='ÁUDIO ON';const source=localSources.get(project.id)||project.src;$('#play-video').disabled=true;$('#play-video').innerHTML='REPRODUZIR <span>▷</span>';$('#media-notice').textContent=source?'Reproduza no próprio painel. ESC retorna à galeria.':'O vídeo original não está incluído neste pacote. Carregue um arquivo local para assistir neste painel.';$('#time-control').hidden=true;$('#mute-video').hidden=!source;
 if(!source)return;
 const current=document.createElement('video');video=current;current.playsInline=true;current.preload='metadata';current.crossOrigin='anonymous';current.src=source;
 current.addEventListener('loadedmetadata',()=>{if(video!==current)return;$('#duration').textContent=formatTime(current.duration);$('#time-control').hidden=false;$('#play-video').disabled=engine.motion.phase!=='focused';});
 current.addEventListener('timeupdate',()=>{if(video!==current)return;$('#current-time').textContent=formatTime(current.currentTime);if(Number.isFinite(current.duration)&&current.duration>0)$('#seek-video').value=String(current.currentTime/current.duration*1000);});
 current.addEventListener('ended',()=>{$('#play-video').innerHTML='REPETIR <span>▷</span>';});
 current.addEventListener('error',()=>{if(video!==current)return;$('#media-notice').textContent='Não foi possível abrir este vídeo. Tente MP4 com H.264 ou WebM.';$('#play-video').disabled=true;});
}
function fallback(reason){loader.hidden=true;document.documentElement.dataset.ready='fallback';document.body.classList.add('no-webgl');$('#fallback').hidden=false;$('#fallback-reason').textContent=reason;const target=$('#fallback-projects');target.replaceChildren();for(const p of projects){const article=document.createElement('article');article.className='fallback-project';const img=new Image();img.src=p.poster;img.alt=p.title;const h=document.createElement('h3');h.textContent=p.title;const desc=document.createElement('p');desc.textContent=p.subtitle;article.append(img,h,desc);target.append(article);}$('#quality').disabled=true;}
try{
 if(new URLSearchParams(location.search).has('fallback'))throw new Error('Modo de compatibilidade selecionado.');
 engine=new PortfolioEngine(gallery,$('#scene'));
 engine.addEventListener('ready',()=>{loader.hidden=true;});
 engine.addEventListener('lost',()=>fallback('O contexto gráfico foi interrompido. Recarregue a página para reativar o 3D.'));
 engine.addEventListener('focus',event=>{previousFocus=document.activeElement;gallery.classList.add('is-focused');viewer.hidden=false;$('#viewer-title').textContent=event.detail.title;$('#viewer-category').textContent=event.detail.subtitle.toUpperCase();refreshMedia();$('#close-video').focus({preventScroll:true});});
 engine.addEventListener('phase',event=>{const phase=event.detail;if(phase==='idle'){gallery.classList.remove('is-focused');viewer.hidden=true;disposeVideo();if(previousFocus){previousFocus.focus({preventScroll:true});previousFocus=null;}}$('#next').disabled=$('#previous').disabled=phase!=='idle';$('#play-video').disabled=!video||!!video.error||video.readyState<1||phase!=='focused';});
 engine.addEventListener('pair',event=>{const index=event.detail;$('#pair-count').textContent=`${String(index+1).padStart(2,'0')} / ${String(pairs.length).padStart(2,'0')}`;$('#pair-progress').style.width=`${(index+1)/pairs.length*100}%`;});
 $('#project-left').addEventListener('click',()=>engine.focus(0));$('#project-right').addEventListener('click',()=>engine.focus(1));
 $('#previous').addEventListener('click',()=>engine.advance(-1));$('#next').addEventListener('click',()=>engine.advance(1));$('#explore').addEventListener('click',()=>engine.advance(1));
 $('#close-video').addEventListener('click',()=>engine.close());
 let wheel=0,lastWheel=0,cooldown=0;gallery.addEventListener('wheel',event=>{if(event.ctrlKey||event.target.closest('.viewer-controls,.header')||gallery.getBoundingClientRect().top< -60)return;event.preventDefault();const now=performance.now();if(engine.motion.phase!=='idle'||now<cooldown)return;if(now-lastWheel>220)wheel=0;lastWheel=now;wheel+=event.deltaY*(event.deltaMode===1?16:1);if(Math.abs(wheel)>65){if(engine.advance(Math.sign(wheel)))cooldown=now+1500;wheel=0;}},{passive:false});
 let down=null;gallery.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')down={x:event.clientX,y:event.clientY};});gallery.addEventListener('pointerup',event=>{if(!down)return;const dx=event.clientX-down.x,dy=event.clientY-down.y;down=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)engine.advance(dx<0?1:-1);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){engine.close();return;}if(event.target.matches('input,textarea')||event.target.closest('#contacts'))return;if(event.key==='ArrowRight'&&engine.motion.phase==='idle'){event.preventDefault();engine.advance(1);}if(event.key==='ArrowLeft'&&engine.motion.phase==='idle'){event.preventDefault();engine.advance(-1);}});
 // A keyboard user stays in the spatial player until returning, without losing the original focus.
 viewer.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const nodes=[...viewer.querySelectorAll('button:not([disabled]),label[tabindex],input:not([hidden])')].filter(e=>e.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 $('#play-video').addEventListener('click',async()=>{if(!video||engine.motion.phase!=='focused')return;if(!video.paused){video.pause();$('#play-video').innerHTML='CONTINUAR <span>▷</span>';return;}try{if(video.ended)video.currentTime=0;await video.play();engine.cards.panels[engine.motion.selected].setVideo(video);await video.play();$('#play-video').innerHTML='PAUSAR <span>Ⅱ</span>';$('#media-notice').textContent='Reproduzindo no painel 3D. ESC retorna à galeria.';}catch(error){toast('O navegador não reproduziu o arquivo. Tente MP4 H.264 ou WebM.');}});
 $('#local-video').addEventListener('change',event=>{const file=event.target.files?.[0],project=selectedProject();if(!file||!project)return;if(!file.type.startsWith('video/')&&!/\.(mp4|webm|mov|m4v)$/i.test(file.name)){toast('Escolha um arquivo de vídeo.');return;}const old=localSources.get(project.id);if(old)URL.revokeObjectURL(old);localSources.set(project.id,URL.createObjectURL(file));refreshMedia();toast('Vídeo carregado localmente. Nenhum arquivo foi enviado.');event.target.value='';});
 $('.attach-button').addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();$('#local-video').click();}});
 $('#mute-video').addEventListener('click',()=>{if(!video)return;video.muted=!video.muted;$('#mute-video').textContent=video.muted?'ÁUDIO OFF':'ÁUDIO ON';});
 $('#seek-video').addEventListener('input',event=>{if(video&&Number.isFinite(video.duration))video.currentTime=Number(event.target.value)/1000*video.duration;});
 $('#quality').addEventListener('click',()=>{engine.setQuality(engine.quality==='high'?'low':'high');$('#quality').textContent=engine.quality==='high'?'GRÁFICOS: ALTO':'GRÁFICOS: LEVE';});
 if(new URLSearchParams(location.search).has('debug')||globalThis.__PORTFOLIO_DEBUG__)window.portfolio=engine;
}catch(error){console.warn('Graphics initialization:',error.message);fallback(error.message.includes('compatibilidade')?error.message:'WebGL 2 não está disponível. Seus projetos e contatos continuam acessíveis abaixo.');}
$('#copy-discord').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(contact.discord);toast('Discord copiado: '+contact.discord);}catch{toast('Discord: '+contact.discord);}});
$('#nav-work').addEventListener('click',()=>{if(engine&&engine.motion.selected>=0)engine.close();});
window.addEventListener('pagehide',()=>{disposeVideo();for(const url of localSources.values())URL.revokeObjectURL(url);engine?.dispose();});
