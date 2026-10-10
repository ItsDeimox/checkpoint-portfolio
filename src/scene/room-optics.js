import {
  DepthTexture,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Matrix4,
  NoBlending,
  Quaternion,
  ShaderMaterial,
  UnsignedByteType,
  UnsignedIntType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { TurntableMotionPass } from './room-turntable.js';
import { renderBudget } from './room-core.js';
import { normalizeVisualSettings } from './room-visual-settings.js';
export { DEFAULT_VISUAL_SETTINGS, VISUAL_CONTROLS, normalizeVisualSettings } from './room-visual-settings.js';

const PROFILES = {
  low: { samples: 8, motionSamples: 4, maxBlur: 8, msaaSamples: 0, bloomEdge: 384, bloomScale: 0.25 },
  auto: { samples: 20, motionSamples: 6, maxBlur: 11, msaaSamples: 2, bloomEdge: 512, bloomScale: 0.33 },
  high: { samples: 32, motionSamples: 8, maxBlur: 13, msaaSamples: 4, bloomEdge: 768, bloomScale: 0.4 },
};

function supportedSceneSamples(renderer, hdr) {
  // MAX_SAMPLES alone is insufficient: RGBA16F and DEPTH_COMPONENT24 must
  // support the same count. Query only WebGL2 renderable formats; no test FBO,
  // state changes, extension guessing, or speculative invalid-enum probes.
  const gl = renderer.getContext?.();
  const maxSamples = renderer.capabilities?.maxSamples;
  if (!gl?.getInternalformatParameter || !Number.isFinite(maxSamples) || maxSamples < 2) return [];
  const colorFormat = hdr ? gl.RGBA16F : gl.RGBA8;
  if (![gl.RENDERBUFFER, gl.SAMPLES, colorFormat, gl.DEPTH_COMPONENT24].every(Number.isFinite)) return [];
  try {
    const color = Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, colorFormat, gl.SAMPLES) ?? []);
    const depth = Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, gl.SAMPLES) ?? []);
    return [4, 2].filter(count => count <= maxSamples && color.includes(count) && depth.includes(count));
  } catch {
    // FXAA remains available even if a lost context cannot answer the query.
    return [];
  }
}

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

class SceneCapturePass extends RenderPass {
  constructor(scene, camera, target) {
    super(scene, camera);
    this.target = target;
  }

  render(renderer, writeBuffer) {
    // Geometry is drawn once. The lens reads this target directly, so capturing
    // depth plus MSAA needs neither a scene copy nor multisampled effect buffers.
    super.render(renderer, writeBuffer, this.target);
  }
}

const LENS_FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tSceneDepth;
  uniform sampler2D tObjectMotion;
  uniform float uObjectMotion;
  uniform float uFarPlane;
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
    // A restrained near-field gain softens the framing tires. It fades out
    // by 72% of the focus distance; the car and selected screen keep their CoC.
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
        vec2 uvVelocity = vUv - previousUv;
        if(uObjectMotion>0.5){vec4 objectMotion=texture2D(tObjectMotion,vUv);
          if(objectMotion.a>.5 && abs(objectMotion.b*uFarPlane-distanceToCamera)<max(.045,distanceToCamera*.008))uvVelocity=(objectMotion.rg-.5)*2.;}
        vec2 pixelVelocity = uvVelocity * uResolution * uShutter;
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
    // Denser deterministic aperture gather reduces separated highlight dots.
    for (int i = 0; i < 32; i++) {
      if (float(i) >= count) break;
      float t = (float(i) + 0.5) / count;
      float angle = float(i) * 2.39996323;
      vec2 disk = vec2(cos(angle), sin(angle)) * sqrt(t) * coc * uTexel;
      vec2 sampleUv = boundedUv(vUv + disk + velocity * (t - 0.5));
      float sampleDepth = texture2D(tSceneDepth, sampleUv).x;
      float sampleDistance = viewDistance(sampleUv, sampleDepth);

      // Reject foreground silhouettes and background leakage more strongly as
      // the gather grows, while retaining nearby samples on the same surface.
      // This is a single-layer optical approximation, not a layered bokeh solver.
      float delta = (sampleDistance - distanceToCamera) / max(distanceToCamera, 0.1);
      float tolerance = 0.025 + min(coc * 0.008, 0.09);
      float rejection = signedCoc < 0.0
        ? smoothstep(tolerance, tolerance + 0.45, delta) * 0.72
        : smoothstep(tolerance, tolerance + 0.24, -delta) * 0.97;
      float weight = 1.0 - rejection;
      vec3 sampleColor = texture2D(tDiffuse, sampleUv).rgb;
      // A small, bounded highlight weighting preserves the soft light disks
      // without amplifying bright pixels into unstable fireflies.
      float highlight = max(sampleColor.r, max(sampleColor.g, sampleColor.b));
      weight *= 1.0 + clamp(highlight - 1.0, 0.0, 2.0) * 0.08;
      sum += sampleColor * weight;
      weightSum += weight;
    }
    gl_FragColor = vec4(sum / weightSum, center.a);
  }
