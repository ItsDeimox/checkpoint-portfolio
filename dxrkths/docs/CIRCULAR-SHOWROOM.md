# DXT circular showroom

## Current state — r4, 2026-10-10

Revision **`dxt-showroom-r4`** adds restrained mouse-follow navigation, interactive
content on the physical screens, and a revised optical/material pipeline. The
rigid geometry correction from r3 remains intact. The same repository, Vercel
project and `dxrkths.vercel.app` domain are used.

### Camera and screen interaction

Moving a mouse over the scene steers the overview without a pressed button.
Absolute viewport coordinates drive damped targets, bounded to ±0.055 radians of
yaw and ±0.025 radians of pitch. Downward pointer movement reverses the old drag
pitch. Leaving the scene eases back to neutral. Touch retains a gentle drag;
secondary/cancelled pointers cannot release or activate another pointer's gesture.
Pointer look is disabled while approaching, exploring or leaving a screen, and
for the reduced-motion preference. Changing that preference also settles an
already-running transition.

The approved 42° vertical lens remains at desktop, ordinary ultrawide and portrait
aspects. Extreme horizontal views are capped at 90°, with a tighter geometric
cap for the more distant mobile camera in landscape. A physical ceiling at
Y=8.4 closes rays that previously passed above the cylindrical wall. Regression
tests cover 810 horizontal wall rays and 1,350 full 3D upper-frustum rays across
six viewports and nine pointer positions. All tested sightlines remain within
the room's physical enclosure.

Each screen owns one stable 1024² sRGB CanvasTexture. Arriving at a panel fades
its emitted artwork into a menu on the **same mesh and UVs**. The frame, bevel,
glass and geometry do not move or deform. Button painting and raycast activation
share UV regions; Back is also on the screen. Links retain the existing authored
destinations. The renderer bundle and native page have independent module copies,
so actions are matched by authored ID and URL rather than object identity.

During normal WebGL operation, the visible menu is entirely in the scene. A
clipped native action group provides keyboard navigation, direct links and
screen-reader content; focusing an action highlights it on the screen. The
canvas remains interactive. If WebGL is unavailable, the same content is shown
in the existing native modal, with its focus trap and Escape behavior. URL
history, deep links and restored contexts keep one persistent scene.

Hover updates a surface halo, button artwork and one precompiled fill light.
Textures upload only at creation, font readiness, or a changed action hover.
The frame scheduler guards synchronous arrival/texture callbacks so they cannot
fork additional animation loops. Hover and menu fades continue to completion
when ambient motion is paused, then the renderer can sleep.

### Rendering, lighting and material controls

The scene now renders into a dedicated linear color/depth target. Low, Auto and
High request 0, 2 and 4 MSAA samples, capped to counts supported by both the actual
color format and depth attachment. Three resolves that target before the lens
pass reads it. Postprocessing targets are color-only and single-sampled; there
is no redundant scene copy. FXAA follows ACES tone mapping and sRGB output.
Scene budgets remain 0.9, 1.9 and 2.9 megapixels, and bloom buffers remain bounded.

Depth of field uses view-axis focus distance and depth rejection. The selected
screen's text remains under the gather threshold in the tested focused poses,
including maximum DOF. Motion blur uses current depth and the previous camera
projection, with a bounded pixel length and no accumulated color history. Camera
travel explicitly identifies continuous FOV changes so approach/return motion
can blur; unannounced projection changes, camera jumps, resize, pause and quality
changes invalidate that history. Stopping the camera stops motion blur.

Bloom uses a selective HDR threshold and soft knee. Lens response combines small
dispersion, highlight-driven streaks/ghosts and vignette. Contrast and bounded
detail sharpening precede the final tone mapper. The optional **View settings →
Light & lens** controls expose exposure, bloom, depth of field, motion blur, lens
response, contrast and sharpness. Values are normalized, persisted locally and
applied as uniforms without replacing the focused slider or reallocating render
targets. Bloom, depth of field, motion blur and lens response each accept zero
to disable that effect.

Broad warm/cool softboxes and a red rim source shape the car and glass. Their
reflection cards feed the bounded studio PMREM. Existing car materials are
refined in place: the authored red stays exact, clearcoat and metal roughness are
softened, and external glass receives stronger environment reflection. Geometry,
texture identity, lamp materials and the prepared GLB remain unchanged; no
transmission/refraction pass is added. Physical display cover glass and slightly
clearer wet-floor reflections complete the surface changes.

