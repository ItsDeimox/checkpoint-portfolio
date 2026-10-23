# Changelog

## 1.4.2 — 2026-10-23 (São Paulo)

### Changed
- Rebalanced the meadow using the user's Frutiger Aero reference: muted, cooler sage/teal greens and a gray-blue sky rather than vivid foliage.
- Fixed the 1.4.1 grading error: green plane contrast above 1 exaggerated bright edges despite a small saturation reduction. Contrast is now below 1, saturation is substantially reduced, and exposure slightly restrained.
- Graded each scene layer in the existing bubble refraction pass to avoid a bright unfiltered interior.
- Preserved the artist portrait, continuous grass, CD carousel, bubble jelly motion and all controls.


## 1.4.1 — 2026-10-23 (São Paulo)

### Changed
- Removed HEINEM's X/Twitter profile from the site header and removed its unused SVG symbol. Other socials are preserved.
- Cooler, less saturated green/blue-green atmosphere based on the supplied meadow reference. Sky, distant/mid vegetation, tree and the **single continuous foreground** are graded independently without tinting the artist, artwork, controls or text.
- Retained the original approved bubble motion and geometry; its already-existing WebGL background sampler applies a restrained matching scenery tint in the same pass (no added texture upload, GPU pass or full-screen filter).
- Tuned fallback backgrounds to cooler muted evergreen so the scroll stays visually connected.
- Preserved continuous CD swipe/hover and GitHub-driven Vercel deployment.

### Deployment
- Publish only via GitHub main → Vercel Git integration, then verify source SHA and public alias, following [Webuilder rules](../docs/WEBUILDER-RULES.md).


## 1.4.0 — 2026-10-23 (São Paulo)

### Changed

- Let one mouse/touch hold move through any number of albums, including repeated circular laps and reversals, instead of clamping drag progress to the next index.
- Preserve the original case/rotor transforms and disc-concealment choreography at each integer boundary, with no visual position jump.
- Apply a small, bounded kinetic finish to the partial sleeve after release; cancellation follows the signed path back to the original audible choice.
- Defer actual track/provider changes until the completed gesture settles. Scrubbing across several songs does not repeatedly pause, request, or reinitialize SoundCloud.
- Tune the distance of one sleeve to 30% of the stage (bounded 92–400 CSS pixels), so multiple covers can be crossed in a single desktop or mobile gesture.
- Preserve click/arrow navigation, the approved 3D hover and bubble, native vertical touch scrolling, reduced-motion behavior, player controls and graphics settings.

### Tests

- Add controller regressions for uninterrupted multi-sleeve scrubbing, pose continuity across integer boundaries, multiple laps, directional reversal, cancellation and single provider commit.
- Add real-browser mouse (desktop/mobile) and touch regressions for multi-album drags. Full results and deployment verification are recorded separately once the release gates complete.


## 1.3.0 — 2026-10-22 (São Paulo; 2026-10-23 UTC)

### Changed

- Selected the previously generated brighter portrait requested by the user. `artist-light.webp` is 802 × 1774, 291,154 bytes, WebP quality 94/alpha 100. Its RGB is reconstructed; the original-RGB 1.2 cutout is archived at `docs/reference/artist-photo-v1.2.webp`.
- Added four 1080 × 1457 native detail tiles inside the existing foreground, with static overlaps and the base field's silhouette/underlay. Their combined effective density is about 1964 × 2648, or 3.31 times the base field's effective pixel count, with a 2,057,858-byte optional payload.
- Load field detail only at desktop widths of at least 1000 px on Medium/High without data saving. Reveal it only after all tiles decode; mobile, Low and failure paths retain the complete base field.
- Removed the second 95 ms parallax filter and synchronized depth immediately after actual wheel scroll writes. The sky now follows the same document position before paint, including the first wheel frame and direction changes.
- Replaced the discrete CD exchange timers with one reversible timeline. Mouse/touch dragging controls progress; click navigation uses the same motion, with a full automatic exchange of 520 ms.
- Added bounded pointer-following 3D tilt and local shine on inner case/disc surfaces while keeping outer placement, rotor and play target separate.
- Preserve native vertical touch scrolling and ignore bubbled loss of an inner element's implicit pointer capture when capture moves to the carousel stage.
- Refresh the versioned social preview from the implemented brighter portrait and detailed field, and retain desktop/mobile/transfer screenshots with the validation record.

### Preserved

- The approved bubble shader, typography, local glow and depth factors.
- One continuous foreground through the music section, without scroll-dependent fading or a separate patch beneath the CDs.
- Manual graphics preferences, reduced motion, silent cover browsing, official media transport and MIT application licensing.

### Verification

