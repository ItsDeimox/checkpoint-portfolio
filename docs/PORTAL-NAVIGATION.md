# DXT banner portal navigation

Approved intent: enter the selected physical banner, not a generic fullscreen
cutaway. Its printed artwork opens into an infinite rectangular corridor as
the camera approaches. The camera crosses the same world-space screen plane
and travels through it before arriving at a distinct section page.

The implementation uses the screen's exact position/right/up/normal and a
shared analytic GLSL corridor. The selected material and the interior view
use identical rays and coordinates. Only after the screen covers the view
and reaches the near plane does the interior replace the expensive room draw.
No extra WebGL context, portal render target or animation loop. Low uses fewer
corridor frames. Retain r10 FPS/pixel budgets, audio, car and approved materials.

Native section pages use the authored project content/links, not invented
projects or statistics. Routes: /berserk, /groups, /projects, /about, /contact.
Pages are scrollable, accessible and directly addressable; Back/Escape returns
to the preserved showroom. Direct links avoid loading the 3D room until Home.
Keep soundtrack uninterrupted. No SFX. Reduced-motion skips the travel.

Implementation order: geometry/ray and state tests; shared portal shader and
camera journey; semantic section pages and cancellable route coordination;
integrate with the existing scene/entrypoint; test all paths, cancellation,
resize, direct links, browser history and low/mobile; inspect rendered frames;
publish one commit to the existing project/domain.

Verification: five actual banner clicks render through front, near-plane and
interior checkpoints in software WebGL2 without shader/JS errors. Medium was
also rendered. Native RAF verifies arrival, suspended render count on the
section page, uninterrupted music and resumed rendering on Return. Escape,
resize, mobile default Low, direct links, browser history and reload are covered.
The mobile page requests no GLB until the showroom is requested. Car focus and
cancelled journey callbacks restore correctly. The actual portal uses 12/18/24
frame layers by quality and retains existing FPS/pixel caps. First-person travel
is approximately 2.85 seconds at normal frame rates; no sound effects are added.

Software rendering does not establish hardware GPU frame times. The initial
960x640 native-RAF run was too slow for its 25-second harness deadline; the
480x320 live-RAF test completed. Deterministic 960x640 rendered checkpoints and
responsive native-page layouts were inspected separately.
