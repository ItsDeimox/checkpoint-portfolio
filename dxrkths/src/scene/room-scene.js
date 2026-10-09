import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { loadShowroomCar } from './room-car.js';
import { buildShowroom } from './room-environment.js';
import { RoomOptics } from './room-optics.js';
import { RoomCamera } from './room-camera.js';
import { prepareRoomRenderer, yieldToBrowser, waitForAsset } from './room-startup.js';
import { renderBudget, panelIndex } from './room-core.js';
import { ROOM_PANELS } from '../pages/home-room.js';
import { roomVertex, smokeFragment, beamFragment } from './room-shaders.js';
import { elapsedFrameTime } from '../core.js';

function disposeObjects(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root?.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => texture.dispose());
}

/** One persistent room. Asset preparation finishes before it becomes interactive. */
export class HeroScene {
  constructor(canvas, settings, callbacks = {}) {
    Object.assign(this, {
      canvas, settings, callbacks, host: canvas.closest('.room-hero'),
      controller: new AbortController(), disposed: false, ready: false,
      raf: 0, time: 0, frames: 0, activePanel: 0, hoverPanel: -1, drag: null,
    });
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.startedAt = performance.now();
    this.startup = {};
    this.workController = new AbortController();
    this.controller.signal.addEventListener('abort', () => this.workController.abort(), { once: true });
    this.readyPromise = this.initialize();
  }

  progress(caption) {
    const label = this.host.querySelector('.room-loading-caption');
    if (label) label.textContent = caption;
  }

  async initialize() {
    const signal = this.workController.signal;
    // Paint the lightweight page before creating a context or allocating GPU work.
    await yieldToBrowser(signal);
    this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.bindContext();
    this.gl = this.renderer.getContext();
    Object.assign(this.renderer, { outputColorSpace: T.SRGBColorSpace, toneMapping: T.ACESFilmicToneMapping, toneMappingExposure: 1.05 });
    Object.assign(this.renderer.shadowMap, { enabled: this.settings.quality !== 'low', type: T.PCFSoftShadowMap, autoUpdate: false });
    this.renderer.setClearColor(0x030305);
    this.renderer.info.autoReset = false;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x030305);
    this.scene.fog = new T.FogExp2(0x101015, .013);
    this.camera = new T.PerspectiveCamera(42, 1, .08, 100);
    this.cameraRig = new RoomCamera(this.camera, this.host.clientWidth);

    this.loadingManager = new T.LoadingManager();
    const textureErrors = [];
    const texturesReady = new Promise(resolve => { this.loadingManager.onLoad = resolve; });
    this.loadingManager.onError = url => textureErrors.push(url);
    this.progress('Loading the showroom');
    this.vehiclePromise = this.buildVehicle();
    // Handle rejection immediately while the network overlaps room setup.
    const assetsReady = Promise.all([this.vehiclePromise, texturesReady]);
    assetsReady.catch(() => {});
    await yieldToBrowser(signal);
    buildShowroom(this);
    await yieldToBrowser(signal);
    this.buildLights();
    await yieldToBrowser(signal);
    this.buildAtmosphere();
    await this.prepareEnvironment(signal);
    await waitForAsset(assetsReady, signal);
    signal.throwIfAborted();
    if (textureErrors.length) throw new Error(`Showroom artwork could not load: ${textureErrors.join(', ')}`);
    this.startup.assetsMs = Math.round(performance.now() - this.startedAt);

