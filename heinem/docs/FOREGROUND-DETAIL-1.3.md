# Foreground detail — v1.3

Revision: **22 October 2026, America/Sao_Paulo** (23 October UTC).

The user requested substantially more resolution in the foreground while preserving the continuous meadow and its depth blur. The approved bubble and overall scene composition remain separate concerns. This record documents the selected image workflow, actual output dimensions, production loading rules and focused verification.

## Why the complete field was not simply enlarged

The existing field is `public/assets/layers/field-continuous.webp`, **1080 × 1456**, **414,856 bytes**. Its native generated PNG, `exec-1106998d-deb4-4e5a-a83a-8649a10a553a.png`, has the same dimensions and is 2,563,570 bytes. There was no larger source hidden behind the WebP.

A built-in image edit requested a complete **2160 × 2912** master. The actual output, `exec-9f1cc30c-1dd4-492c-8e90-033106f297fd.png`, was again **1080 × 1456** (2,728,646 bytes, RGBA). It added some reconstructed detail but did not increase native resolution and moved part of the planting silhouette. That candidate is not a runtime dependency. The observed output normalization in this session is recorded as a limitation of this attempt, not a universal guarantee about every image-generation mode.

## Selected method: registered crops in one physical plane

Four overlapping rectangular crops of the native field were prepared with Sharp. Each was reconstructed independently by the built-in image tool at its native output size, preserving major plants, framing, color and existing bokeh. No third-party image service, API-key workflow or CLI fallback was used.

The resulting images are drawn inside the same `.foreground` element as the original complete field. The original remains underneath. A static alpha mask derived from that original preserves the established planting silhouette, while static overlap masks blend tile boundaries. The enclosing foreground retains its single parallax transform; the detail tiles do not introduce additional depth factors, a replacement music landscape, or scroll-dependent opacity.

Integration files:

- [Loading and fallback](../src/lib/field-detail.ts)
- [Scene geometry and static masks](../src/scenery.css)
- [Markup](../index.html)
- [Focused browser regressions](../tests/browser/field.spec.ts)

## Exact crop registration

Full source dimensions: **1080 × 1456**. The normalized requests were TL `[0, 0, .55, .55]`, TR `[.45, 0, .55, .55]`, BL `[0, .45, .55, .55]`, and BR `[.45, .45, .55, .55]`. Pixel coordinates use rounding:

| Tile | Left | Top | Width | Height |
| --- | ---: | ---: | ---: | ---: |
| TL | 0 | 0 | 594 | 801 |
| TR | 486 | 0 | 594 | 801 |
| BL | 0 | 655 | 594 | 801 |
| BR | 486 | 655 | 594 | 801 |

The measured placement fractions are:

| Property | Fraction |
| --- | ---: |
| Width | 0.55 |
| Height | 0.5501373626373627 |
| Right-column left | 0.45 |
| Lower-row top | 0.4498626373626374 |

This gives **108 source pixels of horizontal overlap** and **146 pixels of vertical overlap**. The one-pixel crop rounding is retained in the layout rather than pretending the height is exactly .55.

Only extraction and encoding were performed in code. New plant detail came from image generation. A crop can be prepared with `sharp(nativeSource).extract({ left, top, width: 594, height: 801 }).png()`; the native source and its crop are inspected before submitting the corresponding prompt.

## Runtime manifest

Every selected tile is **1080 × 1457 pixels natively**, encoded directly without resizing using Sharp WebP **quality 89**, **alphaQuality 100**, **effort 6**.

| Tile | Runtime file in `public/assets/layers/` | Bytes | Native PNG source |
| --- | --- | ---: | --- |
| TL | `field-detail-tl.webp` | 382,328 | `exec-1498f917-15f1-4433-b131-9ab3c1b381d8.png` |
| TR | `field-detail-tr.webp` | 252,824 | `exec-4c3839fe-d147-4cb7-903d-5f5de3714fdd.png` |
| BL | `field-detail-bl.webp` | 653,264 | `exec-130f3da0-9f4b-48a5-851a-5eee92aabcd9.png` |
| BR | `field-detail-br.webp` | 769,442 | `exec-4167bfbd-1ce6-4946-a619-2b32df5adb5d.png` |

The native PNG sizes are 1,952,152, 1,207,879, 3,245,985 and 3,682,907 bytes respectively. Those source PNGs belong to the generation workspace; the compressed runtime images are versioned with the site.

