import {
  DepthTexture,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Matrix4,
  NoBlending,
  ShaderMaterial,
  UnsignedByteType,
  UnsignedIntType,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const PROFILES = {
  low: { samples: 6, motionSamples: 3, maxBlur: 9, bloomEdge: 384, bloomScale: 0.25 },
  auto: { samples: 8, motionSamples: 4, maxBlur: 12, bloomEdge: 512, bloomScale: 0.33 },
  high: { samples: 12, motionSamples: 4, maxBlur: 14, bloomEdge: 768, bloomScale: 0.4 },
};

const VERTEX = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function screenMaterial(name, fragmentShader, uniforms) {
  return new ShaderMaterial({
    name, vertexShader: VERTEX, fragmentShader, uniforms,
    depthTest: false, depthWrite: false, toneMapped: false, blending: NoBlending,
  });
}

function colorTarget(name, type) {
  const target = new WebGLRenderTarget(1, 1, {
    type, minFilter: LinearFilter, magFilter: LinearFilter,
    colorSpace: LinearSRGBColorSpace, depthBuffer: false, stencilBuffer: false,
  });
  target.texture.name = name;
  return target;
}

const LENS_FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tSceneDepth;
  uniform vec2 uResolution;
  uniform vec2 uTexel;
  uniform mat4 uInverseProjection;
  uniform mat4 uInverseViewProjection;
  uniform mat4 uPreviousViewProjection;
  uniform float uZeroToOneDepth;
  uniform float uFocusDistance;
  uniform float uCocScale;
  uniform float uForegroundGain;
  uniform float uMaxBlur;
  uniform float uSamples;
  uniform float uMotionSamples;
  uniform float uShutter;
  uniform float uMotionLimit;
  varying vec2 vUv;

  vec2 boundedUv(vec2 uv) {
    return clamp(uv, uTexel * 0.5, vec2(1.0) - uTexel * 0.5);
  }

  float clipDepth(float depth) {
    return mix(depth * 2.0 - 1.0, depth, uZeroToOneDepth);
  }

  float viewDistance(vec2 uv, float depth) {
    vec4 view = uInverseProjection * vec4(uv * 2.0 - 1.0, clipDepth(depth), 1.0);
    return max(-view.z / max(view.w, 0.000001), 0.001);
  }

  void main() {
    vec4 center = texture2D(tDiffuse, vUv);
    float depth = texture2D(tSceneDepth, vUv).x;
    float distanceToCamera = viewDistance(vUv, depth);

    // Signed thin-lens circle of confusion; focus and scene distances are metres.
    float signedCoc = uCocScale * (1.0 - uFocusDistance / distanceToCamera);
    // Art-directed near-field gain matches the soft framing tires. It fades out
    // by 72% of the focus distance; the car and screens keep the physical CoC.
    float nearField = 1.0 - smoothstep(0.48, 0.72, distanceToCamera / uFocusDistance);
    float coc = min(abs(signedCoc) * mix(1.0, uForegroundGain, nearField), uMaxBlur);
    // Subpixel defocus is left sharp instead of paying for an imperceptible gather.
    coc *= smoothstep(0.4, 1.05, coc);

    vec2 velocity = vec2(0.0);
    if (uShutter > 0.0) {
      vec4 world = uInverseViewProjection * vec4(vUv * 2.0 - 1.0, clipDepth(depth), 1.0);
      world /= max(world.w, 0.000001);
      vec4 previousClip = uPreviousViewProjection * world;
      if (previousClip.w > 0.0) {
        vec2 previousUv = previousClip.xy / previousClip.w * 0.5 + 0.5;
        vec2 pixelVelocity = (vUv - previousUv) * uResolution * uShutter;
        float speed = length(pixelVelocity);
        pixelVelocity *= min(1.0, uMotionLimit / max(speed, 0.0001));
        velocity = pixelVelocity * uTexel;
      }
    }

    if (coc < 0.45 && length(velocity * uResolution) < 0.4) {
      gl_FragColor = center;
      return;
    }

    float count = coc >= 0.45 ? uSamples : uMotionSamples;
    vec3 sum = center.rgb;
    float weightSum = 1.0;
    // Bounded, deterministic disk gather: six/eight/twelve taps; no temporal noise.
    for (int i = 0; i < 12; i++) {
      if (float(i) >= count) break;
      float t = (float(i) + 0.5) / count;
      float angle = float(i) * 2.39996323;
      vec2 disk = vec2(cos(angle), sin(angle)) * sqrt(t) * coc * uTexel;
      vec2 sampleUv = boundedUv(vUv + disk + velocity * (t - 0.5));
      float sampleDepth = texture2D(tSceneDepth, sampleUv).x;
      float sampleDistance = viewDistance(sampleUv, sampleDepth);

      // A modest depth rejection limits foreground/background color leaking.
      // This is a single-layer optical approximation, not a layered bokeh solver.
      float delta = (sampleDistance - distanceToCamera) / max(distanceToCamera, 0.1);
      float rejection = signedCoc < 0.0
        ? smoothstep(0.12, 0.8, delta) * 0.45
        : smoothstep(0.08, 0.4, -delta) * 0.85;
      float weight = 1.0 - rejection;
      sum += texture2D(tDiffuse, sampleUv).rgb * weight;
      weightSum += weight;
    }
    gl_FragColor = vec4(sum / weightSum, center.a);
  }
`;

class DepthLensPass extends ShaderPass {
  constructor() {
    super(screenMaterial('DXT.DepthLens', LENS_FRAGMENT, {
      tDiffuse: { value: null }, tSceneDepth: { value: null },
      uResolution: { value: new Vector2(1, 1) }, uTexel: { value: new Vector2(1, 1) },
      uInverseProjection: { value: new Matrix4() },
      uInverseViewProjection: { value: new Matrix4() },
      uPreviousViewProjection: { value: new Matrix4() },
      uZeroToOneDepth: { value: 0 }, uFocusDistance: { value: 12 },
      uCocScale: { value: 1 }, uForegroundGain: { value: 8 }, uMaxBlur: { value: 12 },
      uSamples: { value: 8 }, uMotionSamples: { value: 4 },
      uShutter: { value: 0 }, uMotionLimit: { value: 8 },
    }));
  }

  setSize(width, height) {
    this.uniforms.uResolution.value.set(width, height);
    this.uniforms.uTexel.value.set(1 / width, 1 / height);
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    // RenderPass just filled this buffer. Its sibling is the destination, so
    // neither the color nor the attached depth texture is sampled in place.
    this.uniforms.tSceneDepth.value = readBuffer.depthTexture;
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }
}

const BRIGHT_FRAGMENT = /* glsl */`
  uniform sampler2D tInput;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec2 d = uTexel * 0.5;
    vec3 color = (
      texture2D(tInput, vUv + vec2(-d.x, -d.y)).rgb +
      texture2D(tInput, vUv + vec2( d.x, -d.y)).rgb +
      texture2D(tInput, vUv + vec2(-d.x,  d.y)).rgb +
      texture2D(tInput, vUv + vec2( d.x,  d.y)).rgb
    ) * 0.25;
    // A quadratic soft knee on the peak channel retains saturated red LEDs.
    float brightness = max(color.r, max(color.g, color.b));
    float soft = clamp(brightness - 0.85 + 0.4, 0.0, 0.8);
    soft = soft * soft / 1.6;
    float contribution = max(brightness - 0.85, soft) / max(brightness, 0.0001);
    gl_FragColor = vec4(color * contribution, 1.0);
  }
