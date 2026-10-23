# HEINEM visual asset provenance

## Current revision — v1.3

The current scene uses seven base assets plus four optional detail tiles inside the same physical foreground. The seven base files total **1,782,536 bytes**; optional detail adds **2,057,858 bytes**, for **3,840,394 bytes** when all scene images are loaded. This excludes covers, CD, fonts and social metadata. [LAYER-ASSETS.md](LAYER-ASSETS.md) contains the current file inventory and preserves the earlier release history.

### Portrait choice

The user requested the brighter portrait instead of the yellow-toned version. The selected source, `exec-bbc57ac2-ed6d-4111-9d4b-1d0d7080e545.png`, is **882 × 1784**, generated from the supplied original selfie during the previous asset exploration. Its RGB includes reconstructed facial and clothing detail. It was discarded for v1.2, then explicitly selected as the brighter presentation for v1.3. The current site must therefore **not** be described as displaying unchanged original-photo RGB or an alpha-only portrait edit.

The source was cropped at **left 47, top 10, width 802, height 1774** and encoded without enlargement to `public/assets/layers/artist-light.webp` (**802 × 1774**, **291,154 bytes**, WebP quality 94 / alpha 100 / effort 6). The previous original-RGB cutout is preserved at [reference/artist-photo-v1.2.webp](reference/artist-photo-v1.2.webp) (**414 × 920**, **89,976 bytes**) and is no longer a public runtime image. The selected candidate's exact generation prompt remains in the decision history in [LAYER-ASSETS.md](LAYER-ASSETS.md).

### Foreground detail

The native continuous field remained **1080 × 1456** even after a complete-field edit requested 2160 × 2912. That unsuccessful larger-frame attempt was not shipped or described as a resolution increase. Four exact, overlapping **594 × 801** crops were instead reconstructed independently, each yielding **1080 × 1457** native pixels. Their registered composition provides approximately **1964 × 2648 effective field density**, or **3.31×** the original unique pixel density. Additional blades and petal details are generated reconstruction, not literal recovery of previously photographed detail.

The four files, `field-detail-tl.webp`, `field-detail-tr.webp`, `field-detail-bl.webp` and `field-detail-br.webp`, are encoded at WebP quality 89 / alpha 100 / effort 6. They retain the original complete field underneath and use static overlap/alpha masks inside its single parallax transform. Only viewports ≥1000 px with resolved Medium/High graphics and no advertised data-saving preference request them. Every tile must decode before the detail group is displayed; errors retain the complete base image. Mobile and Low use the base field.

The full crop/source manifest, output sizes, measured alpha, memory cost, all exact prompts, rejected attempt and **3/3 focused browser checks** are in [FOREGROUND-DETAIL-1.3.md](FOREGROUND-DETAIL-1.3.md). The built-in image tool was used; no external generation service, CLI/API fallback or source enlargement supplied the new detail. The existing CD bitmap, official covers, fonts, sky, other vegetation, butterfly and approved bubble material retain their prior asset origins.

### Current social preview and visual evidence

`public/assets/social-preview-v1.3.jpg` is a capture of the implemented 1.3 hero at 1672 × 941, exported at 1200 × 630 with a centered cover crop, JPEG quality 87 and MozJPEG encoding: **227,642 bytes**. It shows the selected brighter portrait and the assembled field. The versioned Open Graph URL avoids serving the old preview from a previously cached asset URL; the previous preview file remains available for existing links.

The five `docs/evidence/refinement-*.webp` images are browser screenshots encoded at WebP quality 86 without changing their capture dimensions. They record the desktop/mobile hero and music views, plus the concealed CD transfer. The corresponding `refinement-visual-report.json` records four viewport sizes and five scroll positions each. These are implementation evidence, not generated concept art.

The code's MIT license does not transfer rights to the artist's likeness, supplied photography, music, branding or third-party artwork. Historical claims below describe their stated releases and do not override the current portrait and field provenance.

## Historical revision — v1.2

The v1.2 runtime used seven separate layers documented with full prompts, alpha measurements, image-generation IDs, crop coordinates, compression and rights in [LAYER-ASSETS.md](LAYER-ASSETS.md). Their combined payload was **1,581,358 bytes**. That portrait displayed the supplied original photograph RGB through a generated matte; generated portrait RGB was discarded for that release. The bubble stopped sampling a photograph at runtime.

The flattened original hero reference now lives at `docs/reference/hero-original.webp` for design history and is excluded from the deployed public assets. The six superseded scene/mask files, including both old music meadow treatments described below, are no longer used in v1.2. Their actual previous files remain available in Git history at application commit `58cb7512d81b48e68a3a022f23155a40d7bd23ae`. The silver CD, official cover artwork and local fonts remain current.

## Historical source record — v1.0/v1.1


## Source and license boundary

The user supplied `image(20261022-215633).png` (1178 × 659) as the visual reference and asked for a faithful implementation with independent parallax layers. The website code's MIT license does **not** grant rights to the artist's likeness, artwork, music, branding or the supplied reference. Those assets remain with their respective rights holders.

## Runtime images

