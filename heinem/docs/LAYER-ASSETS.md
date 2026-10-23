# Production scene layers — v1.3

## Current revision

The current scene retains the seven independent base assets introduced in v1.2 and adds four optional detail tiles inside the existing foreground plane. The user selected the earlier **brighter generated portrait** to replace the warmer original-photo version. The current portrait therefore uses reconstructed RGB; the v1.2 original-RGB statement below is historical and does not describe v1.3.

The built-in image tool produced the new field detail, and Sharp prepared exact reference crops and encoded the outputs. No external generation service, API key, or CLI fallback was used. Full prompts, actual output sizes, crop registration, loading limits and focused tests are preserved in [FOREGROUND-DETAIL-1.3.md](FOREGROUND-DETAIL-1.3.md).

### Current runtime files

| File in `public/assets/layers/` | Dimensions | Bytes | Role |
| --- | ---: | ---: | --- |
| `sky.webp` | 1672 × 941 | 103,860 | Independent sky plate; unchanged bitmap. |
| `tree-left.webp` | 1672 × 941 | 242,914 | Left canopy with alpha; unchanged. |
| `foliage-far.webp` | 1672 × 941 | 268,748 | Distant terrain with alpha; unchanged. |
| `foliage-mid.webp` | 1672 × 941 | 442,644 | Intermediate meadow with alpha; unchanged. |
| `field-continuous.webp` | 1080 × 1456 | 414,856 | Complete continuous field and permanent underlay. |
| `artist-light.webp` | 802 × 1774 | 291,154 | Brighter reconstructed portrait chosen by the user. |
| `butterfly.webp` | 192 × 192 | 18,360 | Existing animated sprite; unchanged. |
| `field-detail-tl.webp` | 1080 × 1457 | 382,328 | Optional upper-left field detail. |
| `field-detail-tr.webp` | 1080 × 1457 | 252,824 | Optional upper-right field detail. |
| `field-detail-bl.webp` | 1080 × 1457 | 653,264 | Optional lower-left field detail. |
| `field-detail-br.webp` | 1080 × 1457 | 769,442 | Optional lower-right field detail. |

The seven base assets total **1,782,536 bytes**. The four optional tiles add **2,057,858 bytes**, making **3,840,394 bytes** if every scene resource is loaded. This excludes covers, CD material, fonts and the social preview. Only the sky lacks an alpha channel.

The four tiles represent approximately **1964 × 2648 effective full-field density**, about **3.31×** the original field's unique pixel density. They are native reconstructed crops with overlap, not an upscaled single bitmap or a 4K file. They load only at viewport width ≥1000 px with resolved Medium/High graphics and no advertised data-saving preference. All four decode before being shown; failure keeps the complete underlay visible. Mobile and Low retain the base field. Static alpha/boundary masks preserve continuity, while all tiles share the foreground's one physical parallax transform. See the detailed record for memory, alpha and reconstruction limits.

### Brighter portrait selected for v1.3

The selected source is `generated_images/exec-bbc57ac2-ed6d-4111-9d4b-1d0d7080e545.png`, **882 × 1784**. It was generated from the supplied mirror selfie during the v1.2 asset exploration and retained the photographed pose/phone with a brighter daylight treatment. It also reconstructed facial and clothing detail, which was why v1.2 used the separate original-RGB workflow instead. The user's next feedback explicitly selected the clearer/brighter version over the yellow-toned one.

Preparation for the current `artist-light.webp`:

1. Crop the selected source at **left 47, top 10, width 802, height 1774**, retaining its alpha.
2. Encode directly at **802 × 1774**, WebP **quality 94**, **alphaQuality 100**, **effort 6**; no source enlargement is involved.
3. Reference that new file in the page and preload. The displayed RGB comes from the reconstructed candidate, not from the original photograph or a matte-only composite.

