import {THREE} from './shared.js';
import {Environment} from './environment.js';
import {ReflectiveFloor} from './floor.js';
import {Hub} from './hub.js';
import {GlassGallery} from './glass.js';
import {Optics} from './optics.js';
import {GalleryMotion,damp} from '../core/motion.js';
import {SurfaceImpulseTracker} from '../core/vertex-energy.js';
import {pairs} from '../projects.js';
import {sceneViewport} from '../core/viewport.js';

/** Owns rendering and spatial interaction, never navigation or media file dialogs. */
export class PortfolioEngine extends EventTarget{
 constructor(host,canvas){super();this.host=host;this.canvas=canvas;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.motion=new GalleryMotion(pairs.length,this.reduced);this.time=0;this.last=performance.now();this.generation=0;this.phase='idle';this.mouse=new THREE.Vector2();this.pick=new THREE.Vector2();this.raycaster=new THREE.Raycaster();this.tracker=new SurfaceImpulseTracker(4.8,2.8);this.quality='high';this.alive=true;
  this.renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});this.renderer.outputColorSpace=THREE.LinearSRGBColorSpace;this.renderer.toneMapping=THREE.NoToneMapping;this.renderer.debug.checkShaderErrors=true;this.renderer.setClearColor(0x040a1c,1);this.renderer.info.autoReset=false;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(45,1,.1,100);this.camera.name='AnimatedPortfolioCamera';this.home=new THREE.Vector3(0,1.8,12.5);this.homeLook=new THREE.Vector3(0,3.3,0);this.look=this.homeLook.clone();this.camera.position.copy(this.home);this.camera.lookAt(this.look);
  this.environment=new Environment(this.scene,this.renderer);this.floor=new ReflectiveFloor(this.scene);this.hub=new Hub(this.scene);this.cards=new GlassGallery(this.scene);this.optics=new Optics(this.renderer);

  this.proxies=[document.querySelector('#project-left'),document.querySelector('#project-right')];
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.footer=document.querySelector("#about");if(this.footer)this.resizeObserver.observe(this.footer);
  this.onMove=e=>this.pointerMove(e);this.onLeave=()=>{this.mouse.set(0,0);this.tracker.reset();this.hub.hover=0;};host.addEventListener('pointermove',this.onMove);host.addEventListener('pointerleave',this.onLeave);
  this.reduceQuery=matchMedia('(prefers-reduced-motion: reduce)');this.onReduced=e=>{this.reduced=e.matches;this.motion.reduced=e.matches;};this.reduceQuery.addEventListener('change',this.onReduced);
  this.onLost=e=>{e.preventDefault();this.alive=false;cancelAnimationFrame(this.raf);this.dispatchEvent(new CustomEvent('lost'));};canvas.addEventListener('webglcontextlost',this.onLost);
  this.resize();this.loop=this.loop.bind(this);this.raf=requestAnimationFrame(this.loop);
 }
 emit(name,detail){this.dispatchEvent(new CustomEvent(name,{detail}));}
 resize(){const{width,height}=this.host.getBoundingClientRect();const viewport=sceneViewport(width,height,this.footer?.getBoundingClientRect().height||0);this.width=viewport.width;this.height=viewport.heroHeight;this.renderHeight=viewport.height;this.mobile=width<760;const aspect=viewport.aspect;this.camera.aspect=aspect;
  this.cards.setLayout(this.mobile);this.hub.baseY=this.mobile?3.4:2.65;
  if(this.mobile){this.home.set(0,5,Math.max(14.5,2+10.2/aspect));this.homeLook.set(0,2.45,0);}else{this.home.set(0,1.8,Math.max(12.5,12.2/(aspect/2.34)));this.homeLook.set(0,3.3,0);}
  // The virtual sensor is the original hero. Overscan adds only ground below it.
  this.camera.setViewOffset(this.width,this.height,0,0,this.width,this.renderHeight);this.camera.updateProjectionMatrix();const dpr=Math.min(devicePixelRatio,this.quality==='low'?.8:this.mobile?1.2:1.35);this.renderer.setPixelRatio(dpr);this.renderer.setSize(this.width,this.renderHeight,false);this.canvas.style.height=`${this.renderHeight}px`;this.optics.resize(Math.round(this.width*dpr),Math.round(this.renderHeight*dpr));this.floor.resize(Math.round(this.width*dpr),Math.round(this.renderHeight*dpr),this.optics.hdr);this.updateCamera(0);this.positionControls();
 }
 setQuality(quality){this.quality=quality==='low'?'low':'high';this.resize();}
 advance(direction){const accepted=this.motion.advance(direction);if(accepted){this.cards.panels.forEach(p=>p.stop());this.emit('transition');}return accepted;}
 focus(side){if(!this.motion.focus(side))return false;this.tracker.reset();this.emit('focus',this.cards.panels[side].project);return true;}
 close(){this.cards.panels.forEach(p=>p.stop());return this.motion.close();}
 pointerMove(event){const rect=this.host.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width,heroY=(event.clientY-rect.top)/rect.height,y=(event.clientY-rect.top)/this.renderHeight;this.mouse.set((x-.5)*2,(heroY-.5)*2);if(this.reduced||!this.alive||!['idle','focused'].includes(this.motion.phase))return;
  this.pick.set(x*2-1,1-y*2);this.raycaster.setFromCamera(this.pick,this.camera);
  const hits=this.raycaster.intersectObjects(this.cards.panels.map(p=>p.mesh));
  if(hits.length){const hit=hits[0],side=hit.object.userData.side;const stroke=this.tracker.sample(side,[hit.uv.x,hit.uv.y],event.timeStamp,[event.clientX,event.clientY]);if(stroke)this.cards.panels[side].energy.addStroke(stroke);this.hub.hover=0;}else{this.tracker.reset();const hubHit=this.raycaster.intersectObject(this.hub.mesh);this.hub.hover=hubHit.length?1:0;if(hubHit.length){this.hub.uniforms.uPoint.value.copy(this.hub.mesh.worldToLocal(hubHit[0].point.clone()));}}
 }
 updateCamera(dt){const focus=this.motion.focusAmount;
  let end=this.home.clone(),target=this.homeLook.clone();
  if(this.motion.selected>=0){const panel=this.cards.panels[this.motion.selected];const center=panel.group.getWorldPosition(new THREE.Vector3());const normal=new THREE.Vector3(0,0,1).applyQuaternion(panel.group.getWorldQuaternion(new THREE.Quaternion()));const scale=panel.group.scale.x;
   const tangent=Math.tan(THREE.MathUtils.degToRad(45)/2);const distance=Math.max(2.8*scale/(2*tangent*.69),4.8*scale/(2*tangent*this.camera.aspect*.80));
   end=center.clone().addScaledVector(normal,distance);target=center;
  }
  const position=this.home.clone().lerp(end,focus);const look=this.homeLook.clone().lerp(target,focus);
  if(!this.reduced&&focus<.001){position.x+=this.mouse.x*.055;position.y-=this.mouse.y*.026;}
  this.camera.position.copy(position);this.look.copy(look);this.camera.up.set(0,1,0);if(this.motion.selected>=0){const up=new THREE.Vector3(0,1,0).applyQuaternion(this.cards.panels[this.motion.selected].group.getWorldQuaternion(new THREE.Quaternion()));this.camera.up.lerp(up,focus).normalize();}this.camera.lookAt(look);this.camera.updateMatrixWorld();
 }
 positionControls(){this.scene.updateMatrixWorld();this.cards.panels.forEach((panel,side)=>{
  const button=this.proxies[side];if(!button)return;const points=[[-2.38,-1.38,0],[2.38,-1.38,0],[2.38,1.38,0],[-2.38,1.38,0]].map(p=>new THREE.Vector3(...p).applyMatrix4(panel.group.matrixWorld).project(this.camera));const xs=points.map(p=>(p.x*.5+.5)*this.width),ys=points.map(p=>(-.5*p.y+.5)*this.renderHeight);
  const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  Object.assign(button.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
  button.disabled=this.motion.phase!=='idle';button.setAttribute('aria-label',`Abrir ${panel.project.title} em 3D`);
 });}
 loop(now){if(!this.alive)return;this.raf=requestAnimationFrame(this.loop);const dt=Math.min(.1,Math.max(.001,(now-this.last)/1000));this.last=now;if(document.hidden)return;
  if(!this.reduced)this.time+=dt;this.motion.update(dt);
  if(this.motion.generation!==this.generation){this.generation=this.motion.generation;this.cards.setPair(this.motion.index);this.emit('pair',this.motion.index);}
  if(this.motion.phase!==this.phase){this.phase=this.motion.phase;this.host.dataset.phase=this.phase;this.emit('phase',this.phase);}
  this.host.dataset.pair=String(this.motion.index);this.environment.update(this.time,this.reduced);this.hub.update(this.time,this.motion,this.reduced);this.cards.update(this.time,dt,this.motion);this.updateCamera(dt);this.positionControls();this.renderer.info.reset();this.optics.render(this.scene,this.camera,this.cards,this.floor,this.time);
  if(document.documentElement.dataset.ready!=='true'){document.documentElement.dataset.ready='true';this.emit('ready');}
 }
 inspect(){return{phase:this.motion.phase,pair:this.motion.index,focus:this.motion.focusAmount,selected:this.motion.selected,camera:this.camera.position.toArray(),render:{hdr:this.optics.hdr,quality:this.quality,triangles:this.renderer.info.render.triangles,drawCalls:this.renderer.info.render.calls,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures},panels:this.cards.panels.map(p=>({project:p.project.id,position:p.group.position.toArray(),energy:p.energy.inspect(),playing:!!p.video&&!p.video.paused}))};}
 dispose(){this.alive=false;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.host.removeEventListener('pointermove',this.onMove);this.host.removeEventListener('pointerleave',this.onLeave);this.reduceQuery.removeEventListener('change',this.onReduced);this.cards.dispose();this.optics.dispose();this.floor.dispose();this.renderer.dispose();}
}