The four WebPs total **2,057,858 bytes (~1.96 MiB)**. Including the original full-field underlay gives **2,472,714 bytes** for the field's base and optional detail resources. A quality-91 trial totaled 2,209,710 bytes; quality 89 was selected after visual inspection.

### Effective density and memory

A tile covers 594/1080 of the full width and 801/1456 of the full height. Its effective full-field density is therefore:

```text
width  = 1080 / (594 / 1080) = 1963.636...
height = 1457 / (801 / 1456) = 2648.429...
```

This corresponds to approximately **1964 × 2648**, or **3.31× the unique pixel density** of the original 1080 × 1456 field. It is a composition of native generated tiles, not a single 4K image. The four output files contain **6,294,240 pixels including overlap**; that total must not be described as unique scene coverage.

The four decoded RGBA images alone occupy about **25.18 MB (24.01 MiB)**. This excludes the underlay and browser/compositor allocations. Additional plant detail is reconstructed content, not recovery of previously photographed microscopic information.

### Alpha measurements

| Tile | Minimum encoded alpha | Maximum encoded alpha |
| --- | ---: | ---: |
| TL | 0 | 255 |
| TR | 0 | 255 |
| BL | 57 | 251 |
| BR | 218 | 250 |

The lower tiles are visually filled but are not perfectly opaque. Keeping the original meadow underneath is part of the compositing contract. The original top silhouette masks the detail group; this prevents small generated silhouette differences from expanding beyond the approved edge. Static boundary blending does not replace the field with a fade while scrolling.

## Production loading contract

The four URLs initially live in `data-field-detail`, without `src`, so hiding the group does not accidentally download them.

Detail is eligible when all of these apply:

- The viewport is at least **1000 CSS pixels wide**.
- The resolved graphics tier is **Medium or High**; Auto follows its resolved tier.
- The browser does not advertise `navigator.connection.saveData === true`.

A hidden document defers the initial load until visibility changes. The controller assigns the four URLs once, awaits decoding of every image, verifies nonzero dimensions and only then shows the complete group. A load/decode failure leaves the existing complete base field visible. It does not expose a partial arrangement.

Narrow screens, Low and data saving use the original field. Switching to Low after a successful load hides the details without issuing more requests; it does not claim to evict already downloaded browser resources. Resize, visibility, connection and quality changes re-evaluate eligibility. Destruction removes the controller listeners and prevents later display.

## Focused verification

The integrated field suite passed **3/3 browser tests** during this revision:

| Check | Confirmed behavior |
| --- | --- |
| Narrow viewport and Low | No detail requests; group remains idle/hidden; the original scene is available. |
| Desktop High and scroll | All four images decode; exactly four requests; one detail plane follows the foreground with stable relative geometry and foreground opacity 1. Switching to Low hides the group without refetching. |
| Missing tile | Aborting one tile keeps the whole detail group hidden and the complete 1080-pixel base visible. |

The separate asset-composition review decoded all images in Chromium and inspected both a whole-field comparison and overlap close-up. It retained the diagonal silhouette, major daisies, purple flower groups and intended nearest bokeh, with no hard rectangular seam, repeated band or transparent gap. Small stems can blend inside overlaps because each crop contains reconstructed detail.

These are asset/loading/continuity checks. They do not establish physical-device frame rate or battery usage. Whole-site and production verification belongs to the release's [validation record](VALIDATION.md).

## Exact generation prompts

The prompts below are verbatim, including original spacing. Each selected tile used **`transparent_background: true`** and its one matching exact crop as `referenced_image_paths`. The four crop files were inspected before the independent generation calls.

### TL

Input crop: `/tmp/heinem-v13-field-inputs/tl.png`, prepared from the source and rectangle recorded above.