The former `public/assets/layers/artist.webp` (**414 × 920**, **89,976 bytes**) has moved to [docs/reference/artist-photo-v1.2.webp](reference/artist-photo-v1.2.webp), retaining the original-RGB result for history while removing it from public runtime assets. The exact prompt for the currently selected brighter source remains in the portrait candidate history below.

The user's supplied photograph, likeness, branding, original reference and third-party artwork retain their respective rights. The MIT license covers the project code; it does not automatically license those identities or source works. Generated reconstruction is recorded explicitly rather than described as unchanged source pixels.

## Historical baseline — v1.2

The following records preserve the v1.2 asset choices, measurements, prompts and visual review. Paths and present-tense implementation descriptions in this historical section refer to that release. In particular, `artist.webp` and the claim of original-photo RGB apply to v1.2; the current portrait and optional field detail are documented above. The old reference paths identify generation inputs; `reference-original.webp` now lives at `docs/reference/hero-original.webp`, and superseded music-meadow files are available in Git history.

These are production bitmap assets for the continuous meadow scene. They replace the flattened hero photograph and the unrelated lower-section meadow/foreground patch. The environments and butterfly were generated with the built-in image generation tool, then encoded to WebP locally. The artist uses the actual original photograph RGB with a generated segmentation matte; no generated face is shipped. No external image-generation service or API key was used.

### Inputs and ownership

- `public/assets/reference-original.webp`: user-approved hero identity, layout, foliage palette, lighting, and photographic style. This image is a visual reference, not a runtime background after the layer integration.
- `public/assets/music-meadow.webp`: supporting reference for the lower meadow's grass and wildflower treatment.
- `docs/reference/music-approved.webp`: approved physical jewel-case composition; the new terrain does not redesign those cases.
- The original artist photograph was provided by the user in this conversation. It is used only to prepare the artist cutout; generated environments contain no person.

The environments are synthesized layers matching the reference style. Hidden background content had to be reconstructed. They are not claimed to be a pixel-exact decomposition of the flattened original. The artist RGB is derived from the supplied photograph; the alpha matte only determines which original pixels are visible. The original artist photograph, photographic reference, and existing third-party cover artwork retain their original rights; the project's MIT license does not transfer those rights. The user supplied the photograph for this site; do not describe the person's likeness or the supplied photography as newly generated or covered automatically by the code license.

### Runtime files

| File in `public/assets/layers/` | Encoded dimensions | Bytes | Alpha | Intended role |
| --- | ---: | ---: | --- | --- |
| `sky.webp` | 1672 × 941 | 103,860 | No | Complete sky plate behind every other layer. |
| `tree-left.webp` | 1672 × 941 | 242,914 | Yes | Upper-left canopy and left-edge tree, with real gaps between leaves. |
| `foliage-far.webp` | 1672 × 941 | 268,748 | Yes | Far hills, lake, atmospheric skyline, and treeline. |
| `foliage-mid.webp` | 1672 × 941 | 442,644 | Yes | Intermediate flower/grass bank behind the artist. |
| `field-continuous.webp` | 1080 × 1456 | 414,856 | Yes | One uninterrupted tall field spanning the hero and music section. |
| `artist.webp` | 414 × 920 | 89,976 | Yes | Original photograph RGB with a source-aligned segmentation matte. |
| `butterfly.webp` | 192 × 192 | 18,360 | Yes | One symmetric butterfly sprite, animated as separate left/right wings and body. |

The seven runtime layers total **1,581,358 bytes**; the five environments account for **1,473,022 bytes**. The continuous field retains the image generator's native dimensions; it is not enlarged to manufacture additional detail or decoded texture memory. The scene layout controls its displayed size. The other four outputs were generated at their final encoded dimensions.

Encoding used Sharp WebP, quality 82 (sky/far/field), 83 (tree/mid), 94 (artist), or 87 (butterfly), alpha quality 100, and effort 6. Environment alpha was preserved; the artist matte and butterfly are resized for their final outputs as detailed below. The generator's visually opaque regions commonly have alpha values around 250–253 rather than 255, so the scene supplies a solid underlying color. There is no drawn checkerboard.