One finite world-space light cone replaces five camera-facing beam planes. Its
shader integrates three samples over the analytic ray/cone interval. Ground fog
uses fewer, lighter sprites. The cone is an inexpensive approximation: opaque
depth at the exit face rejects the fragment instead of integrating a partially
occluded foreground segment. It does not simulate multiple scattering or
screen-space depth clipping.

### Verification scope

The final `npm run build` passed **146/146 tests** and packaged 36 files,
including its build manifest, with nine browser modules. The motion regression
exercises 120 real approach/return paths across five panels, four viewports and
24/60/144 Hz updates, alongside separate history-reset cases.

Automated coverage exercises real camera paths, rigid screen meshes and UV
raycasts, material/vertex identity, hover scheduling, context/disposal lifecycle,
MSAA/depth/pass ownership, optical history, settings, and the actual main module's
navigation/accessibility logic. The menu textures were also drawn on a CPU canvas
with the bundled Barlow fonts and visually inspected; all measured text bounds
fit their safe areas. The native EGL/GLES compiler and linker accepted all 13
custom/representative shader pairs in `room-glsl-validation.json`.

The cloud browser's WebGL implementation is disabled. Native fallback navigation
and keyboard behavior were checked there, but GPU appearance, framebuffer
behavior and device frame rate remain unverified. The mathematical tests, source
review and shader compilation do not replace a visual/performance pass on a
WebGL-enabled device. No alternate browser or graphics-policy bypass was used.

## r3 baseline — 2026-10-09

Revision **`dxt-showroom-r3`** made all five display surfaces and frames rigid,
upright rectangles in the room. At that revision, the persistent scene, camera
controller, loading preparation, optics and navigation retained the r2
implementation described below.

### Why the artwork bent during approach

The previous layout intersected the four outline coordinates from the reference
image with an arbitrarily oriented plane. That guaranteed a flat quadrilateral,
but did not guarantee a rectangle. The outer left frame had vertical edges of
approximately **6.54 m and 3.48 m**; its corner angles ranged from **66.9° to
108.9°**. Its orientation also faced away from the central viewing area.

The screen assigned ordinary square UV coordinates to the two triangles of that
irregular shape. Their world-to-UV mappings therefore had different slopes at the
shared diagonal. Applying the same artwork homography to each side did not remove
that crease. The camera enlarged an existing geometry/mapping error. The screen
vertices, frames and artwork uniforms were already fixed during the movement.

`ROOM_PANELS` now supplies an explicit position, width, height and yaw for each
display. `createFixedPanelLayout()` constructs its four corners from orthogonal
horizontal/vertical axes. The displays face inward and their opposing edges are
parallel and equal. Frames, bevels and physical thickness derive from those same
corners. This gives the screen one affine world-to-UV mapping across both
triangles, so the existing projective artwork shader preserves straight lines.

The physical dimensions were fitted offline to the original four outline points
at the original calibration camera, keeping the depth of each panel fixed. Each
new corner is within **10 source-image pixels** of its reference; the maximum is
approximately **9.60 px at 1672 × 941**. Image outline coordinates remain only a
composition test reference, never the runtime mesh shape. There is no runtime
fitting, geometry deformation, per-frame reorientation or additional rendering
pass.

The camera audit found no view-dependent distortion in the display shader. FOV
changes alter framing, while the irregular mesh caused the line kink. The
existing approach and return paths continue to pass their framing and car
clearance checks with the corrected screens, so this revision retains that
camera controller.

### Regression verification

`tests/room-panel-mapping.test.mjs` builds the actual production meshes with only
image loading replaced by in-memory textures. Its tests inspect real geometry,
UVs, transforms and material projection uniforms. Before the fix, all five
rectangle checks and the interior line-mapping check failed; after it, all seven
checks pass.

The mapping test uses Three's indexed-mesh raycaster for **10,710 samples** across
all five screens and both texture axes. It checks desktop and two portrait sizes,
the overview, three intermediate approach positions, the focused pose, halfway
return and the returned pose. It verifies straight lines across the triangle
boundary and confirms the exact preservation of geometry, UVs, frame matrices
and artwork uniforms during movement. Existing geometry tests additionally
check source composition, inward normals, complete focused framing, car
occlusion, architecture clearance and approach/return collision paths.

