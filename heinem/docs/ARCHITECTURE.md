# Architecture and performance

## One physical garden

The supplied 1178 × 659 reference defines the hero, and the approved 1672 × 941 concept defines the jewel cases and CD controls. Version 1.2 replaces flattened scenery masks and the section dissolve with independent image planes. Mobile repositions the portrait above the biography while preserving semantic sections and native scrolling.

The overall `#scene-world` clips the page boundary. Its hero artboard contains sky, distant foliage, middle foliage, left tree, artist, butterflies, bubble and near field. The hero does not clip or fade its contents. The continuous field starts at −10% and extends to 240% of the artboard height. Music paints above the same terrain, with no fixed replacement meadow or separate grass patch under the CDs.

A narrow, unusually tall viewport needs extra terrain beyond 240% because the hero caps at 1050 px while music can remain a full viewport tall. Mobile uses `max(240%, calc(124% + 100svh + 2px))`: the extra 24% covers the initial 10% offset and 14% parallax travel. The 600 × 1600 regression originally exposed a 382 px gap; this rule covers it without changing normal phone composition.

Environment foreground images have genuine alpha. The field's natural upper silhouette becomes fully covered lower than the prompt requested; measured placement compensates for that geometry. Its dense interior is approximately 251/255 alpha, so a solid green scene underlay remains. See [LAYER-ASSETS.md](LAYER-ASSETS.md) for exact prompts, source images, alpha bounds, dimensions and compression.

The artist uses the new original photograph's RGB. A generated alpha matte preserves the original framing; only that alpha is resampled to 506 × 1024 and combined with the original RGB. Empty margins are cropped to 414 × 920. No generated facial pixels are displayed. A static brightness/saturation adjustment supplies a modest daylight correction; the original grain and mirror imperfections remain.

A centered dorsal butterfly sprite supplies two independently hinged wings and a central body. Its flight parent drifts separately from the parallax transform. CSS motion pauses offscreen, on Low and with reduced motion.

## Native scroll and depth

`createParallax()` operates across the whole scene. Native scrolling moves objects upward; these relative offsets create depth:

| Plane | Relative offset per scroll pixel | Apparent upward speed |
| --- | ---: | ---: |
| Sky | +0.64 | 0.36 |
| Distant foliage | +0.42 | 0.58 |
| Left tree | +0.34 | 0.66 |
| Middle foliage | +0.22 | 0.78 |
| Artist | +0.08 | 0.92 |
| Bubble, desktop | +0.10 | 0.90 |
| Bubble, mobile | 0 | 1.00 |
| Continuous near field | −0.14 | 1.14 |

High/Medium settle with a 95 ms exponential response; Low applies final transforms directly. The loop runs only during scroll/settling, and geometry is measured on resize. There are no scroll-dependent opacity writes. Mobile depth zero keeps the bubble fully inside its outgoing hero at the music stop. A real residual rim was corrected geometrically rather than ignoring its continued rendering.

`createSmoothScroll()` eases vertical wheel input over real `window.scrollY`, using a 125 ms response and bounded settling. No translated virtual page wrapper exists. Native controls, nested scrolling, embeds, horizontal input, zoom and modifiers keep ownership. Pointer/touch, navigation keys including Tab/Shift+Tab, anchors, history and external scrolling cancel pending motion. Reduced motion removes interception.

After actual scenery movement, `syncBackdrop()` maps each image's rectangle, object-fit and object-position into the shader. These reads happen during scroll/resize; idle and stationary hover frames do not measure image or text layout.

## GPU typography and jelly film

### Root cause addressed

V1.1 cached glyph geometry but still wrote transforms and shadows to 307 letters. A baseline observed 4,214 copy style mutations during ten shader draws. Avoiding layout reads had not removed style/paint work, and the underline never joined the field.

V1.2 retains the original heading and paragraph HTML but rasterizes their ink after fonts/layout settle. Native text ranges supply actual wrapping, spacing and heading transforms. The underline and SVG sparkle are included. Sharp ink occupies texture R; two prefiltered glow masks occupy G/B. A single GPU sample provides all three. Prefiltering happens on rasterization, not on hover.

The native visual copy becomes transparent only after its GPU equivalent has drawn; semantic HTML remains present. No-WebGL, context loss and renderer errors show the native copy. The atlas is capped at 1.5 million RGBA pixels, a 2048 px edge and scale 2. Resize/font changes rebuild it. The copy subtree shrank from 459 to 15 descendants.

### Shared elastic mesh

One WebGL2 context, program and draw call render a bounded vertex grid. The fragment material supplies an asymmetric pillow contour, interference ribbons, clear refracted scenery and typography. No simulation render targets, screenshots or full-screen bloom chain are used. The rim is procedural; the original reference photograph is no longer sampled.

