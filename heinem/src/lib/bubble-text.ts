/** A small DOM surface sharing the bubble's analytic deformation, without rasterizing copy. */
export type BubbleTextFrame = {
  width: number;
  height: number;
  pointerX: number;
  pointerY: number;
  hover: number;
  time: number;
  reducedMotion: boolean;
};

type Glyph = {
  element: HTMLSpanElement;
  source: Text;
  start: number;
  end: number;
  x: number;
  y: number;
  left: number;
  a: number;
  b: number;
  c: number;
  d: number;
  ia: number;
  ib: number;
  ic: number;
  id: number;
  lastTransform: string;
  lastGlow: string;
};
type Word = { element: HTMLSpanElement; source: HTMLSpanElement; glyphs: Glyph[] };

export function createBubbleText(host: HTMLElement, canvas: HTMLCanvasElement) {
  const copy = host.querySelector<HTMLElement>('.bubble-copy');
  const replacements: { original: Text; wrapper: HTMLSpanElement }[] = [];
  const accessible: HTMLSpanElement[] = [];
  const words: Word[] = [];
  const glyphs: Glyph[] = [];
  const events = new AbortController();
  let destroyed = false;
  let built = false;
  let measured = false;
  let measureFrame = 0;
  let previousActive = false;

  const segmenter = typeof Intl.Segmenter === 'undefined'
    ? null : new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const characters = (word: string) => segmenter
    ? Array.from(segmenter.segment(word), item => ({ text: item.segment, start: item.index }))
    : Array.from(word).map((text, index, all) => ({ text, start: all.slice(0, index).join('').length }));

  function build() {
    if (destroyed || built || !copy) return;
    built = true;
    for (const root of copy.querySelectorAll<HTMLElement>('h1, p')) {
      // Screen readers receive the unchanged sentence once. The visual glyphs
      // remain selectable HTML; no title, biography, or manual break is rewritten.
      const readable = root.innerText;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (node.data.trim()) textNodes.push(node);
      }
      for (const original of textNodes) {
        const wrapper = document.createElement('span');
        wrapper.dataset.bubbleLetters = '';
        wrapper.setAttribute('aria-hidden', 'true');
        wrapper.style.display = 'contents';
        wrapper.style.font = 'inherit';
        for (const token of original.data.match(/\s+|\S+/gu) ?? []) {
          if (!token.trim()) { wrapper.append(document.createTextNode(token)); continue; }
          const word = document.createElement('span');
          word.style.cssText = 'display:inline-block;position:relative;white-space:pre;font:inherit;letter-spacing:inherit;vertical-align:baseline';
          const source = document.createElement('span');
          source.dataset.bubbleSource = '';
          source.style.cssText = 'font:inherit;letter-spacing:inherit;visibility:visible';
          source.textContent = token;
          word.append(source);
          const sourceText = source.firstChild as Text;
          const wordGlyphs: Glyph[] = [];
          for (const part of characters(token)) {
            const letter = document.createElement('span');
            letter.dataset.bubbleGlyph = '';
            letter.textContent = part.text;
            letter.style.cssText = 'position:absolute;left:0;top:0;display:inline-block;font:inherit;letter-spacing:inherit;line-height:inherit;visibility:hidden;transform-origin:50% 50%;pointer-events:none';
            const glyph: Glyph = {
              element: letter, source: sourceText, start: part.start, end: part.start + part.text.length,
              x: 0, y: 0, left: 0, a: 1, b: 0, c: 0, d: 1, ia: 1, ib: 0, ic: 0, id: 1,
              lastTransform: '', lastGlow: '',
            };
            wordGlyphs.push(glyph);
            glyphs.push(glyph);
            word.append(letter);
          }
          words.push({ element: word, source, glyphs: wordGlyphs });
          wrapper.append(word);
        }
        original.replaceWith(wrapper);
        replacements.push({ original, wrapper });
      }
      const sr = document.createElement('span');
      sr.textContent = readable;
      sr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:normal;border:0;user-select:none';
      root.append(sr);
      accessible.push(sr);
    }
    measure();
  }

  function reset() {
    for (const glyph of glyphs) {
      if (glyph.lastTransform) glyph.element.style.transform = '';
      if (glyph.lastGlow) glyph.element.style.textShadow = '';
      glyph.lastTransform = '';
      glyph.lastGlow = '';
    }
    previousActive = false;
  }

  function measure() {
    measureFrame = 0;
    if (destroyed || !built || !copy) return;
    reset();
    // All geometry/style reads are confined to font readiness and resize.
    const canvasRect = canvas.getBoundingClientRect();
    const transforms = new Map<Element, DOMMatrix>();
    const accumulated = (element: Element) => {
      let matrix = new DOMMatrix();
      let ancestor: Element | null = element;
      while (ancestor && ancestor !== host) {
        let own = transforms.get(ancestor);
        if (!own) {
          const value = getComputedStyle(ancestor).transform;
          own = value === 'none' ? new DOMMatrix() : new DOMMatrix(value);
          transforms.set(ancestor, own);
        }
        matrix = own.multiply(matrix);
        ancestor = ancestor.parentElement;
      }
      return matrix;
    };
    const range = document.createRange();
    for (const word of words) {
      const matrix = accumulated(word.element);
      const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
      const safeDeterminant = Math.abs(determinant) > 0.0001 ? determinant : 1;
      range.selectNodeContents(word.source);
      const origin = range.getBoundingClientRect();
      for (const glyph of word.glyphs) {
        range.setStart(glyph.source, glyph.start);
        range.setEnd(glyph.source, glyph.end);
        const rect = range.getBoundingClientRect();
        // Native invisible words retain kerning, baseline, wrapping and width.
        // Only their visual glyphs become positioned children.
        glyph.left = (rect.left - origin.left) / Math.max(Math.abs(matrix.a), 0.001);
        glyph.x = rect.left - canvasRect.left + rect.width / 2;
        glyph.y = rect.top - canvasRect.top + rect.height / 2;
        glyph.a = matrix.a; glyph.b = matrix.b; glyph.c = matrix.c; glyph.d = matrix.d;
        glyph.ia = matrix.d / safeDeterminant; glyph.ib = -matrix.b / safeDeterminant;
        glyph.ic = -matrix.c / safeDeterminant; glyph.id = matrix.a / safeDeterminant;
      }
    }
    // Batch the writes after all measurements, including on responsive resize.
    for (const glyph of glyphs) {
      glyph.element.style.left = `${glyph.left.toFixed(3)}px`;
      glyph.element.style.visibility = 'visible';
    }
    for (const word of words) {
      word.source.style.visibility = 'hidden';
      word.source.style.userSelect = 'none';
    }
    measured = true;
  }

  function resize() {
    if (destroyed || !built || measureFrame) return;
    measureFrame = requestAnimationFrame(measure);
  }

  function render(state: BubbleTextFrame) {
    if (!measured || destroyed) return;
    if (state.reducedMotion) { if (previousActive) reset(); return; }
    const unit = Math.min(state.width, state.height) / 442;
    const radius = Math.max(52, Math.min(state.width, state.height) * 0.24);
    const strength = state.hover * 11 * unit;
    if (strength < 0.002) { if (previousActive) reset(); return; }
    previousActive = true;
    const cx = state.pointerX * state.width;
    const cy = state.pointerY * state.height;
    const pushX = (0.5 - state.pointerX) * 1.6;
    const pushY = (0.5 - state.pointerY) * 1.6;
    for (const glyph of glyphs) {
      const rx = (glyph.x - cx) / radius;
      const ry = (glyph.y - cy) / radius;
      const g = Math.exp(-rx * rx - ry * ry);
      const vx = pushX - 0.55 * rx;
      const vy = pushY - 0.55 * ry;
      const weight = strength * g;
      const dx = weight * vx;
      const dy = weight * vy;
      // This Jacobian is the same Gaussian membrane used by the fragment shader.
      // A tiny local affine transform makes the glyph lean/stretch with its neighbors.
      const factor = weight / radius;
      const j00 = factor * (-0.55 - 2 * vx * rx);
      const j01 = factor * (-2 * vx * ry);
      const j10 = factor * (-2 * vy * rx);
      const j11 = factor * (-0.55 - 2 * vy * ry);
      const ja = j00 * glyph.a + j01 * glyph.b;
      const jb = j10 * glyph.a + j11 * glyph.b;
      const jc = j00 * glyph.c + j01 * glyph.d;
      const jd = j10 * glyph.c + j11 * glyph.d;
      const a = 1 + glyph.ia * ja + glyph.ic * jb;
      const b = glyph.ib * ja + glyph.id * jb;
      const c = glyph.ia * jc + glyph.ic * jd;
      const d = 1 + glyph.ib * jc + glyph.id * jd;
      const x = glyph.ia * dx + glyph.ic * dy;
      const y = glyph.ib * dx + glyph.id * dy;
      const moving = Math.abs(x) + Math.abs(y) > 0.025;
      const transform = moving ? `matrix(${a.toFixed(4)},${b.toFixed(4)},${c.toFixed(4)},${d.toFixed(4)},${x.toFixed(2)},${y.toFixed(2)})` : '';
      if (transform !== glyph.lastTransform) {
        glyph.element.style.transform = transform;
        glyph.lastTransform = transform;
      }
      const glow = Math.round(Math.max(0, (g - 0.25) / 0.75) * state.hover * 20) / 20;
      const shadow = glow > 0.02 ? `0 0 ${(2 + glow * 3).toFixed(1)}px rgba(214,248,255,${(glow * 0.48).toFixed(2)})` : '';
      if (shadow !== glyph.lastGlow) {
        glyph.element.style.textShadow = shadow;
        glyph.lastGlow = shadow;
      }
    }
  }

  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  if (copy) observer?.observe(copy);
  observer?.observe(canvas);
  const fonts = document.fonts;
  if (fonts) {
    void fonts.ready.then(() => { if (!destroyed) build(); });
    fonts.addEventListener('loadingdone', resize, { signal: events.signal });
  } else build();

  return {
    render, resize, reset,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (measureFrame) cancelAnimationFrame(measureFrame);
      events.abort();
      observer?.disconnect();
      for (const { original, wrapper } of replacements) wrapper.replaceWith(original);
      for (const node of accessible) node.remove();
      words.length = 0;
      glyphs.length = 0;
    },
  };
}