These are CPU geometry and mapping checks. The available cloud browser still
cannot create a WebGL context. They establish the mathematical correction but
do not substitute for a GPU-rendered visual inspection or a device frame-rate
measurement.

## r2 baseline — 2026-10-09

Revision **`dxt-showroom-r2`** established one persistent 3D room with five content panels. Its display calibration is superseded by r3 above. The r1 record below remains as historical context; its camera measurements, loading fallback and separate-page ownership do not describe the current runtime.

### Camera and the open front bay

The dark bars across the car were real near-camera architecture. The original complete cylindrical shell, rails and pillars occupied the sightline between the starting camera and the showroom. Moving an orbital camera through that structure could expose or cross additional obstructions.

`room-core.js` now defines one shared **240° side/back structural arc and a 120° opening at the front**. Walls, rails and structural details all use that arc. The opening is not 240°: `ROOM_SHELL.thetaLength` is `4π/3`, the retained structure. This prevents removing the visible wall while leaving rails across the same opening.

`room-camera.js` owns the current view. Desktop overview starts at `(0, 1.48, -12)`, looking toward `(0, 2.20, 0)`, with a 42° vertical field of view. Overview dragging changes yaw and pitch from a fixed eye position. It does not orbit the eye through the wall. Mobile has a separate, more distant overview pose. The display meshes stay fixed in world space.

Activating a display moves the camera along an elevated curve, then reveals its native content. The approach framing is solved from the panel's four corners and viewport aspect; portrait layouts can move farther back and raise the eye. The curve's control points rise to at least Y `4.4`, and desktop endpoints stay at or above Y `3.15`, to clear the car. These are geometry and camera constraints, not a claim that every rendered pixel has been inspected. The r1 reference-projection numbers below belong to the previous camera.

### Prepared car asset and CPU evidence

The prior `loadShowroomCar()` cloned and transformed the source meshes, partitioned and steered the wheels, extracted headlamp surfaces, and repeatedly scanned geometry bounds on every load. An eager procedural car fallback also created geometry that the detailed asset subsequently replaced.

The reproducible recipe now lives in `tools/car/prepare-car.mjs` and is executed offline by `node tools/bake-showroom-car.mjs`. The browser loads `assets/models/nissan-s15-showroom.glb`. Production `room-car.js` restores only small render metadata fields that glTF does not encode, such as shadow flags, tone mapping and environment intensity. It does not clone or transform vertices, steer wheels, or recompute geometry bounds. The scene no longer constructs the procedural loading car.

The prepared asset retains all 47 meshes, including the two hidden meshes, and **231,983 visible triangles**. Position, normal, UV and index arrays match the prior prepared result exactly. The same red physical paint, glass, wing, wheel steering, authored lens inserts, dimensions and orientation are retained. All seven source image streams remain byte-identical. `tests/showroom-car.test.mjs` checks that equivalence and the absence of runtime vertex operations. The original CC BY source GLB and model attribution remain in the repository; the unchanged source is the offline bake input.

The measured report is preserved in [car-startup-profile.json](car-startup-profile.json). Reproduction command: `node tools/profile-car-startup.mjs`. It launches five fresh Node processes for each variant, reads the local GLB before timing, and uses real GLTF geometry/material parsing with inert texture objects.

| Median CPU measurement | Previous runtime preparation | Prepared GLB |
|---|---:|---:|
| Total timed car load | 180.14 ms | 32.76 ms |
| Preparation after parsing | 105.09 ms | 0.480 ms |
| Transient ArrayBuffer allocation | 30.01 MiB | 20.93 MiB |

Each previous load performed 43 geometry clones, 90 matrix transforms, 178 bounding-box scans and 137 bounding-sphere scans. The prepared loader performs zero of those operations. Individual parser timings vary on the shared machine; the report preserves every run, and table entries are independent medians. The total measured CPU reduction is approximately 82%, while the post-parse preparation reduction exceeds 99%.

**This is not a complete browser startup benchmark.** Network transfer, file reading, image decoding, GPU uploads, PMREM rendering, shader/driver compilation and frame rendering are outside this CPU measurement. The data demonstrates removal of a specific main-thread preparation cost. It does not establish that all freezing has been eliminated on the user's device.