### Geometry and compositing contract

The sky, tree, far vegetation, and intermediate vegetation share a 1672 × 941 canvas. They can be translated independently without moving an image-sized rectangular background with them. Natural foliage silhouettes supply the edge transparency; CSS section masks are not required to hide rectangular cuts.

The continuous field is a tall, single image. Its native aspect ratio is 1080 / 1456; display it across the same scene width without cropping it into a separate music background. The lower field remains continuous to its bottom edge and contains no second skyline, repeated strip, or mirrored band.

Measured first alpha ≥ 128 in representative field columns:

| Horizontal position | Native x | First y | y at a 1672 px display width |
| --- | ---: | ---: | ---: |
| Left | 0 | 279 | 432 |
| 10% | 108 | 338 | 523 |
| 25% | 270 | 419 | 649 |
| Center | 540 | 559 | 866 |
| 75% | 809 | 634 | 982 |
| 90% | 971 | 634 | 982 |
| Right | 1079 | 650 | 1006 |

The first completely covered row (every pixel alpha ≥ 240) is native y = 666. Below that, the field covers the full width continuously. The upper silhouette falls farther down on the right than the requested prompt coordinates; this is recorded rather than represented as exact prompt adherence. The intermediate vegetation fills the space behind it. The integration positions `.foreground` at `top: -10%` with a height of `240%` of the hero board. This is physical overscan: it moves the continuous image high enough to cover the intermediate layer's lower edge while preserving additional terrain below. It does not apply an opacity fade or a section mask. The sampled desktop/mobile scroll positions were inspected after this placement was active.

The tree has nontrivial alpha through x = 910 at its widest top extent and along the left edge to the bottom of its canvas. The far foliage begins at y = 421; the intermediate foliage's highest left tips begin at y = 309. These are real measurements of the selected outputs, not assumed prompt targets.

### Generation provenance

The generated source PNGs remain in the session's `generated_images` directory. Runtime WebP copies are committed with the app. Source identifiers are recorded so the exact chosen outputs can be traced without shipping large PNGs to every visitor.

| Runtime asset | Generated source identifier |
| --- | --- |
| Sky | `exec-629d9d12-8d47-4d48-bc73-5d8b970b8136.png` |
| Tree | `exec-925ba1e4-ba06-4f18-a166-06d9b03605ce.png` |
| Far foliage | `exec-3dc207a6-66a8-4122-969b-e527a98c1310.png` |
| Intermediate foliage | `exec-b9fae11f-178d-4ddb-a46e-9e649e7cbdcd.png` |
| Continuous field | `exec-1106998d-deb4-4e5a-a83a-8649a10a553a.png` |
| Artist matte only | `exec-a188d6c4-0709-45a0-ac4d-eb44b43c6230.png` |
| Butterfly | `exec-b6a1e153-f5d1-480e-8991-62a448acde35.png` |

Two initial full-RGB artist candidates, `exec-c0a704bd-fee1-41a6-8f31-6afeba57e02a.png` and `exec-bbc57ac2-ed6d-4111-9d4b-1d0d7080e545.png`, retained the original pose/phone but visibly regenerated facial and clothing detail. Both were discarded for the v1.2 release. That release used only the alpha from the later source-aligned matte and the actual photograph RGB. In v1.3 the user selected the brighter `exec-bbc57ac2-ed6d-4111-9d4b-1d0d7080e545.png` candidate; it is now the source of `artist-light.webp`, as recorded in the current section above. The other candidate remains unused.

### Original-photo cutout and butterfly preparation

The original upload is **506 × 1024** pixels. The segmentation request emphasized identical normalized framing rather than a tight new composition. Its generated output is **882 × 1784**. The prompt stated 505 px for the source width; the actual file measurement 506 px is authoritative for processing.

The deterministic preparation was:

