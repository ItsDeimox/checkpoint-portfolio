# Fidelity and browser readiness implementation plan

Goal: replace the historical Dragon exterior only with a visually verified licensed Crew Dragon source, then extend validation beyond Chromium and fix reproduced compatibility defects.
Architecture: retain current Three.js renderer and presentation; pin a preauthored GLB with its own source metadata; add feature-safe network cancellation and measured regression tests only where baseline execution demonstrates a problem.
Tech stack: Three.js 0.180.0 / Vite 7.3.7 / Node 22; browser-only QA in Playwright 1.64.0 on Ubuntu 26.04 (Chromium, Firefox, WebKit). WebKit is not a physical iPhone or Safari certification.
Spec: user's authorization to continue commercialization work, preserving approved visuals and never creating procedural spacecraft. The commercial acceptance gates in docs/commercial/acceptance.md remain in force.

Approach: incremental improvements. Do not replace all vehicles or rewrite the renderer, buy models, send outreach, or claim complete interiors. The candidate is dannzjs' authored Crew Dragon (Sketchfab cb180c71fb674e978505e2965eedf2e2), obtained from an attributed public GLB mirror; embedded author/source/CC-BY-4.0 match the creator page. Visual review and source attribute audit gate adoption.

- [x] Reproduce current browser behavior across actual engines, including GLSL errors, input, page return and request recovery.
- [x] Inspect candidate geometry/materials and compare exterior with documented reference; reject if not suitable.
- [x] Add failing tests for chosen model provenance and any reproduced compatibility defects; implement minimal fixes.
- [x] Run unit/build, visual QA, source-fidelity and three-engine checks; record both successes and unsupported environmental tests.
- [ ] Publish exact tested files to main through existing Git integration, verify SHA/READY/public routes.

Review focus: cancellation cleanup, browser navigation resume, engine-specific shader compiler behavior, material extensions, missing internal geometry and label/source mismatches. No claimed physical-device FPS or complete flight-configuration accuracy.

Ruling: do not deploy the downloaded Crew Dragon candidate. Its creator/license identity is consistent, but the close-up render shows a faceted surface and mission-specific graphics not validated against the intended flight reference. A free, correctly attributed file is not automatically a fidelity upgrade. Preserve the approved source and document its historical limitation. This phase adds a build-time identity/license consistency gate instead of weakening the asset acceptance standard. No paid asset was purchased.

Browser baseline: Chromium and WebKit initialize; headless Firefox blocks WebGL2 in this software lab, while normal Firefox under Xvfb initializes without custom browser preferences. Use the latter for real engine tests, label it software lab, and never call it physical-device or branded Safari validation.

Verification: 95 unit tests and 36 compiled-browser scenarios passed. Actual context loss was reproduced before the fix; the old UI remained in its error state after the context restored. A first recovery implementation exposed stale-context deletions specifically in WebKit, fixed by releasing GPU handles during loss while retaining source arrays/images. Two recovery cycles per engine pass with identical selected state and quaternion. Candidate rejected, all asset hashes unchanged. Publication remains gated on Git blob equality and deployment verification.
