import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadShowroomCar } from './room-car.js';
import { refineCarMaterials } from './room-materials.js';
import { buildShowroom } from './room-environment.js';
import { RoomOptics } from './room-optics.js';
import { RoomTurntable, TURNTABLE_RADIUS, TURNTABLE_CENTER } from './room-turntable.js';
import { RoomCamera } from './room-camera.js';
import { prepareRoomRenderer, yieldToBrowser, waitForAsset } from './room-startup.js';
import { renderBudget, panelIndex } from './room-core.js';
import { ROOM_PANELS } from '../pages/room-panel-data.js';
import { RoomPanelContent } from './room-panel-content.js';
import { bindRoomPointer } from './room-input.js';
import { buildRoomLights, dressStudioEnvironment, buildRoomAtmosphere, updateRoomAtmosphere } from './room-lighting.js';
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
      raf: 0, time: 0, frames: 0, activePanel: 0, hoverPanel: -1, drag: null, contentPanel: null,
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
    this.panelContent = new RoomPanelContent({ onChange: () => this.wake() });
    this.panels.forEach(panel => {
      const texture = this.panelContent.getTexture(panel.index);
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      panel.material.uniforms.contentMap.value = texture;
    });
    await yieldToBrowser(signal);
    this.buildLights();
    await yieldToBrowser(signal);
    this.buildAtmosphere();
    await this.prepareEnvironment(signal);
    await waitForAsset(assetsReady, signal);
    await waitForAsset(this.panelContent.ready, signal);
    signal.throwIfAborted();
    if (textureErrors.length) throw new Error(`Showroom artwork could not load: ${textureErrors.join(', ')}`);
    this.startup.assetsMs = Math.round(performance.now() - this.startedAt);

    this.turntable = new RoomTurntable();
    this.turntable.mount(this.scene,[this.carPivot,...this.turntableParts]);
    this.syncCarPicking();
    this.turntablePick = new T.Mesh(new T.CircleGeometry(TURNTABLE_RADIUS,96),new T.MeshBasicMaterial({side:T.DoubleSide}));
    this.turntablePick.rotation.x=-Math.PI/2;this.turntablePick.position.set(0,.031,TURNTABLE_CENTER[2]);
    this.turntablePick.userData.turntable=true;this.turntablePick.updateMatrixWorld(true);
    this.optics = new RoomOptics(this.renderer, this.scene, this.camera);
    this.optics.attachTurntable(this.turntable.group);
    this.composer = this.optics.composer;
    this.optics.setQuality(this.settings.quality);
    this.optics.setVisualSettings(this.settings.visual);
    this.renderer.shadowMap.enabled = this.settings.quality !== 'low';
    this.resize();
    this.raycaster = new T.Raycaster();
    this.pickPosition = new T.Vector2();
    this.pickTargets = [...this.panels.map(panel => panel.screen), this.pickOccluders, this.turntablePick].filter(Boolean);
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
    dressStudioEnvironment(room);
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
      this.scene.environmentIntensity = .40;
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
    refineCarMaterials(car);
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
      mesh.userData.turntable = true;this.pickOccluders.add(mesh);
    }
    this.carPivot.updateWorldMatrix(true, true);
    this.pickOccluders.matrix.copy(this.carPivot.matrixWorld);
    this.pickOccluders.updateMatrixWorld(true);
  }

  syncCarPicking() {
    if(!this.carPivot || !this.pickOccluders)return;
    this.carPivot.updateWorldMatrix(true,true);
    this.pickOccluders.matrix.copy(this.carPivot.matrixWorld);
    this.pickOccluders.updateMatrixWorld(true);
  }

  beginTurntable(x,y) {
    if(!this.turntable || this.cameraRig.mode!=='overview')return false;
    if(!this.hitTest(x,y)?.object.userData.turntable)return false;
    this.cameraRig.targetYaw=this.cameraRig.yaw;this.cameraRig.targetPitch=this.cameraRig.pitch;
    this.turntable.begin();this.clearHover();this.pendingPick=this.lastPointer=null;
    this.canvas.style.cursor='grabbing';return true;
  }

  buildLights() { buildRoomLights(this); }
  buildAtmosphere() { buildRoomAtmosphere(this); }

  bind() {
    const on = (element, event, handler, options = {}) => element?.addEventListener(event, handler, { ...options, signal: this.controller.signal });
    bindRoomPointer(this, on);
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
    this.canvas.style.cursor = 'default';
  }

  hitTest(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    this.pickPosition.set((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2);
    this.raycaster.setFromCamera(this.pickPosition, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickTargets, true);
    return hits[0] ?? null;
  }

  hitAt(x,y) {const hit=this.hitTest(x,y);return Number.isInteger(hit?.object.userData.panel)?hit:null;}

  pick(x, y) { return this.hitAt(x, y)?.object.userData.panel ?? -1; }

  activateAt(x, y) {
    const hit = this.hitAt(x, y);
    if (!hit) return;
    const index = hit.object.userData.panel;
    if (this.cameraRig.mode === 'focused' && index === this.contentPanel) {
      const action = this.panelContent.getActionAtUV(index, hit.uv);
      if (action) this.callbacks.onPanelAction?.(action);
    } else if (this.cameraRig.mode === 'overview') {
      this.callbacks.onPanelRequest?.(index, this.panelLinks[index]);
    }
  }

  showPanelContent(index) {
    if (!this.ready || this.cameraRig.mode !== 'focused') return;
    this.contentPanel = panelIndex(index); this.clearHover(); this.wake();
  }

  hidePanelContent() {
    this.clearHover(); this.contentPanel = null;
  }

  clearHover() {
    this.hoverPanel = -1;
    if (this.contentPanel !== null) this.panelContent?.setHovered(this.contentPanel, null);
  }

  focusAction(id) {
    if (this.contentPanel === null) return;
    this.panelContent.setHovered(this.contentPanel, id);
    this.hoverPanel = id ? this.contentPanel : -1;
    this.pendingPick = this.lastPointer = null; this.wake();
  }

  updateHover() {
    if (!this.pendingPick) return;
    const hit = this.hitTest(...this.pendingPick);
    this.pendingPick = null;
    const index = hit?.object.userData.panel ?? -1;
    let clickable = false;
    if (this.cameraRig.mode === 'overview') {
      this.hoverPanel = index; clickable = index >= 0;
    } else if (this.cameraRig.mode === 'focused' && this.contentPanel !== null) {
      const action = index === this.contentPanel ? this.panelContent.getActionAtUV(index, hit.uv) : null;
      this.panelContent.setHovered(this.contentPanel, action);
      this.hoverPanel = index === this.contentPanel ? index : -1;
      clickable = Boolean(action);
    }
    if (this.hoverPanel >= 0) this.panels[this.hoverPanel].material.uniforms.hoverUv.value.copy(hit.uv);
    this.canvas.style.cursor = this.drag?.mode === 'turntable' || this.drag?.type === 'touch' ? 'grabbing' : clickable ? 'pointer' : this.cameraRig.mode === 'overview' && hit?.object.userData.turntable ? 'grab' : 'default';
  }

  updatePanels(dt) {
    const alpha = this.reduced.matches ? 1 : 1 - Math.exp(-Math.min(dt, .1) * 10);
    let moving = false;
    for (const panel of this.panels) {
      const uniforms = panel.material.uniforms;
      if(uniforms.hoverTime)uniforms.hoverTime.value=this.time;
      for (const [key, target] of [['hover', panel.index === this.hoverPanel ? 1 : 0], ['contentMix', panel.index === this.contentPanel ? 1 : 0]]) {
        const difference = target - uniforms[key].value;
        uniforms[key].value = Math.abs(difference) < .001 ? target : uniforms[key].value + difference * alpha;
        moving ||= Math.abs(target - uniforms[key].value) >= .001;
      }
    }
    const litIndex = this.contentPanel ?? (this.hoverPanel < 0 ? null : this.hoverPanel);
    const lit = litIndex !== null ? this.panels[litIndex] : null;
    if (lit && this.lightPanel !== litIndex) {
      this.screenLight.position.copy(lit.center).addScaledVector(lit.normal, .65);
      this.screenLight.intensity = 0; this.lightPanel = litIndex;
    }
    const intensity = lit ? this.contentPanel !== null ? 1.2 : 2.5 : 0;
    this.screenLight.intensity += (intensity - this.screenLight.intensity) * alpha;
    return moving;
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
    this.turntable?.end(false);this.release(); this.hidePanelContent(); this.pendingPick = this.lastPointer = null; this.selectPanel(index);
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
    this.turntable?.end(false);this.release();this.hidePanelContent(); this.pendingPick = this.lastPointer = null; this.selectPanel(0);
    this.cameraRig.reset({ reduced: this.reduced.matches, onComplete }); this.wake();
  }

 async setSound(enabled){
  if(!enabled){if(this.audio)await this.audio.suspend();return false;}
  if(!this.audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;this.audio=new Audio();const master=this.audio.createGain();master.gain.value=.027;master.connect(this.audio.destination);for(const [f,g]of [[43,.32],[86,.17],[129,.065]]){const o=this.audio.createOscillator(),gain=this.audio.createGain();o.type='sine';o.frequency.value=f;gain.gain.value=g;o.connect(gain).connect(master);o.start();}const b=this.audio.createBuffer(1,this.audio.sampleRate*3,this.audio.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*.17;const n=this.audio.createBufferSource();n.buffer=b;n.loop=true;const filter=this.audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;n.connect(filter).connect(master);n.start();}await this.audio.resume();return true;
 }

  setSettings() {
    if (!this.ready || !this.optics) return;
    this.optics.setQuality(this.settings.quality);
    this.optics.setVisualSettings(this.settings.visual);
    for(const beam of this.beams ?? [])beam.material.uniforms.beamSamples.value=this.settings.quality==='high'?32:this.settings.quality==='low'?12:20;
    if(this.settings.paused || this.reduced.matches)this.turntable?.end(false);
    if (this.reduced.matches) { this.cameraRig.neutralLook(); this.cameraRig.update(60); }
    const shadows = this.settings.quality !== 'low';
    if (this.renderer.shadowMap.enabled !== shadows) {
      this.renderer.shadowMap.enabled = shadows; this.renderer.shadowMap.needsUpdate = true;
    }
    this.resize(); this.wake();
  }

  setVisualSettings(values) {
    if (!this.optics) return;
    this.optics.setVisualSettings(values); this.wake();
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
    if (this.reduced.matches) this.cameraRig.update(60);
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

  updateAtmosphere() { updateRoomAtmosphere(this); }

  render(dt, motion) {
    this.renderer.info.reset();
    this.optics.render(dt, {
      time: this.time, motion, focusDistance: this.cameraRig.focusDistance,
      turntableDelta:this.turntable?.frameDelta ?? 0,
      paused: this.settings.paused || this.reduced.matches,
      projectionAnimated: this.cameraRig.mode === 'approaching' || this.cameraRig.mode === 'returning',
    });
    this.frames++;
  }

  wake() {
    if (!this.ready || this.disposed || this.raf || this.inFrame || document.hidden || this.lost) return;
    this.last = performance.now(); this.raf = requestAnimationFrame(now => this.frame(now));
  }
  sleep() { cancelAnimationFrame(this.raf); this.raf = 0; }

  frame(now) {
    this.raf = 0;
    if (!this.ready || this.disposed || this.lost || document.hidden) return;
    // Surface redraws and arrival callbacks can call wake() synchronously.
    // Keep one frame owner so those callbacks cannot fork animation loops.
    this.inFrame = true;
    let continueFrames = false;
    try {
      const dt = elapsedFrameTime(now, this.last); this.last = now;
      const animated = !this.settings.paused && !this.reduced.matches;
      if (animated) this.time += Math.min(.05, dt);
      const rotating=this.turntable?.update(dt) ?? false;
      if(rotating){
        this.syncCarPicking();this.renderer.shadowMap.needsUpdate=true;
        this.ground.material.uniforms.turntableAngle.value=this.turntable.angle;
      }
      const moving = this.cameraRig.update(dt);
      if (moving && this.lastPointer && this.cameraRig.mode === 'overview') this.pendingPick = this.lastPointer;
      this.updateHover();
      const surfacesMoving = this.updatePanels(dt);
      this.updateAtmosphere(); this.render(dt, moving || rotating ? .65 : 0);
      if (moving) this.updateLinkProjection();
      continueFrames = animated || moving || rotating || this.turntable?.moving || surfacesMoving || Boolean(this.pendingPick);
    } finally { this.inFrame = false; }
    if (continueFrames && this.ready && !this.disposed && !this.lost && !document.hidden) {
      this.raf = requestAnimationFrame(time => this.frame(time));
    }
  }

  inspect() {
    return {
      ready: this.ready, modelReady: this.modelReady, startup: this.startup,
      panels: this.panels?.length, cameraMode: this.cameraRig?.mode,
      cameraPosition: this.camera?.position.toArray(), fov: this.camera?.fov,
      activePanel: this.activePanel, frames: this.frames,
      width: this.canvas.width, height: this.canvas.height,
      drawCalls: this.renderer?.info.render.calls, triangles: this.renderer?.info.render.triangles,
      quality: this.settings.quality, fixedPanels: true, contentPanel: this.contentPanel,
      sceneSamples: this.optics?.sceneTarget.samples, visual: this.optics?.visualSettings,
      turntableAngle:this.turntable?.angle,turntableVelocity:this.turntable?.velocity,
      hoverPanel:this.hoverPanel,bloomLevels:this.optics?.bloomPass.levels.length,
      beamSamples:this.beams?.[0]?.material.uniforms.beamSamples.value,
      motionShutter:this.optics?.lensPass.uniforms.uShutter.value,
      objectMotion:this.optics?.lensPass.uniforms.uObjectMotion.value,
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
    disposeObjects(this.scene); disposeObjects(this.pickOccluders);disposeObjects(this.turntablePick);
    this.textures?.forEach(texture => texture.dispose());
    this.panelContent?.dispose();
    this.ground?.dispose(); this.environment?.dispose(); this.key?.shadow.dispose();
    this.optics?.dispose(); this.renderer?.dispose();
  }
}