1. Extract only the generated image's alpha channel and resample that matte to the measured original 506 × 1024 canvas. No generated RGB is retained.
2. Join that alpha to the actual original photograph RGB. Zero RGB for fully transparent pixels so invisible background colors cannot bleed through filtering at the silhouette.
3. Remove transparent margins using the recorded crop: left 54, top 104, width 414, height 920. The lower edge remains the original photograph's crop; no legs or other hidden anatomy were generated.
4. Encode as WebP quality 94, alpha quality 100, effort 6. This is lossy compression of source-derived RGB, so the encoded pixels are not claimed to be byte-identical to the upload. Face geometry, expression, clothing, phone and original photographic detail come from the actual photo.
5. Apply only the scene's CSS `brightness(1.12) saturate(.82)` for daylight balance. This changes displayed color, not the person's shape or identity.

The butterfly source is 1254 × 1254 RGBA. It is downsampled to 192 × 192 and encoded at quality 87 / alpha 100. One centered dorsal sprite supplies the left-wing, right-wing and body views; CSS clips those views around the same 50% hinge and animates wing rotation. There is no frame-by-frame image regeneration or texture upload.

### Exact selected prompt set

#### Sky

Reference: `reference-original.webp`. Transparent background: **false**.

> Use case: background-extraction. Asset type: sky-only background plate for a production layered-parallax artist website. Input image is the approved composition reference; extract its visual language and sky placement only. Create one clean 16:9 landscape image, ideally 1672×941 pixels, consisting ONLY of the beautiful blue daytime sky and soft detailed white cumulus clouds in the reference, with the same cyan-blue atmospheric palette, photographic dreamy summer sunlight from upper right. Reconstruct sky seamlessly behind the removed objects all the way to every edge of the frame. Keep delicate clouds at the right and top, slightly lighter haze toward the bottom. Remove EVERY other element completely: no person, tree, leaves, grass, hill, city, bubble, butterflies, letters, logo, black UI label, line, UI, or watermark. This is only the sky layer to sit behind several independent transparent layers; not a finished webpage or concept art. No dark vignette. Full opaque RGB background. Preserve the original photographic texture and natural color.

#### Tree

Reference: `reference-original.webp`. Transparent background: **true**.

> Use case: background-extraction. Asset type: isolated upper-left tree canopy for a production parallax website. Input image is the approved website visual; preserve its exact photographic summer style and geometry. Produce ONE 16:9 1672×941 transparent PNG layer containing ONLY the lush sunlit green tree branches and leaves that enter from the upper LEFT, with a dark partial trunk hugging the left boundary. Tree should occupy the left 0–26% of width substantially, extend as sparse natural overhanging leaves from upper-left to about 46% of width along the top, and trail down the left edge to about 58% height. Entire right half and bottom 40% must be completely transparent. Keep intricate real small leaf silhouettes, airy natural gaps with genuine alpha, warm backlighting and rich darkgreen shadows as reference. No sky color baked into any gaps or edges; no blue/white halo. Reconstruct leaves naturally where artist or logo blocked them, no exact need to retain UI covered pixels. Remove person, grass, flowers, hills, city, bubble, letters, logos, black label, insects, and all other elements. This is only one compositing layer, not a scene. TRUE TRANSPARENT background, not checkerboard imagery, no cast ground shadow, no text or watermark.

#### Far foliage

References: `reference-original.webp`, `music-meadow.webp`. Transparent background: **true**.

