/**
 * A small, decorative soap-film surface. HTML owns the content and interactions.
 * The GPU draws one triangle, with two optional static images and no render targets.
 */
import { createBubbleText } from '../lib/bubble-text';

export type BubbleQuality = 'low' | 'medium' | 'high';

type BubbleOptions = {
  quality: BubbleQuality;
  reducedMotion: boolean;
  backdrop?: HTMLImageElement;
  /** Supplied artwork: only its explicitly masked bubble perimeter is uploaded. */
  rim?: HTMLImageElement;
  /** A masked copy of the same image, moving at the sky layer's own depth. */
  sky?: HTMLImageElement;
  skyMaskStops?: readonly [number, number];
  scene?: HTMLElement;
};
type BubbleController = {
  setQuality(quality: BubbleQuality): void;
  setReducedMotion(value: boolean): void;
  syncBackdrop(): void;
  destroy(): void;
};

const PROFILES = {
  low: { dpr: 0.9, pixels: 260_000, edge: 1000, detail: 0.45, interval: 1000 / 30 },
  medium: { dpr: 1.25, pixels: 620_000, edge: 1440, detail: 0.8, interval: 1000 / 60 },
  high: { dpr: 1.75, pixels: 1_200_000, edge: 2048, detail: 1, interval: 0 },
} as const;

const VERTEX = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uSize, uPointer;
uniform float uTime, uHover, uMotion, uDetail;
uniform sampler2D uBackdrop, uRim;
uniform vec4 uBackdropMap, uSkyMap, uSkyElementMap;
uniform vec2 uSkyMaskStops;
uniform float uHasBackdrop, uHasSky, uHasRim;
out vec4 outColor;

