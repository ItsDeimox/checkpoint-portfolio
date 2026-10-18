# DXT: five worlds, one showroom (R22)

Baseline: `1d020e88b145473cd8af7181456abdea38776f1d`.

## Scope

The entry showroom starts with dim white practicals. Hover or keyboard focus selects red (Berserk), white (Groups), purple (Future), orange (About), or light blue (Contact). Other panels dim, the existing lights and practicals interpolate to the selected color, and the portal carries the same identity. Shaders are patched once before the original preparation phase. No hover-time shader compilation or car material recoloring is introduced. The obstructing overhead volume is disabled; the studio lights that define the car remain. Music still modulates the actual selected practicals instead of assuming that all sources begin red.

Berserk retains the existing native game gallery, controls and real Play Now link. Its CTA now excites a persistent energy graph, inspired by the node energy and connection sampling in `deimoxportfolios/src/shaders/cube.frag`. The community invitation is on Groups only. Groups have larger manually scrolled presentations, inert game-image galleries and group-level Roblox links. Vertical wheel input advances an actual snap destination and releases ordinary page scrolling at the edges. There is no autoplay.

About uses the supplied Portuguese biography, an unframed large avatar and the existing personal mark. Future Projects has a procedural 3D covered-car scene with cloth folds, overhead lighting, floor shadows and a restrained camera, followed by the seven supplied projects. Contact replaces the old photograph crop with the actual identity and thin blue signal paths.

## Resource ownership and continuity

The approved portal geometry, camera path and SectionRoutes/preload implementation are unchanged. New page graphics share one canvas, warmed under the entry gate; the native module and bundled scene share it via a root-scoped Symbol. Its drawing buffer uses layout dimensions, not the changing projected size during portal travel. Animation sleeps when pages are hidden, inert, offscreen or the tab is hidden. Reduced-motion and no-WebGL fallbacks retain navigation. The original showroom/header renderer lifecycle stays separate.

## Validation scope

CPU regression coverage includes themes, car material invariance, shader reuse, portal color locking, audio modulation, energy propagation/decay, group wheel boundaries, lifecycle sleeping and all requested editorial changes. The existing complete test suite remains a required build gate; a compact CI reporter prints failures without truncating the interesting part of the deployment logs. Tests that demanded the old unannounced-project text or removed photographic crop were updated to the supplied catalog and actual artwork, while retaining navigation and asset-preload checks.

Both new raw GLSL programs were compiled and linked with native EGL/OpenGL ES on Mesa llvmpipe. The covered-car shader was rendered at 960 by 640 with no GL error. A Chromium DOM test reproduced and verified the mandatory-scroll-snap wheel fix. Browser WebGL is unavailable in the current environment, so these checks are not a claim of full end-to-end browser 3D appearance or device FPS. The Vercel Sandbox quota was unavailable; no billing or subscription settings were changed.

## Owner dependencies

Only RevLine's association with Berserk Drift X was confirmed in the existing source. Its real image is included. Additional RevLine games and the Frost Mammoth game catalog need owner confirmation and the corresponding artwork or game URLs. Unknown games are not invented or linked. The supplied avatar is 256 by 256; a higher-resolution original would improve its large presentation. The main showroom car is unchanged for the owner's later replacement.
