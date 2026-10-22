# HEINEM visual asset provenance

## Source and license boundary

The user supplied `image(20261022-215633).png` (1178 × 659) as the visual reference and asked for a faithful implementation with independent parallax layers. The website code's MIT license does **not** grant rights to the artist's likeness, artwork, music, branding or the supplied reference. Those assets remain with their respective rights holders.

## Runtime images

| File in `public/assets` | Dimensions | Bytes | Purpose |
| --- | --- | ---: | --- |
| `meadow-background.webp` | 1677 × 938 | 331,140 | Reconstructed background plate behind the separated person and grass |
| `portrait-layer.webp` | 1677 × 938, alpha | 124,824 | Alpha mask only; generated RGB is never displayed |
| `foreground-grass.webp` | 1677 × 938, alpha | 160,756 | Transparent foreground grass plane |
| `reference-original.webp` | 1178 × 659 | 822,578 | Lossless conversion of the supplied reference, for exact original-pixel masks |

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

The foreground contains a mirrored overscan image below its initial visible bounds. It extends the last image row when the fast plane scrolls upward, preventing a horizontal uncovered edge without increasing the initial image download. This reconstructed continuation is not part of the original photograph.

The three track covers are artist/provider artwork documented in `artist-sources.json`. They are locally cached thumbnails; no music is re-hosted. Poppins Latin fonts are self-hosted under the included SIL Open Font License. A social preview is captured from the running site rather than exposing the reference screenshot's editing tooltip.

Original generated PNGs remain in the task workspace's `generated_images` directory. Only compressed runtime assets belong in the web bundle.