float roundBox(vec2 p, vec2 extent, float radius) {
  vec2 q = abs(p) - extent + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

float gaussian(float x, float width) {
  float n = x / max(width, 0.001);
  return exp(-n * n);
}

vec3 spectrum(float phase) {
  vec3 interference = 0.5 + 0.5 * cos(phase + vec3(0.0, 2.08, 4.16));
  return mix(vec3(0.74, 0.9, 1.0), interference, 0.58);
}

// The DOM letters use this exact forward field and its analytic Jacobian.
// All distances are CSS pixels, independent of the chosen quality profile.
vec2 membraneDisplacement(vec2 position) {
  float unit = min(uSize.x, uSize.y) / 442.0;
  float radius = max(52.0, min(uSize.x, uSize.y) * 0.24);
  vec2 r = (position - uPointer * uSize) / radius;
  float weight = uHover * uMotion * 11.0 * unit * exp(-dot(r, r));
  vec2 push = (vec2(0.5) - uPointer) * 1.6;
  return weight * (push - 0.55 * r);
}

vec3 sceneSample(vec2 uv, vec2 displacement, float lod) {
  vec2 imageUv = uBackdropMap.xy + uv * uBackdropMap.zw;
  imageUv += displacement * uBackdropMap.zw / max(uSize, vec2(1.0));
  float skyAlpha = 0.0;
  vec2 skyUv = vec2(0.0);
  if (uHasSky > 0.5) {
    vec2 maskUv = uSkyElementMap.xy + uv * uSkyElementMap.zw;
    skyAlpha = clamp((uSkyMaskStops.y - maskUv.y) / max(uSkyMaskStops.y - uSkyMaskStops.x, 0.001), 0.0, 1.0);
    skyAlpha *= step(0.0, maskUv.x) * step(maskUv.x, 1.0) * step(0.0, maskUv.y) * step(maskUv.y, 1.0);
    skyUv = uSkyMap.xy + uv * uSkyMap.zw;
    skyUv += displacement * uSkyMap.zw / max(uSize, vec2(1.0));
  }
  // Fully covered areas need only one lookup. Only the mask transition blends.
  if (skyAlpha > 0.999) return textureLod(uBackdrop, clamp(skyUv, vec2(0.001), vec2(0.999)), lod).rgb;
  vec3 base = textureLod(uBackdrop, clamp(imageUv, vec2(0.001), vec2(0.999)), lod).rgb;
  if (skyAlpha < 0.001) return base;
  return mix(base, textureLod(uBackdrop, clamp(skyUv, vec2(0.001), vec2(0.999)), lod).rgb, skyAlpha);
}

void main() {
  // CSS-pixel space makes the optical rim independent of framebuffer DPR.
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 pixel = uv * uSize;
  // Invert the smooth, bounded field rather than deforming a clipped photograph.
  // Two fixed iterations keep the contour and source microfolds on one surface.
  vec2 rest = pixel - membraneDisplacement(pixel);
  rest = pixel - membraneDisplacement(rest);
  vec2 restUv = rest / max(uSize, vec2(1.0));
  vec2 p = restUv * 2.0 - 1.0;
  vec2 halfSize = uSize * 0.5;
  float unit = min(uSize.x, uSize.y) / 442.0;
  float t = uTime * 0.42;

  // Inward side midpoints and soft outward corners form the reference pillow.
  vec2 pinch = vec2(
    1.0 - 0.070 * cos(p.y * 3.25),
    1.0 - 0.080 * cos(p.x * 3.23)
  );
  vec2 q = p / pinch;
  q.x += 0.012 * sin(p.y * 3.0) + 0.008 * p.y;
  q.y += 0.018 * (p.y + 1.0) - 0.012 * p.x;
  float d = roundBox(q * halfSize, halfSize * vec2(0.915, 0.880), min(uSize.x, uSize.y) * 0.215);
  vec2 cursor = rest - uPointer * uSize;
  float radius = max(52.0, min(uSize.x, uSize.y) * 0.24);
  float cursorDistance = length(cursor);
  float influence = exp(-dot(cursor, cursor) / (radius * radius));

  float aa = max(fwidth(d), 0.55 * unit);
  vec2 gradient = vec2(dFdx(d), -dFdy(d));
  vec2 normal = gradient * inversesqrt(max(dot(gradient, gradient), 0.000001));
  float inside = 1.0 - smoothstep(-aa, aa, d);
  // Only optical highlight detail survives the upload; no meadow/photo RGB is
  // composited here. The detail uses the same inverse field as the contour.
  vec4 referenceRim = uHasRim > 0.5 ? texture(uRim, clamp(restUv, 0.0, 1.0)) : vec4(0.0);
  if (d > max(15.0 * unit, aa * 3.0) && referenceRim.a < 0.002) discard;

  float angle = atan(p.y, p.x);
  float phase = angle * 3.0 + p.x * 3.7 - p.y * 2.3 + t * 0.42 * uMotion;
  float folds = pow(max(0.0, cos(angle + 2.43)), 14.0)
    + 0.92 * pow(max(0.0, cos(angle - 0.65)), 17.0);
  float otherFold = 0.58 * pow(max(0.0, cos(angle + 0.68)), 16.0)
    + 0.38 * pow(max(0.0, cos(angle - 2.45)), 12.0);
  float filmFlow = sin(angle * 4.5 - t * 0.36) * 0.55 + sin(angle * 7.0 + t * 0.2) * 0.3;
  float shoulder = (4.0 + filmFlow * 6.0) * unit;
  float second = (10.0 + sin(angle * 3.0 + t * 0.27) * 7.0 + filmFlow * 3.0) * unit;
  float third = (17.5 + cos(angle * 4.0 - t * 0.16) * 7.0) * unit;
  // Separate ribbons cross, fade, and gather. They are not uniform nested borders.
  float arc = smoothstep(-0.55, 0.65, sin(angle * 3.0 + 0.35));
  float arc2 = smoothstep(-0.7, 0.65, cos(angle * 2.4 - 0.8));
  float line = gaussian(d, max((0.65 + folds * 0.75) * unit, aa * 0.62))
    * (0.24 + arc * 0.62 + folds * 0.3);
  float nearRibbon = gaussian(d + shoulder, max((1.05 + folds * 1.8 + otherFold) * unit, aa * 0.8))
    * (0.24 + arc2 * 0.66 + folds * 0.28);
  float farRibbon = gaussian(d + second, max((1.0 + folds * 1.8) * unit, aa * 0.9))
    * inside * (0.12 + arc * 0.65 + folds * 0.4 + otherFold * 0.2);
  float fineRibbon = gaussian(d + third, max((0.9 + folds * 1.3) * unit, aa))
    * inside * uDetail * (folds + otherFold + arc2 * 0.18);
  float outerRibbon = gaussian(d - (2.5 + sin(angle * 3.2 + 1.7) * 4.5) * unit, max(0.72 * unit, aa * 0.8))
    * smoothstep(-0.2, 0.7, sin(angle * 2.3 - 0.7));
  float rimSpread = gaussian(d + 5.0 * unit, (5.0 + folds * 7.0) * unit);
  float innerSpread = exp(-max(-d, 0.0) / max(23.0 * unit, 0.1)) * inside;
  float whiteFold = gaussian(d + (8.0 + filmFlow * 7.0) * unit, (5.0 + folds * 5.5) * unit)
    * (folds + otherFold) * inside;
  float darkRibbon = gaussian(d + (7.0 + sin(angle * 4.1 + 2.0) * 6.0) * unit, 1.0 * unit)
    * inside * (1.0 - arc) * 0.38;

  vec3 pearl = vec3(0.96, 0.99, 1.0);
  vec3 hue = spectrum(phase);
  vec3 hue2 = spectrum(phase + 2.5);
  // Broad, uneven white folds overlap the narrower spectral interference bands.
  float directional = 0.64 + 0.36 * pow(max(0.0, cos(angle + 2.2)), 2.0);
  float glint = pow(max(0.0, sin(angle * 2.0 + 0.8)), 14.0);
  float edgeAlpha = clamp(line * (0.82 + glint * 0.15)
    + nearRibbon * 0.8 + farRibbon * 0.66 + fineRibbon * 0.42 + outerRibbon * 0.7
    + rimSpread * (0.035 + folds * 0.15) + innerSpread * 0.035 + whiteFold * 0.52 + darkRibbon, 0.0, 0.97);
  vec3 edgeColor = pearl * (line + rimSpread * 0.06 + whiteFold * 1.25 + outerRibbon * 0.65)
    + mix(pearl, hue, 0.48) * nearRibbon * 0.8
    + mix(pearl, hue2, 0.68) * farRibbon * 0.66
    + mix(pearl, hue, 0.72) * fineRibbon * 0.42
    + vec3(0.13, 0.31, 0.34) * darkRibbon;
  edgeColor /= max(line + rimSpread * 0.06 + whiteFold * 1.25 + outerRibbon * 0.65 + nearRibbon * 0.8 + farRibbon * 0.66 + fineRibbon * 0.42 + darkRibbon, 0.001);
  edgeColor = clamp(edgeColor + directional * innerSpread * 0.05, 0.0, 1.0);
  // The tiny reference residual adds irregular microfolds to the procedural film;
  // it never replaces its underlying scene with pixels from another photograph.
  float microfold = referenceRim.a * 0.34;
  edgeColor = mix(edgeColor, referenceRim.rgb, microfold);
  edgeAlpha = 1.0 - (1.0 - edgeAlpha) * (1.0 - microfold);

  float reflection = exp(-pow((p.y + p.x * 0.23 + 0.66) / 0.14, 2.0));
  float softSheen = exp(-pow((p.y - p.x * 0.36 - 0.6) / 0.36, 2.0));
  float cursorFold = uHover * uMotion * gaussian(cursorDistance - radius * 0.48, radius * 0.3) * 0.012;
  float filmAlpha = inside * (0.012 + reflection * 0.017 + softSheen * 0.009 + cursorFold);
  vec3 filmColor = mix(vec3(0.62, 0.83, 0.9), vec3(0.9, 0.97, 1.0), reflection);
  vec3 filmPremultiplied = filmColor * filmAlpha;
  if (uHasBackdrop > 0.5) {
    float edgeLens = exp(-abs(d) / max(13.0 * unit, 0.1));
    // The Gaussian surface's slope bends the backdrop while its in-plane field
    // moves the contour and type. A sharp scene makes the optical bend legible.
    vec2 pointerLens = cursor / radius * influence * uHover * uMotion * 25.0 * unit;
    vec2 bend = normal * (7.2 * edgeLens + 0.55 * inside) * unit + pointerLens;
    // Mipmaps are prepared once per image upload: no blur pass or per-frame copy.
    float lod = mix(0.35, 0.8, edgeLens);
    vec3 sceneColor = sceneSample(uv, bend, lod);
    if (uDetail > 0.99) {
      vec2 dispersion = normal * 1.15 * unit * edgeLens + pointerLens * 0.035;
      sceneColor.r = sceneSample(uv, bend + dispersion, lod).r;
      sceneColor.b = sceneSample(uv, bend - dispersion, lod).b;
    }
    float mist = 0.5 + 0.25 * sin(p.x * 4.5 + p.y * 3.3) + 0.25 * cos(p.y * 5.0 - p.x * 2.0);
    sceneColor = mix(sceneColor, vec3(0.65, 0.75, 0.8), 0.018);
    sceneColor = mix(sceneColor, vec3(0.85, 0.91, 0.94), 0.008 + mist * 0.022 + reflection * 0.012);
    // The sampled layer is the actual backdrop. An opaque interior lets its
    // displaced pixels replace the undistorted scene, without a screen capture.
    filmPremultiplied = mix(sceneColor * inside, filmColor * inside, min(filmAlpha, 0.15));
    filmAlpha = inside;
  }
  float alpha = edgeAlpha + filmAlpha * (1.0 - edgeAlpha);
  vec3 premultiplied = edgeColor * edgeAlpha + filmPremultiplied * (1.0 - edgeAlpha);
  // Analytic local bloom: two smooth lobes, in this same pass. It requires no
  // frame capture, blur target, or extra texture and fades with the shared hover.
  vec2 lightCursor = cursor + vec2(10.0, 13.0) * unit;
  float lightDistance2 = dot(lightCursor, lightCursor);
  float contact = exp(-lightDistance2 / max(340.0 * unit * unit, 1.0));
  float halo = exp(-lightDistance2 / max(3800.0 * unit * unit, 1.0));
  float bloom = uHover * uMotion * (contact * 0.1 + halo * 0.055)
    * max(inside * 0.7, exp(-abs(d) / max(5.0 * unit, 0.1)));
  vec3 lightColor = vec3(0.9, 0.98, 1.0);
  premultiplied = lightColor * bloom + premultiplied * (1.0 - bloom);
  alpha = bloom + alpha * (1.0 - bloom);
  outColor = vec4(premultiplied, alpha);
}`;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function createBubble(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: BubbleOptions,
): BubbleController {
  let quality = options.quality;
  let reducedMotion = options.reducedMotion;
  let destroyed = false;
  let contextLost = false;
  let visible = true;
  let ready = false;
  let dirtySize = true;
  let frame = 0;
  let lastDraw = 0;
  let time = 0;
  let hover = 0;
  let targetHover = 0;
  const pointer = [0.5, 0.5];
  const targetPointer = [0.5, 0.5];
  let cssWidth = 1;
  let cssHeight = 1;
  let canvasLeft = 0;
  let canvasTop = 0;
  let gl: WebGL2RenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let backdropTexture: WebGLTexture | null = null;
  let rimTexture: WebGLTexture | null = null;
  let rimSource: HTMLCanvasElement | null = null;
  let backdropReady = false;
  let rimReady = false;
  let backdropSourceKey = '';
  let rimSourceKey = '';
  const backdropMap = new Float32Array([0, 0, 1, 1]);
  const skyMap = new Float32Array([0, 0, 1, 1]);
  const skyElementMap = new Float32Array([0, 0, 1, 1]);
  const skyMaskStops = options.skyMaskStops ?? [0.42, 0.63];
  const imageStyles = new Map<HTMLImageElement, { fit: string; position: string[] }>();
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  const events = new AbortController();
  const bubbleText = createBubbleText(host, canvas);
  const textFrame = { width: 1, height: 1, pointerX: 0.5, pointerY: 0.5, hover: 0, time: 0, reducedMotion };
  host.dataset.webgl = 'fallback';
  canvas.setAttribute('aria-hidden', 'true');

  const sleep = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastDraw = 0;
  };

  const canDraw = () => !destroyed && ready && !contextLost && visible && !document.hidden;

  const wake = () => {
    if (frame || !canDraw()) return;
    frame = requestAnimationFrame(draw);
  };

  function resize() {
    imageStyles.clear();
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, rect.width || host.clientWidth);
    cssHeight = Math.max(1, rect.height || host.clientHeight);
    canvasLeft = rect.left;
    canvasTop = rect.top;
    const profile = PROFILES[quality];
    const scale = Math.min(
      Math.max(0.5, window.devicePixelRatio || 1),
      profile.dpr,
      Math.sqrt(profile.pixels / (cssWidth * cssHeight)),
      profile.edge / Math.max(cssWidth, cssHeight),
    );
    const width = Math.max(2, Math.floor(cssWidth * scale));
    const height = Math.max(2, Math.floor(cssHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    dirtySize = false;
    bubbleText.resize();
    syncBackdrop();
  }

  function syncBackdrop() {
    if (destroyed) return;
    const bubbleRect = canvas.getBoundingClientRect();
    canvasLeft = bubbleRect.left;
    canvasTop = bubbleRect.top;
    if (!options.backdrop) return;
    const mapBounds = (bounds: { left: number; top: number; width: number; height: number }, target: Float32Array) => {
      target[0] = (bubbleRect.left - bounds.left) / Math.max(1, bounds.width);
      target[1] = (bubbleRect.top - bounds.top) / Math.max(1, bounds.height);
      target[2] = bubbleRect.width / Math.max(1, bounds.width);
      target[3] = bubbleRect.height / Math.max(1, bounds.height);
    };
    const mapImage = (image: HTMLImageElement, target: Float32Array) => {
      const rect = image.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        const fallback = options.scene?.getBoundingClientRect();
        if (fallback) mapBounds(fallback, target);
        return rect;
      }
      let style = imageStyles.get(image);
      if (!style) {
        const css = getComputedStyle(image);
        style = { fit: css.objectFit, position: css.objectPosition.split(/\s+/) };
        imageStyles.set(image, style);
      }
      let width = rect.width;
      let height = rect.height;
      if (style.fit !== 'fill' && image.naturalWidth && image.naturalHeight) {
        const contain = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
        const scale = style.fit === 'cover'
          ? Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight)
          : style.fit === 'none' ? 1 : style.fit === 'scale-down' ? Math.min(1, contain) : contain;
        width = image.naturalWidth * scale;
        height = image.naturalHeight * scale;
      }
      const position = (token: string | undefined, space: number) => {
        if (!token || token === 'center') return space * 0.5;
        if (token === 'left' || token === 'top') return 0;
        if (token === 'right' || token === 'bottom') return space;
        const number = Number.parseFloat(token);
        if (!Number.isFinite(number)) return space * 0.5;
        return token.endsWith('%') ? space * number / 100 : number;
      };
      mapBounds({
        left: rect.left + position(style.position[0], rect.width - width),
        top: rect.top + position(style.position[1], rect.height - height),
        width,
        height,
      }, target);
      return rect;
    };
    mapImage(options.backdrop, backdropMap);
    if (options.sky) mapBounds(mapImage(options.sky, skyMap), skyElementMap);
    if (reducedMotion) wake();
  }

  function uploadBackdrop() {
    const image = options.backdrop;
    if (destroyed || contextLost || !ready || !gl || !image?.complete || !image.naturalWidth) return;
    const sourceKey = image.currentSrc || image.src;
    if (backdropReady && backdropSourceKey === sourceKey) return;
    try {
      backdropTexture ??= gl.createTexture();
      if (!backdropTexture) throw new Error('Backdrop texture allocation failed');
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, backdropTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      backdropReady = true;
      backdropSourceKey = sourceKey;
      syncBackdrop();
      wake();
    } catch (error) {
      fail(error);
    }
  }

  function uploadRim() {
    const image = options.rim;
    if (destroyed || contextLost || !ready || !gl || !rimTexture || !image?.complete || !image.naturalWidth) return;
    const sourceKey = image.currentSrc || image.src;
    if (rimReady && rimSourceKey === sourceKey) return;
    try {
      if (rimSourceKey !== sourceKey) rimSource = null;
      if (!rimSource) {
        // A fixed optical contour traced from the supplied 1178 × 659 artwork.
        // Keep the crop local to the bubble, feather only its peripheral band,
        // and clear every text/signature pixel before anything reaches the GPU.
        const source = document.createElement('canvas');
        const mask = document.createElement('canvas');
        source.width = mask.width = 580;
        source.height = mask.height = 442;
        const paint = source.getContext('2d');
        const alpha = mask.getContext('2d');
        if (!paint || !alpha) return;
        paint.drawImage(image, image.naturalWidth * 495 / 1178, image.naturalHeight * 112 / 659,
          image.naturalWidth * 580 / 1178, image.naturalHeight * 442 / 659, 0, 0, 580, 442);
        const original = paint.getImageData(0, 0, 580, 442).data;
        alpha.translate(-495, -112);
        alpha.lineCap = 'round';
        alpha.lineJoin = 'round';
        alpha.strokeStyle = '#fff';
        alpha.shadowColor = '#fff';
        alpha.shadowBlur = 6;
        alpha.lineWidth = 18;
        const contour = new Path2D('M 552 132 C 596 117 652 157 735 155 C 827 154 929 128 987 132 C 1032 128 1056 154 1052 194 C 1049 236 1022 274 1016 318 C 1009 356 1032 392 1042 430 C 1051 476 1034 511 1001 526 C 959 544 884 526 805 509 C 769 498 751 494 708 505 C 650 521 610 532 575 518 C 539 508 515 480 517 445 C 518 406 541 369 540 328 C 542 283 530 236 525 204 C 515 169 522 145 552 132 Z');
        alpha.stroke(contour);
        // Larger soft bundles belong to corners; side runs stay thin and clear.
        alpha.lineWidth = 29;
        alpha.stroke(new Path2D('M 550 134 C 525 144 519 165 526 198 C 533 222 538 244 540 264'));
        alpha.lineWidth = 25;
        alpha.stroke(new Path2D('M 967 133 C 1027 125 1057 152 1052 194 C 1050 219 1039 241 1032 258'));
        alpha.lineWidth = 25;
        alpha.stroke(new Path2D('M 1040 432 C 1051 476 1034 511 1001 526 C 966 540 922 534 873 524'));
        // The source's signature is y477; the biography begins near y200.
        // This exclusion remains transparent after filtering and deformation.
        alpha.shadowBlur = 0;
        alpha.clearRect(584, 181, 367, 310);
        // The source photograph overlaps the far-left lower rim. Its person
        // remains a separate original-pixel DOM layer, never part of this strip.
        alpha.globalCompositeOperation = 'destination-out';
        alpha.fillStyle = '#fff';
        alpha.shadowBlur = 7;
        alpha.fill(new Path2D('M 490 342 L 508 342 C 520 390 546 472 570 523 L 560 555 L 490 555 Z'));
        paint.globalCompositeOperation = 'destination-in';
        paint.drawImage(mask, 0, 0);
        // Remove the photographed scene entirely. Keep only a faint, pearl-tinted
        // high-frequency highlight residual; original clouds/grass never become
        // an opaque second backdrop when the membrane bends. This runs once.
        const optical = paint.getImageData(0, 0, 580, 442);
        for (let y = 0; y < 442; y++) {
          for (let x = 0; x < 580; x++) {
            const i = (y * 580 + x) * 4;
            if (!optical.data[i + 3]) continue;
            let localR = 0; let localG = 0; let localB = 0;
            for (let oy = -4; oy <= 4; oy += 4) {
              for (let ox = -4; ox <= 4; ox += 4) {
                const j = (Math.min(441, Math.max(0, y + oy)) * 580 + Math.min(579, Math.max(0, x + ox))) * 4;
                localR += original[j]; localG += original[j + 1]; localB += original[j + 2];
              }
            }
            localR /= 9 * 255; localG /= 9 * 255; localB /= 9 * 255;
            const r = original[i] / 255; const g = original[i + 1] / 255; const b = original[i + 2] / 255;
            const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
            const mean = localR * 0.2126 + localG * 0.7152 + localB * 0.0722;
            const detail = Math.max(0, luminance - mean - 0.006) * 6.5;
            const white = Math.max(0, (luminance - 0.83) / 0.17) * 0.3;
            optical.data[i] = Math.round(clamp01(0.91 + (r - localR) * 1.5) * 255);
            optical.data[i + 1] = Math.round(clamp01(0.96 + (g - localG) * 1.5) * 255);
            optical.data[i + 2] = Math.round(clamp01(0.99 + (b - localB) * 1.5) * 255);
            optical.data[i + 3] = Math.round(optical.data[i + 3] * Math.min(0.9, detail + white));
          }
        }
        paint.putImageData(optical, 0, 0);
        rimSource = source;
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, rimTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rimSource);
      rimReady = true;
      rimSourceKey = sourceKey;
      wake();
    } catch (error) {
      rimReady = false;
      console.warn('[HEINEM] Original rim unavailable; procedural material remains active.', error instanceof Error ? error.message : String(error));
    }
  }

  function draw(now: number) {
    frame = 0;
    if (!canDraw() || !gl || !program || (options.backdrop && !backdropReady)) return;
    const profile = PROFILES[quality];
    if (!dirtySize && !reducedMotion && lastDraw && now - lastDraw < profile.interval - 0.5) {
      wake();
      return;
    }
    try {
      const elapsed = lastDraw ? Math.min(0.25, Math.max(0, (now - lastDraw) / 1000)) : 1 / 60;
      const dt = Math.min(0.05, elapsed);
      lastDraw = now;
      if (dirtySize) resize();
      if (!reducedMotion) time += dt;
      // Pointer easing follows wall time even if a constrained renderer skips
      // frames; only decorative optical time is capped to prevent a phase jump.
      const follow = 1 - Math.exp(-elapsed / 0.075);
      const release = 1 - Math.exp(-elapsed / (targetHover > hover ? 0.14 : 0.36));
      pointer[0] += (targetPointer[0] - pointer[0]) * follow;
      pointer[1] += (targetPointer[1] - pointer[1]) * follow;
      hover += (targetHover - hover) * release;
      if (Math.abs(hover - targetHover) < 0.0001) hover = targetHover;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.uSize, cssWidth, cssHeight);
      gl.uniform2f(uniforms.uPointer, pointer[0], pointer[1]);
      gl.uniform1f(uniforms.uTime, reducedMotion ? 0 : time);
      gl.uniform1f(uniforms.uHover, reducedMotion ? 0 : hover);
      gl.uniform1f(uniforms.uMotion, reducedMotion ? 0 : 1);
      gl.uniform1f(uniforms.uDetail, profile.detail);
      gl.uniform1f(uniforms.uHasBackdrop, backdropReady ? 1 : 0);
      gl.uniform4fv(uniforms.uBackdropMap, backdropMap);
      gl.uniform4fv(uniforms.uSkyMap, skyMap);
      gl.uniform4fv(uniforms.uSkyElementMap, skyElementMap);
      gl.uniform2f(uniforms.uSkyMaskStops, skyMaskStops[0], skyMaskStops[1]);
      gl.uniform1f(uniforms.uHasSky, options.sky ? 1 : 0);
      gl.uniform1f(uniforms.uHasRim, rimReady ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, backdropTexture);
      gl.uniform1i(uniforms.uBackdrop, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, rimTexture);
      gl.uniform1i(uniforms.uRim, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      textFrame.width = cssWidth;
      textFrame.height = cssHeight;
      textFrame.pointerX = pointer[0];
      textFrame.pointerY = pointer[1];
      textFrame.hover = hover;
      textFrame.time = time;
      textFrame.reducedMotion = reducedMotion;
      bubbleText.render(textFrame);
      host.dataset.webgl = 'ready';
      if (!reducedMotion) wake();
    } catch (error) {
      fail(error);
    }
  }

  function releaseResources() {
    if (gl && !contextLost) {
      if (vao) gl.deleteVertexArray(vao);
      if (program) gl.deleteProgram(program);
      if (backdropTexture) gl.deleteTexture(backdropTexture);
      if (rimTexture) gl.deleteTexture(rimTexture);
    }
    vao = null;
    program = null;
    uniforms = {};
    backdropTexture = null;
    rimTexture = null;
    backdropReady = false;
    rimReady = false;
  }

  function fail(error?: unknown) {
    ready = false;
    sleep();
    host.dataset.webgl = 'fallback';
    bubbleText.reset();
    releaseResources();
    if (error) console.warn('[HEINEM] Bubble uses its CSS fallback.', error instanceof Error ? error.message : String(error));
  }

  function initialize() {
    if (destroyed) return;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'low-power',
      });
      if (!gl) { fail(); return; }
      const context = gl;
      const compile = (type: number, source: string) => {
        const shader = context.createShader(type);
        if (!shader) throw new Error('Shader allocation failed');
        context.shaderSource(shader, source);
        context.compileShader(shader);
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
          const info = context.getShaderInfoLog(shader) || 'Shader compilation failed';
          context.deleteShader(shader);
          throw new Error(info);
        }
        return shader;
      };
      const vertex = compile(context.VERTEX_SHADER, VERTEX);
      let fragment: WebGLShader | null = null;
      try {
        fragment = compile(context.FRAGMENT_SHADER, FRAGMENT);
        program = context.createProgram();
        if (!program) throw new Error('Program allocation failed');
        context.attachShader(program, vertex);
        context.attachShader(program, fragment);
        context.linkProgram(program);
        if (!context.getProgramParameter(program, context.LINK_STATUS)) {
          throw new Error(context.getProgramInfoLog(program) || 'Shader link failed');
        }
      } finally {
        context.deleteShader(vertex);
        if (fragment) context.deleteShader(fragment);
      }
      vao = context.createVertexArray();
      // A complete neutral texture also makes the optional no-backdrop path valid.
      backdropTexture = context.createTexture();
      if (!backdropTexture) throw new Error('Backdrop texture allocation failed');
      context.activeTexture(context.TEXTURE0);
      context.bindTexture(context.TEXTURE_2D, backdropTexture);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
      context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, 1, 1, 0, context.RGBA, context.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      rimTexture = context.createTexture();
      if (!rimTexture) throw new Error('Rim texture allocation failed');
      context.activeTexture(context.TEXTURE1);
      context.bindTexture(context.TEXTURE_2D, rimTexture);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
      context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, 1, 1, 0, context.RGBA, context.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      for (const name of ['uSize', 'uPointer', 'uTime', 'uHover', 'uMotion', 'uDetail', 'uBackdrop', 'uRim', 'uHasRim', 'uBackdropMap', 'uHasBackdrop', 'uSkyMap', 'uSkyElementMap', 'uSkyMaskStops', 'uHasSky']) {
        uniforms[name] = context.getUniformLocation(program!, name);
      }
      ready = true;
      dirtySize = true;
      if (options.backdrop) uploadBackdrop();
      if (options.rim) uploadRim();
      wake();
    } catch (error) {
      fail(error);
    }
  }

  const updatePointer = (event: PointerEvent) => {
    if (reducedMotion) return;
    targetPointer[0] = clamp01((event.clientX - canvasLeft) / cssWidth);
    targetPointer[1] = clamp01((event.clientY - canvasTop) / cssHeight);
    targetHover = 1;
    wake();
  };
  const pointerMove = (event: PointerEvent) => { if (event.pointerType !== 'touch') updatePointer(event); };
  const pointerLeave = () => {
    if (reducedMotion || targetHover === 0) return;
    targetHover = 0;
    wake();
  };
  const passive = { passive: true, signal: events.signal };
  host.addEventListener('pointermove', pointerMove, passive);
  host.addEventListener('pointerenter', pointerMove, passive);
  host.addEventListener('pointerleave', pointerLeave, passive);
  host.addEventListener('pointerdown', updatePointer, passive);
  host.addEventListener('pointerup', (event) => { if (event.pointerType === 'touch') pointerLeave(); }, passive);
  host.addEventListener('pointercancel', pointerLeave, passive);
  options.backdrop?.addEventListener('load', uploadBackdrop, { signal: events.signal });
  options.rim?.addEventListener('load', uploadRim, { signal: events.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) sleep(); else wake(); }, passive);
  window.addEventListener('resize', () => { dirtySize = true; wake(); }, passive);
  window.addEventListener('pageshow', () => { dirtySize = true; wake(); }, passive);
  window.addEventListener('pagehide', sleep, passive);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    ready = false;
    sleep();
    host.dataset.webgl = 'fallback';
    bubbleText.reset();
    program = null;
    vao = null;
    backdropTexture = null;
    rimTexture = null;
    backdropReady = false;
    rimReady = false;
  }, { signal: events.signal });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    initialize();
  }, { signal: events.signal });

  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
    dirtySize = true;
    wake();
  });
  resizeObserver?.observe(canvas);
  const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
    // Edge contact can remain isIntersecting at the exact mobile scroll limit.
    visible = entry.isIntersecting && entry.intersectionRatio > 0.001;
    if (visible) wake(); else sleep();
  }, { rootMargin: '0px', threshold: 0.001 });
  intersectionObserver?.observe(host);
  initialize();

  return {
    setQuality(value) {
      if (destroyed || value === quality || !(value in PROFILES)) return;
      quality = value;
      dirtySize = true;
      wake();
    },
    setReducedMotion(value) {
      if (destroyed || value === reducedMotion) return;
      reducedMotion = value;
      hover = 0;
      targetHover = 0;
      bubbleText.reset();
      sleep();
      wake();
    },
    syncBackdrop,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      ready = false;
      sleep();
      events.abort();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      bubbleText.destroy();
      releaseResources();
      rimSource = null;
      host.dataset.webgl = 'fallback';
    },
  };
}
