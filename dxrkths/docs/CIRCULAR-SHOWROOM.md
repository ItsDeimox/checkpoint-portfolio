# DXT circular showroom

## Visual specification

Implement the supplied 1672 × 941 reference as a navigable real-time scene in the existing DXT project and domain. Preserve the five destination pages and verified social/game URLs. The new home replaces the previous diagonal outdoor layout.

The initial composition is a dark cylindrical industrial hall, five angled framed displays, a red drift coupe centered on a low circular stage, wet irregular reflections, a white ceiling shaft, localized tire smoke, red practical lights and unobtrusive typography. The car occupies approximately x30–69%, y49–77%; the stage x16–84%, y67–82%. The two foreground tire stacks are out of focus. The source image supplies the artwork printed on the five displays; each display and its frame has real world geometry. The car, architecture, floor, lights, mist and camera are rendered independently.

## Implementation plan

- [x] Retain the existing routes, content, hosting identity and dependency versions. Work in an isolated checkout and make one consolidated commit.
- [x] Build the room and display frames as scene geometry. Calibrate their initial projection against the source camera, use projective UVs for the display artwork, and expose five raycast targets.
- [x] Use the attributed CC BY S15 mesh, retune physical red paint, and retain the authored coupe as a loading/error fallback.
- [x] Render a genuine mirrored-camera floor with procedural wetness, roughness and surface breakup. Build narrow stage/ceiling rings and local industrial details.
- [x] Integrate restrained linear HDR bloom, depth of field, camera motion blur, lens effects and grading, with bounded render resolution.
- [x] Add drag/keyboard camera controls, panel activation, sound opt-in, quality controls, reduced motion and route cleanup.
- [x] Verify geometry, native shader compilation, route navigation and unavailable-renderer navigation.
- [ ] Verify rendered desktop/mobile composition, GPU picking, framebuffer behavior and frame rate in a WebGL-capable browser.

## Rendering constraints

One car; no photographic car billboard. No replacement production domains. UI remains readable and keyboard accessible. Optical effects must stop accumulating while stationary or paused. Reflection resolution and pixel count are bounded. Existing secondary pages retain their data and verified destinations. The reference is a visual target, not evidence of capabilities that have not been tested.

## Module ownership

`room-core.js`: pure geometry/mapping helpers. `room-environment.js`: architecture, framed screens, reflective floor. `room-scene.js`: lifecycle, car, lighting and camera interaction. `room-optics.js`: postprocessing. `home-room.js`, `room-shell.js`, `styles-room.css`: accessible home interface. Existing templates and content continue to own destination pages. `tools/bundle.mjs` selects the room scene as the production bundle entry.

## Verification and limits — 2026-10-09

The project regression suite passes 46 tests. A native EGL/OpenGL ES compiler compiles and links 12 shader pairs: all custom room materials, optical passes, the injected weathered-metal material, and the final ACES/sRGB output. The reproducible check is `python tools/validate-room-glsl.py --report docs/room-glsl-validation.json`; the report contains source hashes and compiler details.

Actual transformed GLB vertices project to x `[.304000, .688000]`, y `[.494000, .770000]` at the reference viewport. The front points left and the tires meet Y `.031`, directly above the floor at `.024`. The outer stage projects to x `[.165000, .835000]` and a front edge at y `.821000`. The white oculus ends at y `.136859`. Foreground tire stacks enter at the image edges rather than remaining outside the camera frustum.

The asset has 45 visible meshes and 231,983 visible triangles after duplicate transparent geometry is hidden and projector inserts are added. CPU checks found no nonfinite positions or zero normals; both primary lamps face the calibrated camera. The car is a licensed S15 LBWK silhouette, so matching its bounds does not imply identical body panels to the concept coupe.

The display shader reconstructs the small lower regions hidden by the original foreground car, preventing that photographed roof from remaining printed on a screen when the real camera moves. The rest of the supplied display artwork remains sampled from the reference. Grading is analytic; no external LUT is claimed. Transparent smoke uses the underlying opaque scene depth for defocus.

The available cloud test browser reports `GL_RENDERER=Disabled` and fails before WebGL context creation. Its native navigation through Home, Groups, Projects, Contact and About was checked. A failed or lost context exposes all five destinations and an honest unavailable message. Native shader compilation and numerical projection do not substitute for a rendered pixel comparison, actual GPU frame timing or a mobile GPU test. Those visual/performance checks remain explicitly open.
