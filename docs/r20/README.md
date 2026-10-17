# R20 · Page at the physical corridor exit

Baseline: `fa05cce396ba8639fe471ecbf68c3528e2d3d1a2`.

The previous arrival faded a nearly full-size HTML page over the corridor. This revision places the destination at a finite plane at the corridor's far end. The page starts small and already readable as a distant surface, then grows through the actual camera's perspective as the eye approaches it. No screen-wide crossfade or independently timed scale is used.

## Implementation

`projectPortalExit()` defines a world-space aperture inside the corridor bounds and projects its four corners with the same camera that renders the walls. The page's first viewport is mapped to those corners with a CSS projective matrix. The GLSL corridor terminates at the identical plane and half-extents, including its red illuminated trim. Rings no longer continue beyond the exit on incoming journeys.

The exit plane is chosen beyond the final camera position so its projection equals the destination's native viewport precisely at the last frame. This preserves final text positions and scrollbar spacing without replacing the already prepared DOM. Its initial opacity eases in only while the surface is still very small, over the first 8% of the flight; thereafter it is fully opaque and all magnification comes from camera motion.

The page remains inert until arrival. Escape, superseding history and direct/reduced-motion entry retain the previous cancellation and accessibility behavior. Navbar composition, 3D logo placement, combined click-spin/Home behavior, content, audio and the reverse journey were not redesigned.

## Verification

The initial world-plane and finite-corridor tests were run against R19 and both failed, then passed with the implementation. The full project build passed **295 CPU tests**. The browser suite passed **45 checks** in Chromium 141.0.7390.37 using actual WebGL2 through ANGLE SwiftShader.

The tests include five destinations, exact projection registration, monotonic growth, no end-of-flight text jump, persistent navbar coordinates, gallery and Play, Escape, a native requestAnimationFrame journey and return, and WebGL-denied reduced-motion direct entry. Responsive captures/checks cover 390x844, 320x640 and 1440x1800 in addition to the 900x600 desktop probe.

`browser-report.json` contains the measured projection and DOM bounds; `exit-zoom-filmstrip.jpg` contains six real browser captures at increasing camera progress. These are not generated concept images. The native-frame trace supplements deterministic samples, which pause the normal scheduler to inspect exact camera positions.

These are software-WebGL and emulated viewport tests, not physical-device performance measurements or Safari/Firefox certification. The destination is live HTML registered to the 3D exit, not rasterized gameplay footage or an extra WebGL context. Corridor optics stay on the existing renderer; text remains browser-rendered for clarity.

## Reproduce

Run `npm ci`, `npm run build`, start `node tools/server.mjs --host 127.0.0.1 --port 3000`, then run `NODE_PATH=<playwright/sharp installation> node tests/portal-end-browser.cjs`. The browser harness appends getter-only instrumentation to its intercepted main-module response. That test instrumentation is not part of production.