```text
Use case: precise-object-edit. Asset type: photographic meadow DETAIL TILE for a production website. The supplied image is an EXACT rectangular crop of a larger approved meadow photograph. Re-render this SAME exact crop at your maximum native output resolution, ideally1080×1456 or higher at exactly the same aspect ratio594:801. Add genuinely resolved detail inside the grass blades, green leaves, tiny seed heads and daisy petals, without changing their locations. This is photographic high-resolution reconstruction, NOT a new composition, not a sharpening filter and not an upscaled blur. CRITICAL REGISTRATION: keep camera, crop framing, normalized location, size, angle and shape of every major plant/flower unchanged; NO zoom, no recenter, no camera shift. Neighboring tiles overlap this one, so keep the outer8% of all four borders especially faithful in exact placement and color, preserving every stem crossing an edge in the same place. Match original natural lime/olive-green grass, white daisies with yellow centers, sparse purple spikes and yellow wildflowers, sunshine from upper-right, shadow density and exposure. Keep photographic depth of field and only already-defocused very-near plants blurry; make existing in-focus plants finely resolved and natural, without extra halos, artificial micro-noise, extra flowers or new props. Do not invent sky, landscape, hills, trees, people, butterflies, disc, text, borders or watermarks. Preserve transparent pixels exactly where the reference is transparent; never fill empty alpha with sky or a colored background. Filled ground remains filled, with no new transparency holes. Return only this tile, not a collage or mockup.

This is the TOP LEFT crop. Preserve the large EMPTY TRANSPARENT top region and diagonal irregular grass-tip silhouette: at left the first tips occur near33% of tile height, descending to approximately66% of tile height at right. Do not move that silhouette or enlarge the plants into empty alpha. Preserve the daisy near44% width and89% height, all purple clusters and the lightly blurred stems entering from the left. The bottom edge remains dense meadow and must match the original cut.
```

### TR

Input crop: `/tmp/heinem-v13-field-inputs/tr.png`, prepared from the source and rectangle recorded above.

```text
Use case: precise-object-edit. Asset type: photographic meadow DETAIL TILE for a production website. The supplied image is an EXACT rectangular crop of a larger approved meadow photograph. Re-render this SAME exact crop at your maximum native output resolution, ideally1080×1456 or higher at exactly the same aspect ratio594:801. Add genuinely resolved detail inside the grass blades, green leaves, tiny seed heads and daisy petals, without changing their locations. This is photographic high-resolution reconstruction, NOT a new composition, not a sharpening filter and not an upscaled blur. CRITICAL REGISTRATION: keep camera, crop framing, normalized location, size, angle and shape of every major plant/flower unchanged; NO zoom, no recenter, no camera shift. Neighboring tiles overlap this one, so keep the outer8% of all four borders especially faithful in exact placement and color, preserving every stem crossing an edge in the same place. Match original natural lime/olive-green grass, white daisies with yellow centers, sparse purple spikes and yellow wildflowers, sunshine from upper-right, shadow density and exposure. Keep photographic depth of field and only already-defocused very-near plants blurry; make existing in-focus plants finely resolved and natural, without extra halos, artificial micro-noise, extra flowers or new props. Do not invent sky, landscape, hills, trees, people, butterflies, disc, text, borders or watermarks. Preserve transparent pixels exactly where the reference is transparent; never fill empty alpha with sky or a colored background. Filled ground remains filled, with no new transparency holes. Return only this tile, not a collage or mockup.

This is the TOP RIGHT crop. Most of the canvas is intentionally EMPTY TRANSPARENT: the plant silhouette begins around66% height at the left, then descends to roughly80% height at the right. Preserve those exact transparent proportions. Only the bottom quarter/third is dense finely resolved meadow. Keep the natural grass tips, lavender stems, yellow buttercups and daisy groups in the exact same positions as the crop. No zoom into the vegetation; no plant expansion into the transparent space.
```

### BL

Input crop: `/tmp/heinem-v13-field-inputs/bl.png`, prepared from the source and rectangle recorded above.

```text
Use case: precise-object-edit. Asset type: photographic meadow DETAIL TILE for a production website. The supplied image is an EXACT rectangular crop of a larger approved meadow photograph. Re-render this SAME exact crop at your maximum native output resolution, ideally1080×1456 or higher at exactly the same aspect ratio594:801. Add genuinely resolved detail inside the grass blades, green leaves, tiny seed heads and daisy petals, without changing their locations. This is photographic high-resolution reconstruction, NOT a new composition, not a sharpening filter and not an upscaled blur. CRITICAL REGISTRATION: keep camera, crop framing, normalized location, size, angle and shape of every major plant/flower unchanged; NO zoom, no recenter, no camera shift. Neighboring tiles overlap this one, so keep the outer8% of all four borders especially faithful in exact placement and color, preserving every stem crossing an edge in the same place. Match original natural lime/olive-green grass, white daisies with yellow centers, sparse purple spikes and yellow wildflowers, sunshine from upper-right, shadow density and exposure. Keep photographic depth of field and only already-defocused very-near plants blurry; make existing in-focus plants finely resolved and natural, without extra halos, artificial micro-noise, extra flowers or new props. Do not invent sky, landscape, hills, trees, people, butterflies, disc, text, borders or watermarks. Preserve transparent pixels exactly where the reference is transparent; never fill empty alpha with sky or a colored background. Filled ground remains filled, with no new transparency holes. Return only this tile, not a collage or mockup.

This is the BOTTOM LEFT crop. The canvas is entirely filled by continuous meadow. Preserve the large optically defocused nearest daisy at left around69% height and soft nearest green stems at the lower edge; those elements intentionally remain bokeh. The clear plants toward top/right and the midground blades and purple flowers must receive much higher resolved detail. Keep the original soft-to-sharp depth transition and exact composition. Every edge is filled with meadow, no transparent backdrop or edge vignette.
```

