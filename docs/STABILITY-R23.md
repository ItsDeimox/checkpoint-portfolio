# DXT stability and cube-hover repair · R23

Baseline: `e25d4ca5f13c3d30067ec56c87a750cf9b0cca99`.

## Observed problems

The previous native-input baseline compiled 16 new GPU programs on the first Low-to-Medium change. It also uploaded previously undrawn geometry. Both happened after entry, despite the earlier startup preparation. Quality switching resized the optical targets once using the old pixel ratio and again using the new ratio. Ordinary animation could continue submitting frames while the GPU was still finishing the last one. These are verified cold-path and queueing problems, not an assertion that every reported device crash had the same driver cause.

The page renderer also attached and drew during the inert portal preview. The prior page/corridor tests often stepped the camera manually; they did not establish native quality-switch behavior. This release's browser suites use real pointer/keyboard input and the application's unmodified RAF scheduler. Test injection exposes read-only handles and instruments GL calls; it does not replace rendering, wake/sleep, camera or routing methods.

The ceiling's white emitter was excluded by a red-only color test. The old wide light shaft had been removed rather than narrowed. The showroom car pivot was offset left of the circular platform. Finally, the previous CTA used a different energy solver from the reference cube, and the physical panels still used the previous generic hologram response.

## Repairs

- Prepare both shadow variants, every relevant geometry draw, portal states and attachment storage under the entry gate. Driver completion uses zero-time fence polling, cancellation and a deadline; it cannot silently publish ready after an arbitrary number of polls.
- Serialize/coalesce quality changes, stop normal submissions while reallocating, defer optical resize to the final pixel ratio, and finish the first new-quality draw before resuming. Failed allocation rolls back to the last applied profile. Both entry and Back defer to a pending quality transaction; superseded navigation cannot fire later.
- Keep at most one main-scene GPU frame outstanding. The browser can process events while polling completion rather than enqueue an unbounded backlog.
- Render the covered-car preview during loading, decode it once, and let that image travel on the approved page wall. The live page renderer starts only after the native page owns input. The return freezes the existing surface rather than restarting its renderer.
- Use the reference cube's actual closed-surface wave solver, velocity, damping, seam transport and afterglow. Both CTA and physical panels sample the same GLSL function. Rectangular aspect mapping keeps the cells square. Pointer motion injects impulses; a stationary pointer does not continually flood the graph.
- Explicitly bind authored ceiling/floor emitters, excluding all car descendants. Restore a neutral, narrow, low-strength spotlight shaft aimed at the centered car, without the former broad obstruction. Move the car and its contact shadow onto the turntable center; no runtime vertex scan is added.

## Reference provenance

`src/ui/cube-energy.js` is byte-for-byte the original `deimoxportfolios/src/core/cube-energy.js` after assembling the repository's reference source. SHA-256: `967c79ef18165bed1d7fa657e7c68cc4e3f8d7720ac43045902700642fd2d468`.

The network sampling and radiance are from the tracked, reduced-glow `deimoxportfolios/src/shaders/cube.frag`, SHA-256 `da80317b65cda531a3ddb724e6e11dfad5fa39f0684e3f4ba886036931613156`. Do not substitute the historical brighter shader inside the release archive. The adaptations are rectangular UV mapping, the destination tint, and composition into the existing page/panel surfaces. The reference project is not modified.

## Verification

Run `npm run build`, then with Playwright 1.56.1 and a WebGL-capable Chromium:

```sh
node tools/server.mjs --port 3000
# In another process, with NODE_PATH pointing to the test-only Playwright install:
node tests/stability-browser.cjs
node tests/stability-recovery-browser.cjs
DXT_QA_OUT=docs/stability-r23-qa/layout node tests/stability-layout-browser.cjs
```

The first suite covers six real quality changes, all five native first entries and returns, ceiling/floor color isolation, untouched car paint, shader/buffer reuse, the wave hover, group scrolling, 2560×1440 High, reduced motion and unexpected context loss. The recovery suite deliberately loses/restores both the main and page contexts, including a parked page, dormant direct-page initialization, and Back during a quality change. The layout suite covers desktop and 390×844 mobile pages, real decoded images and CTA decay.

Fresh machine-readable reports are published with the tested candidate. Program, buffer and texture counts are recorded, not inferred from a successful build. Deliberate recovery losses are explicitly separated from unexpected losses. Regression tests were first run against the defective behavior, including deferred Back and parked-page warming.

The test renderer is Chromium WebGL2 on ANGLE/SwiftShader software rendering. These results prove the exercised lifecycle and resource invariants, **not an RTX 2060 FPS benchmark or a guarantee against every possible hardware/driver failure**. The original crash on the owner's machine was not reproduced on that same machine.

## Scope and remaining editorial inputs

The approved corridor geometry, camera travel curve/duration, projected page-wall math, navbar geometry, logo navigation, group presentation, Portuguese biography, transparent avatar, covered-car mesh and seven-item project catalogue remain. The spotlight cone is deliberately restrained, not removed. No gallery/game membership is invented.

The only known outstanding content dependency remains the additional RevLine and Frost Mammoth game list and its authorized artwork/URLs. Berserk Drift X remains the confirmed RevLine entry. This does not block the repaired interactions.
