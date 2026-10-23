# Validation — HEINEM 1.2.0

Revision: **22 October 2026, America/Sao_Paulo** (23 October UTC). This record separates local tests, public deployment checks, simulated media events and hardware limits. The [v1.1 record](VALIDATION-1.1.md) remains historical.

## Reproduce

```bash
npm ci
npm run build
CHROMIUM_PATH=/path/to/chromium npm run test:e2e
PLAYWRIGHT_BASE_URL=https://heinem.vercel.app CHROMIUM_PATH=/path/to/chromium npm run test:e2e
```

The build includes TypeScript and all unit/controller tests. Browser checks remain a separate gate. The task environment uses Node 24, Vite 8.3.5, TypeScript 7.0.2 and Playwright 1.64.1 with Chromium 134/ANGLE/SwiftShader. The browser override is explicit. These are software-GPU checks, not physical-device frame-rate or battery measurements.

## Local evidence

| Check | Observed result |
| --- | --- |
| TypeScript + production build | Passed; 11 source modules transformed |
| Unit/state/input checks | **30/30 passed**: 9 graphics, 13 player, 8 native-scroll/input |
| Complete existing browser suite | **17/17 passed**, 53.6 s |
| Added tall-viewport regression after independent review | **1/1 passed**, 4.6 s; final suite contains 18 tests |
| Normal layout viewports | 1178 × 659, 1440 × 900, 390 × 844, 320 × 780 |
| Additional visual review | 1672 × 941; 12 actual-page snapshots over desktop/mobile scroll positions |
| Unusually tall mobile layout | 600 × 1600, entire music viewport covered by the same field |
| Layout and hit targets | No horizontal overflow, mobile body text ≥12 px, CD center reaches its native button |
| Real assets | Seven independent files, true alpha except sky; source RGB retained for artist |
| Physical scroll | Foreground opacity 1, no hero/field masks, no replacement meadow or local CD-grass patch |
| GPU copy | No per-letter wrappers; title, biography, underline and sparkle share material coordinates |
| Jelly motion | Independent touch centers, signed recoil after pointer departure, max six impulses, eventual settling |
| Hover work | **0 copy mutations, 0 application geometry reads, 0 additional texture uploads** |
| Shader lifecycle | Offscreen/reduced-motion draws stop; context loss restores native copy; restoration returns GPU text |
| CD sequence | 180 ms insertion → 220 ms concealed swap → 180 ms ejection; pivot returns within 0.6 CSS px |
| Rapid input | Newest requested release wins; reversing can cancel; no accumulating animation queue |
| Reduced motion | Immediate CD selection, static decorative rendering, no depth/wheel interpolation |
| Before play intent | No provider network requests or iframe; cover/arrow browsing remains silent |
| Provider state/failure | Confirmed events drive spin/progress; paused/pending-cancel/stale-frame/retry paths pass using mocks |

The desktop/mobile scene review found clean alpha silhouettes and no rectangular seam at scroll fractions 0, .15, .3, .5, .8 and 1. The final artist was reviewed again after replacing generated portrait RGB with the original photograph.

## Why the hover change is supported by evidence

The prior version had 307 animated glyph elements and 459 descendants in `.bubble-copy`. A baseline probe at 1178 × 659 recorded **4,214 style mutations during ten WebGL draws** over roughly 1.05 s of cursor motion. Caching rectangles had removed layout reads but not style/paint updates.

The new copy subtree has 15 descendants. Font/layout changes create a packed texture containing sharp ink and two glow masks; hover updates only bounded uniforms on one vertex grid. The test observes the DOM and intercepts layout/texture APIs through movement and relaxation. Counts remain zero and uploads remain unchanged. This proves removal of that work; it does not promise a particular FPS on the user's hardware.

Playwright tracing is disabled only for this instrumented test because the trace's own snapshots call layout APIs. Other tests retain normal failure tracing. Images upload on startup, appropriate quality changes and context restoration; those legitimate events are outside the stationary-hover claim.

## Bugs found and corrected during validation

