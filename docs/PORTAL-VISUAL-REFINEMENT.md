# DXT portal visual refinement (r12)

The approved scope is the banner opening and forward travel only. Destination
pages stay 2D. No SFX, new media requests or product dependencies are added.
The normal showroom, car materials, wet floor, music and r10 quality/FPS/pixel
budgets remain unchanged.

## Presentation

A single bounded opening pulse powers the aperture rim, a rectangular pressure
wave, the existing red panel spill light and a temporary bloom lift. Instanced
procedural vapor and spark trails leave all four edges of the selected physical
banner. Particles have staggered births, outward velocity and short lifetimes;
the center remains readable. Geometry is preallocated and reused across doors.

The camera keeps the same entry point and corridor centerline. Quadratic forward
travel supplies sustained acceleration; FOV widens from 48 to 59 degrees. The
corridor gains paired road markings, a dashed centerline, extra frame filaments,
wall comets and faint haze. None of these changes moves or scales a banner.

A conditional pre-bloom pass reconstructs corridor wall points analytically and
reprojects them with the preceding camera matrix to obtain velocity. It gathers
existing rendered color along that velocity, so it neither redraws the corridor
for every sample nor allocates another velocity target. Opening refraction,
edge-weighted chromatic separation, speed streaks and a restrained vignette
share this pass. The focus remains clearer than the periphery.

## Cost and lifecycle

| Budget | Low | Medium | High |
| --- | ---: | ---: | ---: |
| Vapor instances | 8 | 16 | 24 |
| Spark instances | 32 | 72 | 112 |
| Maximum shutter samples | 6 | 9 | 12 |
| Maximum blur length, render pixels | 32 | 54 | 70 |
| Maximum chromatic separation, render pixels | 2 | 3.2 | 4.2 |

Opening geometry uses three transient batches plus the existing reflector when
it refreshes. The optical pass reuses the composer's existing ping-pong buffers
and stays disabled outside the transition. No additional light/context/RAF.
Temporary light, bloom and optics overrides restore through finally blocks.
Escape, arrival, reduced motion and disposal clear the transient resources.
The section page continues to suspend all showroom rendering while music plays.

The interior shader is prepared against the actual HDR scene target rather
than the default framebuffer. The new pass is also included in startup shader
preparation, avoiding first-use shader compilation during the trip.

## Verification

233 tests pass, including new checks for instance reuse and anchoring, profile
budgets, acceleration, reprojection history, idempotent pass attachment, shader
warmup target restoration, cancellation and exception-safe temporary overrides.
The existing route/page/audio, fixed-panel and performance tests still pass.

Software WebGL2 rendered 24 checkpoints across Low, Medium and High, including
opening, surface crossing and corridor flight, without JavaScript or shader
errors. Opening/flight captures were visually inspected. A separate native RAF
run verified arrival, stopped page frame count, uninterrupted music, returning
to the same live scene, Escape and reduced motion. Direct mobile section entry
remained 2D with zero GLB requests. In that live run, compiled program count was
40 before and 40 after the first journey.

These are functional/rendering checks, not measurements of hardware GPU FPS or
utilization. The reference concept is a visual direction, not a claimed exact
match to an offline render.
