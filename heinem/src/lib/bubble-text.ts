/**
 * Rasterize the real HTML typography once, then let the membrane shader move it.
 * The original heading/paragraph remain in the DOM for semantics, selection and
 * the no-WebGL fallback. No glyph wrappers or per-frame DOM work are created.
 */
export function createBubbleText(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  onRaster: (source: HTMLCanvasElement) => void,
) {
  const copy = host.querySelector<HTMLElement>('.bubble-copy');
  const events = new AbortController();
  let destroyed = false;
  let fontsReady = !document.fonts;
  let scheduled = 0;
  let source: HTMLCanvasElement | null = null;
  const segmenter = typeof Intl.Segmenter === 'undefined'
    ? null : new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  const characters = (text: string) => segmenter
    ? Array.from(segmenter.segment(text), item => ({ text: item.segment, start: item.index }))
    : Array.from(text).map((character, index, all) => ({ text: character, start: all.slice(0, index).join('').length }));

  function rasterize() {
    scheduled = 0;
    if (destroyed || !fontsReady || !copy) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    // <= 6 MiB packed RGBA and <= 2048 per edge, independent of display DPR.
    // This gives the small body type antialiasing without an unbounded 3x atlas.
    const scale = Math.min(2, Math.sqrt(1_500_000 / (bounds.width * bounds.height)), 2048 / Math.max(bounds.width, bounds.height));
    const ink = document.createElement('canvas');
    ink.width = Math.max(2, Math.ceil(bounds.width * scale));
    ink.height = Math.max(2, Math.ceil(bounds.height * scale));
    const paint = ink.getContext('2d', { willReadFrequently: true });
    if (!paint) return;
    paint.scale(scale, scale);
    paint.fillStyle = '#fff';
    paint.textBaseline = 'alphabetic';
    paint.fontKerning = 'normal';
    const styles = new Map<Element, CSSStyleDeclaration>();
    const matrices = new Map<Element, DOMMatrix>();
    const styleOf = (element: Element) => {
      let style = styles.get(element);
      if (!style) { style = getComputedStyle(element); styles.set(element, style); }
      return style;
    };
    const matrixOf = (element: Element) => {
      let result = matrices.get(element);
      if (result) return result;
      result = new DOMMatrix();
      let ancestor: Element | null = element;
      while (ancestor && ancestor !== host) {
        const transform = styleOf(ancestor).transform;
        if (transform !== 'none') result = new DOMMatrix(transform).multiply(result);
        ancestor = ancestor.parentElement;
      }
      matrices.set(element, result);
      return result;
    };
    const range = document.createRange();
    for (const block of copy.querySelectorAll<HTMLElement>('h1, p')) {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const parent = node.parentElement;
        if (!parent || !node.data.trim()) continue;
        const style = styleOf(parent);
        const matrix = matrixOf(parent);
        paint.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        // Native ranges provide kerning, responsive wrapping and letter-spacing;
        // only the visible shape is rasterized. Browser line breaks stay exact.
        const metrics = paint.measureText('Mg');
        const ascent = metrics.fontBoundingBoxAscent || Number.parseFloat(style.fontSize) * 0.8;
        const descent = metrics.fontBoundingBoxDescent || Number.parseFloat(style.fontSize) * 0.2;
        for (const part of characters(node.data)) {
          if (!part.text.trim()) continue;
          range.setStart(node, part.start);
          range.setEnd(node, part.start + part.text.length);
          const rect = range.getBoundingClientRect();
          if (rect.width < 0.01 || rect.height < 0.01) continue;
          const localHeight = rect.height / Math.max(0.001, Math.abs(matrix.d));
          const localWidth = Math.max(0, (rect.width - Math.abs(matrix.c) * localHeight) / Math.max(0.001, Math.abs(matrix.a)));
          const minX = Math.min(0, matrix.a * localWidth) + Math.min(0, matrix.c * localHeight);
          const minY = Math.min(0, matrix.b * localWidth) + Math.min(0, matrix.d * localHeight);
          paint.save();
          paint.translate(rect.left - bounds.left - minX, rect.top - bounds.top - minY);
          paint.transform(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0);
          paint.fillText(part.text, 0, ascent + (localHeight - ascent - descent) / 2);
          paint.restore();
        }
      }
    }
    // The underline and its native SVG sparkle are ink on the same membrane.
    const line = copy.querySelector<HTMLElement>('.signature-line');
    if (line) {
      const rect = line.getBoundingClientRect();
      const gradient = paint.createLinearGradient(rect.left - bounds.left, 0, rect.right - bounds.left, 0);
      gradient.addColorStop(0, 'rgba(255,255,255,.88)');
      gradient.addColorStop(1, 'rgba(255,255,255,.5)');
      paint.fillStyle = gradient;
      paint.fillRect(rect.left - bounds.left, rect.top - bounds.top, rect.width, Math.max(1, rect.height));
      const spark = line.querySelector('svg');
      if (spark) {
        const star = spark.getBoundingClientRect();
        paint.save();
        paint.translate(star.left - bounds.left, star.top - bounds.top);
        paint.scale(star.width / 24, star.height / 24);
        paint.fillStyle = '#fff';
        paint.fill(new Path2D('M12 1 14.2 9.8 23 12 14.2 14.2 12 23 9.8 14.2 1 12 9.8 9.8Z'));
        paint.restore();
      }
    }
    const base = paint.getImageData(0, 0, ink.width, ink.height);
    const blur = document.createElement('canvas');
    blur.width = ink.width; blur.height = ink.height;
    const blurPaint = blur.getContext('2d', { willReadFrequently: true });
    if (!blurPaint) return;
    blurPaint.filter = `blur(${1.5 * scale}px)`;
    blurPaint.drawImage(ink, 0, 0);
    const small = blurPaint.getImageData(0, 0, ink.width, ink.height);
    blurPaint.clearRect(0, 0, ink.width, ink.height);
    blurPaint.filter = `blur(${4.5 * scale}px)`;
    blurPaint.drawImage(ink, 0, 0);
    const large = blurPaint.getImageData(0, 0, ink.width, ink.height);
    // R = sharp ink; G/B = prefiltered glow lobes. One texture fetch per pixel,
    // no blur framebuffer and no repeated Canvas -> GPU transfers on hover.
    for (let i = 0; i < base.data.length; i += 4) {
      base.data[i] = base.data[i + 3];
      base.data[i + 1] = small.data[i + 3];
      base.data[i + 2] = large.data[i + 3];
      base.data[i + 3] = 255;
    }
    paint.putImageData(base, 0, 0);
    source = ink;
    onRaster(ink);
  }

  const resize = () => {
    if (!destroyed && fontsReady && !scheduled) scheduled = requestAnimationFrame(rasterize);
  };
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  if (copy) observer?.observe(copy);
  observer?.observe(canvas);
  if (document.fonts) {
    void document.fonts.ready.then(() => { fontsReady = true; resize(); });
    document.fonts.addEventListener('loadingdone', resize, { signal: events.signal });
  } else resize();

  return {
    resize,
    getSource: () => source,
    destroy() {
      destroyed = true;
      if (scheduled) cancelAnimationFrame(scheduled);
      events.abort();
      observer?.disconnect();
      source = null;
    },
  };
}