> Use case: background-extraction. Asset type: distant landscape/foliage layer with genuine transparency for a layered parallax website. Image 1 is approved hero composition for geometry and color. Image 2 is meadow style supporting reference. Produce ONE landscape canvas at 1672×941: isolate and rebuild ONLY the most distant treeline, atmospheric low green hills, faint distant city and bright lake/valley that appear behind the meadow in the approved hero. Keep the top of this low far landscape at about 54% of image height on the left, about 61% center, and 55% right (roughly y500–570). Absolutely everything ABOVE this irregular tree/hill horizon is genuine alpha transparency. From the horizon downward, a layer of distant bluish olive-green tree crowns and faint slopes fills the lower canvas all the way to bottom edge, continuing naturally behind areas formerly hidden by artist/bubble so there are no object-shaped holes. Keep foliage small scale and softly atmospheric as viewed from a hilltop, with muted contrast; detailed photorealistic distant leaves, no huge near leaves. NO separate foreground/meadow/flowers, NO tree overhang, NO sky, NO artist, NO bubble, NO text, logo, UI, blacklabel, butterflies or discs. This layer is for compositing; natural canopy-shaped upper alpha edge, no straight rectangular band, no blurred feather seam, no blue/white skyline halo. Summer light consistent with reference, right side glow. Transparent top 50%, opaque terrain at bottom.

#### Intermediate foliage

References: `reference-original.webp`, `music-meadow.webp`. Transparent background: **true**.

> Use case: background-extraction. Asset type: intermediate meadow vegetation layer, RGBA parallax production asset. Input image 1 approved artist hero fixes geometry and palette; image 2 fixes meadow/flower photographic style. Create ONE 16:9 canvas ideally 1672×941 containing a gently sloping belt of lush meadow vegetation behind the artist. Only small-to-medium grass stems, white wild daisies, sparse yellow buttercups and purple wildflowers, natural mixed greens in warm sunny light. Entire upper 50% fully transparent. Irregular thin grass and flower tips reach to around y490 at left, y560 in center, y600 at right. Dense continuous intermediate meadow fills lower portion from y670 down to bottom, going to all left/right/bottom edges. It should be in mid-distance: blades not huge, flowers relatively small, deeper crisp focus than the eventual blurred near foreground, not bokeh. Bottom must be fully opaque meadow, not an isolated strip with transparent bottom. Reconstruct behind the removed person and bubble so there are NO person/bubble-shaped gaps. The far skyline, trees, hill, lake and sky are separate layers so exclude ALL of those. Exclude tree canopy, people, butterflies, text, logo, UI, discs. True alpha above natural grass and flower silhouette only, no straight cut edge, no white outlines, no premultiplied sky color. Consistent leafy photographic style and sunlight as reference. This is only one transparent compositing layer, not a full website mockup.

#### Continuous field

References: `reference-original.webp`, `music-meadow.webp`. Transparent background: **true**.

> Use case: compositing. Asset type: ONE vertically extended meadow field RGBA image for physical webpage parallax, NOT a concept art or UI. Reference image 1 is original artist hero for palette and top-edge planting shape; reference image 2 is the approved lower meadow scene for grass/flower style. Create a TALL PORTRAIT CANVAS, ideally EXACTLY 1672 pixels wide by 2256 pixels high, approximately 3:4. This is a single long continuous plantation of green meadow grass that will span over two screens, viewed obliquely from standing eye level down toward nearby ground. TOP EDGE GEOMETRY IS CRITICAL: leave the upper canvas TRANSPARENT; the highest grass tips begin at x0 left around y430; tip height slopes DOWN to around y590 in center and around y750 on the right. That is about19% of TOTAL tall height at left,26% center,33% right. The first 420 vertical pixels must be empty alpha everywhere. Between those tips and y900, individual near grass stems and occasional white daisy / purple wildflower have genuine transparent gaps. By y900 (40% total height) the meadow is FULLY OPAQUE edge to edge. From y900 all the way to bottom y2256, it is CONTINUOUS full grass ground, with NO transparent gaps, NO second horizon, NO bands, NO collage, NO mirror, NO section break. Rich lush mixed green grass blades; white daisies and sparse purple/yellow wildflowers, same dreamy photorealistic sunlit summer identity. At top-left tips, nearer blades are softly optically out of focus like original foreground. Gradually closer ground details continue down the entire tall canvas; bottom field should still be visually usable medium-detail grass, avoid a giant uniform blur or giant flowers. Keep center/lower-center somewhat calm green so white music type will be readable over it. Light from upper right, natural small leaf highlights. NO sky, tree canopy, distant hills, skyline, water, butterflies, humans, discs, UI, letters, logos or any other objects. Do not add a pedestal or a grass patch with side boundaries. Meadow must reach all side edges from y900 down, and the bottom edge is full terrain. Only upper irregular silhouette is transparent. True alpha background. This image will be used exactly as one continuous tall layer behind CDs during scrolling.