Up to six impulses retain their own touch locations. Each follows `sin(age × 13.5) × exp(−age × 3.2)` and expires after 1.8 seconds. This signed response recoils after the cursor has moved away. Speed affects capped amplitude; total displacement is bounded. The CPU supplies six uniform records, and the GPU evaluates the spatial field per vertex, avoiding six impulse evaluations at every framebuffer pixel. Contour, refraction, letters, underline and sparkle share interpolated material coordinates.

Four actual alpha scenery textures are sampled back to front with separate parallax mappings. Small lens displacement and mip levels 0.35–0.8 retain detail. High adds color dispersion. A 0.94 scene tint and prefiltered ink keyline improve white-copy contrast over clouds and flowers without blurring the scenery. Packed halos supply local LDR glow; this is not a true HDR multipass bloom implementation.

| Graphics | DPR cap | Framebuffer pixel cap | Grid cells | Backdrop max edge |
| --- | ---: | ---: | ---: | ---: |
| Low | 1.00 | 280,000 | 24 × 18 | 1,024 |
| Medium | 1.25 | 620,000 | 36 × 28 | 1,536 |
| High | 1.75 | 1,200,000 | 48 × 36 | 2,048 |

The canvas covers only the bubble. Backdrops upload at initialization, quality changes requiring new texture dimensions, or context restoration; text uploads on rasterization/restoration. Hover uploads neither. Five tiny initialization textures are distinct from the four scenery images and text atlas. Mipmaps are generated only on backdrop upload.

## Quality and lifecycle

Auto uses optional CPU/memory hints, data saving and pointer type; these are not GPU benchmarks. Manual Low/Medium/High is authoritative and persists under `heinem.graphics.v1`. Storage errors cannot block startup. Reduced motion retains a static shader while stopping impulses, parallax, wheel interpolation and decorative CSS movement.

Visibility requires intersection ratio above 0.001 with a matching threshold, excluding zero-area edge contact. The bubble, hero decorations and disc use appropriate separate visibility gates. Hidden/offscreen rendering clears old impulses and sleeps. Controllers release observers, listeners, timers, programs and textures on disposal. Final unload and back-forward-cache preservation remain distinct.

Chromium/SwiftShader checks establish behavior and work counts, not physical-device FPS. The new hover path measured zero copy mutations, geometry reads and additional texture uploads. Independent positions recoiled and settled. Exact evidence and practical limits are in [VALIDATION-1.2.md](VALIDATION-1.2.md).

## CD exchange and music transport

Three native case buttons display verified artwork. Circular order is Memories → MHA → Show. A visual state machine performs 180 ms insertion, 220 ms exchange while the CD is hidden, then 180 ms ejection. CSS supplies motion; no per-frame JavaScript exchange loop exists. The disc button translates while its inner face rotates, preserving the centered hub and rotor.

A separate requested-track index captures rapid input without queuing many animations. Reversing to the current track cancels exchange. Keyboard activation settles the selected release before interpreting play/pause. Reduced motion settles immediately, even mid-transition. Disposal clears the single timer.

Idle browsing loads no provider; paused browsing does not autoplay. Active/pending intent continues, and the provider changes only after the outgoing disc is concealed. Generation guards reject stale callbacks. Rotation requires actual provider PLAY, not a click or pending request.

The official SoundCloud widget remains the transport behind native controls. Its visible panel/footer are removed. A compact source link retains attribution and opens the verified track. Errors show a short status over the grass and retry on the CD. No audio, scraped stream URL or credential is hosted. Continuous real audio was not confirmed in this environment; deterministic media tests use mocked events.

## References and history

- [Exact asset prompts and provenance](LAYER-ASSETS.md), [v1.2 decisions](LAYERED-REVISION.md), [validation](VALIDATION-1.2.md)
- [v1.1 music concept](MEADOW-REVISION.md), retained as history; its dissolve and DOM glyph path are superseded
- Cortex: `Programming/Web3D/Performance.md`, `Rendering.md`, `Validation.md`, `Interactions.md`, `Layered-Artist-Sites.md`, and `Programming/WebQuality/README.md`
- Checkpoint Portfolio: `deimoxportfolios/src/ui/modal-material.js`, `dxrkths/src/scene/room-quality.js`, `dxrkths/docs/STABILITY-R23.md`, `braaza/src/render/quality.js`
- [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [Canvas specification](https://html.spec.whatwg.org/multipage/canvas.html)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget) and [API guide](https://developers.soundcloud.com/docs/api/guide)

The original work also inspected Figma's first-party Moving blobs shader as an optical reference; its WebGPU source is not bundled. This app owns its WebGL2 renderer. Do not import older portfolio unpack/build flows that overwrite expanded source, historical desktop FPS caps or rejected effects into this project.