### BR

Input crop: `/tmp/heinem-v13-field-inputs/br.png`, prepared from the source and rectangle recorded above.

```text
Use case: precise-object-edit. Asset type: photographic meadow DETAIL TILE for a production website. The supplied image is an EXACT rectangular crop of a larger approved meadow photograph. Re-render this SAME exact crop at your maximum native output resolution, ideally1080×1456 or higher at exactly the same aspect ratio594:801. Add genuinely resolved detail inside the grass blades, green leaves, tiny seed heads and daisy petals, without changing their locations. This is photographic high-resolution reconstruction, NOT a new composition, not a sharpening filter and not an upscaled blur. CRITICAL REGISTRATION: keep camera, crop framing, normalized location, size, angle and shape of every major plant/flower unchanged; NO zoom, no recenter, no camera shift. Neighboring tiles overlap this one, so keep the outer8% of all four borders especially faithful in exact placement and color, preserving every stem crossing an edge in the same place. Match original natural lime/olive-green grass, white daisies with yellow centers, sparse purple spikes and yellow wildflowers, sunshine from upper-right, shadow density and exposure. Keep photographic depth of field and only already-defocused very-near plants blurry; make existing in-focus plants finely resolved and natural, without extra halos, artificial micro-noise, extra flowers or new props. Do not invent sky, landscape, hills, trees, people, butterflies, disc, text, borders or watermarks. Preserve transparent pixels exactly where the reference is transparent; never fill empty alpha with sky or a colored background. Filled ground remains filled, with no new transparency holes. Return only this tile, not a collage or mockup.

This is the BOTTOM RIGHT crop. The canvas is filled by continuous meadow, with dense clear grass blades, white daisies, tiny seed heads and purple flowers. Preserve the prominent daisy around58% width and24% height, and the large near-bottom-right daisy around83% width and75% height in exactly the same positions. Keep the soft very-near lower-left bokeh, while reconstructing crisp fine detail throughout the in-focus upper/middle region. Every edge must remain filled with meadow, without a new horizon or transparent cutout.
```

## Rejected complete-field request

Input: native `exec-1106998d-deb4-4e5a-a83a-8649a10a553a.png`; `transparent_background: true`. Actual output stayed 1080 × 1456 and was not shipped.

```text
Use case: precise-object-edit. Asset type: production high-resolution RGBA meadow photograph for a continuous webpage parallax layer. The provided image is the EDIT TARGET. Upgrade this exact image to a genuinely higher-resolution detailed master, TARGET EXACTLY 2160 pixels wide × 2912 pixels high (same aspect ratio and identical normalized composition); request maximum native output resolution. Preserve its current placement of the meadow, diagonal natural planting silhouette, every major flower group, daylight colors, camera perspective and continuous full field down to the bottom. Preserve the genuinely transparent upper region and natural individual-blade alpha edge. The top silhouette starts at approximately 18% height on the left, 35% in center, and43% on right, just as the target. The scene is lush sunlit green grasses with white daisies, some purple wildflowers and sparse yellow buttercups. Add optically resolved fine detail to grass blades, leaf veins and flower petals throughout the field, especially the center and lower right, so this is an authentic high-resolution image, NOT merely sharpened low-resolution pixels. Keep only the very nearest left/bottom foreground bokeh softly out of focus, with crisp in-focus plants behind it. Maintain photographic natural textures, no AI-smear, no plastic leaves, no oversharpening outlines, no noise texture. Keep the whole middle and bottom fully opaque meadow reaching every side and bottom edge. No horizon, sky, background scene, people, trees, butterfly, text, UI, discs, logo or new props. No new framing or border. High resolution is the purpose of this edit; keep all other compositional choices stable. Transparent background alpha above the vegetation only, no baked checkerboard or black/white matte.
```