1. A positive desktop depth left a visible bottom rim of the mobile bubble above the music section at maximum scroll. The renderer correctly kept drawing it. Mobile depth is now zero, and the sleep test requires the actual bubble bottom to leave the viewport.
2. On 600 × 1600, the capped 1050 px hero plus viewport-height music exceeded the initial 240% field. Review measured a 382 px uncovered region. Mobile field height now uses `max(240%, calc(124% + 100svh + 2px))`; a dedicated browser test checks both the music bottom and viewport bottom.
3. The controller's final `idle` phase can occur one presentation frame before the compositor reaches the last CD position. The browser test polls real geometry and retains the 0.6 px pivot tolerance; it does not weaken the requirement.
4. Reduced-motion global CSS uses 0.001 ms. The test accepts effectively zero duration rather than requiring a literal zero string.

## Production artifacts

Final Vite application resources; gzip values use level 9:

| Resource | Bytes | Gzip bytes |
| --- | ---: | ---: |
| `index.html` | 16,997 | 4,216 |
| `assets/index-BUeKTwlZ.js` | 42,192 | 15,536 |
| `assets/index-Dh_4q4nR.css` | 21,788 | 5,946 |

The **seven-layer image payload is 1,581,358 bytes**. This figure excludes covers, the retained silver CD, fonts and social-preview metadata. Superseded flattened scenery was removed from `public`; the design reference is documentation only. No general 3D library or new runtime package was added.

## Published revision

Application source [`502288c32a9b91c49f38e13cc9a537db955dc0bd`](https://github.com/ItsDeimox/checkpoint-portfolio/commit/502288c32a9b91c49f38e13cc9a537db955dc0bd) was deployed through the existing Git integration. Vercel deployment **`dpl_9CHrNBtfXToMPuDL8bbQh4dCTmNY`** reported **READY**, with that exact Git SHA and the production alias [heinem.vercel.app](https://heinem.vercel.app).

The final **18/18 browser tests passed against the public alias in 57.4 s**. This includes the added 600 × 1600 continuous-field regression, GPU typography/underline work counts, context recovery, graphic preferences, CD insertion/exchange/ejection and pivot, responsive hit targets, reduced motion, and simulated provider failures and playback events.

Independent `curl` requests with normal TLS verification returned **HTTP 200 for all 23 files in `dist`**. Every response matched its local build artifact byte for byte, including the HTML, bundled JavaScript/CSS, all seven layers, covers, CD, fonts and metadata assets. [Machine-readable artifact evidence](evidence/release-1.2.json) records their SHA-256 digests and the tested deployment.

The disposable Playwright browser used `PLAYWRIGHT_IGNORE_TLS=1` for the environment's missing proxy CA, as documented in its configuration. The independent HTTP/artifact comparison used the system trust store and **no TLS bypass**. This test-only setting is not part of the site. The browser run proves behavior under Chromium/ANGLE/SwiftShader; it does not remove the physical-hardware and real-audio limits below.

Publication preserved concurrent `dxrkths/` work in the shared repository. The remote `heinem` tree was verified identical to the locally tested Git tree before updating `main`. This evidence-only follow-up changes documentation, not the verified application resources.

## Visual evidence

- [Desktop hero](evidence/layers-hero-desktop.webp)
- [Mobile hero](evidence/layers-hero-mobile.webp)
- [Desktop music](evidence/layers-music-desktop.webp)
- [Mobile music](evidence/layers-music-mobile.webp)
- [Exact asset prompts, masks and source dimensions](LAYER-ASSETS.md)

## Practical limits

The original photograph has finite resolution, warm room lighting, grain and mirror marks. The final cutout preserves its actual face; a static color correction cannot manufacture new photographic detail. Environment layers reconstruct scenery in the approved style and do not claim exact unseen pixels from the flattened design. Native alpha geometry was measured rather than assumed from the prompt.

Continuous real SoundCloud audio remains unconfirmed in this environment. The previous real-provider test obtained metadata but paused at 0:00 without progress. Current automated tests simulate provider events and prove controller behavior, not an audible stream. The official transport, true event gating, retry and verified external source link remain. The requested visible provider panel is removed.

Software rendering validates behavior, bounded resources and work counts. Physical hardware FPS and battery usage have not been measured. Auto is a device-hint estimate, and manual Low/Medium/High remains available.
