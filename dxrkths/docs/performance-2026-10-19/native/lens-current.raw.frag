
  uniform sampler2D tDiffuse;
  uniform sampler2D tSceneDepth;
  uniform sampler2D tObjectMotion;
  uniform float uObjectMotion;
  uniform float uFarPlane;
  uniform vec2 uResolution;
  uniform vec2 uTexel;
  uniform mat4 uInverseProjection;
  uniform vec4 uDepthCoefficients;
  uniform float uSimpleDepth;
  uniform vec2 uAperture[32];
  uniform vec2 uApertureScale;
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
    if(uSimpleDepth>.5){
      float z=clipDepth(depth);
      return max((uDepthCoefficients.x*z+uDepthCoefficients.y)
        /max(uDepthCoefficients.z*z+uDepthCoefficients.w,0.000001),0.001);
    }
    vec4 view = uInverseProjection * vec4(uv * 2.0 - 1.0, clipDepth(depth), 1.0);
    return max(-view.z / max(view.w, 0.000001), 0.001);
  }

  void main() {
    vec4 center = texture2D(tDiffuse, vUv);
    if(uCocScale<=0.0&&uShutter<=0.0){gl_FragColor=center;return;}
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
    float inverseCount=1.0/count;
    vec2 diskScale=coc*uTexel*(coc>=0.45?uApertureScale.x:uApertureScale.y);
    float inverseDistance=1.0/max(distanceToCamera,0.1);
    float tolerance=0.025+min(coc*0.008,0.09);
    vec3 sum = center.rgb;
    float weightSum = 1.0;
    // Denser deterministic aperture gather reduces separated highlight dots.
    for (int i = 0; i < 32; i++) {
      if (float(i) >= count) break;
      float t = (float(i) + 0.5) * inverseCount;
      vec2 disk = uAperture[i] * diskScale;
      vec2 sampleUv = boundedUv(vUv + disk + velocity * (t - 0.5));
      float sampleDepth = texture2D(tSceneDepth, sampleUv).x;
      float sampleDistance = viewDistance(sampleUv, sampleDepth);

      // Reject foreground silhouettes and background leakage more strongly as
      // the gather grows, while retaining nearby samples on the same surface.
      // This is a single-layer optical approximation, not a layered bokeh solver.
      float delta = (sampleDistance - distanceToCamera) * inverseDistance;
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
