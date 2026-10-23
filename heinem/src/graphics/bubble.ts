/** One elastic WebGL surface: procedural film, scene refraction and cached text. */
import { createBubbleText } from '../lib/bubble-text';

export type BubbleQuality = 'low' | 'medium' | 'high';
type BubbleOptions = {
  quality: BubbleQuality;
  reducedMotion: boolean;
  /** Actual visible scenery, in back-to-front order, with native alpha. */
  backdrops?: readonly HTMLImageElement[];
  /** Legacy single-image fallback; new scenes should supply backdrops. */
  backdrop?: HTMLImageElement;
  scene?: HTMLElement;
};
type BubbleController = {
  setQuality(quality: BubbleQuality): void;
  setReducedMotion(value: boolean): void;
  syncBackdrop(): void;
  destroy(): void;
};

const PROFILES = {
  low: { dpr: 1, pixels: 280_000, edge: 1000, detail: 0.45, interval: 1000 / 30, columns: 24, rows: 18 },
  medium: { dpr: 1.25, pixels: 620_000, edge: 1440, detail: 0.8, interval: 1000 / 60, columns: 36, rows: 28 },
  high: { dpr: 1.75, pixels: 1_200_000, edge: 2048, detail: 1, interval: 0, columns: 48, rows: 36 },
} as const;
const MAX_WAVES = 6;

