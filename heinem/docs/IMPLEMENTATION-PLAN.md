# HEINEM implementation plan

**Goal:** Ship the approved artist reference as a lightweight interactive, layered website.
**Architecture:** Semantic HTML and TypeScript controllers; CSS composited image planes; one localized shader; on-demand official music embed.
**Spec:** [DESIGN.md](./DESIGN.md)

## Tasks

- [x] Inspect Cortex, Checkpoint Portfolio and DXRKTHS; verify artist content and reference composition.
- [x] Reconstruct the background and isolate supporting layers; retain original photograph pixels for the face.
- [x] Implement hero, navigation, responsive composition and the lower CD/music/contact sections in `index.html` and `src/style.css`.
- [x] Implement a finite, antialiased soap-film renderer in `src/graphics/bubble.ts`, with native DOM text over it, context recovery and bounded quality.
- [x] Implement passive native-scroll depth transforms, graphics preference and lifecycle cleanup in `src/lib/quality.ts`, `src/lib/parallax.ts` and `src/main.ts`.
- [x] Implement a real SoundCloud disc player in `src/lib/player.ts`; playback state must come from provider events and include a useful external fallback.
- [x] Verify desktop/mobile layouts, persisted graphics, no-WebGL, reduced motion, first interaction, player failure and keyboard navigation; record limitations honestly.
- [ ] Publish the site and source, MIT license, changelog, security and architecture notes. Add reusable lessons to Cortex (PT/EN) and Checkpoint Portfolio.

## Review focus

Unavailable storage must not prevent rendering. Hidden tabs and offscreen graphics must sleep. A failed provider must not display a fake playing disc. Manual High must never be silently lowered. Small screens must retain a legible portrait and bio without horizontal overflow.