### Staged startup and renderer warmup

`main.js` mounts the lightweight room interface before importing the renderer bundle. `HeroScene.initialize()` yields through a paint opportunity before creating the WebGL context and between major room setup steps. The prepared car download overlaps room construction. Startup waits for required artwork and the car before exposing the interactive scene.

The studio environment is compiled before PMREM generation and uses a bounded 128-pixel cube size. PMREM's `fromScene()` still dispatches synchronously; the loading state and browser yields contain that work within startup, rather than making it free or cancellable.

`room-startup.js` then prepares the renderer in awaited batches:

- Initialize one render target at a time and yield between targets.
- Upload source textures in groups of at most two and yield between groups.
- Compile up to four distinct scene material variants per batch with the real scene's lighting and environment. Different variants of a shared material use separate awaited batches.
- Compile optical materials against the scene-linear target, then compile the final output pass with its actual ACES/sRGB defines.

This preparation function does not render frames. It serializes renderer use, supports abort checks between batches and restores renderer state on exit. An in-flight `compileAsync()` cannot be cancelled; teardown waits for it to settle. Driver submission or compilation can still take time on a particular device.

The first actual geometry upload and shadow draw happen behind the loading state. Only after that first render and another browser yield does the room become ready and start its interactive loop. Static shadows update when needed instead of on every frame. Pointer picking uses two coarse car occluder volumes rather than raycasting the approximately 232,000 rendered car triangles.

### One scene, modal content and deep links

`main.js` creates the room DOM and renderer once. Opening a panel, closing it, or traversing browser history updates the camera and content state without replacing the canvas or constructing another scene. `room-navigation.js` maps `/berserk`, `/groups`, `/projects`, `/about` and `/contact` to the five room panels; `/` returns to the overview. A deep link requested during startup resumes when the room becomes ready.

The content dialog opens after the camera approach completes. It moves focus to the panel heading, makes surrounding controls inert, keeps Tab navigation inside the dialog, and supports Escape/Back with focus restoration. Existing verified game, community and social destinations remain external links in those panels. If WebGL is unavailable or the context is lost, native content and the same deep links remain available without requiring 3D rendering.

### Publication boundary and assets

`index.html` loads only `styles-base.css`, `styles-room.css` and `main.js`. The base stylesheet supplies reset, screen-reader text, focus styles and the two actual font families. It removes the old CSS cascade, `race.webp` preload and external font stylesheet requests. Local WOFF2 files cover Barlow 400/500 and Barlow Condensed 400/500/600, with OFL 1.1 attribution and source hashes in `assets/fonts/`.

`tools/build.mjs` distributes an explicit allowlist: the room main/core/content modules, icons/room-shell/room-navigation, `home-room.js`, the two stylesheets, `render/showroom.bundle.js`, the prepared car and its license, the reference artwork PNG, four currently used logo icons, and the five fonts with their license/source record. The original model, HDR, legacy templates/renderers/styles and unused images stay in the source repository and are not copied to `dist`.

The build publishes the same HTML for all five route aliases and `404.html`, and records version `dxt-showroom-r2` in `build-info.json`. Import-graph validation rejects reachable browser modules outside the manifest; distribution tests resolve imports again from the packaged tree and verify identical alias documents. The inspected source bundle has no legacy project imports or external module imports.

### Verification boundary

The saved native EGL/OpenGL ES report in [room-glsl-validation.json](room-glsl-validation.json) records **12 shader pairs compiled and linked successfully**, including the custom room and optical programs and a representative weathered-metal material variant. The check uses a native compiler and does not render frames. It does not cover every possible Three.js material/driver variant.

The available cloud browser reports `GL_RENDERER=Disabled` and cannot create a WebGL context. CPU geometry/raycast checks, asset equality tests, import checks, native navigation checks and native shader compilation support the fixes described here. They do **not** establish rendered desktop/mobile composition, GPU picking, framebuffer correctness, complete startup latency, or sustained frame rate. Those checks remain for a WebGL-capable device. No claim is made that the startup freeze is fully eliminated.

## Historical r1 record

The following records the initial implementation and measurements from before r2. Its separate destination pages, authored loading car, camera bounds and test count are historical and are superseded where the current-state section above differs.