const VERTEX = `#version 300 es
precision highp float;
uniform vec2 uSize, uPointer;
uniform ivec2 uGrid;
uniform vec4 uWaves[6];
uniform vec2 uWaveShape[6];
uniform int uWaveCount;
uniform float uHover, uMotion;
out vec2 vUv;

vec2 membraneDisplacement(vec2 position) {
  float unit = min(uSize.x, uSize.y) / 442.0;
  vec2 displacement = vec2(0.0);
  // Six independently located, damped impulses. The time-domain spring is
  // evaluated once on the CPU, while this bounded spatial field runs per vertex.
  for (int i = 0; i < 6; i++) {
    if (i >= uWaveCount) break;
    vec2 r = (position - uWaves[i].xy * uSize) / max(uWaveShape[i].x, 1.0);
    displacement += exp(-dot(r, r)) * (uWaves[i].zw - r * uWaveShape[i].y);
  }
  vec2 contact = (position - uPointer * uSize) / max(52.0, min(uSize.x, uSize.y) * 0.23);
  displacement -= contact * exp(-dot(contact, contact)) * uHover * 2.5 * unit;
  // Keep the mesh bijective and its text legible under very fast pointer strokes.
  displacement /= 1.0 + length(displacement) / max(28.0 * unit, 1.0);
  return displacement * uMotion;
}
void main() {
  int vertex = gl_VertexID % 6;
  int cell = gl_VertexID / 6;
  vec2 corner = vec2(
    (vertex == 1 || vertex == 2 || vertex == 4) ? 1.0 : 0.0,
    (vertex == 2 || vertex == 4 || vertex == 5) ? 1.0 : 0.0
  );
  vec2 uv = (vec2(cell % uGrid.x, cell / uGrid.x) + corner) / vec2(uGrid);
  vec2 position = uv * uSize + membraneDisplacement(uv * uSize);
  vUv = vec2(uv.x, 1.0 - uv.y);
  gl_Position = vec4(position.x / uSize.x * 2.0 - 1.0, 1.0 - position.y / uSize.y * 2.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uSize, uPointer;
uniform float uTime, uHover, uMotion, uDetail;
uniform sampler2D uBackdrop0, uBackdrop1, uBackdrop2, uBackdrop3, uText;
uniform vec4 uBackdropMaps[4];
uniform int uBackdropCount;
uniform float uHasText, uActivity;
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

vec4 layerSample(sampler2D source, vec4 map, vec2 uv, vec2 displacement, float lod) {
  vec2 at = map.xy + (uv + displacement / max(uSize, vec2(1.0))) * map.zw;
  float covered = step(0.0, at.x) * step(at.x, 1.0) * step(0.0, at.y) * step(at.y, 1.0);
  vec4 color = textureLod(source, clamp(at, 0.0, 1.0), lod);
  color.a *= covered;
  return color;
}

// Grade the *actual* scenery sampled inside the refracting film.
// Per-layer chroma/contrast matches the softer CSS scene without a second pass.
vec3 gradeGarden(vec3 rgb, float chroma, float exposure, float contrastValue, vec3 tint) {
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 muted = mix(vec3(luma), rgb, chroma);
  return clamp((muted * exposure * tint - vec3(0.5)) * contrastValue + vec3(0.5), 0.0, 1.0);
}

vec3 sceneSample(vec2 uv, vec2 displacement, float lod) {
  vec4 base = layerSample(uBackdrop0, uBackdropMaps[0], uv, displacement, lod);
  vec3 color = gradeGarden(base.rgb, 0.64, 0.94, 0.94, vec3(0.98, 1.0, 1.025));
  if (uBackdropCount > 1) {
    vec4 next = layerSample(uBackdrop1, uBackdropMaps[1], uv, displacement, lod);
    color = mix(color, gradeGarden(next.rgb, 0.56, 0.92, 0.92, vec3(0.96, 1.005, 1.04)), next.a);
  }
  if (uBackdropCount > 2) {
    vec4 next = layerSample(uBackdrop2, uBackdropMaps[2], uv, displacement, lod);
    color = mix(color, gradeGarden(next.rgb, 0.56, 0.92, 0.92, vec3(0.96, 1.005, 1.04)), next.a);
  }
  if (uBackdropCount > 3) {
    vec4 next = layerSample(uBackdrop3, uBackdropMaps[3], uv, displacement, lod);
    color = mix(color, gradeGarden(next.rgb, 0.56, 0.92, 0.92, vec3(0.96, 1.005, 1.04)), next.a);
  }
  return color;
}

void main() {
  // CSS-pixel space makes the optical rim independent of framebuffer DPR.
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 pixel = uv * uSize;
  // The vertex grid carries the undeformed material coordinates. Contour,
  // refraction, type and underline all sample this one elastic surface.
  vec2 rest = pixel;
  vec2 restUv = uv;
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
  if (d > max(15.0 * unit, aa * 3.0)) discard;

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
  float reflection = exp(-pow((p.y + p.x * 0.23 + 0.66) / 0.14, 2.0));
  float softSheen = exp(-pow((p.y - p.x * 0.36 - 0.6) / 0.36, 2.0));
  float cursorFold = uHover * uMotion * gaussian(cursorDistance - radius * 0.48, radius * 0.3) * 0.012;
  float filmAlpha = inside * (0.012 + reflection * 0.017 + softSheen * 0.009 + cursorFold);
  vec3 filmColor = mix(vec3(0.62, 0.83, 0.9), vec3(0.9, 0.97, 1.0), reflection);
  vec3 filmPremultiplied = filmColor * filmAlpha;
  if (uBackdropCount > 0) {
    float edgeLens = exp(-abs(d) / max(13.0 * unit, 0.1));
    // Surface lensing stays clear. Elastic geometry moves scene and ink together.
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
    // A restrained neutral tint preserves contrast against white clouds without blur.
    sceneColor *= 0.94;
    sceneColor = mix(sceneColor, vec3(0.65, 0.75, 0.8), 0.009);
    sceneColor = mix(sceneColor, vec3(0.85, 0.91, 0.94), 0.005 + mist * 0.012 + reflection * 0.008);
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
  if (uHasText > 0.5) {
    // Packed static mask: sharp ink + two prefiltered halo radii. The blur was
    // generated once when the actual HTML typography was measured.
    vec3 ink = texture(uText, clamp(restUv, 0.0, 1.0)).rgb;
    float inkAlpha = ink.r * inside;
    float localLight = uMotion * (uHover * influence + uActivity * influence * 0.28);
    float inkGlow = clamp((ink.g * 0.85 + ink.b * 1.7) * localLight, 0.0, 0.78) * inside;
    // A subtle dark keyline keeps white body copy readable against the sky.
    float keyline = ink.g * (1.0 - ink.r) * 0.65 * inside;
    premultiplied = mix(premultiplied, vec3(0.08, 0.19, 0.21), keyline);
    premultiplied = mix(premultiplied, vec3(0.78, 0.96, 1.0), inkGlow);
    alpha = inkGlow + alpha * (1.0 - inkGlow);
    premultiplied = vec3(0.99, 1.0, 1.0) * inkAlpha + premultiplied * (1.0 - inkAlpha);
    alpha = inkAlpha + alpha * (1.0 - inkAlpha);
  }
  outColor = vec4(premultiplied, alpha);
}`;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
type Wave = { x: number; y: number; dx: number; dy: number; strength: number; age: number };

