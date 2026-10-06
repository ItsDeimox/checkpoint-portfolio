# Stage 4: process cards

Final chapter only: larger cards, two rounded chamfer corners, rigid hover approach, neutral inactive material, local colored light, restrained bloom, fragmented square lattice in CSS pixels, glass edge highlights and a narrow broken floor reflection. Text and raymarched material share transformed rectangles. Pointer, touch and keyboard are supported. Native horizontal touch scrolling does not activate the detail dialog accidentally.

The hero and cube source behavior is preserved. Deterministic framebuffer comparisons at 480x360 were pixel-identical in both earlier chapters. The provided application ZIP includes all sources, 82 unit tests, the 24-check GPU material test and the 45-check native-browser suite, plus an independent modular ES-module smoke test of all three chapters. Tests ran in Chromium/Xvfb WebGL2 with mobile emulation, not physical mobile devices.

## Build

This repository already uses a historical compressed source snapshot. `release/build-process.mjs` captures the tracked source overrides BEFORE expansion, restores them after verification, and invokes the checked template adapter. This prevents the assembly step from silently overwriting the four reduced-glow shaders committed earlier.

Process-specific editable sources are `src/core/process-surface.js`, `src/ui/process-cards.js`, `src/rendering/process-pass.js`, `src/shaders/process.frag`, and `src/styles-process.css`. `release/process-stage4.mjs` connects these to the historical template and its portable HTML build. `/build-info.json` records the deployed source digests and commit.
