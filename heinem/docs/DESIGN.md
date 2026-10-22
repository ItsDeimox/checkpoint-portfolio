# HEINEM — implementation brief

The user supplied a 1178 × 659 approved visual reference and explicitly authorized implementation, testing, GitHub versioning, MIT licensing, Vercel production deployment, and reusable documentation in Cortex and Checkpoint Portfolio. The reference is the design specification. No new concept or approval round is needed.

## Required result

- Match the landscape hero: original portrait at the left, blue sky and meadow, blurred foreground grass, transparent irregular soap-film bio at the right, quiet white navigation and original branding.
- Use separate depth planes and native document scrolling. Foreground moves faster than portrait; distant grass and sky move more slowly. Never intercept wheel/touch scrolling.
- Animate an iridescent bubble with local pointer indentation and gradual relaxation. Keep bio text real, selectable, accessible HTML.
- A section below the hero presents a clickable compact disc that controls verified HEINEM music. Its rotation follows actual playback events.
- Automatically select low/medium/high graphics and retain a simple persistent manual override. Respect reduced motion independently.
- Keep effects light: localized WebGL2 surface, finite GLSL, one program, bounded framebuffer, no full-scene postprocessing, no hidden/offscreen animation work.
- Publish production at heinem.vercel.app, with heinemofc.vercel.app only if the first name is unavailable. Use one production project/domain.

## Assets and factual content

The original attachment is a flattened composition, not layered source. Reconstruct newly exposed scenery with image editing, use the original portrait pixels wherever visible, and document the distinction. Real artist profiles and SoundCloud embeds are verified in `artist-sources.json`. No invented releases, contact email, statistics, or reviews.

## Architecture

Vite + TypeScript with semantic static HTML, CSS, native WebGL2 and the official SoundCloud Widget API loaded after intent. No application framework, full 3D engine, analytics, authentication, database or backend is necessary. Figma's first-party Moving blobs shader was inspected for distortion/reference; application shader is original WebGL2 code.

## Definition of done

Build passes; desktop/mobile screenshots are reviewed against the reference; native scroll, keyboard links, graphics preference, reduced motion, WebGL fallback and player error states work. Production is verified at its real URL. Measurements are labeled with the actual test environment and never presented as a physical-device GPU benchmark.
