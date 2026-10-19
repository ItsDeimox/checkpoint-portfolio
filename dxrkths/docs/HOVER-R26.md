# R26: Prism Trails on the five physical cards

Based on R25 `ba432534f25c50d5bb21001f857021940ace60a3` (the user's other-model performance correction). This is an intentionally small visual change, not a redo of the scene.

## Design

Card interaction now displays **Prism Trails**: gently curved, broken diagonal light paths, sparse elliptical echo fragments and brief glints that travel with the existing wave field. The exact cube grid/network presentation is removed **from the five card shaders only**. Small phase variations between cards make the trails feel authored, not cloned. The real cube solver still supplies motion and decay, so trails stay tied to the pointer rather than looping over the background.

The Play Now button keeps its separate, previously reduced cube effect. The destination color system, screenshot repairs, native R25 bitmap portal, scene lighting, car, camera, UI and pixel budgets are unchanged.

## Performance and lifecycle

- No additional rendering pass, overlay canvas, per-card renderer, timer, geometry, or extra GPU texture.
- Same `CubeSurface` objects and one existing RGBA float atlas texture per panel.
- A panel's shader compiles exactly once during the original showroom startup, with `uSignalSeed` as a cheap constant uniform.
- Uniform early-out when not hovered, reduced-motion mode disables the effect, and the existing portal path pauses the simulations.
- Four bilinear atlas reads with no loops. Derivatives are evaluated before the per-fragment energy early exit, preventing undefined GPU derivative behavior.
- The approved R25 click/quality controls remain untouched.

## Validation

`node --test tests/card-signature.test.mjs tests/hover-regression.test.mjs` verifies visual shader independence, input coordinates, reuse of panel resources and existing responsiveness regressions. The full application build and GPU pixel probe must pass before production; the native hover probe checks upper/lower pointer positions on all five panels and verifies the unchanged reduced-intensity CTA.
