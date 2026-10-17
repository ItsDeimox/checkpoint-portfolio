# R19 · Destination page revealed during portal arrival

Baseline: `ddd3d5c486b9c7204f160e8240eb025aa5d744e6`.

## Behavior

The incoming corridor no longer multiplies its radiance by a closing-to-black envelope. The real destination HTML is prepared once at the start of the journey, initially transparent and inert. During the last part of the camera flight, it grows from 72% to full size and fades in using a quintic smoothstep. The reveal is driven by the actual camera's progress, not a second timer or animation loop.

The page is fully opaque before the camera finishes. On arrival the same DOM nodes become interactive and scrollable; they are not replaced or replayed through the old CSS entrance animation. The corridor remains illuminated behind the page until it is completely covered. There is no blank-screen handoff.

The reveal starts at normalized flight progress 0.34 and finishes at 0.96. The source of truth is `arrivalVisual()` in `src/ui/portal-arrival.js`. `SectionRoutes` owns DOM preparation, inertness, cancellation and handoff. A classic-scrollbar gutter is reserved only when the destination needs vertical scrolling, and is recalculated on resize.

## Preserved behavior

The original 3D environment, content, navbar composition, fixed header/3D logo coordinates and combined logo-spin/home navigation are unchanged. The existing reverse portal retains its original clock, path and appearance. Normal direct links and reduced-motion/no-WebGL entry bypass the preview. Escape and history supersession invalidate pending preview/completion callbacks.

No screenshot is used as the destination. No new rendering context, graphics dependency, continuous DOM-render loop or video is added.

## Verification

- 6 of the initial 7 new tests failed against the baseline, demonstrating missing intermediate-page updates, unconditional incoming darkness and absent cancellation safeguards.
- A separate classic-scrollbar regression was written and failed before its refinement.
- Final project build: **288 CPU tests passed, 0 failed**; 20 browser modules.
- Final Chromium 156.0.8078.4 / ANGLE SwiftShader run: **49 browser checks passed**, zero page JavaScript errors.
- All five destinations were exercised through the actual camera and renderer at early, mid-flight, 98% and complete states. At 98%, direct pixel sampling verified illuminated corridor pixels, not a black render. Each destination reused its original prepared DOM and preserved its text bounds across the transition within 0.15px.
- Native requestAnimationFrame entry and reverse journeys were tested in addition to deterministic rendering samples. The frame trace verifies that the destination appears before arrival, neither content source is simultaneously hidden, and persistent header/logo bounds remain stable.
- Mobile 390x844, classic scrollbars, a tall 1440x1800 viewport without overflow, gallery, Play link, Escape, combined logo action, reduced motion and WebGL-denied direct entry were checked.

The full browser report is `docs/arrival-r19/browser-report.json`; `arrival-filmstrip.jpg` shows actual rendered progress samples, not generated artwork. Deterministic captures pause the main frame scheduler to inspect precise camera states; the additional native trace uses the normal scheduler. Tests use software WebGL and emulated mobile dimensions, not hardware-performance or Safari/Firefox certification.

## Reproduce

Run `npm ci`, `npm test`, `npm run build`. With the development server listening on port 3000, run `NODE_PATH=<playwright installation> node tests/portal-arrival-browser.cjs`. The browser harness adds getter-only instrumentation through an intercepted main-module response; this instrumentation is not shipped.