`;

const BLUR_FRAGMENT = /* glsl */`
  uniform sampler2D tInput;
  uniform vec2 uStep;
  varying vec2 vUv;
  void main() {
    // Five bilinear fetches approximate a nine-tap separable Gaussian.
    vec3 color = texture2D(tInput, vUv).rgb * 0.22702703;
    color += (texture2D(tInput, vUv + uStep * 1.38461538).rgb
      + texture2D(tInput, vUv - uStep * 1.38461538).rgb) * 0.31621622;
    color += (texture2D(tInput, vUv + uStep * 3.23076923).rgb
      + texture2D(tInput, vUv - uStep * 3.23076923).rgb) * 0.07027027;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const STREAK_FRAGMENT = /* glsl */`
  uniform sampler2D tInput;
  uniform vec2 uStep;
  varying vec2 vUv;
  void main() {
    vec3 color = vec3(0.0);
    float total = 0.0;
    for (int i = -4; i <= 4; i++) {
      float x = float(i);
      float weight = exp(-x * x * 0.23);
      color += texture2D(tInput, vUv + uStep * x).rgb * weight;
      total += weight;
    }
    gl_FragColor = vec4(color / total, 1.0);
  }
`;

class BoundedBloomPass extends Pass {
  constructor(type) {
    super();
    this.needsSwap = false;
    this.profile = PROFILES.auto;
    this.width = 1;
    this.height = 1;
    this.bright = colorTarget('DXT.Bloom.Threshold', type);
    this.temporary = colorTarget('DXT.Bloom.Temporary', type);
    this.bloom = colorTarget('DXT.Bloom.Near', type);
    this.wideTemporary = colorTarget('DXT.Bloom.WideTemporary', type);
    this.wide = colorTarget('DXT.Bloom.Wide', type);
    this.streak = colorTarget('DXT.Bloom.Streak', type);
    this.targets = [this.bright, this.temporary, this.bloom, this.wideTemporary, this.wide, this.streak];
    this.brightMaterial = screenMaterial('DXT.SoftThreshold', BRIGHT_FRAGMENT, {
      tInput: { value: null }, uTexel: { value: new Vector2() },
    });
    this.blurMaterial = screenMaterial('DXT.SmallGaussian', BLUR_FRAGMENT, {
      tInput: { value: null }, uStep: { value: new Vector2() },
    });
    this.streakMaterial = screenMaterial('DXT.HorizontalStreak', STREAK_FRAGMENT, {
      tInput: { value: null }, uStep: { value: new Vector2() },
    });
    this.quad = new FullScreenQuad(this.brightMaterial);
  }

  setProfile(profile) {
    this.profile = profile;
    this.setSize(this.width, this.height);
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    const scale = Math.min(this.profile.bloomScale, this.profile.bloomEdge / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    this.bright.setSize(w, h);
    this.temporary.setSize(w, h);
    this.bloom.setSize(w, h);
    const wideWidth = Math.max(1, Math.round(w * 0.5));
    const wideHeight = Math.max(1, Math.round(h * 0.5));
    this.wideTemporary.setSize(wideWidth, wideHeight);
    this.wide.setSize(wideWidth, wideHeight);
    this.streak.setSize(wideWidth, wideHeight);
  }

  draw(renderer, material, target) {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
  }

  blur(renderer, texture, target, x, y) {
    this.blurMaterial.uniforms.tInput.value = texture;
    this.blurMaterial.uniforms.uStep.value.set(x, y);
    this.draw(renderer, this.blurMaterial, target);
  }

  render(renderer, writeBuffer, readBuffer) {
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    try {
      this.brightMaterial.uniforms.tInput.value = readBuffer.texture;
      this.brightMaterial.uniforms.uTexel.value.set(1 / readBuffer.width, 1 / readBuffer.height);
      this.draw(renderer, this.brightMaterial, this.bright);
      this.blur(renderer, this.bright.texture, this.temporary, 1 / this.bright.width, 0);
      this.blur(renderer, this.temporary.texture, this.bloom, 0, 1 / this.temporary.height);
      this.blur(renderer, this.bloom.texture, this.wideTemporary, 2.5 / this.bloom.width, 0);
      this.blur(renderer, this.wideTemporary.texture, this.wide, 0, 1.25 / this.wideTemporary.height);
      this.streakMaterial.uniforms.tInput.value = this.bloom.texture;
      this.streakMaterial.uniforms.uStep.value.set(9 / this.bloom.width, 0);
      this.draw(renderer, this.streakMaterial, this.streak);
    } finally {
      renderer.autoClear = oldAutoClear;
    }
  }

  dispose() {
    this.targets.forEach(target => target.dispose());
    this.brightMaterial.dispose();
    this.blurMaterial.dispose();
    this.streakMaterial.dispose();
    this.quad.dispose();
  }
}

const GRADE_FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tBloom;
  uniform sampler2D tWideBloom;
  uniform sampler2D tStreak;
  uniform vec2 uTexel;
  uniform float uPixelRatio;
  uniform float uTime;
  varying vec2 vUv;

  // Analytic LUT-equivalent grading in scene-linear RGB. There is no LUT asset.
  // Neutral shadows lose a little saturation; red highlights gain a small bias.
  vec3 gradeLinear(vec3 color) {
    color = max(color, vec3(0.0));
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float shadowSaturation = mix(0.965, 1.0, smoothstep(0.015, 0.22, luminance));
    color = mix(vec3(luminance), color, shadowSaturation);
    float red = smoothstep(0.05, 0.5, color.r - max(color.g, color.b));
    red *= smoothstep(0.08, 0.8, luminance + color.r * 0.2);
    color *= vec3(1.0 + red * 0.035, 1.0 - red * 0.009, 1.0 - red * 0.009);
    return color;
  }

  void main() {
    vec2 p = vUv - 0.5;
    float radius = length(p);
    // Less than half a CSS pixel of lateral color separation at the corners.
    vec2 shift = p / max(radius, 0.001) * smoothstep(0.1, 0.67, radius)
      * 0.45 * uPixelRatio * uTexel;
    vec4 center = texture2D(tDiffuse, vUv);
    vec3 color = vec3(
      texture2D(tDiffuse, clamp(vUv + shift, uTexel * 0.5, 1.0 - uTexel * 0.5)).r,
      center.g,
      texture2D(tDiffuse, clamp(vUv - shift, uTexel * 0.5, 1.0 - uTexel * 0.5)).b
    );
    color += texture2D(tBloom, vUv).rgb * 0.19;
    color += texture2D(tWideBloom, vUv).rgb * 0.13;
    color += texture2D(tStreak, vUv).rgb * 0.025;
    color = gradeLinear(color);
    color *= 1.0 - smoothstep(0.12, 0.5, dot(p, p)) * 0.10;
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))
      + floor(uTime * 24.0) * 0.71) * 43758.5453) - 0.5;
    color = max(vec3(0.0), color + grain * 0.00015);
    // OutputPass alone applies renderer exposure, tone mapping, and sRGB transfer.
    gl_FragColor = vec4(color, center.a);
  }