#### Artist segmentation matte

Edit target: original user-uploaded photo. Transparent background: **true**. Only the returned alpha is used in the final asset.

> Use case: background-extraction.
>
> EDIT TARGET: original uploaded photo. Perform ONLY background removal. Do not regenerate, reinterpret, beautify, relight, reconstruct or sharpen the man. Preserve original photo pixels, grain, glasses, face, expression, hair, hoodie, phone, backpack, pants and pose. Most importantly PRESERVE THE EXACT ORIGINAL CANVAS FRAMING AND SUBJECT POSITION: source is 505 pixels wide by 1024 high, use identical 505:1024 aspect and same normalized pixel positions; empty top margin remains 10.8% of image, hair starts at about x40%,y10.8%, headphones span x38.5% to73.8%, feet remain cropped below frame, left edge of backpack at x11.5%. DO NOT tightly recrop, enlarge or recenter the person, DO NOT outpaint any part of body. Original subject bounding-box roughly x11.5%..92%, y10.8%..100%. Replace wood door, handle and background with actual alpha transparency, including fine gaps around hair and clothes. The exact original room lighting and photographic imperfections stay intact on the person. This is a precise segmentation alpha matte used aligned over the original photo, so identical pose/edges/framing are essential. No added object, no border, no drop shadow, no text. Return the original photo with only its background made fully transparent.

#### Butterfly

Reference: `reference-original.webp`. Transparent background: **true**.

> Use case: background-extraction / precise-object-edit.
>
> Asset type: one transparent butterfly sprite for a lightweight animated website.
>
> Input image is the visual STYLE REFERENCE for the small violet butterflies around HEINEM. Create a single complete realistic purple butterfly matching those lavender/violet butterflies, isolated with true alpha transparency. Show the butterfly in straight dorsal view from above, body perfectly vertical through the exact horizontal center of a square canvas, head up, both wings fully and symmetrically spread. All four wings, antennae and fine purple/black wing veins intact. Left and right wings meet at the middle body so each half can rotate independently around a central hinge in CSS. Body should stay exactly at x=50%; pair of antennae centered. Photographic, lightly translucent violet and lavender wings with darker deep purple outer edges and soft pale speckling, sunny soft daylight as reference. Tight framing, butterfly occupies 86 percent of square height and 88 percent width with safe transparent margin. It must be a clean stand-alone butterfly sprite, not the meadow, not the portrait, not the bubble, not a concept art or UI screenshot, no sheet, no multiple poses, no drop shadow, no words, no border. Transparent RGBA square image.

### Discarded full-RGB portrait prompts

#### Candidate `exec-bbc57ac2-ed6d-4111-9d4b-1d0d7080e545.png`

Original photo edit target; transparent background true. Discarded in v1.2 because facial details were re-rendered; selected as the brighter portrait at the user's request in v1.3. Its reconstructed RGB is now displayed.

> Use case: background-extraction / identity-preserve.
>
> Asset type: actual transparent foreground portrait layer for the HEINEM artist website, not a concept art.
>
> Input image 1 is the EDIT TARGET: the supplied original mirror selfie. Isolate only this exact young man from the photo on a fully transparent background. Preserve his actual recognizable face, curly hair, glasses, black headphones, mustache/beard, white hoodie, black backpack, black pants, hand positions, phone, body proportions, and photographed pose faithfully. Do not invent a new person or a different facial expression. Carefully extract fine curly hair and clothing edges. Remove the wooden door, mirror dirt/reflections on empty background, handle and all background pixels, leaving genuine alpha transparency. Keep skin natural, make only a subtle soft daylight white balance to remove the yellow room cast, with gentle cool outdoor fill; do not retouch face shapes. Keep the same three-quarter body crop from hair to below thighs, lower pants can continue to canvas edge. Tight portrait canvas with 4% transparent margin around left/right and hair, entire headphones and backpack intact. High quality clean photographic cutout, clear sharp eyes and clothing texture, no heavy glow, no grass, no shadows cast on backdrop, no background, no labels or text. Transparent RGBA output.

