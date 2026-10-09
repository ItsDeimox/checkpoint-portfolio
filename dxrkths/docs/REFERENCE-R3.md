# DXT reference refinement R3

Baseline: `ed83059492e807ada099c49b81372cb443b639b1`.
Only `dxrkths/` is changed.

## Reference geometry

The approved 1648x928 concept is the diagonal-band design, without copying its browser chrome, fabricated counters, unsupported Twitter/email or entire composition as an image. Home now uses a compact navigation bar, a panoramic hero, two overlapping sloped editorial bands, a straighter biography strip (explicit user request), and compact contact shortcuts.

Six card faces are independent perspective-projected planes. The HTML anchor and the GLSL surface share the same column-major projective matrix, including nonzero homogeneous-w terms. Rest angles: X -38°, Y 20°, Z -2.7°; perspective distance 1100 CSS pixels. Hover interpolates orientation and a 32px forward translation. This is not affine skew or non-uniform scale. Card artwork retains its aspect; captions and links remain native HTML.

A single optional WebGL2 optical layer renders the six materials, thickness/backplate, cursor-local glass highlights, finite velocity-dependent waves, sparse traces, HDR emission and two bloom scales. Neighboring cards dim and defocus continuously according to focus weight, not a Boolean hover threshold. The scheduler sleeps when energy settles and stops offscreen/hidden. Native images, perspective, links and keyboard access remain usable without WebGL.

## Hero and environment

Car geometry was deliberately left untouched: the same two authored models, totaling 109,992 triangles, are awaiting the user's replacement assets. Framing, paint lighting and the environment changed. New procedural cloud sky, layered ridges, alpha-tested instanced pine silhouettes, wire fencing, red rails, banners, soft smoke, local optical streaks and rough wet-asphalt planar reflection replace the earlier sparse setting. Reflections use an actual 1k CC0 HDRI; `HDRI-SOURCE.md` records attribution and the source. The GLB logo, all five routes, Roblox profile integration and original social destinations are preserved.

No claim is made that these placeholder cars reproduce the concept's vehicle models. Static concept art cannot establish temporal hover behavior; that interaction was implemented in the existing Deimox visual language and tested separately.

## Tests run on the final source

- 43 Node tests passed, zero failures.
- 39 Chromium/WebGL2 reference checks passed, zero JavaScript or shader errors. Includes current HDR load, 24 card-corner comparisons, real projective coordinates, HTML hit targets, layout overlap, visible hero CTA, focus/lift, finite impulses, idle sleep, route disposal, portrait 390/320, gallery-pan alignment, reduced motion and forced no-WebGL fallback.
- Separate interaction smoke: 9 checks passed. Camera drag/reset, expanded viewport, Escape restoration, quality control, actual CDP touch pan, no accidental route navigation, no GL/JavaScript errors.
- New regressions were observed failing before fixes for an obscured hero CTA and hover activation in the clipped-away portion of a phone card. The final assertions pass.
- Browser version and actual projection errors are in `reference-browser-r3.json`; interaction results are in `interaction-browser-r3.json`.
- Captures in this folder are actual browser renders, not concept art.

The browser used ANGLE SwiftShader and emulated viewport/touch conditions. These results are not a physical GPU performance benchmark or Safari/Firefox certification, and the tests do not assert pixel-identical photographic assets. The API function was preserved byte-for-byte from the existing site.

## Reproduce

`npm ci && npm test && npm run build`

Serve the site with `npm run dev`. With Playwright/Chromium installed, run:

`DXT_BASE_URL=http://localhost:5186 node tests/browser.cjs`

`DXT_BASE_URL=http://localhost:5186 node tests/interaction-browser.cjs`

Runtime files: `src/pages/home-reference.js`, `src/styles-reference.css`, `src/ui/card-projection.js`, `src/ui/perspective-cards.js`, `src/render/card-material.js`, `src/scene/environment.js`, `src/scene/shaders.js`. No screenshot slicing or depth-mapped car photograph is used for the live 3D hero.
