# Cinematic inspection refinement

## Implemented

- Isolated engines, tanks, interstage and payload inspection. Whole rockets are hidden while inspecting a module; BACK restores the carousel.
- Camera framing derives from the selected geometry bounds and reserves desktop/mobile UI space. Drag rotation and reduced-motion preferences are retained.
- EXTERIOR / CUTAWAY controls, with lightweight generated structures, piping, tank domes and a generic payload bus. These are explicitly illustrative, not manufacturer CAD or a real mission payload.
- Linear HDR scene and reflections feed a multiscale bloom pass before a single output tone-map/color conversion. Low quality bypasses the post-processing chain; unsupported float-rendering devices use the direct path.
- Material calibration distinguishes dielectric paint/composites from reflective engine metals. Inactive-rocket dimming now happens in linear light.
- Studio strip lighting, warm uplight/cool contour separation, emissive floor practicals, contact shading and scaled atmospheric layers.
- Automatic and manual low/medium/high budgets. Sustained active-frame overruns can lower automatic quality, with hysteresis. Rendering still sleeps when idle.
- Shared source geometry is not disposed by inspection views. Generated interior geometry is batched by material and disposed when changing modules.

## Verification

- `npm test`: 44 passing, 0 failures (33 existing + 11 new).
- `npm run build`: successful production build, including checksum-verified existing licensed assets.
- Chromium 141 / Playwright: 31 passing browser checks on the production build at 1440x900 and 390x844. Coverage: all four vehicles and four parts, outside-click return, real control clicks, drag rotation, graphics presets, projected framing, idle sleep, repeated-inspection geometry counts, overflow and JavaScript/shader errors.
- Tests ran in a software-rendered browser. They are not physical-device FPS benchmarks.

## Boundaries

Existing licensed Falcon 9 and Starship meshes are retained; Falcon Heavy still adapts Falcon 9 geometry. Falcon 1 and Crew Dragon remain procedural approximations. Internal details are explanatory, not authoritative engineering. This iteration does not claim concept-render parity, official CAD fidelity, or physical mobile performance certification. No generated concept images were used as the 3D viewport.