`;

/**
 * Scene-linear optical pipeline. The ordinary RenderPass preserves scene fog and
 * captures opaque depth in the same draw. Transparent smoke uses underlying depth.
 * HDR is half-float when supported; the same pipeline has an 8-bit fallback.
 */
export class RoomOptics {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.camera = camera;
    this.quality = 'auto';
    this.profile = PROFILES.auto;
    this.width = 1;
    this.height = 1;
    this.pixelRatio = 1;
    this.time = 0;
    this.disposed = false;
    this.previousValid = false;
    this.currentViewProjection = new Matrix4();
    this.previousViewProjection = new Matrix4();
    this.hdr = renderer.extensions.has('EXT_color_buffer_float');
    const type = this.hdr ? HalfFloatType : UnsignedByteType;
    const target = new WebGLRenderTarget(1, 1, {
      type, colorSpace: LinearSRGBColorSpace, minFilter: LinearFilter, magFilter: LinearFilter,
      depthBuffer: true, stencilBuffer: false, samples: 0,
      depthTexture: new DepthTexture(1, 1, UnsignedIntType),
    });
    target.texture.name = 'DXT.SceneLinear';
    target.depthTexture.name = 'DXT.SceneDepth';
    // Three.js clones the depth texture as well as color: the two are independent.
    this.composer = new EffectComposer(renderer, target);
    this.renderPass = new RenderPass(scene, camera);
    this.lensPass = new DepthLensPass();
    this.bloomPass = new BoundedBloomPass(type);
    this.gradePass = new ShaderPass(screenMaterial('DXT.LensGrade', GRADE_FRAGMENT, {
      tDiffuse: { value: null }, tBloom: { value: this.bloomPass.bloom.texture },
      tWideBloom: { value: this.bloomPass.wide.texture }, tStreak: { value: this.bloomPass.streak.texture },
      uTexel: { value: new Vector2(1, 1) }, uPixelRatio: { value: 1 }, uTime: { value: 0 },
    }));
    this.outputPass = new OutputPass();
    this.outputPass.material.depthTest = false;
    this.outputPass.material.depthWrite = false;
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.lensPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.gradePass);
    this.composer.addPass(this.outputPass);
    const size = renderer.getSize(new Vector2());
    this.resize(size.x, size.y, renderer.getPixelRatio());
  }

  resize(width, height, pixelRatio = this.renderer.getPixelRatio()) {
    if (this.disposed) return;
    this.width = Math.max(1, Math.round(Number.isFinite(width) ? width : 1));
    this.height = Math.max(1, Math.round(Number.isFinite(height) ? height : 1));
    this.pixelRatio = Math.max(0.1, Number.isFinite(pixelRatio) ? pixelRatio : 1);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(this.width, this.height);
    this.gradePass.uniforms.uTexel.value.set(
      1 / (this.width * this.pixelRatio), 1 / (this.height * this.pixelRatio),
    );
    this.gradePass.uniforms.uPixelRatio.value = this.pixelRatio;
    this.lensPass.uniforms.uMaxBlur.value = this.profile.maxBlur * this.pixelRatio;
    this.lensPass.uniforms.uMotionLimit.value = (this.quality === 'low' ? 6 : 8) * this.pixelRatio;
    this.previousValid = false;
  }

  setQuality(quality) {
    if (this.disposed) return;
    this.quality = Object.hasOwn(PROFILES, quality) ? quality : 'auto';
    this.profile = PROFILES[this.quality];
    this.lensPass.uniforms.uSamples.value = this.profile.samples;
    this.lensPass.uniforms.uMotionSamples.value = this.profile.motionSamples;
    this.lensPass.uniforms.uMaxBlur.value = this.profile.maxBlur * this.pixelRatio;
    this.lensPass.uniforms.uMotionLimit.value = (this.quality === 'low' ? 6 : 8) * this.pixelRatio;
    this.bloomPass.setProfile(this.profile);
  }

  render(deltaTime, { time, motion = 0, focusDistance = 12, paused = false } = {}) {
    if (this.disposed) return;
    const dt = Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : 1 / 60;
    if (!paused) this.time = Number.isFinite(time) ? time : this.time + Math.min(dt, 0.05);
    this.camera.updateWorldMatrix(true, false);
    this.currentViewProjection.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    let matrixChange = 0;
    if (this.previousValid) {
      for (let i = 0; i < 16; i++) {
        matrixChange = Math.max(matrixChange,
          Math.abs(this.currentViewProjection.elements[i] - this.previousViewProjection.elements[i]));
      }
    }
    const continuousMotion = this.previousValid && !paused && dt < 0.15
      && matrixChange > 0.000001 && matrixChange < 0.35;
    const uniforms = this.lensPass.uniforms;
    uniforms.uInverseProjection.value.copy(this.camera.projectionMatrixInverse);
    uniforms.uInverseViewProjection.value.copy(this.currentViewProjection).invert();
    uniforms.uPreviousViewProjection.value.copy(
      this.previousValid ? this.previousViewProjection : this.currentViewProjection,
    );
    uniforms.uZeroToOneDepth.value = this.renderer.capabilities.reversedDepthBuffer ? 1 : 0;
    const motionAmount = Math.min(1, Math.max(0, Number.isFinite(motion) ? motion : 0));
    uniforms.uShutter.value = continuousMotion
      ? Math.min(0.65, (1 / 144) / dt) * (0.7 + motionAmount * 0.3) : 0;

    const focus = Math.max(this.camera.near * 1.01,
      Math.min(this.camera.far * 0.95, Number.isFinite(focusDistance) ? focusDistance : 12));
    const focalLength = (this.camera.getFocalLength?.() ?? 40) * (this.camera.zoom ?? 1) / 1000;
    const filmHeight = (this.camera.getFilmHeight?.() ?? 24) / 1000;
    const fNumber = 1.5;
    uniforms.uFocusDistance.value = focus;
    uniforms.uCocScale.value = 0.5 * this.height * this.pixelRatio * focalLength * focalLength
      / (fNumber * filmHeight * Math.max(focus - focalLength, 0.01));
    this.gradePass.uniforms.uTime.value = this.time;
    this.composer.render(Math.min(dt, 0.1));
    this.previousViewProjection.copy(this.currentViewProjection);
    this.previousValid = true;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.composer.passes.forEach(pass => pass.dispose());
    this.composer.dispose();
  }
}