| File in `public/assets` | Dimensions | Bytes | Purpose |
| --- | --- | ---: | --- |
| `meadow-background.webp` | 1677 × 938 | 331,140 | Reconstructed background plate behind the separated person and grass |
| `portrait-layer.webp` | 1677 × 938, alpha | 124,824 | Alpha mask only; generated RGB is never displayed |
| `foreground-grass.webp` | 1677 × 938, alpha | 160,756 | Transparent foreground grass plane |
| `reference-original.webp` | 1178 × 659 | 822,578 | Lossless conversion of the supplied reference, for exact original-pixel masks |
| `music-meadow.webp` | 1672 × 941 | 400,046 | Clean field reconstructed from the approved music concept |
| `music-foreground.webp` | 1672 × 941, alpha | 224,940 | Focused grass crossing the jewel-case bases, with near bokeh below |
| `silver-disc.webp` | 768 × 768, alpha | 152,362 | Photographic iridescent CD material, separated from the live controls |

The three layer images retain a full landscape canvas and near-original placement. Align them to one shared canvas, rather than independently using `object-fit: cover` with different positions. WebP conversions were produced with Sharp (quality 88 background/grass, 94 portrait, alpha quality 100, effort 6). The reference conversion is lossless. Compression does not change semantic image content.

## Generation method and prompts

The built-in image generation/edit tool was used, with the supplied reference as the sole edit target. No CLI/API fallback or external stock images were used.

### Background plate

Prompt: Preserve the exact camera viewpoint, composition, blue cloudy sky, left overhanging leafy tree, distant meadow and woodland horizon, white/yellow/purple meadow flowers, hazy sunny light and realistic colors. Remove all web UI, text, logos, icons, tooltip, lines, the complete glass bubble, the man, the very close blurry foreground grass and the two butterflies. Naturally reconstruct the occluded meadow and sky. Preserve original aspect ratio and framing, with no crop, camera change, humans, new architecture or added typography.

### Portrait underlayer

Prompt: Extract only the source man with strict identity preservation, retaining curly hair, glasses, gray headphones, face/expression, skin tone, hoodie, backpack, pose and lighting. Remove all background and grass to actual transparency. Fill only hoodie regions obscured by foreground grass. Retain the original full landscape canvas and the person's original placement and scale, without centering, zooming or changing the bottom crop.

Observed limitation: generation slightly reconstructs facial lighting/details. The implementation therefore uses **only this file's alpha channel** as a CSS mask. All displayed portrait RGB, including the face and clothing, comes from the lossless original reference. The generated face is never rendered.

### Foreground grass

Prompt: Extract only the nearest blurry green grass, soft white flowers and close plants from the lower source image, keeping original locations, dreamy focus, lighting and colors. Remove every other scene object and UI. Retain original landscape framing, with the upper majority fully transparent, organic soft alpha around blades and grass reaching the bottom edge.

Observed limitation: some translucent grass edges contain saturated green fringe. Verify on the meadow background at actual display size; a very small CSS blur/soft mask can soften it without blurring the entire page.

## Fidelity notes

The reference is a flattened screenshot, not the source layered artwork. Regions hidden by the person, bubble and foreground have to be reconstructed. These generated regions are approximations. The reference's original pixels should be preserved wherever exact identity or branding is visible. No claim of a mathematically exact match should be made for inpainted areas.

Desktop also retains masked original landscape and sky plates. `landscape-preserve-mask.svg` removes the flattened navigation, logo, old bubble, original butterflies and footer labels. Separate HTML/SVG elements and butterfly crops replace them. The portrait mask removes the duplicated person from the background planes. This keeps the original tree and field details while allowing independent depth motion. The logo is a hand-drawn SVG interpretation; the source did not contain an editable vector asset.

V1.1 removes the mirrored foreground overscan used in the initial release. A soft lower alpha mask and a shared meadow background now maintain coverage while the fast plane moves. The scene transition is a crossfade of registered layers; it is not an infinitely extended photograph.

The three track covers are artist/provider artwork documented in `artist-sources.json`. They are locally cached thumbnails; no music is re-hosted. Poppins Latin fonts are self-hosted under the included SIL Open Font License. A social preview is captured from the running site rather than exposing the reference screenshot's editing tooltip.

Original generated PNGs remain in the task workspace's `generated_images` directory. Only compressed runtime assets belong in the web bundle.

## Approved music scene — v1.1

The user approved the generated [1672 × 941 concept](reference/music-approved.webp) with the explicit instruction to replicate it 1:1. The background was edited to remove the cases, disc and UI, then a separate focused-grass alpha layer was generated to cross the case bases. The disc was isolated and its occluded half reconstructed into a full circular material. Case geometry, artwork, labels and all controls are independent live HTML/CSS elements. The actual provider cover images are retained rather than replacing the artist artwork with the concept's generated lettering.

The new three-image runtime payload is 777,348 bytes. The CD's transparent outer margin is compensated in CSS. Its measured visible center at (381.5, 381.5) within the 768-pixel canvas is aligned to the rotor center using background positioning; a circular mask regularizes the exterior and center aperture. Fine alpha fringes in the grass remain a limitation of generated segmentation, mitigated by matching the field and inspecting its real-size overlay.

Full prompts, source generation identifiers, dimensions, compression settings, the discarded first foreground and remaining limits are preserved in [MUSIC-ASSETS.md](MUSIC-ASSETS.md). The stored concept is documentation and is not requested by the public page.

Poppins Bold Latin was added as a local 7,816-byte WOFF2 for the approved music title, from the [official Google Fonts stylesheet](https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap) and its [font file](https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2). The same included SIL Open Font License applies. No Google Fonts request is made at runtime.
