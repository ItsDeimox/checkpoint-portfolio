# Braaza: continuous gallery revision

Baseline commit: `cacf99a26f59ba2865641acd1c2d8062a176d6a2`.

## Root cause

The released gallery used modulo slots followed by independent card exit/entry damping. It therefore did not have one common scroll coordinate. The baseline passed its 55 CPU tests but a browser trace showed a visible card still moving upward for several frames after the scroll reversed. Extending the lower recycle coordinate alone did not fix that cause.

The replacement derives buffered occurrences directly from `Motion.travel`. All occurrences keep 2.4 units of separation; no occurrence chases a slot or teleports while visible. The current four media resources are reused. The original camera, four resting centers, scene, chains, lights, content and CSS remain unchanged.

## Rendering and picking

`glsl/glass/lifecycle.glsl` evaluates the same deterministic panel-local XY field for the front glass and its depth pass. `cardCoverage()` is its CPU equivalent. Birth reveals the leading upper edge; the upper forge consumes that edge first. Reverse scrolling retraces the same coverage without history-dependent catch-up or changing noise.

The uncut media pass is used only as the transmission source. The scene backdrop is restored before the front glass draws, applying lifecycle alpha once instead of leaving the media underneath the dissolved region. A depth-only pass uses the same mask after color blending. Picking rejects invisible portions. The transition emission was reduced to avoid the white-hot cut overpowering the media.

## Verification results

- New continuity regression suite first run against the baseline: 6 failed out of 6. The same tests passed after the change.
- Complete revised CPU suite: **65 passed, 0 failed**. The obsolete tests demanding autonomous wrap animations were replaced by continuous-motion invariants, not retained as acceptance criteria.
- Production build: passed, includes the CPU gate; 52 published source/asset files.
- Chromium **156.0.8078.4**, ANGLE SwiftShader, real WebGL2: **31 checks passed**, zero JavaScript or WebGL errors in the tested cases.
- **720 actual-engine update steps** at 30/60/120 Hz simulation intervals, with repeated reversal and long-session rebasing. Maximum scroll-delta discrepancy: 3.553e-15; maximum spacing discrepancy: 1.333e-15.
- **87,552 GPU coverage samples**, read from 19 frames at 96x48, compared with the CPU picking function. Maximum absolute error: 0.001979, within RGBA8 quantization tolerance.
- Actual nonempty display-buffer comparisons on either side of the integer wrap: average channel differences 0.00147 and 0.00238 on the 0-255 scale. A repeated paused frame at a fixed position was byte-identical.
- Wheel in both directions, mouse drag versus click, Home, keyboard project opening, Escape, hidden-area picking, reduced motion and no-WebGL fallback checked.
- Viewports: desktop 1440x900, portrait 390x844 and narrow phone 320x640; no horizontal overflow and canvas dimensions aligned.
- Additional native requestAnimationFrame smoke test: **26 frames**, navigation reversal and CDP-dispatched touch dragging. Maximum shared-motion discrepancy 1.839e-15, no accidental dialog, no hanging drag state, zero JavaScript/WebGL errors.
- Six modified runtime source files were byte-verified against the staged GitHub Git blobs before publication.

## Reproduce CPU tests

From `braaza/`, run `npm test` and `npm run build`. The continuity tests cover slot boundaries, buffer invisibility, entry direction, reversal, consistent spacing, endpoint coverage, wrap identity and constant media counts.

## Limits

The browser runs used software WebGL and emulated viewport/touch conditions. They are not physical-phone, Safari/Firefox or hardware performance certification. Pixel differences were measured with paused environmental animation to isolate the gallery transition. No global resolution, lighting or environment changes were bundled into this correction.