`;

class DepthLensPass extends ShaderPass {
  constructor(sceneTarget) {
    super(screenMaterial('DXT.DepthLens', LENS_FRAGMENT, {
      tDiffuse: { value: null }, tSceneDepth: { value: null },
      tObjectMotion: { value: null }, uObjectMotion: { value: 0 }, uFarPlane: { value: 100 },
      uResolution: { value: new Vector2(1, 1) }, uTexel: { value: new Vector2(1, 1) },
      uInverseProjection: { value: new Matrix4() },
      uInverseViewProjection: { value: new Matrix4() },
      uPreviousViewProjection: { value: new Matrix4() },
      uZeroToOneDepth: { value: 0 }, uFocusDistance: { value: 12 },
      uCocScale: { value: 1 }, uForegroundGain: { value: 4.5 }, uMaxBlur: { value: 11 },
      uSamples: { value: 20 }, uMotionSamples: { value: 6 },
      uShutter: { value: 0 }, uMotionLimit: { value: 8 },
    }));
    this.sceneTarget = sceneTarget;
  }

  setSize(width, height) {
    this.uniforms.uResolution.value.set(width, height);
    this.uniforms.uTexel.value.set(1 / width, 1 / height);
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    // Three resolves color and depth after the scene render. The lens writes
    // into a separate single-sample buffer and never samples in place.
    this.uniforms.tSceneDepth.value = this.sceneTarget.depthTexture;
    super.render(renderer, writeBuffer, this.sceneTarget, deltaTime, maskActive);
  }
}

const BRIGHT_FRAGMENT = /* glsl */`
  uniform sampler2D tInput;
  uniform vec2 uTexel;
  uniform float uThreshold;
  uniform float uKnee;
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
    color *= min(1.0, 12.0 / max(brightness, 0.0001));
    brightness = min(brightness, 12.0);
    float soft = clamp(brightness - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / max(4.0 * uKnee, 0.0001);
    float contribution = max(brightness - uThreshold, soft) / max(brightness, 0.0001);
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

const BLOOM_COMBINE_FRAGMENT = /* glsl */`
 uniform sampler2D mip0;uniform sampler2D mip1;uniform sampler2D mip2;
 uniform sampler2D mip3;uniform sampler2D mip4;uniform sampler2D mip5;varying vec2 vUv;
 void main(){vec3 c=texture2D(mip0,vUv).rgb*.31+texture2D(mip1,vUv).rgb*.24
 +texture2D(mip2,vUv).rgb*.18+texture2D(mip3,vUv).rgb*.13
 +texture2D(mip4,vUv).rgb*.09+texture2D(mip5,vUv).rgb*.05;
 gl_FragColor=vec4(c*1.15,1.);}
`;
class BoundedBloomPass extends Pass {
 constructor(type){
  super();this.needsSwap=false;this.profile=PROFILES.auto;this.lensEnabled=true;this.width=this.height=1;
  this.bright=colorTarget('DXT.Bloom.Threshold',type);
  this.levels=Array.from({length:6},(_,i)=>({horizontal:colorTarget(`DXT.Bloom.Mip${i}.H`,type),vertical:colorTarget(`DXT.Bloom.Mip${i}.V`,type)}));
  this.bloom=colorTarget('DXT.Bloom.Combined',type);this.wide=this.levels[3].vertical;
  this.streak=colorTarget('DXT.Bloom.Streak',type);
  this.targets=[this.bright,...this.levels.flatMap(l=>[l.horizontal,l.vertical]),this.bloom,this.streak];
  this.brightMaterial=screenMaterial('DXT.SoftThreshold',BRIGHT_FRAGMENT,{tInput:{value:null},uTexel:{value:new Vector2()},uThreshold:{value:type===HalfFloatType?1.05:.82},uKnee:{value:type===HalfFloatType?.3:.18}});
  this.blurMaterial=screenMaterial('DXT.SmallGaussian',BLUR_FRAGMENT,{tInput:{value:null},uStep:{value:new Vector2()}});
  this.streakMaterial=screenMaterial('DXT.HorizontalStreak',STREAK_FRAGMENT,{tInput:{value:null},uStep:{value:new Vector2()}});
  this.combineMaterial=screenMaterial('DXT.SixScaleBloom',BLOOM_COMBINE_FRAGMENT,Object.fromEntries(this.levels.map((l,i)=>['mip'+i,{value:l.vertical.texture}])));
  this.quad=new FullScreenQuad(this.brightMaterial);
 }
 setProfile(profile){this.profile=profile;this.setSize(this.width,this.height);}
 setSize(width,height){
  this.width=width;this.height=height;
  const scale=Math.min(this.profile.bloomScale,this.profile.bloomEdge/Math.max(width,height));
  const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
  this.bright.setSize(w,h);this.bloom.setSize(w,h);
  this.levels.forEach((l,i)=>{const x=Math.max(1,Math.round(w/2**i)),y=Math.max(1,Math.round(h/2**i));l.horizontal.setSize(x,y);l.vertical.setSize(x,y);});
  this.streak.setSize(Math.max(1,Math.round(w*.5)),Math.max(1,Math.round(h*.5)));
 }
 draw(renderer,material,target){this.quad.material=material;renderer.setRenderTarget(target);this.quad.render(renderer);}
 blur(renderer,texture,target,x,y){this.blurMaterial.uniforms.tInput.value=texture;this.blurMaterial.uniforms.uStep.value.set(x,y);this.draw(renderer,this.blurMaterial,target);}
 render(renderer,writeBuffer,readBuffer){
  const oldAutoClear=renderer.autoClear;renderer.autoClear=false;
  try{
   this.brightMaterial.uniforms.tInput.value=readBuffer.texture;this.brightMaterial.uniforms.uTexel.value.set(1/readBuffer.width,1/readBuffer.height);
   this.draw(renderer,this.brightMaterial,this.bright);
   let source=this.bright;
   for(const level of this.levels){
    this.blur(renderer,source.texture,level.horizontal,1/level.horizontal.width,0);
    this.blur(renderer,level.horizontal.texture,level.vertical,0,1/level.vertical.height);source=level.vertical;
   }
   this.draw(renderer,this.combineMaterial,this.bloom);
   if(this.lensEnabled){this.streakMaterial.uniforms.tInput.value=this.levels[0].vertical.texture;this.streakMaterial.uniforms.uStep.value.set(9/this.bloom.width,0);this.draw(renderer,this.streakMaterial,this.streak);}
  }finally{renderer.autoClear=oldAutoClear;}
 }
 dispose(){this.targets.forEach(t=>t.dispose());this.brightMaterial.dispose();this.blurMaterial.dispose();this.combineMaterial.dispose();this.streakMaterial.dispose();this.quad.dispose();}
}

const GRADE_FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tBloom;
  uniform sampler2D tWideBloom;
  uniform sampler2D tStreak;
  uniform vec2 uTexel;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uBloomStrength;
  uniform float uLensStrength;
  uniform float uContrast;
  uniform float uSharpness;
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
    // Contrast pivots around middle grey in linear light; ACES still owns the
    // highlight shoulder and sRGB conversion, so whites do not hard-clip here.
    color *= pow(max(luminance / 0.18, 0.0001), uContrast - 1.0);
    return color;
  }

  void main() {
    vec2 p = vUv - 0.5;
    float radius = length(p);
    // Optical dispersion stays below 0.6 CSS pixels even at the maximum setting.
    vec2 shift = p / max(radius, 0.001) * smoothstep(0.1, 0.67, radius)
      * 0.6 * uLensStrength * uPixelRatio * uTexel;
    vec4 center = texture2D(tDiffuse, vUv);
    vec3 color = vec3(
      texture2D(tDiffuse, clamp(vUv + shift, uTexel * 0.5, 1.0 - uTexel * 0.5)).r,
      center.g,
      texture2D(tDiffuse, clamp(vUv - shift, uTexel * 0.5, 1.0 - uTexel * 0.5)).b
    );
    if (uSharpness > 0.0) {
      vec3 north = texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb;
      vec3 south = texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
      vec3 east = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb;
      vec3 west = texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb;
      vec3 average = (north + south + east + west) * 0.25;
      vec3 detail = center.rgb - average;
      float luminance = dot(center.rgb, vec3(0.2126, 0.7152, 0.0722));
      float edge = length(detail) / (0.04 + luminance);
      float detailLimit = 0.012 + luminance * 0.055;
      // Recover texture detail while avoiding bright rims around LED/panel edges.
      color += clamp(detail, vec3(-detailLimit), vec3(detailLimit))
        * uSharpness * (1.0 - smoothstep(0.2, 0.9, edge));
    }
    if (uBloomStrength > 0.0) {
      color += texture2D(tBloom, vUv).rgb * uBloomStrength;
      if (uLensStrength > 0.0) {
        color += texture2D(tStreak, vUv).rgb * uBloomStrength * uLensStrength * 0.09;
        // A very faint reversed ghost is driven only by actual bright sources.
        vec2 ghostUv = clamp(0.5 - p * 0.72, uTexel * 0.5, 1.0 - uTexel * 0.5);
        color += texture2D(tWideBloom, ghostUv).rgb * uBloomStrength * uLensStrength * 0.025;
      }
    }
    color = gradeLinear(color);
    color *= 1.0 - smoothstep(0.12, 0.5, dot(p, p)) * 0.12 * uLensStrength;
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))
      + floor(uTime * 24.0) * 0.71) * 43758.5453) - 0.5;
    color = max(vec3(0.0), color + grain * 0.00012 * uLensStrength);
    // OutputPass alone applies renderer exposure, tone mapping, and sRGB transfer.
    gl_FragColor = vec4(color, center.a);
  }
