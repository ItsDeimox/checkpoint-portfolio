import type { QualityTier } from './quality';

/** Native scrolling moves one continuous world; relative transforms supply depth. */
export function createParallax(world: HTMLElement, onFrame?: () => void): {
  setReducedMotion(value: boolean): void;
  setQuality(quality: QualityTier): void;
  destroy(): void;
} {
  const layers = [...world.querySelectorAll<HTMLElement>('[data-depth]')].map(element => {
    const parsed = Number(element.dataset.depth);
    const baseDepth = Number.isFinite(parsed) ? parsed : 0;
    const mobile = Number(element.dataset.depthMobile ?? baseDepth);
    return { element, depth: baseDepth, baseDepth, mobileDepth: Number.isFinite(mobile) ? mobile : baseDepth, original: element.style.transform };
  });
  const events = new AbortController();
  const { signal } = events;
  let quality: QualityTier = 'high';
  let reducedMotion = false;
  let visible = false;
  let destroyed = false;
  let frame = 0;
  let worldTop = 0;
  let worldHeight = 0;
  let current = 0;
  let lastApplied = NaN;
  let previousTime = 0;
  let geometryDirty = true;
  let snapNext = true;

  function measure() {
    const bounds = world.getBoundingClientRect();
    worldTop = bounds.top + window.scrollY;
    worldHeight = bounds.height;
    visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
    for (const layer of layers) layer.depth = window.innerWidth <= 700 ? layer.mobileDepth : layer.baseDepth;
    lastApplied = NaN;
    geometryDirty = false;
  }

  function apply(offset: number) {
    if (offset === lastApplied) return;
    for (const layer of layers) {
      const translation = Math.round(offset * layer.depth * 100) / 100;
      layer.element.style.transform = `translate3d(0, ${translation}px, 0)`;
    }
    // The tall foreground exposes its own lower terrain as it travels upward.
    // No opacity animation, section mask, mirrored strip or second meadow exists.
    lastApplied = offset;
    onFrame?.();
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }

  function tick(time: number) {
    frame = 0;
    if (destroyed || document.hidden || reducedMotion) return;
    if (geometryDirty) measure();
    if (!visible) { previousTime = 0; return; }
    const target = Math.max(0, Math.min(worldHeight, window.scrollY - worldTop));
    const delta = previousTime ? Math.min(64, time - previousTime) : 16.7;
    previousTime = time;
    // Low keeps compositor transforms but avoids additional easing frames.
    current = snapNext || quality === 'low' ? target : current + (target - current) * (1 - Math.exp(-delta / 95));
    snapNext = false;
    if (Math.abs(current - target) < 0.08) current = target;
    apply(current);
    if (current !== target) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  }

  function request(snap = false) {
    if (destroyed || reducedMotion || document.hidden) return;
    snapNext ||= snap;
    if (!frame && (visible || geometryDirty)) frame = requestAnimationFrame(tick);
  }

  function resize() {
    geometryDirty = true;
    request(true);
  }

  window.addEventListener('scroll', () => request(), { passive: true, signal });
  window.addEventListener('resize', resize, { passive: true, signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else { geometryDirty = true; request(true); }
  }, { signal });

  const intersection = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (!entry) return;
    visible = entry.isIntersecting && entry.intersectionRatio > 0.001;
    if (visible) request(true);
    else stop();
  }, { threshold: 0.001 });
  intersection.observe(world);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(world);
  measure();
  request(true);

  return {
    setReducedMotion(value) {
      if (value === reducedMotion) return;
      reducedMotion = value;
      if (value) {
        stop();
        current = 0;
        apply(0);
      } else {
        geometryDirty = true;
        request(true);
      }
    },
    setQuality(value) {
      if (value === quality) return;
      quality = value;
      request(true);
    },
    destroy() {
      destroyed = true;
      stop();
      events.abort();
      intersection.disconnect();
      resizeObserver.disconnect();
      for (const layer of layers) layer.element.style.transform = layer.original;
    },
  };
}
