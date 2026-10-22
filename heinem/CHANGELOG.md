# Changelog

## 1.0.0 — 2026-10-22

### Added

- HEINEM reference composition with original portrait pixels, preserved landscape areas, reconstructed reveal areas and separate foreground grass.
- Native-scroll parallax with different depth factors, reduced motion and offscreen/hidden pause.
- Hybrid WebGL2 soap-film material: procedural refraction and cursor deformation with the masked original perimeter preserving the reference microfolds.
- Automatic graphics default and persistent Low/Medium/High overrides, local pixel budgets and CSS fallback.
- Interactive CD with verified SoundCloud tracks, actual playback events, seeking, volume, retries and official player fallback.
- Responsive music/about/contact sections, verified external profiles, local Poppins fonts and keyboard support.
- MIT software license, source provenance, architecture/security documentation, quality tests and production configuration.

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
