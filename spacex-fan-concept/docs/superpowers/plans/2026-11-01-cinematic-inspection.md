# Cinematic inspection implementation plan

Goal: implement the approved cinematic viewer refinements without replacing the UI or using generated images as the viewport.
Architecture: retain licensed GLTF assets and the existing demand-driven renderer; add isolated, bounded component inspection, explicitly illustrative interiors, and HDR bloom before output conversion. Keep native geometry shared and own/dispose only inspection materials and generated interior geometry.
Stack: Three.js 0.180.0, Vite, node:test, browser smoke tests.
Spec: user's approved screenshots and implementation request in this conversation.

Constraints: only spacex-fan-concept changes; preserve carousel, sources, payload mode, touch, reduced motion and idle pause; use Git-integrated deployment. Never label illustrative internals as official CAD.

Review focus: asynchronous asset replacement during inspection; portrait module framing; exterior restoration on BACK; low/high preset switching and resource disposal; rapid component switching and shader compilation.

- [x] Add regression tests for tier budgets, aspect-aware framing, isolation and disposal.
- [x] Implement bounded inspection with cutaway interiors and exterior toggle.
- [x] Implement material calibration, linear HDR reflections, multiscale bloom and device budgets.
- [x] Validate tests, production build, desktop/mobile browser flows and idle behavior.
- [ ] Publish atomic main commit, verify Git deployment SHA, READY and public alias.

Decision: run inline in the isolated Vercel sandbox; the implementation and design were already authorized. Interior geometry is explanatory, not reconstructed proprietary hardware.
