import type { QualityTier } from './quality';

/** Native scrolling moves one continuous world; relative transforms supply depth. */
export function createParallax(world: HTMLElement, onFrame?: () => void): {
  syncScroll(): void;
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
  let reducedMotion = false;
  let visible = false;
  let destroyed = false;
  let frame = 0;
  let worldTop = 0;
  let worldHeight = 0;
  let lastApplied = NaN;
  let geometryDirty = true;

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
  }

  function tick() {
    frame = 0;
    if (destroyed || document.hidden || reducedMotion) return;
    if (geometryDirty) measure();
    if (!visible) return;
    // Wheel input already eases the real document scroll position. Depth must
    // use that same position, not a second delayed copy: otherwise the sky
    // keeps drifting downward after an upward document movement has stopped.
    // Native touch, scrollbar and keyboard input also keep the same geometry.
    apply(Math.max(0, Math.min(worldHeight, window.scrollY - worldTop)));
  }

  function request() {
    if (destroyed || reducedMotion || document.hidden) return;
    if (!frame && (visible || geometryDirty)) frame = requestAnimationFrame(tick);
  }

  function resize() {
    geometryDirty = true;
    request();
  }

  window.addEventListener('scroll', () => request(), { passive: true, signal });
  window.addEventListener('resize', resize, { passive: true, signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else { geometryDirty = true; request(); }
  }, { signal });

  const intersection = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (!entry) return;
    visible = entry.isIntersecting && entry.intersectionRatio > 0.001;
    if (visible) request();
    else stop();
  }, { threshold: 0.001 });
  intersection.observe(world);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(world);
  measure();
  request();

  return {
    syncScroll() {
      // The wheel controller has just written scrollY in this same frame.
      // Cancel its queued native-scroll update and use the new value before
      // paint, rather than exposing one frame of uncompensated sky movement.
      stop();
      tick();
    },
    setReducedMotion(value) {
      if (value === reducedMotion) return;
      reducedMotion = value;
      if (value) {
        stop();
        apply(0);
      } else {
        geometryDirty = true;
        request();
      }
    },
    setQuality(_value) {
      // Quality budgets affect rendering, not the physical depth of scenery.
      request();
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
