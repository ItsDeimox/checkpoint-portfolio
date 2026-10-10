# Banner continuity and persistent 3D branding (r14)

Scope: remove the stop when entering a banner and keep the original 3D DXT logo
on all internal pages. Car, floor, lights, shaders, music defaults, destination
content and quality budgets are unchanged.

The old approach eased its positional velocity to zero before a second flight
started from zero. The approach now ends with a corridor-aligned tangent at
14 world units per second. The flight begins at that same velocity, accelerates
and eases out near arrival. Unused time from a frame that crosses the stage
boundary is consumed by the next stage. Total travel is 2.20 seconds instead
of 2.85 seconds. Return uses exactly the reversed path and preserves cancellation,
resize handling and reduced motion.

A persistent, small alpha WebGL canvas now owns the original DXTlogoPrinted.glb,
RoomBrandLogo material/light rig and LogoSpin interaction. The same studio PMREM
setup and exposure are retained. It stays over the header regardless of route,
so parking the showroom no longer restores a static icon on a section page.
This is a separate bounded logo context, not a second full-scene renderer.
It draws on header/layout changes and during click rotation, then stops. Direct
section entry fetches only the logo model; the vehicle loads only on returning
to the showroom. The normal showroom no longer loads/renders a duplicate logo.

Verification: 249 tests pass. New regression checks cover matching nonzero
velocity at every doorway, leftover frame time, reversed-path continuity,
idle/hidden logo scheduling and avoiding duplicate logo downloads. Software
WebGL2 tests confirmed the same live 3D mesh across direct section, Home and
portal entry, click rotation on the section page without advancing showroom
render frames, idle rendering stopping, preserved music, history return and
mobile alignment. Resting and rotated-logo screenshots were inspected. These
are functional/rendering checks, not a physical GPU utilization benchmark.