#### Candidate `exec-c0a704bd-fee1-41a6-8f31-6afeba57e02a.png`

Original photo edit target; transparent background true. Discarded for the same reason.

> Use case: background-extraction, identity-preserve. Asset type: faithful isolated artist photographic cutout for a layered website. The attached image is the ORIGINAL photo of the artist and is the edit target. Precisely remove only the wooden room background, door handle, and mirror smudges that are outside the person. Preserve the SAME human identity, face, subtle facial expression, face geometry, curly hair silhouette and fine flyaways, eyeglasses, black headphones, beard, every visible item of the light gray hoodie, dark pants, black backpack and straps, original hand positions, and the phone held in the right hand. Keep the exact original stance, body proportions, clothing folds, and face direction. DO NOT change pose, DO NOT remove phone, DO NOT beautify or replace face, DO NOT invent feet or hidden limbs, DO NOT redesign headphones or clothing. Output the full visible head-to-cropped-lower-leg person exactly as photographed, centered in a tall tightly framed transparent canvas with a small margin around all edges, roughly 700×1400 or higher resolution. Remove the warm wood-color spill at edge only, use a very subtle neutral daylight balance that does not change facial appearance; do not add scenery, shadows, bubbles, flora or effects. The face must remain readily identifiable as this SAME person. Genuine transparent alpha outside the person, clean hair edges, not a checkerboard background. No text or watermark.

### Asset validation

- Inspected the original user photo, flattened hero, music concept, and meadow reference before generation.
- Inspected all generated outputs visually, including transparent silhouettes.
- Decoded every runtime WebP and measured dimensions, byte size, alpha occupancy, and field coverage; verified that non-sky assets contain genuine alpha.
- Composited the sky, far foliage, intermediate foliage, and tree for a visual edge check. The bright edge colors visible against the tool's transparent preview did not produce colored rectangular halos when composited on the intended sky.
- Inspected 12 actual browser captures: 1672 × 941 at hero scroll fractions 0, .15, .3, .5, .8, 1; 390 × 844 and 320 × 780 at 0, .5, 1. The final `top:-10%` field placement was active. No exposed rectangular seam, uncovered strip, extra CD grass patch, or bottom gap was visible.
- Measured foreground opacity 1 and CSS mask `none` at every sampled position. The field moved physically with scroll. All 12 captures reported zero horizontal overflow and zero page errors.
- Bubble GPU text and WebGL states both reported ready. Bio computed font was about 19.18 px on desktop and 12 px on both mobile widths. The 320 px layout uses a 900 px hero and therefore requires normal vertical scrolling to view its lower edge.
- After replacing the generated portrait with original-photo RGB, inspected fresh 1672 × 941 and 390 × 844 browser captures. The original face and photographic detail are retained, silhouette placement is clean, and no wooden-background rectangle is visible. Mild warm coloration and the original photograph's grain/smudges remain; these are source detail rather than a generated substitute face.
- The earlier full-RGB portrait fidelity concern is resolved by the matte-only workflow. The visual review also flagged white bubble type over bright clouds/flowers; the shader integration owns that local text-contrast treatment.
- No frame-rate claim is made from these screenshots or software-WebGL runs. Visual checks do not establish physical-device GPU performance, and browser/provider state tests do not establish continuous real SoundCloud audio. Runtime performance and media checks are recorded separately in the release validation report.
