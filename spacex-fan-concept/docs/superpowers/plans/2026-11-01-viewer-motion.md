# Viewer motion and optical stability implementation plan

Goal: fix near-surface visual artifacts and low-sampled bloom, add smooth isolation, oriented XY inspection and a finger-following carousel without replacing authored assets.
Architecture: pure pose/clipping/carousel math, cached material fades, bounded lens bloom, and one requestAnimationFrame-driven scene controller. Keep Three.js 0.180.0 and the existing Git-integrated Vercel project.
Spec: the user's detailed request in this conversation, building on the approved authored-only viewer.

Constraints: preserve actual model topology, source PBR/UV/tangents and license data; no fabricated interiors. Preserve adaptive graphics, reduced motion, keyboard/touch and idle rendering. Only spacex-fan-concept changes.

Evidence: baseline 49 tests pass. High bloom first target is 360x225 at 1440x900 because the app halves the resolution before UnrealBloomPass halves it again. Inspection near/far remain .025/240 even for a .56-radius engine cluster. The reported tip artifact is not explained by near-plane intersection at the default pose (clearance >2 units); depth precision, reflection sampling and specular aliasing require validation rather than simply moving the near plane closer. Existing source geometry is centered horizontally but rotates about its base. Visibility is boolean on selection, and touch overview motion only changes state on pointer-up.

Approach: use geometry-centered pivots and rotation-safe framing; point engine -Y toward the viewer with a 20–30 degree side offset. Apply camera-space quaternion deltas, never accumulated Euler angles. Fade material opacity with cached source state, then hide at zero. Preserve source depth flags at stable endpoints. Use a floating carousel coordinate with direct drag, bounded velocity and a short settling animation, with overview Shift/right-drag rotation. No UI redesign.

- [x] Add failing tests for pose/clearance, screen-axis quaternion rotation, continuous carousel and bloom resolution.
- [x] Implement math, fades and optical budgets; verify tests.
- [x] Wire frame-driven input, transitions, source-matched isolation and safe camera depth; add actual browser regression checks.
- [x] Inspect actual screenshots and drag/transition sequences, audit textures and repeated-interaction memory, run production checks.
- [ ] Publish exact tested files to main and verify deployment SHA, READY, alias and live behavior.

Review focus: interrupts/back during a fade; late model/LOD arrivals; pinch/pointer cancellation; full upside-down rotation near floor; resize/reduced motion/quality switching during carousel settling. Source-detail limits remain unchanged.

Execution: 62 passing unit tests. Fifteen interactive browser checks and five compiled-build checks passed. Camera trace found no negative clearance during the measured engine-to-tank transition; source geometry stays unchanged. A model-replacement fade visibility regression was reproduced with a failing unit test and fixed. Review was inline; no independent subagent was available. Publication remains gated on exact tested blob verification and Git deployment checks.
