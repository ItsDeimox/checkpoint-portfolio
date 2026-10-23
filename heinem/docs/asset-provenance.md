# HEINEM visual asset provenance

## Current revision — v1.2

The current runtime uses seven separate layers documented with full prompts, alpha measurements, image-generation IDs, crop coordinates, compression and rights in [LAYER-ASSETS.md](LAYER-ASSETS.md). Their combined payload is **1,581,358 bytes**. The portrait displays the newly supplied original photograph RGB through a generated matte; generated portrait RGB was discarded. The bubble no longer samples a photograph at runtime.

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
