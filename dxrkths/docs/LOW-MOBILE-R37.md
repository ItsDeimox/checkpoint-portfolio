# R37: an explicitly lightweight mobile Low profile

Date: 27 October 2026. Author request: aggressively reduce effects and unnecessary calculations in Low for mobile. Preserve the approved R36 navigation, car, content, portal routes and Medium/High appearance. No new device-wide downgrade, library, rendering context or FPS cap.

## What Low now skips

- No planar-reflection scene capture, including while the car/camera moves. The floor takes a cheap matte/contact-lit path before water FBM, animated ripples and reflection texture sampling. Its unused reflection target is 1x1, not a full-size mirror buffer.
- No bloom pyramid, depth of field, motion blur, object-velocity capture, chromatic portal shutter, smoke bursts, sparks, beams, ambient dust or smoke. Unused bloom/velocity attachments stay 1x1. Disabled work is bypassed, not merely multiplied by zero after execution.
- The main pipeline has four draws/passes: scene, color grade, output tonemapping/sRGB and final FXAA. Basic antialiasing, car materials and scene lighting remain.
- Maximum Low raster budget drops from 900,000 to 450,000 pixels. A compact phone uses at most one render pixel per CSS pixel, rather than 1.25x supersampling. HTML text and controls are not downscaled.
- No repeated panel-energy simulation/uploads, decorative audio spectrum analysis or hidden desktop target projection on mobile. Large touch viewports beyond the actual mobile CSS breakpoint retain projected controls.
- Low stops its requestAnimationFrame chain after actual camera/car/transition motion and queued GPU work settle. Touch, resize, navigation, quality changes and user actions still wake the scene. Music playback continues; only visual reactivity is omitted.
- Secondary 3D surfaces render a static low-cost frame, capped at 640x440. The covered car does not perpetually rotate in Low. Medium/High restore their established animation and budgets.
- Low startup warmup does not temporarily reactivate discarded smoke, particles, hover or shadows. Higher-quality shader compilation remains available for later quality switching.

## Calculations and state integrity

Low bypasses lens matrix inversion, reprojection history and optical sample work entirely. Portal optics in other modes reuse scratch Matrix4/Vector3 instances instead of allocating each frame. Saved visual preferences are never replaced by Low defaults. Returning to High restores its 4x supported scene MSAA, 32 aperture samples, six bloom scales, reflection, smoke and original raster budget. The shared quality object also reaches destination-page graphics, so changing quality inside Projects takes effect immediately.

## Measured work, not claimed phone FPS

A real full-site browser capture at 390x844 CSS pixels, mobile/touch emulation, DPR2, Linux system Chrome with SwiftShader recorded:

| Metric | Previous Low | Optimized Low |
| --- | ---: | ---: |
| Raster dimensions | 487x1055 | 390x844 |
| Rendered pixels | 513,785 | 329,160 |
| Captured-frame draw calls | 259 | 120 |
| Captured-frame triangles | 567,487 | 283,682 |
| Bloom scales | 3 | 0 |
| Visible smoke layers | 8 | 0 |
| Additional idle frames over 2.4s | 1 | 0 |
| Additional reflection captures over 2.4s | 1 | 0 |
| Additional audio-analysis reads over 2.4s | 1 | 0 |

This is about 54% fewer draw submissions, 50% fewer submitted triangles and 36% fewer raster pixels in the captured scene. The old snapshot included a reflection capture; these are representative measured frames, NOT average cost across every frame or a 54% FPS claim. No car geometry was decimated. Software-GPU startup time and frame interval are not used as a physical-device benchmark.

Baseline evidence: [run 40548673112](https://github.com/ItsDeimox/checkpoint-portfolio/actions/runs/40548673112), artifact 12754995043. First optimized profile: [run 40549120933](https://github.com/ItsDeimox/checkpoint-portfolio/actions/runs/40549120933), optimized/report.json in artifact 12754542134. Its 15 focused profile checks passed; the separate old mobile script encountered a pre-existing async image-decode assertion race. The final [confirmation run 40550483283](https://github.com/ItsDeimox/checkpoint-portfolio/actions/runs/40550483283) reruns both suites with atomic identity/decode/presentation checks and a large-touch-screen regression. See that run and production build logs for final pass counts.

## Reproduce

`npm ci && npm run build` runs the entire Node regression suite. `tests/low-mobile-r37.test.mjs` and additional optics/lifecycle cases assert cheap Low, true idle sleep, High restoration, suppressed warmup work and desktop/tablet target scope. Existing effects tests now exercise Medium where the effect still exists; navigation contracts were not removed.

With Playwright 1.56.1 and system Chrome installed, run `node tests/low-mobile-r37-browser.cjs`, followed by `node tests/mobile-r35-browser.cjs`. The first verifies actual Low draws, idle parking, wake by touch, portal completion and Medium/High restoration. The second exercises all routes, media, dialogs, scroll preservation, quality controls and seven viewport/orientation combinations. Their reports and screenshots are reproducible; temporary CI scripts are excluded from production source.

Limits: no physical Android/iPhone/Safari tests, battery/thermal measurements or real mobile GPU FPS were obtained. The explicit Low profile intentionally trades atmosphere and continuous decoration for lower work. Medium and High remain selectable, and all owner-supplied project media stays unchanged.
