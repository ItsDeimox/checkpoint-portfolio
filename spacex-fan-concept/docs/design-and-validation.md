# Design and validation ledger

## Approved scope
Deimox approved five cinematic showroom concepts on November 1, 2026 and authorized implementation, GitHub publication and Git-connected Vercel deployment. Preserve the monochrome studio, full-height rocket, right-side typography, dim adjacent vehicles, white component highlights, engine/fairing close-ups and reflective floor. Responsive layout adapts the composition to mobile rather than scaling a desktop screenshot.

## Implementation
An isolated vanilla JavaScript, Three.js and Vite application under `spacex-fan-concept/`. Existing sites are untouched. Actual selectable and rotatable geometry, not image planes. Original procedural visual models avoid relying on unverified third-party model licenses. They are artistic reconstructions, not official engineering CAD. The Starship model intentionally references an early flight-test configuration. Sources, credits and the independent-concept disclaimer are accessible through About.

The DXT source was inspected for studio environment, reflection, input and rendering-budget techniques. Geometry is merged by material and component. Resolution and reflection targets are bounded. Rendering stops when the scene settles and when the document is hidden. Reduced-motion preferences are respected.

## Verification performed on November 1, 2026
- 15 Node tests passed: state, bounded navigation, invalid input, Dragon configuration, quality limits, camera fits, easing, content contracts and all four geometry contracts.
- Production Vite build succeeded; whitespace check clean.
- 24 Chromium browser checks passed with no JavaScript or shader errors. These exercised actual raycast hover and click, every Falcon 9 component, Escape and empty-space return, all four vehicles, boundaries, Dragon, search, automatic rotation, idle rendering, economy quality, reduced-motion handling and viewport/detail bounds at 390x844, 320x568 and 844x390.
- Desktop screenshots were captured at 1672x941; mobile at 390x844. Visual review prompted lighting, carbon roughness, engine framing and reflection falloff corrections. The browser checks and build were repeated after those changes.
- A floor-shader compilation error found in Chromium was fixed by including the common and dithering declarations. Build-only tests did not detect this error, which is why the browser check is included.
- Drag threshold is sticky once exceeded so dragging back to the start cannot accidentally select a component.

## Limits of verification
Chromium ran with software WebGL in a remote test environment. Viewport emulation is not a physical Android or iPhone performance benchmark. No FPS guarantee is implied. The procedural model details and material finish are an approximation of the approved concepts, not a claim of exact reproduction of an offline render or access to official SpaceX CAD.

## Deployment procedure
The tested source is committed to the main branch. Vercel builds the `spacex-fan-concept/` root from Git. Deployment success must be confirmed through READY state, matching commit SHA and an unauthenticated check of the assigned production domain. Generated screenshots are excluded from production source.