    this.optics = new RoomOptics(this.renderer, this.scene, this.camera);
    this.composer = this.optics.composer;
    this.optics.setQuality(this.settings.quality);
    this.renderer.shadowMap.enabled = this.settings.quality !== 'low';
    this.resize();
    this.raycaster = new T.Raycaster();
    this.pickPosition = new T.Vector2();
    this.panelLinks = [...this.host.querySelectorAll('.room-panel-link')];
    this.bind();
    this.progress('Preparing light and reflections');
    this.preparation = prepareRoomRenderer(this, { signal });
    this.startup.preparation = await this.preparation;
    await yieldToBrowser(signal);
    this.scene.updateMatrixWorld(true);
    this.updateAtmosphere();
    this.renderer.shadowMap.needsUpdate = true;
    this.render(1 / 60, 0);
    // First geometry upload and shadow draw stay behind the loading state.
    await yieldToBrowser(signal);
    this.ready = true;
    this.startup.readyMs = Math.round(performance.now() - this.startedAt);
    this.host.classList.remove('scene-unavailable');
    this.host.classList.add('scene-ready');
    this.host.dataset.sceneStatus = 'ready';
    this.selectPanel(0);
    this.updateLinkProjection();
    this.observeSize();
    this.callbacks.onReady?.();
    this.wake();
    return this;
  }

  async prepareEnvironment(signal) {
    this.progress('Preparing studio lighting');
    const room = new RoomEnvironment();
    const pmrem = new T.PMREMGenerator(this.renderer);
    const target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, colorSpace: T.LinearSRGBColorSpace });
    const oldTarget = this.renderer.getRenderTarget();
    try {
      this.renderer.setRenderTarget(target);
      await this.renderer.compileAsync(room, new T.PerspectiveCamera(90, 1, .1, 100), room);
      await yieldToBrowser(signal);
      // Same studio and blur with a bounded cube map; fromScene still dispatches
      // synchronously and deliberately stays outside the interactive loop.
      this.environment?.dispose();
      this.environment = pmrem.fromScene(room, .018, .1, 100, { size: 128 });
      this.scene.environment = this.environment.texture;
      this.scene.environmentIntensity = .34;
      this.scene.environmentRotation.y = .2;
      await yieldToBrowser(signal);
    } finally {
      this.renderer.setRenderTarget(oldTarget);
      target.dispose(); room.dispose(); pmrem.dispose();
    }
  }

  async buildVehicle() {
    this.carPivot = new T.Group();
    this.carPivot.position.set(-.67248, -.084365, 1.28199);
    this.carPivot.rotation.y = -.460715;
    this.carPivot.scale.setScalar(1.922749);
    this.scene.add(this.carPivot);
    const car = await loadShowroomCar();
    if (this.disposed) { disposeObjects(car); return; }
    this.carPivot.add(car);
    this.red = car;
    this.modelReady = true;
    // Two cheap picking volumes replace raycasts over 232k rendered triangles.
    this.pickOccluders = new T.Group();
    this.pickOccluders.matrixAutoUpdate = false;
    const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
    for (const [size, center] of [
      [[1.94, .80, 4.84], [0, .54, 0]],
      [[1.56, .48, 2.20], [0, 1.11, .28]],
    ]) {
      const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
      mesh.position.set(...center);
      this.pickOccluders.add(mesh);
    }
    this.carPivot.updateWorldMatrix(true, true);
    this.pickOccluders.matrix.copy(this.carPivot.matrixWorld);
    this.pickOccluders.updateMatrixWorld(true);
  }

 buildLights(){
  RectAreaLightUniformsLib.init();this.scene.add(new T.HemisphereLight(0xcbd4e2,0x160c0e,.27));this.key=new T.DirectionalLight(0xfff1e8,2.6);this.key.position.set(-3.5,8,-4);this.key.castShadow=true;Object.assign(this.key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:26});this.key.shadow.bias=-.00025;this.key.shadow.normalBias=.012;this.key.shadow.mapSize.set(1536,1536);this.scene.add(this.key);
  for(const [color,intensity,w,h,p,target]of [[0xf8f6ff,15,8,1.15,[-2,6.1,-3.5],[0,.65,0]],[0xfff7f4,9,5,1.1,[4,4.7,-2],[0,.8,0]],[0xff0923,9.5,8,.7,[0,2.8,4],[0,.65,0]],[0xff1a25,7,5,1.3,[-5,2.8,-.5],[0,.7,0]],[0xe4eafa,4,3,3,[6.5,3.5,0],[0,1,0]]]){const l=new T.RectAreaLight(color,intensity,w,h);l.position.set(...p);l.lookAt(...target);this.scene.add(l);}
  const spot=new T.SpotLight(0xe8efff,70,22,.28,.65,2);spot.position.set(0,7.45,.1);spot.target.position.set(0,0,0);this.scene.add(spot,spot.target);this.renderer.shadowMap.needsUpdate=true;
 }
 buildAtmosphere(){
  this.smokes=[];let seed=829;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<28;i++){const x=(i%2?1:-1)*(2.7+random()*2),z=-1+random()*3.8,y=.4+random()*.8;const material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:smokeFragment,uniforms:{time:{value:0},seed:{value:random()*19},density:{value:.56+random()*.32},tint:{value:new T.Color(i%4===0?0x916367:0x90939c)}},transparent:true,depthWrite:false,side:T.DoubleSide});const mesh=new T.Mesh(new T.PlaneGeometry(2.2+random()*1.3,1.5+random()*.8),material);mesh.position.set(x,y,z);mesh.userData.base=mesh.position.clone();mesh.userData.phase=random()*6.28;mesh.renderOrder=3;this.scene.add(mesh);this.smokes.push(mesh);}
  this.beams=[];for(let i=0;i<5;i++){const material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:beamFragment,uniforms:{time:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});const mesh=new T.Mesh(new T.PlaneGeometry(4.1,7.4),material);mesh.position.set(0,3.9,.65+i*.35);mesh.renderOrder=4;this.scene.add(mesh);this.beams.push(mesh);}
  const p=[];for(let i=0;i<190;i++)p.push((random()-.5)*10,.25+random()*6.4,(random()-.5)*6);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));this.dust=new T.Points(g,new T.PointsMaterial({color:0xb8bdc9,size:.012,transparent:true,opacity:.33,depthWrite:false}));this.scene.add(this.dust);
 }

  bind() {
    const on = (element, event, handler, options = {}) => element?.addEventListener(event, handler, { ...options, signal: this.controller.signal });
    on(this.canvas, 'pointermove', event => {
      if (!this.ready || this.cameraRig.mode !== 'overview') return;
      if (this.drag?.id === event.pointerId) {
        this.drag.moved ||= Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) > 7;
        this.cameraRig.look(-(event.clientX - this.drag.x) * .002, (event.clientY - this.drag.y) * .0021);
        this.drag.x = event.clientX; this.drag.y = event.clientY;
        this.hoverPanel = -1;
      } else this.pendingPick = [event.clientX, event.clientY];
      this.wake();
    }, { passive: true });
    on(this.canvas, 'pointerdown', event => {
      if (!this.ready || event.button !== 0 || this.cameraRig.mode !== 'overview') return;
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.classList.add('dragging');
      this.canvas.style.cursor = 'grabbing';
    });
    on(this.canvas, 'pointerup', event => {
      const click = this.drag?.id === event.pointerId && !this.drag.moved;
      const hit = click ? this.pick(event.clientX, event.clientY) : -1;
      this.release();
      if (hit >= 0) this.callbacks.onPanelRequest?.(hit, this.panelLinks[hit]);
    });
    on(this.canvas, 'pointercancel', () => this.release());
    on(this.canvas, 'lostpointercapture', () => { this.drag = null; this.canvas.classList.remove('dragging'); });
    on(this.canvas, 'pointerleave', () => { this.pendingPick = null; this.hoverPanel = -1; });
    on(this.canvas, 'keydown', event => {
      if (!this.ready || this.cameraRig.mode !== 'overview') return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'Enter'].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowLeft') this.focusPanel(this.activePanel - 1);
      if (event.key === 'ArrowRight') this.focusPanel(this.activePanel + 1);
      if (event.key === 'ArrowUp') this.cameraRig.look(0, .05);
      if (event.key === 'ArrowDown') this.cameraRig.look(0, -.05);
      if (event.key === 'Home') this.callbacks.onResetRequest?.();
      if (event.key === 'Enter') this.callbacks.onPanelRequest?.(this.activePanel, this.canvas);
      this.wake();
    });
    this.panelLinks.forEach((link, index) => on(link, 'focus', () => this.focusPanel(index)));
    on(document, 'visibilitychange', () => {
      if (document.hidden) { this.sleep(); this.audio?.suspend(); }
      else { if (this.settings.sound) this.audio?.resume(); this.wake(); }
    });
    on(this.reduced, 'change', () => this.setSettings());
  }

  bindContext() {
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.lost = true; this.ready = false;
      this.sleep(); this.audio?.suspend();
      this.workController.abort(new DOMException('WebGL context lost', 'AbortError'));
      this.callbacks.onUnavailable?.(new Error('WebGL context lost'));
    }, { signal: this.controller.signal });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      const previous = this.restoration || this.readyPromise;
      this.restoration = previous.catch(() => {}).then(async () => {
        if (this.disposed) return;
        // An initial loss can interrupt geometry construction. Recreate only if
        // no complete scene exists; navigation never follows this exceptional path.
        if (!this.optics) {
          this.callbacks.onUnavailable?.(new Error('Reload to restore the interrupted showroom.'));
          return;
        }
        this.workController = new AbortController();
        await this.restore();
      });
      this.restoration.catch(error => {
        if (!this.disposed) this.callbacks.onUnavailable?.(error);
      });
    }, { signal: this.controller.signal });
  }

  async restore() {
    const signal = this.workController.signal;
    this.host.classList.remove('scene-unavailable', 'scene-ready');
    this.progress('Restoring the showroom');
    await this.prepareEnvironment(signal);
    this.preparation = prepareRoomRenderer(this, { signal });
    await this.preparation;
    this.renderer.shadowMap.needsUpdate = true;
    this.render(1 / 60, 0);
    await yieldToBrowser(signal);
    this.ready = true;
    this.host.classList.add('scene-ready');
    this.host.dataset.sceneStatus = 'ready';
    this.observeSize();
    this.callbacks.onReady?.(); this.wake();
  }

  observeSize() {
    if (this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
  }

  release() {
    if (this.drag && this.canvas.hasPointerCapture(this.drag.id)) this.canvas.releasePointerCapture(this.drag.id);
    this.drag = null;
    this.canvas.classList.remove('dragging');
    this.canvas.style.cursor = 'grab';
  }

  pick(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    this.pickPosition.set((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2);
    this.raycaster.setFromCamera(this.pickPosition, this.camera);
    const targets = [...this.panels.map(panel => panel.screen), this.pickOccluders].filter(Boolean);
    const hits = this.raycaster.intersectObjects(targets, true);
    return hits.length && Number.isInteger(hits[0].object.userData.panel) ? hits[0].object.userData.panel : -1;
  }

  selectPanel(index) {
    this.activePanel = panelIndex(index);
    const panel = ROOM_PANELS[this.activePanel];
    this.host.dataset.activePanel = this.activePanel;
    document.querySelectorAll('[data-focus-panel]').forEach(button => {
      const active = Number(button.dataset.focusPanel) === this.activePanel;
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
    const title = this.host.querySelector('[data-active-panel-title]');
    const number = this.host.querySelector('[data-active-panel-number]');
    const open = this.host.querySelector('[data-active-panel-open]');
    if (title) title.textContent = panel.title;
    if (number) number.innerHTML = `0${this.activePanel + 1} <span>/ 05</span>`;
    if (open) {
      open.dataset.openPanel = this.activePanel;
      open.querySelector('span').textContent = panel.action;
      open.setAttribute('aria-label', `${panel.action}: ${panel.title}`);
    }
  }

  focusPanel(index) {
    if (!this.ready || !this.panels) return;
    this.selectPanel(index);
    this.cameraRig.preview(this.panels[this.activePanel]); this.wake();
  }

  approach(index, onComplete) {
    if (!this.ready) return false;
    this.release(); this.selectPanel(index);
    this.host.classList.add('camera-travelling');
    this.cameraRig.approach(this.panels[this.activePanel], {
      reduced: this.reduced.matches,
      onComplete: () => { this.host.classList.remove('camera-travelling'); onComplete?.(); },
    });
    this.wake(); return true;
  }

  reset(onComplete) {
    if (!this.ready) { onComplete?.(); return; }
    this.host.classList.remove('camera-travelling');
    this.hoverPanel = -1; this.pendingPick = null; this.selectPanel(0);
    this.cameraRig.reset({ reduced: this.reduced.matches, onComplete }); this.wake();
  }

 async setSound(enabled){
  if(!enabled){if(this.audio)await this.audio.suspend();return false;}
  if(!this.audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;this.audio=new Audio();const master=this.audio.createGain();master.gain.value=.027;master.connect(this.audio.destination);for(const [f,g]of [[43,.32],[86,.17],[129,.065]]){const o=this.audio.createOscillator(),gain=this.audio.createGain();o.type='sine';o.frequency.value=f;gain.gain.value=g;o.connect(gain).connect(master);o.start();}const b=this.audio.createBuffer(1,this.audio.sampleRate*3,this.audio.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*.17;const n=this.audio.createBufferSource();n.buffer=b;n.loop=true;const filter=this.audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;n.connect(filter).connect(master);n.start();}await this.audio.resume();return true;
 }

  setSettings() {
    if (!this.ready || !this.optics) return;
    this.optics.setQuality(this.settings.quality);
    const shadows = this.settings.quality !== 'low';
    if (this.renderer.shadowMap.enabled !== shadows) {
      this.renderer.shadowMap.enabled = shadows; this.renderer.shadowMap.needsUpdate = true;
    }
    this.resize(); this.wake();
  }

  resize() {
    if (this.disposed || !this.optics) return;
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (width < 2 || height < 2) return;
    const budget = renderBudget(width, height, devicePixelRatio || 1, this.settings.quality);
    const key = [width, height, budget.ratio, budget.reflection].join(':');
    if (key === this.viewportKey) return;
    this.viewportKey = key;
    Object.assign(this, { width, height, budget });
    this.renderer.setPixelRatio(budget.ratio); this.renderer.setSize(width, height, false);
    this.optics.resize(width, height, budget.ratio);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.cameraRig.resize(width);
    this.ground.getRenderTarget().setSize(budget.reflection, budget.reflection);
    this.ground.material.uniforms.reflectionResolution.value.set(budget.reflection, budget.reflection);
    this.updateLinkProjection(); this.wake();
  }

  updateLinkProjection() {
    if (!this.panelLinks) return;
    this.panels.forEach((panel, index) => {
      const points = panel.corners.map(corner => {
        const p = corner.clone().project(this.camera);
        return [(p.x * .5 + .5) * this.width, (-p.y * .5 + .5) * this.height];
      });
      const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
      const left = Math.min(...xs), top = Math.min(...ys);
      const width = Math.max(.01, Math.max(...xs) - left), height = Math.max(.01, Math.max(...ys) - top);
      const link = this.panelLinks[index];
      if (link) Object.assign(link.style, {
        left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`,
        clipPath: `polygon(${points.map(([x, y]) => `${(x - left) / width * 100}% ${(y - top) / height * 100}%`).join(',')})`,
        pointerEvents: 'none',
      });
    });
  }

  updateAtmosphere() {
    for (const smoke of this.smokes) {
      smoke.quaternion.copy(this.camera.quaternion); smoke.material.uniforms.time.value = this.time;
      smoke.position.x = smoke.userData.base.x + Math.sin(this.time * .18 + smoke.userData.phase) * .23;
      smoke.position.y = smoke.userData.base.y + Math.sin(this.time * .23 + smoke.userData.phase) * .07;
    }
    for (const beam of this.beams) { beam.quaternion.copy(this.camera.quaternion); beam.material.uniforms.time.value = this.time; }
    this.dust.rotation.y = this.time * .009; this.ground.material.uniforms.time.value = this.time;
  }

  render(dt, motion) {
    this.renderer.info.reset();
    this.optics.render(dt, { time: this.time, motion, focusDistance: this.cameraRig.focusDistance, paused: this.settings.paused || this.reduced.matches });
    this.frames++;
  }

  wake() {
    if (!this.ready || this.disposed || this.raf || document.hidden || this.lost) return;
    this.last = performance.now(); this.raf = requestAnimationFrame(now => this.frame(now));
  }
  sleep() { cancelAnimationFrame(this.raf); this.raf = 0; }

  frame(now) {
    this.raf = 0;
    if (!this.ready || this.disposed || this.lost || document.hidden) return;
    const dt = elapsedFrameTime(now, this.last); this.last = now;
    const animated = !this.settings.paused && !this.reduced.matches;
    if (animated) this.time += Math.min(.05, dt);
    const moving = this.cameraRig.update(dt);
    if (this.pendingPick && this.cameraRig.mode === 'overview') {
      this.hoverPanel = this.pick(...this.pendingPick); this.pendingPick = null;
      this.canvas.style.cursor = this.drag ? 'grabbing' : this.hoverPanel >= 0 ? 'pointer' : 'grab';
    }
    this.updateAtmosphere(); this.render(dt, moving ? .5 : 0);
    if (moving) this.updateLinkProjection();
    if (animated || moving || this.pendingPick) this.raf = requestAnimationFrame(time => this.frame(time));
  }

  inspect() {
    return {
      ready: this.ready, modelReady: this.modelReady, startup: this.startup,
      panels: this.panels?.length, cameraMode: this.cameraRig?.mode,
      cameraPosition: this.camera?.position.toArray(), fov: this.camera?.fov,
      activePanel: this.activePanel, frames: this.frames,
      width: this.canvas.width, height: this.canvas.height,
      drawCalls: this.renderer?.info.render.calls, triangles: this.renderer?.info.render.triangles,
      quality: this.settings.quality, fixedPanels: true,
    };
  }

  async dispose() {
    if (this.disposed) return;
    this.disposed = true; this.ready = false; this.sleep(); this.release();
    this.controller.abort(); this.resizeObserver?.disconnect(); this.audio?.close();
    // Driver compilation cannot be cancelled. Don't destroy its renderer early.
    await this.readyPromise.catch(() => {});
    await this.restoration?.catch(() => {});
    await this.preparation?.catch(() => {});
    disposeObjects(this.scene); disposeObjects(this.pickOccluders);
    this.textures?.forEach(texture => texture.dispose());
    this.ground?.dispose(); this.environment?.dispose(); this.key?.shadow.dispose();
    this.optics?.dispose(); this.renderer?.dispose();
  }
}
