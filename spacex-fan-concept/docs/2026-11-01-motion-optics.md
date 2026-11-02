# Viewer motion and optical stability

## Changes

- Camera near/far now follows the visible model bounds instead of remaining at 0.025 / 240 in a tiny close-up. Inspection pivots are centered, framed for arbitrary rotation and lifted above the floor. Scroll and pinch zoom have explicit limits.
- Engine inspection presents the supplied underside at an oblique angle. Drag applies incremental camera-space quaternions on both axes, so controls remain consistent after the object rotates. Double-click resets the view.
- Surrounding parts fade continuously; the selected authored geometry is initially registered to its original position, then moves into inspection. Returning and switching components uses owned-material fades with bounded outgoing views. Source material flags are restored at endpoints.
- Carousel positioning is continuous while dragging. Release settles using a critically damped spring with bounded flick velocity; edges resist overscroll. Mouse, touch, cancellation and keyboard navigation are supported. Shift/right-drag preserves whole-rocket rotation.
- High bloom extraction now starts at half the rendered dimensions instead of one quarter: 720x450 instead of 360x225 for a 1440x900, DPR 1 viewport. Five explicitly weighted scattering layers use smooth reconstruction and a soft luminance threshold, before the existing output transform. High requests up to 4x MSAA; medium up to 2x, subject to GPU limits.
- Texture inspection confirmed source sRGB color maps, mipmaps and trilinear filtering. Anisotropic filtering is capped by the active tier and device support (up to 16x). Source textures, PBR factors and topology remain unchanged.
- Picking adds cached bounding-sphere rejection and pointer sampling throttling. Rotation collects event deltas for the render frame. Reusable scratch objects avoid several frame allocations. Quality sampling uses actual active-frame time rather than a clamped animation delta; settled views still stop rendering.

## Verification

- 62 unit tests pass, including 13 motion, fade, quaternion, clipping and bloom regressions added to the previous 49.
- 15 gesture/motion checks passed in Chromium: partial fades, XY rotation, full-turn clearance, bounded zoom, drag-following carousel, cancellation, interruption, idle behavior and reduced motion.
- Five additional compiled-build checks passed, covering pinch, quality changes, resource disposal and all twelve available model/module combinations at 320x568 and 844x390.
- Actual WebGL engine imagery was inspected. At 1366x768 High, bloom extraction was 683x384; the default engine view measured near 0.34, far 20 and clearance 2.12 in normalized model units. All four inspected Falcon 9 modules had positive camera clearance and a rest-pose floor margin of 0.08.
- Tests use Chromium software rendering and mobile emulation, not physical-device FPS certification.

## Limits

The initial reported engine-tip symptom was not a near-plane intersection at the default baseline pose; the fixed, unnecessarily wide depth range and undersampled optical path were measurable issues. The changes improve depth precision, anti-aliasing and safe inspection clearance, but do not establish that every possible GPU-specific artifact is eliminated. Existing artistic source-model limitations remain. No procedural spacecraft, fabricated internals or generated viewport imagery were added.
