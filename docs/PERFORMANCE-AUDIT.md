# Showroom r10 performance audit

## Scope and confirmed causes

This change keeps the car mesh and PBR materials, wet-floor shader, panel
geometry, camera navigation, music, introduction and public controls intact.
No SFX are included. It changes rendering budgets rather than restyling the room.

The r9 frame loop rendered at every display refresh with no upper frame limit.
The floor Reflector inherited Three.js's default four-sample render target even
on Low. Low still used six bloom scales plus a streak pass, full DOF, all twenty
procedural smoke planes and a moving-car velocity redraw. The stationary 3D logo
was rendered again on every frame. Inactive holograms evaluated their shader
noise before multiplying the result by zero. The turntable updated its entire
world-matrix hierarchy even when stationary.

There was no duplicate main animation loop. Main-scene frustum culling was
already enabled; the proxy meshes used by the moving-object pass were the
exception. Environment PMREM was already generated once at startup and shadows
were already disabled on Low. Those are not presented as new optimizations.

## New budgets

| Feature | Low | Medium | High |
| --- | --- | --- | --- |
| Desktop render ceiling | 60 FPS | 60 FPS | 90 FPS |
| Mobile render ceiling | 30 FPS | 60 FPS | 60 FPS |
| Bloom scales | 3 | 6 | 6 |
| Procedural smoke planes | 8 | 20 | 20 |
| Dust particles | 48 | 160 | 160 |
| Reflection MSAA ceiling | 0 | 2 | 4 |
| Animated reflection refresh, stationary camera/car | 20 Hz | 30 Hz | 60 Hz |
| Camera motion blur | Yes | Yes | Yes |
| Separate moving-object velocity capture | No | Yes | Yes |
| Cinematic DOF and lens streak/ghost | No | Yes | Yes |

MSAA counts are selected only from formats supported by the device. Camera,
projection, car rotation, screen selection, resize and explicit invalidation
force an immediate reflection refresh. This avoids reprojecting stale car or
panel geometry while dragging. Completely paused/static scenes reuse the image.
Low reflections omit the overhead volume and use four smoke cards; the actual
primary-view light volume keeps its existing twelve samples to avoid making
light banding worse. Low smoke uses three noise evaluations instead of nested
four-octave noise; higher qualities keep the original shader path.

The logo keeps a cached render target at rest and updates it on spin, resize,
anchor changes or environment preparation. Its composite remains on every frame.
Holograms skip noise only when both hover and music contribution are inactive.
The frame pacer drops surplus refresh callbacks before simulation/render work,
uses elapsed time for smooth animation and does not add a timer or second loop.

## Mobile resolution and preferences

A mobile hint, or a compact touch-only screen without a fine pointer, selects
Low initially. Narrow desktop windows are not classified as mobile. Explicit
quality choices remain saved and override device defaults. Volume and reactive
light preferences are not reset.

Compact high-DPI Low viewports use up to 1.25 render pixels per CSS pixel rather
than 0.82, under the same 900,000-pixel ceiling. At a 390 by 844 CSS viewport,
this changes the actual buffer from 319 by 692 to 487 by 1055. Large desktop Low
viewports retain their existing bounded resolution. The low-cost effects and
30 FPS mobile ceiling pay for improved legibility rather than further blur.

## Observed rendering work

A controlled software-WebGL2 comparison used the same 960 by 640 CSS viewport,
Low quality, car angle, camera and neutral soundtrack state. The initial warm
frame is not representative of steady state.

- r9: 323 draw submissions and 557,349 triangles per sampled frame, including
  the planar reflection, logo mesh and twenty fullscreen draws.
- r10, fully paused with a valid reflection: 161 submissions and 284,187
  triangles, no redundant reflection or logo-mesh draw, thirteen fullscreen draws.
- r10, stationary camera with ambience advancing at 60 steps/second: twelve
  sampled frames averaged 202.5 submissions, alternating reflection captures
  and cached frames. A moving camera/car forces capture, so this is not a
  universal 37% reduction for every interaction.

These are actual renderer counters, not RTX 2060 utilization or hardware FPS.
Software timings vary with shader compilation and driver scheduling and are not
used to promise a GPU percentage. The user should compare the same viewport,
quality, music and interaction after reloading the published version.

## Verification

Regression tests cover frame pacing at 60/120/144/165/180/240 Hz, preservation of
elapsed simulation time, one frame chain, stalls, mobile inference, manual
preferences, pixel budgets, reflection invalidation and failure cleanup,
Low/High effects restoration, and inactive hologram early-outs.

Browser checks confirmed primary and reflection rendering, all three quality
profiles, low/high moving-object capture, hover and focused screen content,
logo spin and return, and touch-device default Low at 487 by 1055 with a 30 FPS
ceiling. A manual High choice was saved. Before/after Low images were inspected.
No JavaScript or shader errors were reported by the integration run. Profiling
hooks are added only to isolated test distributions, never to shipped sources.
