# Reverse banner journey (r13)

Returning from a section now rewinds the portal flight, crosses the original
physical screen plane and retraces the elevated approach to the saved overview.
The same path sampler, corridor, smoke, sparks, bloom and velocity-reprojected
shutter are reused. The virtual effect clock decreases on return, so the aperture
contracts and the particles retract rather than introducing another opening.
The page briefly fades over a primed dark corridor frame. No new renderer,
render target, shader program, media asset, sound effect or animation loop.

Back to showroom, Home, Escape and browser-history navigation all use the same
return state. Duplicate requests do not restart travel. A second Escape skips
the return, and a newer history destination invalidates old completion callbacks.
Reduced motion bypasses the journey. The soundtrack and saved quality settings
are independent of navigation and stay intact.

Direct section entries still load no GLB until Home/Return is requested. The
existing 2D page covers preparation, then the return plays through its banner.
A failed renderer falls back to the usable showroom links. Changing viewport
size during the return rebases its remaining path without snapping the camera.

Validation: 244 unit/integration tests passed, including every screen in desktop
and portrait, reversed Bezier samples, restoration, signed motion history,
lazy preparation, cancellation, disposal, resize and navigation races.
Software WebGL2 rendered 35 checkpoints spanning five portals and all three
quality levels at 800x530. A separate live-RAF test exercised Back, Home, Escape,
history Back/Forward, resize, lazy mobile return and uninterrupted music. Shader
program count stayed at 40 across that live round trip. Screenshots of the
corridor, screen-plane exit, closing effects and restored room were inspected.
The first 960x640 screenshot attempt timed out in software rendering; these
checks do not measure FPS or GPU usage on physical hardware.
