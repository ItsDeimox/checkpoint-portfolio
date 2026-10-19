# R25: portal raster stalls, neutral lighting and antialiasing

The first portal entry could stall even with low JavaScript and WebGL draw time. A Chromium GPU trace identified a roughly 90–100 ms raster-worker flush while the destination's full DOM was being scaled through the portal. Shader warmup alone did not remove it.

Destinations now prepare bounded viewport bitmaps under the intro. The portal moves a bitmap and restores the original interactive nodes on arrival. Initial bitmaps are discarded on first arrival so later navigation cannot show stale gallery state. Return captures the current page while the room is parked, including document scroll, horizontal gallery offsets, fixed controls and nested WebGL content. Cancellation releases captures; resize falls back to responsive DOM with the original scroll.

Native-resolution warmup now exercises the moving interior shutter. Floor reflections omit redundant transparent smoke/beam layers, avoid an unnecessary MSAA resolve, and refresh at 30 Hz when the camera and objects are stationary. Main-view atmosphere is retained.

Idle emitters now use white at 0.30 strength instead of the nearly unlit 0.035. Hover colors and the car's red paint remain intact. High retains 4× scene MSAA and supports native 2560×1440; Medium uses a supported multisample count instead of silently falling to zero when the device offers 4× but not 2×. Low remains bounded.

## Validation, 2026-10-19

- `npm run build`: 352/352 unit and integration tests; runtime graph and 67-file distribution passed.
- `tests/stability-browser.cjs` with `DXT_HARDWARE_GPU=1`: 47/47 checks, five destinations, native hover/input, gallery interaction, return snapshots, quality cycling, 1440p and reduced motion. No page errors or context loss.
- `tests/page-preview-browser.cjs`: exact rendered pixels verify a selected horizontal slide and viewport-fixed control on a scrolled page, unchanged live offsets, bounded capture and abort handling.
- Desktop and mobile page previews inspected; final Groups return retained its selected Frost Mammoth slide and 500 px document scroll. Future Projects retained its WebGL covered-car image.

Hardware: NVIDIA GeForce RTX 2060 through ANGLE Direct3D11 in isolated headless Edge, without software rasterization. The measured Groups entry uses a 2560×1276 viewport, High, real render loops, WebGL timer queries and a Chromium trace.

| Render-start intervals | Original | R25 |
| --- | ---: | ---: |
| Groups entry mean | 13.96 ms | 11.83 ms |
| Groups entry p95 | 22.30 ms | 19.20 ms |
| Groups entry maximum | 128.00 ms | 25.30 ms |
| Showroom idle mean | 13.31 ms | 12.64 ms |

R25 Groups return maximum was 29.30 ms. The original rendered below native resolution (2412×1202); R25 rendered 2560×1276 with 4× MSAA. A separate five-panel run measured entry maxima of 22.5–42.1 ms and return maxima of 22.8–71.4 ms. These are observed runs, not guaranteed display FPS or a promise of zero stutter.

Preparation is intentionally outside camera motion. Capturing the current page before return took 149–421 ms at 900×600 across the five pages. Intro work also happens before entry is enabled. If capture fails or the viewport changes, navigation uses the native DOM fallback. No FPS number from the background-throttled Brave tab was treated as a valid performance measurement.

Browser tests require Playwright resolvable by Node and Edge installed. Set `DXT_BASE_URL` to the local server; `DXT_QA_OUT` selects the stability report directory. Test instrumentation is injected only into the test browser response and is not published.
