# BRAAZA / refinement 1.1

## Changes

- The far chains had 17 links on a 20-link recycling interval. All four chains now have 56 alternating links on one complete, even period. Recycling is below -14 / above 35 world units, outside the intended camera framing. The local twist is applied after path alignment. Long-session motion rebasing retains chain travel.
- Native GLSL gradient Perlin noise, quintic interpolation and advected octaves shape the fire. Varied emitters start at the bowl surfaces. Sorted premultiplied-alpha sheets avoid additive color washout.
- Original media demonstrations now render into floating-point HDR targets where supported. Emissive information is not clipped before postprocessing. Popup previews apply tone mapping during readback.
- Rounded beveled glass geometry, a separate environment capture, subtle RGB refraction, sparse glass fractures, a radial heat trail and internally lit perimeter. No change to the project names or provided content.
- Obsidian floor, faceted foreground slabs, revised metal/coal lighting, depth fog, elongated sparks and restrained multiscale bloom. Distant floor fades instead of ending at a hard rectangle.
- Original layout, vertical gallery, navigation, media loading, pause, accessibility controls and other repository projects are preserved.

## Validation

21 Node tests, 13 actual render-target checks, 30 browser interaction checks passed in Chromium/WebGL2. Mobile was emulated (390 x 844); this is not a physical-device performance benchmark.
The render checks audit all scene/bloom/transmission pixels for NaN, negative channels and runaway radiance, check HDR media peaks, flame borders/evolution, and popup readback. Interaction tests include a 365-phase sweep of both chain directions, pointer, keyboard, touch and quality modes.
The new regression tests fail on the original baseline. Browser tests wait for the scene state after Home rather than sampling stale matrices while software rendering is catching up.
Run `npm test`, `npm run build`, `python tests/render-check.py` and `python tests/interactions.py`. Python checks require Playwright and Chromium; in Linux without a desktop set DISPLAY to an active Xvfb display.

## Research

Original implementation informed by:
- NVIDIA GPU Gems 2, chapter 26, Implementing Improved Perlin Noise: https://developer.nvidia.com/gpugems/gpugems2/part-iii-high-quality-rendering/chapter-26-implementing-improved-perlin-noise
- NVIDIA GPU Gems, chapter 6, Fire in the Vulcan Demo (emitter variety, alpha composition, glow): https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-6-fire-vulcan-demo
No external shader library or runtime dependency was added.
