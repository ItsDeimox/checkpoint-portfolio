# Modal material R3

Baseline: `0b67e200645a06c93ad1c37ad38c2451a5e44c2f`, restored original modal.

## Architecture

The native dialog, original 840px desktop layout, project preview, text and destinations are retained. A stable internal scroll wrapper keeps the optical canvas and close button fixed inside the modal. One lazy WebGL2 context renders the background and native-control materials. HTML text and images stay above it and remain selectable and accessible.

The existing `VertexEnergyField` solver supplies finite directional impulses and dissipating graph energy. Displacement affects lighting only, never the UI geometry or text. HDR targets and two bloom scales add restrained control-rim highlights. Field emission is capped to keep the content readable.

Opening takes 200ms and closing 130ms. Reduced motion disables these transitions and the wave simulation, retaining a static hover/focus response. The UI renderer sleeps when idle, closed or hidden. The 3D scene freezes while blocked by the native modal and resumes afterward.

## Verification performed before commit

- Full local CPU suite: 87 passed, zero failures, including the original 82 tests.
- Real Chromium 144 / ANGLE SwiftShader WebGL2: 50 browser checks passed, zero JavaScript or WebGL errors in the tested paths.
- Read back actual rendered pixels in all 16 quadrants to guard against the previous half-surface triangle defect.
- Desktop 1440x900, portrait 390x844 and 320x640, landscape 844x390.
- Original dimensions, canvas bounds/layer ordering, native links, text selection, focus trap, Escape, outside click and close-button behavior.
- FAQ internal scrolling, eight other sheet types, context reuse, wave decay, idle sleep, scene pause/resume, reduced motion and denied-WebGL fallback.
- The new release adapter produces byte-identical runtime files to the locally tested assembly.
- Hero, cube and process shaders, logos, media and destinations are unchanged.

These are software-WebGL and emulated-viewport checks, not a physical-device benchmark or Safari/Firefox certification. Network fonts were unavailable locally; captures use the existing CSS fallbacks. Production font declarations are unchanged.

## Maintenance

The patch is isolated in `release/modal-material.mjs`, applied after the approved snapshot and process-stage adapter. Never edit the compressed historical release to tune this effect.

`src/ui/modal-material.js` owns input, lifecycle and GPU resources. `src/shaders/modal-material.frag` owns the charcoal material, sparse lattice and control lighting. `src/shaders/modal-output.frag` owns bloom composition. `src/styles-modal-material.css` owns layering and responsive internal scrolling.

`npm run build` runs the modal and process CPU regression gates before producing the static and portable entrypoints. The complete local test reports and browser harness accompany the delivery artifact.
