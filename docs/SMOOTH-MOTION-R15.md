# Portal trajectory smoothing (r15)

Scope is camera motion only. The persistent 3D logo, materials, music, 2D pages,
portal effects, rendering profiles and 2.20-second nominal trip remain unchanged.

The r14 join matched position and velocity, but not acceleration. This revision
uses a bounded degree-nine Bezier approach and a degree-seven Hermite flight.
Both meet with velocity 14 world units/second and zero acceleration and jerk.
Departure and arrival also settle those derivatives. Rotation and lens use a
C3 easing function. No stop is added at the doorway. The return samples the same
curve backwards, including the new position sampler on the existing controller.

The approach control hull lifts before the vehicle, straightens before the
selected banner and stays below the overhead structure. No post-sampling clamp
or last-moment collision correction is used: those would reintroduce a jerk.
Sampling uses preallocated scratch vectors. No GPU pass, dependency, media
request, render target or extra animation loop is added.

## Verification

255 tests pass. Regression tests fail with the previous camera/portal source
and pass with the new source. They compare velocity, acceleration and jerk at
the same junction, check lens/rotation, endpoints, reverse traversal and frame
steps from 30 through 144 Hz.

10,465 swept-volume samples cover all five doors across seven viewports,
including portrait mobile, 2K and ultrawide. A 0.24-unit camera radius plus half
the sample chord provides near-plane and between-sample clearance. The vehicle
check uses a cylinder derived from every original GLB vertex, enclosing all
turntable angles; minimum remaining car clearance is about 0.87 world units.
Checks also cover other display slabs, shell/rails, ceiling and foreground
tires. A separate test keeps the near-plane footprint inside the selected
screen's inset aperture. These collision checks cover the visible showroom;
the intentional passage into the shader corridor is not a physical wall hit.

Software WebGL2 verified 40 rendered checkpoints across the five outward paths,
all reverse trips, live RAF arrival/return, Escape, parked section rendering,
ongoing music, mobile direct entry and the unchanged clickable 3D logo. Captures
of approach, junction and corridor were inspected. These are functional and
rendering checks, not a benchmark of physical RTX GPU utilization or FPS.
