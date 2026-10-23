# Changelog

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