`;

/**
 * Scene-linear optical pipeline. One geometry draw captures resolved color and
 * opaque depth; transparent smoke uses underlying depth. MSAA is restricted to
 * that draw. Color-only effect buffers stay single-sampled, followed by ACES/sRGB
 * and FXAA. HDR is half-float when supported, with the same 8-bit fallback.
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
    this.previousProjectionAnimated = false;
    this.currentViewProjection = new Matrix4();
    this.previousViewProjection = new Matrix4();
    this.previousProjection = new Matrix4();
    this.currentPosition = new Vector3();
    this.previousPosition = new Vector3();
    this.currentRotation = new Quaternion();
    this.previousRotation = new Quaternion();
    this.previousNear = camera.near;
    this.previousFar = camera.far;
    this.previousAspect = camera.aspect;
    this.previousZoom = camera.zoom;
    this.previousFilmOffset = camera.filmOffset;
    this.visualSettings = normalizeVisualSettings();
    this.hdr = renderer.extensions.has('EXT_color_buffer_float');
    this.supportedSamples = supportedSceneSamples(renderer, this.hdr);
    const type = this.hdr ? HalfFloatType : UnsignedByteType;
    this.sceneTarget = new WebGLRenderTarget(1, 1, {
      type, colorSpace: LinearSRGBColorSpace, minFilter: LinearFilter, magFilter: LinearFilter,
      depthBuffer: true, stencilBuffer: false,
      samples: this.supportedSamples.find(count => count <= this.profile.msaaSamples) ?? 0,
      resolveDepthBuffer: true, resolveStencilBuffer: false,
      depthTexture: new DepthTexture(1, 1, UnsignedIntType),
    });
    this.sceneTarget.texture.name = 'DXT.SceneLinear';
    this.sceneTarget.depthTexture.name = 'DXT.SceneDepth';
    this.composer = new EffectComposer(renderer, colorTarget('DXT.OpticsLinear', type));
    this.renderPass = new SceneCapturePass(scene, camera, this.sceneTarget);
    this.lensPass = new DepthLensPass(this.sceneTarget);
    this.bloomPass = new BoundedBloomPass(type);
    this.gradePass = new ShaderPass(screenMaterial('DXT.LensGrade', GRADE_FRAGMENT, {
      tDiffuse: { value: null }, tBloom: { value: this.bloomPass.bloom.texture },
      tWideBloom: { value: this.bloomPass.wide.texture }, tStreak: { value: this.bloomPass.streak.texture },
      uTexel: { value: new Vector2(1, 1) }, uPixelRatio: { value: 1 }, uTime: { value: 0 },
      uBloomStrength: { value: 0 }, uLensStrength: { value: 0 },
      uContrast: { value: 1 }, uSharpness: { value: 0 },
    }));
    this.outputPass = new OutputPass();
    this.outputPass.material.depthTest = false;
    this.outputPass.material.depthWrite = false;
    this.aaPass = new FXAAPass();
    Object.assign(this.aaPass.material, {
      name: 'DXT.FXAA', depthTest: false, depthWrite: false, toneMapped: false, blending: NoBlending,
    });
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.lensPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.gradePass);
    this.composer.addPass(this.outputPass);
    // FXAA's luminance thresholds expect the sRGB output, not scene-linear HDR.
    this.composer.addPass(this.aaPass);
    this.setVisualSettings(this.visualSettings);
    const size = renderer.getSize(new Vector2());
    this.resize(size.x, size.y, renderer.getPixelRatio());
  }

  attachTurntable(root) {
    if(this.turntableMotion)return this.turntableMotion;
    this.turntableMotion=new TurntableMotionPass(root,this.camera,this.hdr);
    this.composer.insertPass(this.turntableMotion,1);
    this.lensPass.uniforms.tObjectMotion.value=this.turntableMotion.target.texture;
    return this.turntableMotion;
  }

  resize(width, height, pixelRatio = this.renderer.getPixelRatio()) {
    if (this.disposed) return;
    this.width = Math.max(2, Math.round(Number.isFinite(width) ? width : 2));
    this.height = Math.max(2, Math.round(Number.isFinite(height) ? height : 2));
    this.requestedPixelRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
    const budget = renderBudget(this.width, this.height, this.requestedPixelRatio, this.quality);
    this.pixelRatio = budget.ratio;
    this.renderWidth = budget.width;
    this.renderHeight = budget.height;
    this.sceneTarget.setSize(this.renderWidth, this.renderHeight);
    // Explicit physical sizes keep all pass texels identical to the framebuffer,
    // including fractional DPR and the floor at the ultrawide pixel budget.
    this.composer.setPixelRatio(1);
    this.composer.setSize(this.renderWidth, this.renderHeight);
    this.gradePass.uniforms.uTexel.value.set(1 / this.renderWidth, 1 / this.renderHeight);
    this.gradePass.uniforms.uPixelRatio.value = this.pixelRatio;
    this.lensPass.uniforms.uMaxBlur.value = this.profile.maxBlur * this.pixelRatio;
    this.lensPass.uniforms.uMotionLimit.value = (this.quality === 'low' ? 6 : 8) * this.pixelRatio;
    this.resetHistory();
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
    const samples = this.supportedSamples.find(count => count <= this.profile.msaaSamples) ?? 0;
    if (samples !== this.sceneTarget.samples) {
      this.sceneTarget.dispose();
      this.sceneTarget.samples = samples;
    }
    this.resize(this.width, this.height, this.requestedPixelRatio);
  }

  setVisualSettings(settings = {}) {
    if (this.disposed) return { ...this.visualSettings };
    this.visualSettings = normalizeVisualSettings(settings, this.visualSettings);
    const values = this.visualSettings, uniforms = this.gradePass.uniforms;
    this.renderer.toneMappingExposure = values.exposure;
    uniforms.uBloomStrength.value = values.bloom;
    uniforms.uLensStrength.value = values.lens;
    uniforms.uContrast.value = values.contrast;
    uniforms.uSharpness.value = values.sharpness;
    this.bloomPass.enabled = values.bloom > 0;
    this.bloomPass.lensEnabled = values.lens > 0;
    this.resetHistory();
    return { ...values };
  }

  resetHistory() {
    this.previousValid = false;
    this.previousProjectionAnimated = false;
    this.lensPass.uniforms.uShutter.value = 0;
  }

  render(deltaTime, { time, motion = 0, focusDistance = 12, paused = false, projectionAnimated = false, turntableDelta = 0 } = {}) {
    if (this.disposed) return;
    const validDelta = Number.isFinite(deltaTime) && deltaTime > 0;
    const dt = validDelta ? deltaTime : 1 / 60;
    if (!paused) this.time = Number.isFinite(time) ? time : this.time + Math.min(dt, 0.05);
    this.camera.updateWorldMatrix(true, false);
    this.currentViewProjection.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.currentPosition.setFromMatrixPosition(this.camera.matrixWorld);
    this.camera.getWorldQuaternion(this.currentRotation);
    const animatedProjection = projectionAnimated === true;
    let translation = 0;
    let rotation = 0;
    let projectionChange = 0;
    let projectionShapeChange = 0;
    let lensChange = 0;
    let continuousProjection = true;
    if (this.previousValid) {
      translation = this.currentPosition.distanceTo(this.previousPosition);
      rotation = this.currentRotation.angleTo(this.previousRotation);
      const current = this.camera.projectionMatrix.elements;
      const previous = this.previousProjection.elements;
      for (let i = 0; i < 16; i++) {
        const change = Math.abs(current[i] - previous[i]);
        projectionChange = Math.max(projectionChange, change);
        if (i !== 0 && i !== 5) projectionShapeChange = Math.max(projectionShapeChange, change);
      }
      const fixedLensParameters = this.camera.near === this.previousNear && this.camera.far === this.previousFar
        && this.camera.aspect === this.previousAspect && this.camera.zoom === this.previousZoom
        && this.camera.filmOffset === this.previousFilmOffset;
      continuousProjection = fixedLensParameters && projectionChange < 0.0000001;
      if (!continuousProjection && fixedLensParameters && animatedProjection && this.camera.isPerspectiveCamera) {
        const scaleX = current[0] / previous[0];
        const scaleY = current[5] / previous[5];
        lensChange = Math.abs(Math.log(scaleY));
        // Only the rig's explicitly animated FOV may change. Isotropic lens
        // scaling preserves aspect; clip planes, film/view offsets and zoom
        // retain their own guards. A resize or an external FOV edit resets.
        continuousProjection = scaleX > 0 && scaleY > 0 && Number.isFinite(lensChange)
          && Math.abs(Math.log(scaleX / scaleY)) < 0.0000001
          && projectionShapeChange < 0.0000001
          && lensChange <= Math.min(0.08, 1.25 * dt);
      }
    }
    // World-space speed guards are independent of aspect and focal length.
    // They admit the actual panel paths (under 35 m/s and .84 rad/s), while
    // retaining absolute per-frame limits for camera cuts or a stalled frame.
    const safeHistory = this.previousValid && !paused && validDelta && dt < 0.15
      && !(this.previousProjectionAnimated && !animatedProjection) && continuousProjection
      && translation <= Math.min(3, 45 * dt) && rotation <= Math.min(0.25, 2.5 * dt);
    const continuousMotion = safeHistory
      && (translation > 0.000001 || rotation > 0.000001 || lensChange > 0.0000001);
    const objectMoving=Boolean(this.turntableMotion && this.hdr && safeHistory && Number.isFinite(turntableDelta) && Math.abs(turntableDelta)>1e-6 && Math.abs(turntableDelta)<.15);
    if(this.turntableMotion){this.turntableMotion.enabled=objectMoving;if(objectMoving)this.turntableMotion.prepare(this.previousViewProjection,turntableDelta);}
    const uniforms = this.lensPass.uniforms;
    uniforms.uObjectMotion.value=objectMoving?1:0;uniforms.uFarPlane.value=this.camera.far;
    uniforms.uInverseProjection.value.copy(this.camera.projectionMatrixInverse);
    uniforms.uInverseViewProjection.value.copy(this.currentViewProjection).invert();
    uniforms.uPreviousViewProjection.value.copy(
      continuousMotion || objectMoving ? this.previousViewProjection : this.currentViewProjection,
    );
    uniforms.uZeroToOneDepth.value = this.renderer.capabilities.reversedDepthBuffer ? 1 : 0;
    const motionAmount = Math.min(1, Math.max(0, Number.isFinite(motion) ? motion : 0));
    uniforms.uShutter.value = continuousMotion || objectMoving
      ? Math.min(0.65, (1 / 90) / dt) * (0.7 + motionAmount * 0.3) * this.visualSettings.motionBlur : 0;

    const focus = Math.max(this.camera.near * 1.01,
      Math.min(this.camera.far * 0.95, Number.isFinite(focusDistance) ? focusDistance : 12));
    const focalLength = (this.camera.getFocalLength?.() ?? 40) * (this.camera.zoom ?? 1) / 1000;
    const filmHeight = (this.camera.getFilmHeight?.() ?? 24) / 1000;
    const fNumber = 1.65;
    uniforms.uFocusDistance.value = focus;
    uniforms.uCocScale.value = this.visualSettings.depthOfField * 0.5 * this.renderHeight * focalLength * focalLength
      / (fNumber * filmHeight * Math.max(focus - focalLength, 0.01));
    this.gradePass.uniforms.uTime.value = this.time;
    this.composer.render(Math.min(dt, 0.1));
    this.previousViewProjection.copy(this.currentViewProjection);
    this.previousProjection.copy(this.camera.projectionMatrix);
    this.previousPosition.copy(this.currentPosition);
    this.previousRotation.copy(this.currentRotation);
    this.previousNear = this.camera.near;
    this.previousFar = this.camera.far;
    this.previousAspect = this.camera.aspect;
    this.previousZoom = this.camera.zoom;
    this.previousFilmOffset = this.camera.filmOffset;
    this.previousProjectionAnimated = animatedProjection;
    this.previousValid = !paused && validDelta && dt < 0.15;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.composer.passes.forEach(pass => pass.dispose());
    this.composer.dispose();
    this.sceneTarget.dispose();
  }
}
