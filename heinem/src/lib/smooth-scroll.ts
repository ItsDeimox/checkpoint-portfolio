export interface SmoothScrollController {
  setReducedMotion(value: boolean): void;
  destroy(): void;
}

const RESPONSE_MS = 125;
const MAX_FRAME_MS = 64;
const MAX_SETTLE_MS = 650;
const POSITION_EPSILON = 0.4;
const NATIVE_CONTROLS = [
  'input', 'textarea', 'select', 'option', 'button', 'a[href]', 'iframe',
  'audio', 'video', '[contenteditable]:not([contenteditable="false"])',
  '[role="slider"]', '[role="spinbutton"]', '[role="textbox"]',
  '[role="combobox"]', '[role="listbox"]', '[role="menu"]',
  '[data-native-scroll]',
].join(',');
const SCROLL_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown',
  'Home', 'End', ' ', 'Spacebar', 'Escape', 'Tab',
]);

/** Smooth vertical wheel input while keeping the document's real scrollY. */
export function createSmoothScroll(reducedMotion: boolean): SmoothScrollController {
  const listeners = new AbortController();
  let reduced = reducedMotion;
  let destroyed = false;
  let wheelAttached = false;
  let frame: number | null = null;
  let current = window.scrollY;
  let target = current;
  let lastWritten = current;
  let lastFrameTime = 0;
  let settlingTime = 0;
  let maximum = 0;
  let viewportHeight = window.innerHeight;
  let lineHeight = 16;

  const clamp = (value: number) => Math.max(0, Math.min(maximum, value));

  function cancel() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    current = target = lastWritten = clamp(window.scrollY);
    lastFrameTime = settlingTime = 0;
  }

  function measureBounds() {
    viewportHeight = window.innerHeight;
    const root = document.scrollingElement ?? document.documentElement;
    maximum = Math.max(0, Math.max(
      root.scrollHeight,
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0,
    ) - viewportHeight);
    const rootStyle = window.getComputedStyle(document.documentElement);
    const measuredLine = Number.parseFloat(rootStyle.lineHeight);
    lineHeight = Number.isFinite(measuredLine) && measuredLine > 0 ? measuredLine : 16;
    current = clamp(current);
    target = clamp(target);
    lastWritten = clamp(lastWritten);
    if (maximum === 0) cancel();
  }

  function needsNativeWheel(event: WheelEvent): boolean {
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey
      || event.shiftKey || event.altKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return true;
    }
    // The composed path also protects controls and scrolling areas in shadow DOM.
    for (const node of event.composedPath()) {
      if (!(node instanceof Element)) continue;
      if (node.matches(NATIVE_CONTROLS)) return true;
      if (node === document.documentElement || node === document.body) continue;
      const style = window.getComputedStyle(node);
      const canScrollY = /^(auto|scroll|overlay)$/.test(style.overflowY)
        && node.scrollHeight > node.clientHeight + 1;
      const canScrollX = /^(auto|scroll|overlay)$/.test(style.overflowX)
        && node.scrollWidth > node.clientWidth + 1;
      if (canScrollY || canScrollX) return true;
    }
    return false;
  }

  function animate(now: number) {
    frame = null;
    if (destroyed || reduced || document.hidden) {
      cancel();
      return;
    }
    const elapsed = Math.min(MAX_FRAME_MS, Math.max(0, now - lastFrameTime));
    lastFrameTime = now;
    settlingTime += elapsed;
    const difference = target - current;
    const finish = Math.abs(difference) <= POSITION_EPSILON || settlingTime >= MAX_SETTLE_MS;
    current = finish ? target : current + difference * (1 - Math.exp(-elapsed / RESPONSE_MS));
    lastWritten = current;
    // Explicit instant overrides the page's CSS scroll-behavior:smooth.
    // There are no geometry/computed-style reads in this animation loop.
    window.scrollTo({ top: current, behavior: 'instant' });
    if (!finish) frame = window.requestAnimationFrame(animate);
    else lastFrameTime = settlingTime = 0;
  }

  function onWheel(event: WheelEvent) {
    if (destroyed || reduced || document.hidden) return;
    if (needsNativeWheel(event) || !Number.isFinite(event.deltaY) || event.deltaY === 0) {
      cancel();
      return;
    }
    // Refresh on input as well as resize: late content/overflow can alter the
    // page extent without changing an observed element's border box.
    measureBounds();
    const actual = clamp(window.scrollY);
    if (frame !== null && Math.abs(actual - lastWritten) > 1.5) cancel();
    current = actual;
    if (frame === null) target = current;

    const unit = event.deltaMode === 1 ? lineHeight : event.deltaMode === 2 ? viewportHeight : 1;
    const maximumDelta = Math.max(240, Math.min(640, viewportHeight * 0.8));
    const delta = Math.max(-maximumDelta, Math.min(maximumDelta, event.deltaY * unit));
    // Reversing the wheel cancels accumulated forward momentum immediately.
    if (Math.sign(delta) !== Math.sign(target - current) && target !== current) target = current;
    const maximumBacklog = Math.max(700, viewportHeight * 1.5);
    const backlog = Math.max(-maximumBacklog, Math.min(maximumBacklog, target - current + delta));
    const nextTarget = clamp(current + backlog);
    if (Math.abs(nextTarget - current) <= POSITION_EPSILON) {
      cancel();
      return; // Preserve the browser's native boundary/overscroll behavior.
    }

    event.preventDefault();
    target = nextTarget;
    lastWritten = current;
    settlingTime = 0;
    if (frame === null) {
      lastFrameTime = performance.now();
      frame = window.requestAnimationFrame(animate);
    }
  }

  function syncWheelListener() {
    const shouldAttach = !destroyed && !reduced && !document.hidden;
    if (shouldAttach === wheelAttached) return;
    if (shouldAttach) {
      window.addEventListener('wheel', onWheel, { passive: false, signal: listeners.signal });
    } else {
      window.removeEventListener('wheel', onWheel);
    }
    wheelAttached = shouldAttach;
  }

  function onNativeScroll() {
    // Root scroll events from our writes agree with lastWritten. Native input,
    // anchors or programmatic navigation take ownership when they disagree.
    if (frame !== null && Math.abs(window.scrollY - lastWritten) > 1.5) cancel();
  }

  const passive = { passive: true, signal: listeners.signal };
  const capture = { ...passive, capture: true };
  window.addEventListener('scroll', onNativeScroll, passive);
  window.addEventListener('pointerdown', cancel, capture);
  window.addEventListener('touchstart', cancel, capture);
  window.addEventListener('click', cancel, capture);
  window.addEventListener('blur', cancel, passive);
  window.addEventListener('hashchange', cancel, passive);
  window.addEventListener('popstate', cancel, passive);
  window.addEventListener('keydown', (event) => {
    if (SCROLL_KEYS.has(event.key) || event.ctrlKey || event.metaKey) cancel();
  }, capture);
  window.addEventListener('resize', measureBounds, passive);
  document.addEventListener('visibilitychange', () => {
    cancel();
    syncWheelListener();
  }, passive);

  const resizeObserver = typeof ResizeObserver === 'undefined'
    ? undefined
    : new ResizeObserver(measureBounds);
  resizeObserver?.observe(document.documentElement);
  if (document.body) resizeObserver?.observe(document.body);
  measureBounds();
  syncWheelListener();

  return {
    setReducedMotion(value) {
      if (destroyed || reduced === value) return;
      reduced = value;
      cancel();
      syncWheelListener();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancel();
      syncWheelListener();
      listeners.abort();
      resizeObserver?.disconnect();
    },
  };
}