export function createBubble(canvas: HTMLCanvasElement, host: HTMLElement, options: BubbleOptions): BubbleController {
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
  let lastInputAt = 0;
  let lastImpulseAt = 0;
  const previousInput = [0.5, 0.5];
  let cssWidth = 1;
  let cssHeight = 1;
  let canvasLeft = 0;
  let canvasTop = 0;
  let gl: WebGL2RenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let textTexture: WebGLTexture | null = null;
  let textReady = false;
  const images = (options.backdrops ?? (options.backdrop ? [options.backdrop] : [])).slice(0, 4);
  const backdropTextures: (WebGLTexture | null)[] = [];
  const backdropReady = [false, false, false, false];
  const backdropKeys = ['', '', '', ''];
  const maps = new Float32Array(16);
  for (let i = 0; i < 4; i++) { maps[i * 4 + 2] = 1; maps[i * 4 + 3] = 1; }
  const imageStyles = new Map<HTMLImageElement, { fit: string; position: string[] }>();
  const waves: Wave[] = [];
  const waveData = new Float32Array(MAX_WAVES * 4);
  const waveShape = new Float32Array(MAX_WAVES * 2);
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  const events = new AbortController();
  host.dataset.webgl = 'fallback';
  host.dataset.gpuCopy = 'fallback';
  canvas.setAttribute('aria-hidden', 'true');
  const bubbleText = createBubbleText(host, canvas, uploadText);

  const sleep = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastDraw = 0;
  };
  const canDraw = () => !destroyed && ready && !contextLost && visible && !document.hidden;
  const wake = () => {
    if (!frame && canDraw()) frame = requestAnimationFrame(draw);
  };
  const nativeCopy = () => {
    if (host.dataset.gpuCopy !== 'fallback') host.dataset.gpuCopy = 'fallback';
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
      Math.max(0.5, window.devicePixelRatio || 1), profile.dpr,
      Math.sqrt(profile.pixels / (cssWidth * cssHeight)), profile.edge / Math.max(cssWidth, cssHeight),
    );
    const width = Math.max(2, Math.floor(cssWidth * scale));
    const height = Math.max(2, Math.floor(cssHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
    }
    dirtySize = false;
    bubbleText.resize();
    syncBackdrop();
  }

  function syncBackdrop() {
    if (destroyed) return;
    const bubbleRect = canvas.getBoundingClientRect();
    canvasLeft = bubbleRect.left; canvasTop = bubbleRect.top;
    images.forEach((image, index) => {
      const rect = image.getBoundingClientRect();
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
        width = image.naturalWidth * scale; height = image.naturalHeight * scale;
      }
      const position = (token: string | undefined, space: number) => {
        if (!token || token === 'center') return space * 0.5;
        if (token === 'left' || token === 'top') return 0;
        if (token === 'right' || token === 'bottom') return space;
        const number = Number.parseFloat(token);
        return !Number.isFinite(number) ? space * 0.5 : token.endsWith('%') ? space * number / 100 : number;
      };
      const offset = index * 4;
      maps[offset] = (bubbleRect.left - rect.left - position(style.position[0], rect.width - width)) / Math.max(1, width);
      maps[offset + 1] = (bubbleRect.top - rect.top - position(style.position[1], rect.height - height)) / Math.max(1, height);
      maps[offset + 2] = bubbleRect.width / Math.max(1, width);
      maps[offset + 3] = bubbleRect.height / Math.max(1, height);
    });
    if (reducedMotion) wake();
  }

  function uploadBackdrop(index: number) {
    const image = images[index];
    if (destroyed || contextLost || !ready || !gl || !image?.complete || !image.naturalWidth) return;
    const edge = quality === 'low' ? 1024 : quality === 'medium' ? 1536 : 2048;
    const key = `${image.currentSrc || image.src}:${edge}`;
    if (backdropReady[index] && backdropKeys[index] === key) return;
    try {
      let source: HTMLImageElement | HTMLCanvasElement = image;
      const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      if (scale < 1) {
        const resized = document.createElement('canvas');
        resized.width = Math.max(1, Math.round(image.naturalWidth * scale));
        resized.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const paint = resized.getContext('2d');
        if (paint) {
          paint.drawImage(image, 0, 0, resized.width, resized.height);
          source = resized;
        }
      }
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, backdropTextures[index]);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      backdropReady[index] = true; backdropKeys[index] = key;
      syncBackdrop(); wake();
    } catch (error) { fail(error); }
  }

  function uploadText(source: HTMLCanvasElement) {
    if (destroyed || contextLost || !ready || !gl || !textTexture) return;
    try {
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, textTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      textReady = true;
      wake();
    } catch (error) {
      textReady = false; nativeCopy();
      console.warn('[HEINEM] Native text remains available.', error instanceof Error ? error.message : String(error));
    }
  }

  function draw(now: number) {
    frame = 0;
    if (!canDraw() || !gl || !program || images.some((_, index) => !backdropReady[index])) return;
    const profile = PROFILES[quality];
    if (!dirtySize && !reducedMotion && lastDraw && now - lastDraw < profile.interval - 0.5) { wake(); return; }
    try {
      const elapsed = lastDraw ? Math.min(0.25, Math.max(0, (now - lastDraw) / 1000)) : 1 / 60;
      lastDraw = now;
      if (dirtySize) resize();
      if (!reducedMotion) time += Math.min(0.05, elapsed);
      const follow = 1 - Math.exp(-elapsed / 0.045);
      const release = 1 - Math.exp(-elapsed / (targetHover > hover ? 0.07 : 0.22));
      pointer[0] += (targetPointer[0] - pointer[0]) * follow;
      pointer[1] += (targetPointer[1] - pointer[1]) * follow;
      hover += (targetHover - hover) * release;
      if (Math.abs(hover - targetHover) < 0.0001) hover = targetHover;
      let activity = 0;
      for (let i = waves.length - 1; i >= 0; i--) {
        waves[i].age += elapsed;
        if (waves[i].age > 1.8) waves.splice(i, 1);
      }
      const unit = Math.min(cssWidth, cssHeight) / 442;
      waves.forEach((wave, index) => {
        // Underdamped response changes sign, so each touched patch recoils after
        // the cursor has left it. Positions never follow the current pointer.
        const response = Math.sin(wave.age * 13.5) * Math.exp(-wave.age * 3.2);
        activity += Math.abs(response) * wave.strength / 12;
        waveData[index * 4] = wave.x; waveData[index * 4 + 1] = wave.y;
        waveData[index * 4 + 2] = wave.dx * response * unit;
        waveData[index * 4 + 3] = wave.dy * response * unit;
        waveShape[index * 2] = Math.max(48, Math.min(cssWidth, cssHeight) * (0.19 + wave.age * 0.015));
        waveShape[index * 2 + 1] = wave.strength * response * unit;
      });
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program); gl.bindVertexArray(vao);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.uSize, cssWidth, cssHeight);
      gl.uniform2f(uniforms.uPointer, pointer[0], pointer[1]);
      gl.uniform2i(uniforms.uGrid, profile.columns, profile.rows);
      gl.uniform1f(uniforms.uTime, reducedMotion ? 0 : time);
      gl.uniform1f(uniforms.uHover, reducedMotion ? 0 : hover);
      gl.uniform1f(uniforms.uMotion, reducedMotion ? 0 : 1);
      gl.uniform1f(uniforms.uDetail, profile.detail);
      gl.uniform1f(uniforms.uActivity, reducedMotion ? 0 : Math.min(1, activity));
      gl.uniform1i(uniforms.uWaveCount, reducedMotion ? 0 : waves.length);
      gl.uniform4fv(uniforms.uWaves, waveData);
      gl.uniform2fv(uniforms.uWaveShape, waveShape);
      gl.uniform4fv(uniforms.uBackdropMaps, maps);
      gl.uniform1i(uniforms.uBackdropCount, images.length);
      for (let index = 0; index < 4; index++) {
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, backdropTextures[index]);
        gl.uniform1i(uniforms[`uBackdrop${index}`], index);
      }
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, textTexture);
      gl.uniform1i(uniforms.uText, 4); gl.uniform1f(uniforms.uHasText, textReady ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, profile.columns * profile.rows * 6);
      if (host.dataset.webgl !== 'ready') host.dataset.webgl = 'ready';
      if (textReady && host.dataset.gpuCopy !== 'ready') host.dataset.gpuCopy = 'ready';
      if (!reducedMotion) wake();
    } catch (error) { fail(error); }
  }

  function releaseResources() {
    if (gl && !contextLost) {
      if (vao) gl.deleteVertexArray(vao);
      if (program) gl.deleteProgram(program);
      if (textTexture) gl.deleteTexture(textTexture);
      for (const texture of backdropTextures) if (texture) gl.deleteTexture(texture);
    }
    vao = null; program = null; textTexture = null; textReady = false; uniforms = {};
    backdropTextures.length = 0;
    backdropReady.fill(false); backdropKeys.fill('');
  }
  function fail(error?: unknown) {
    ready = false; sleep(); nativeCopy(); host.dataset.webgl = 'fallback';
    releaseResources();
    if (error) console.warn('[HEINEM] Bubble uses its CSS fallback.', error instanceof Error ? error.message : String(error));
  }
  function initialize() {
    if (destroyed) return;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power',
      });
      if (!gl) { fail(); return; }
      const context = gl;
      const compile = (type: number, source: string) => {
        const shader = context.createShader(type);
        if (!shader) throw new Error('Shader allocation failed');
        context.shaderSource(shader, source); context.compileShader(shader);
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
          const info = context.getShaderInfoLog(shader) || 'Shader compilation failed';
          context.deleteShader(shader); throw new Error(info);
        }
        return shader;
      };
      const vertex = compile(context.VERTEX_SHADER, VERTEX);
      let fragment: WebGLShader | null = null;
      try {
        fragment = compile(context.FRAGMENT_SHADER, FRAGMENT);
        program = context.createProgram();
        if (!program) throw new Error('Program allocation failed');
        context.attachShader(program, vertex); context.attachShader(program, fragment); context.linkProgram(program);
        if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error(context.getProgramInfoLog(program) || 'Shader link failed');
      } finally {
        context.deleteShader(vertex); if (fragment) context.deleteShader(fragment);
      }
      vao = context.createVertexArray();
      for (let index = 0; index < 5; index++) {
        const texture = context.createTexture();
        if (!texture) throw new Error('Texture allocation failed');
        context.activeTexture(context.TEXTURE0 + index); context.bindTexture(context.TEXTURE_2D, texture);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, 1, 1, 0, context.RGBA, context.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
        if (index === 4) textTexture = texture; else backdropTextures[index] = texture;
      }
      for (const name of ['uSize', 'uPointer', 'uGrid', 'uTime', 'uHover', 'uMotion', 'uDetail', 'uActivity', 'uWaveCount', 'uWaves', 'uWaveShape', 'uBackdropMaps', 'uBackdropCount', 'uBackdrop0', 'uBackdrop1', 'uBackdrop2', 'uBackdrop3', 'uText', 'uHasText']) {
        uniforms[name] = context.getUniformLocation(program!, name);
      }
      ready = true; dirtySize = true;
      images.forEach((_, index) => uploadBackdrop(index));
      const text = bubbleText.getSource();
      if (text) uploadText(text);
      wake();
    } catch (error) { fail(error); }
  }

  const updatePointer = (event: PointerEvent) => {
    if (reducedMotion) return;
    const x = clamp01((event.clientX - canvasLeft) / cssWidth);
    const y = clamp01((event.clientY - canvasTop) / cssHeight);
    const now = performance.now();
    const dx = (x - previousInput[0]) * cssWidth;
    const dy = (y - previousInput[1]) * cssHeight;
    const distance = Math.hypot(dx, dy);
    if (now - lastImpulseAt > 32 && (distance > 3 || !targetHover)) {
      const elapsed = lastInputAt ? Math.max(0.016, Math.min(0.15, (now - lastInputAt) / 1000)) : 0.15;
      const strength = Math.min(14, Math.max(5, distance / elapsed * 0.012));
      const length = Math.max(1, distance);
      waves.push({ x, y, dx: dx / length * strength, dy: dy / length * strength, strength: strength * 0.8, age: 0 });
      if (waves.length > MAX_WAVES) waves.shift();
      lastImpulseAt = now;
    }
    previousInput[0] = x; previousInput[1] = y; lastInputAt = now;
    targetPointer[0] = x; targetPointer[1] = y; targetHover = 1;
    wake();
  };
  const pointerMove = (event: PointerEvent) => { if (event.pointerType !== 'touch') updatePointer(event); };
  const pointerLeave = () => { if (reducedMotion) return; targetHover = 0; lastInputAt = 0; wake(); };
  const passive = { passive: true, signal: events.signal };
  host.addEventListener('pointermove', pointerMove, passive);
  host.addEventListener('pointerenter', pointerMove, passive);
  host.addEventListener('pointerleave', pointerLeave, passive);
  host.addEventListener('pointerdown', updatePointer, passive);
  host.addEventListener('pointerup', event => { if (event.pointerType === 'touch') pointerLeave(); }, passive);
  host.addEventListener('pointercancel', pointerLeave, passive);
  images.forEach((image, index) => image.addEventListener('load', () => uploadBackdrop(index), { signal: events.signal }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { waves.length = 0; hover = targetHover = 0; sleep(); } else wake();
  }, passive);
  window.addEventListener('resize', () => { dirtySize = true; wake(); }, passive);
  window.addEventListener('pageshow', () => { dirtySize = true; wake(); }, passive);
  window.addEventListener('pagehide', sleep, passive);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true; ready = false; sleep(); nativeCopy();
    host.dataset.webgl = 'fallback'; releaseResources();
  }, { signal: events.signal });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; initialize(); }, { signal: events.signal });
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { dirtySize = true; wake(); });
  resizeObserver?.observe(canvas);
  const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio > 0.001;
    if (visible) wake(); else { waves.length = 0; hover = targetHover = 0; sleep(); }
  }, { rootMargin: '0px', threshold: 0.001 });
  intersectionObserver?.observe(host);
  initialize();

  return {
    setQuality(value) {
      if (destroyed || value === quality || !(value in PROFILES)) return;
      quality = value; dirtySize = true;
      images.forEach((_, index) => uploadBackdrop(index));
      wake();
    },
    setReducedMotion(value) {
      if (destroyed || value === reducedMotion) return;
      reducedMotion = value; hover = 0; targetHover = 0; waves.length = 0;
      sleep(); wake();
    },
    syncBackdrop,
    destroy() {
      if (destroyed) return;
      destroyed = true; ready = false; sleep(); events.abort();
      resizeObserver?.disconnect(); intersectionObserver?.disconnect();
      bubbleText.destroy(); releaseResources(); nativeCopy(); host.dataset.webgl = 'fallback';
    },
  };
}
