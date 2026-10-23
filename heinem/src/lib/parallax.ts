import type { QualityTier } from './quality';

/** Native scrolling moves the document; these small relative offsets create depth. */
export function createParallax(hero: HTMLElement, onFrame?: () => void): {
  setReducedMotion(value: boolean): void;
  setQuality(quality: QualityTier): void;
  destroy(): void;
} {
  const layers = [...hero.querySelectorAll<HTMLElement>('[data-depth]')].map(element => {
    const parsed = Number(element.dataset.depth);
    return { element, depth: Number.isFinite(parsed) ? parsed : 0, original: element.style.transform };
  });
  const events = new AbortController();
  const { signal } = events;
  let quality: QualityTier = 'high';
  let reducedMotion = false;
  let visible = false;
  let destroyed = false;
  let frame = 0;
  let heroTop = 0;
  let heroHeight = 0;
  let current = 0;
  let lastApplied = NaN;
  let previousTime = 0;
  let geometryDirty = true;
  let snapNext = true;

  function measure() {
    const bounds = hero.getBoundingClientRect();
    heroTop = bounds.top + window.scrollY;
    heroHeight = bounds.height;
    visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
    geometryDirty = false;
  }

  function apply(offset: number) {
    if (offset === lastApplied) return;
    for (const layer of layers) {
      const translation = Math.round(offset * layer.depth * 100) / 100;
      layer.element.style.transform = `translate3d(0, ${translation}px, 0)`;
    }
    // Reveal the continuous meadow before a translated source image reaches its edge.
    const blend = Math.max(0, Math.min(1, (offset / Math.max(heroHeight, 1) - 0.3) / 0.55));
    hero.style.setProperty('--scene-presence', String(1 - blend * blend * (3 - 2 * blend)));
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
    const target = Math.max(0, Math.min(heroHeight, window.scrollY - heroTop));
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
  intersection.observe(hero);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hero);
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
      hero.style.removeProperty('--scene-presence');
    },
  };
}