### Visual specification

Implement the supplied 1672 × 941 reference as a navigable real-time scene in the existing DXT project and domain. Preserve the five destination pages and verified social/game URLs. The new home replaces the previous diagonal outdoor layout.

The initial composition is a dark cylindrical industrial hall, five angled framed displays, a red drift coupe centered on a low circular stage, wet irregular reflections, a white ceiling shaft, localized tire smoke, red practical lights and unobtrusive typography. The car occupies approximately x30–69%, y49–77%; the stage x16–84%, y67–82%. The two foreground tire stacks are out of focus. The source image supplies the artwork printed on the five displays; each display and its frame has real world geometry. The car, architecture, floor, lights, mist and camera are rendered independently.

### Implementation plan

- [x] Retain the existing routes, content, hosting identity and dependency versions. Work in an isolated checkout and make one consolidated commit.
- [x] Build the room and display frames as scene geometry. Calibrate their initial projection against the source camera, use projective UVs for the display artwork, and expose five raycast targets.
- [x] Use the attributed CC BY S15 mesh, retune physical red paint, and retain the authored coupe as a loading/error fallback.
- [x] Render a genuine mirrored-camera floor with procedural wetness, roughness and surface breakup. Build narrow stage/ceiling rings and local industrial details.
- [x] Integrate restrained linear HDR bloom, depth of field, camera motion blur, lens effects and grading, with bounded render resolution.
- [x] Add drag/keyboard camera controls, panel activation, sound opt-in, quality controls, reduced motion and route cleanup.
- [x] Verify geometry, native shader compilation, route navigation and unavailable-renderer navigation.
- [ ] Verify rendered desktop/mobile composition, GPU picking, framebuffer behavior and frame rate in a WebGL-capable browser.

### Rendering constraints

One car; no photographic car billboard. No replacement production domains. UI remains readable and keyboard accessible. Optical effects must stop accumulating while stationary or paused. Reflection resolution and pixel count are bounded. Existing secondary pages retain their data and verified destinations. The reference is a visual target, not evidence of capabilities that have not been tested.

### Module ownership

`room-core.js`: pure geometry/mapping helpers. `room-environment.js`: architecture, framed screens, reflective floor. `room-scene.js`: lifecycle, car, lighting and camera interaction. `room-optics.js`: postprocessing. `home-room.js`, `room-shell.js`, `styles-room.css`: accessible home interface. Existing templates and content continue to own destination pages. `tools/bundle.mjs` selects the room scene as the production bundle entry.

### Verification and limits — 2026-10-09

The project regression suite passes 46 tests. A native EGL/OpenGL ES compiler compiles and links 12 shader pairs: all custom room materials, optical passes, the injected weathered-metal material, and the final ACES/sRGB output. The reproducible check is `python tools/validate-room-glsl.py --report docs/room-glsl-validation.json`; the report contains source hashes and compiler details.

Actual transformed GLB vertices project to x `[.304000, .688000]`, y `[.494000, .770000]` at the reference viewport. The front points left and the tires meet Y `.031`, directly above the floor at `.024`. The outer stage projects to x `[.165000, .835000]` and a front edge at y `.821000`. The white oculus ends at y `.136859`. Foreground tire stacks enter at the image edges rather than remaining outside the camera frustum.

The asset has 45 visible meshes and 231,983 visible triangles after duplicate transparent geometry is hidden and projector inserts are added. CPU checks found no nonfinite positions or zero normals; both primary lamps face the calibrated camera. The car is a licensed S15 LBWK silhouette, so matching its bounds does not imply identical body panels to the concept coupe.

The display shader reconstructs the small lower regions hidden by the original foreground car, preventing that photographed roof from remaining printed on a screen when the real camera moves. The rest of the supplied display artwork remains sampled from the reference. Grading is analytic; no external LUT is claimed. Transparent smoke uses the underlying opaque scene depth for defocus.

The available cloud test browser reports `GL_RENDERER=Disabled` and fails before WebGL context creation. Its native navigation through Home, Groups, Projects, Contact and About was checked. A failed or lost context exposes all five destinations and an honest unavailable message. Native shader compilation and numerical projection do not substitute for a rendered pixel comparison, actual GPU frame timing or a mobile GPU test. Those visual/performance checks remain explicitly open.