- Added regressions for stopped/reversed sky motion and depth alignment within each completed wheel frame.
- Added field-detail request gating, shared-plane movement and all-or-fallback decoding checks.
- Expanded CD controller and real browser pointer coverage for gradual motion, cancellation, tilt, capture and native touch ownership.
- TypeScript and 34/34 unit tests passed; 26/26 browser cases passed locally and on the public alias. All 28 deployed files returned 200 and matched the tested build. Focused, integrated and published evidence is recorded separately in [VALIDATION-1.3.md](docs/VALIDATION-1.3.md).

## 1.2.0 — 2026-10-22 (São Paulo; 2026-10-23 UTC)

### Changed

- Generated separate sky, tree, far/middle foliage, continuous field and butterfly assets. The portrait uses the supplied original photograph RGB through an aligned generated alpha matte, with no generated facial pixels in the runtime asset.
- Removed the hero opacity dissolve, section masks, reused flattened landscape crops and the local grass overlay beneath the CDs. One tall field physically travels upward across the entire page.
- Replaced 307 animated HTML glyphs with a cached GPU typography texture including the underline and sparkle. Text and film share one elastic mesh; hover no longer writes letter styles or uploads textures.
- Added up to six independently located, damped jelly impulses and packed local glow masks without extra bloom render targets. The bubble rim is now fully procedural.
- Added articulated butterfly wings with compositor transforms and offscreen/low/reduced-motion suspension.
- Animated CD insertion, concealed case exchange and ejection in 580 ms, with interruptible navigation and a centered independent rotor.
- Removed the visible SoundCloud embed/footer panel. Retained official transport, native controls, real provider event gating and a compact track-source link.
- Kept the mobile bubble within its outgoing hero so no residual rim continues rendering above the music section.

### Verification

- Expanded player regression coverage for transition ordering, repeated input, cancellation, reduced motion, keyboard activation and obsolete provider events.
- Replaced glyph tests with GPU-copy, spatial recoil, zero-hover-DOM-work, no-upload, context recovery and offscreen/reduced-motion assertions.
- Recorded actual alpha geometry, source prompts, discarded candidates, continuous-scroll visual inspection and remaining streaming/hardware limits.

## 1.1.0 — 2026-10-23

### Changed

- Replaced the separate music dashboard, About and Contact/CTA sections with the user-approved meadow composition: three transparent jewel cases, a silver disc and compact controls over grass.
- Added a shared scenic background, a focused foreground grass overlay and a soft hero transition. Removed mirrored foreground overscan that exposed an inverted image edge during scroll.
- Separated the disc rotor from its stationary hub and play button; hover changes light without translating or tilting its pivot.
- Aligned visual case order with Previous/Next. Browsing without an active play intent does not start audio or load the SoundCloud SDK.
- Shared one CSS-pixel deformation field between the shader and HTML glyphs, including a local affine response and localized glow. Geometry is cached after font readiness and resize.
- Sharpened refraction, reduced haze and replaced the photographed rim RGB with a faint extracted optical highlight residual. Kept one localized shader pass.
- Added short, cancellable wheel interpolation. Touch, keyboard, native controls, nested scrollers and reduced motion keep native ownership; Tab and Shift+Tab cancel pending motion.
- Added focused player/scroll tests and browser regressions for the disc pivot, silent cover selection, glyph motion, texture uploads and offscreen/reduced-motion suspension.

### Preserved

- Original artist portrait pixels, manual graphics settings, reduced-motion independence, CSS fallback, context recovery and provider error/fallback behavior.
- MIT application license and the separate rights of photography, identity, covers, fonts and music.

## 1.0.0 — 2026-10-22

### Added

- HEINEM reference composition with original portrait pixels, preserved landscape areas, reconstructed reveal areas and separate foreground grass.
- Native-scroll parallax with different depth factors, reduced motion and offscreen/hidden pause.
- Hybrid WebGL2 soap-film material: procedural refraction and cursor deformation with the masked original perimeter preserving the reference microfolds.
- Automatic graphics default and persistent Low/Medium/High overrides, local pixel budgets and CSS fallback.
- Interactive CD with verified SoundCloud tracks, actual playback events, seeking, volume, retries and official player fallback.
- Responsive music/about/contact sections, verified external profiles, local Poppins fonts and keyboard support.
- MIT software license, source provenance, architecture/security documentation, quality tests and production configuration.
- Build gate runs TypeScript and all graphics-policy tests before creating production assets.

### Validation fixes

- Matched biography line spacing and content width to the supplied reference.
- Corrected `object-fit: cover` texture coordinates on mobile.
- Matched the shader to separately moving sky and landscape layers.
- Added optical softness and wider local highlights after inspecting real rendered output.
- Fixed foreground overscan and removed duplicated butterflies from the preserved background.
- Increased mobile bio readability, contrast and control hit areas.
- Delegated `encrypted-media` to the official SoundCloud frame and added a useful message for playback that stops before audio starts.
- Preserved cleanup after a back-forward-cache round trip.

See `docs/VALIDATION.md` for the actual verification environment and remaining limitations.
