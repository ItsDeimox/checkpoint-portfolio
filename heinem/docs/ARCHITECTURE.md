# Architecture and performance

## The composition is the starting point

The user's flattened 1178 × 659 reference defines layout, color and identity. Desktop uses a shared scene coordinate system with an aspect ratio of 1178/659 and cover framing. Text and navigation remain HTML. Mobile intentionally recomposes the portrait above the biography, preserving legibility instead of horizontally cropping away the artist or text.

The original source is losslessly encoded as `reference-original.webp`. `portrait-layer.webp` is **only a CSS alpha mask**: its generated facial pixels are never displayed. The displayed face and hoodie come from the original source. Original landscape and sky plates use a static SVG mask to remove embedded interface text, the old bubble and duplicated butterflies; the same portrait alpha removes a duplicate person from those background plates. Reconstructed scenery fills the now-visible holes. Foreground grass is a separately reconstructed transparent image. A mirrored overscan below its original bounds fills the exposed area during upward motion; the extra element reuses the already loaded texture.

This cannot recover the exact unseen scenery from a flattened image. The project preserves original visible pixels where possible and records reconstruction honestly; visual resemblance is not a claim of pixel-identical hidden material.

## Depth and native scrolling

`createParallax()` listens passively to scroll, never prevents wheel/touch events and never replaces document scrolling. It applies only transform offsets within the hero. These offsets are relative to the normally scrolling document:

| Plane | Relative offset per scroll pixel | Apparent travel upward |
| --- | ---: | ---: |
| Sky | +0.64 | 0.36 |
| Distant landscape | +0.36 | 0.64 |
| Portrait | +0.12 | 0.88 |
| Bubble | +0.10 | 0.90 |
| Foreground grass | −0.32 | 1.32 |

High/Medium settle using exponential time-based smoothing. Low preserves the same final composition and skips extra settling frames. Geometry is measured on resize; there is no permanent parallax animation loop at rest. After transform writes, `syncBackdrop()` updates the bubble's UV mapping. Reading those rectangles can cause a layout flush, so it happens during actual movement rather than on every idle shader frame.

## Soap-film rendering

`createBubble(canvas, host, options)` owns one WebGL2 context, one shader program, one triangle and two static textures: the shared scene image and a small original-rim strip. No general-purpose 3D engine, simulation render targets, full-screen bloom or depth-of-field pipeline is used.

The fragment shader starts with a rounded rectangular signed-distance field and bends its sides inward. Low-amplitude temporal warping keeps the film alive. A local Gaussian pointer field dents the contour; frame-rate-independent smoothing controls its entry and relaxation. Thin-film colors and spatially varying reflection bands provide the complete procedural fallback. `fwidth` supplies antialiasing without an expensive full-scene MSAA chain.

For fidelity to the supplied artwork, the optional `rim` source preserves its actual white microfolds and iridescent threads. A fixed contour mask extracts only the peripheral band into a 580 × 442 transparent canvas once; the biography, heading and original signature area are explicitly cleared before upload. A soft diagonal exclusion removes portrait pixels that overlap the left lower border. The shader warps this band with time and the smoothed pointer, then composites it over the procedural film. Text remains native HTML and the interior remains a newly refracted scene. This is a hybrid material, not a claim that every optical crease is generated procedurally. The small masked source is retained for context restoration; neither masking nor uploads run per animation frame.

Background and sky share one uploaded image. Their distinct transforms, `object-fit` and crop are mapped separately. The sky's 42%–63% mask is recombined in texture space before refraction. Static mipmaps provide cheap optical softness; they are built only when the image is uploaded. High adds subtle RGB dispersion; lower profiles use fewer optical samples. Safe denominators, nonnegative power bases and normalized/clamped input avoid NaNs.

### Raster budgets

| Mode | Maximum DPR | Maximum canvas pixels | Maximum edge |
| --- | ---: | ---: | ---: |
| Low | 0.90 | 260,000 | 1,000 |
| Medium | 1.25 | 620,000 | 1,440 |
| High | 1.75 | 1,200,000 | 2,048 |

The local canvas is limited to the bubble bounds, not the whole viewport. The two image uploads occur on initial readiness and context restoration, not per frame or quality change. WebGL telemetry also counts two tiny 1 × 1 initialization placeholders; those are distinct from the scene and rim images. Only the scene image needs mipmaps. A static CSS glass surface remains if WebGL is unavailable or lost. Context restoration rebuilds only this surface.

## Quality and lifecycle

Auto chooses an initial budget from data-saving mode, optional memory/CPU hints and coarse pointer. These hints are not a GPU benchmark. No FPS claim or adaptive hardware ranking is inferred from them. Missing optional values are treated as unknown. Manual Low/Medium/High is authoritative and persists under `heinem.graphics.v1`; storage exceptions cannot prevent startup.

Reduced motion is independent of fidelity: the page keeps a static shader render, stops parallax and disables decorative CSS motion. `IntersectionObserver`, `visibilitychange` and page lifecycle events pause hidden/offscreen work. Renderer, parallax, quality and player controllers each expose `destroy()` and release observers, listeners, timers and graphics resources. Back-forward cache preservation is treated separately from a final unload.

## SoundCloud CD

The only external runtime dependency is the official SoundCloud Widget API, injected after the first playback gesture. The visible official iframe is retained for browser policies and provider errors. The disc state follows provider `PLAY`, `PAUSE`, `FINISH` and progress events. A generation counter ignores stale callbacks when switching tracks. Timeouts and explicit error states expose a retry and external track link; the UI does not invent playback.

Albums are real artist artwork. No audio file, scraped stream URL or provider token is stored. Contact leads to the verified artist Instagram because no professional email was verified.

## Reference work

- Cortex, reviewed at `abf2a5fcc02f46ad68659cd3dc30b82555cd1788`: `Programming/Web3D/Performance.md`, `Rendering.md`, `Validation.md`, `Interactions.md`, `DXRKTHS-2026-10-19.md`, and `Programming/WebQuality/README.md`.
- Checkpoint Portfolio, reviewed at `1324faa04a145beb2e76729d16988eb9cc58bb71`: `deimoxportfolios/src/ui/modal-material.js`, `dxrkths/src/scene/room-quality.js`, `dxrkths/src/scene/panel-energy-field.js`, `dxrkths/docs/STABILITY-R23.md`, and `braaza/src/render/quality.js`.
- Figma first-party **Moving blobs**, ID `2e7f7880-a499-458f-8739-62f3ae9e4a01`, version `a9ca4f6c349e5eb414cb73995b201876304acf36`, inspected as an optical/distortion reference. Its WebGPU source is not bundled; this site uses an original WebGL2 shader.
- [WebGL best practices — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [Page Visibility API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget)

Avoid importing the portfolio's frozen-source unpack/build workflow into a new project: that workflow can overwrite expanded source. Also avoid historical DXRKTHS fixed desktop FPS caps and rejected Prism Trails. Preserve the approved visual identity and remove inactive work first.
