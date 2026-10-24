# R36: Mobile navigation that belongs to the showroom

## Author feedback
R35 made every route reachable, but the author rejected its standalone rounded, multicoloured button grid as visually inconsistent with the approved DXT scene. Functional approval does not imply design approval.

## Design and scope
Preserve the actual 3D showroom, car, camera, lights, shaders and all destination pages. Replace only the native mobile navigation's internal presentation and mobile stylesheet: an open, floor-fading lower-third with etched numbers, condensed uppercase type and fine neutral dividers. Berserk Drift X occupies one full-width headline; the other four destinations use two quieter rows. The five routes remain immediately available with direct actions, not a hidden menu or carousel selection step. No extra images, rendering context, continuous loop or backdrop blur is added.

The visual palette is warm white/black with one restrained red feature. Existing per-destination colours remain in the actual 3D scene; they are not repeated as five competing default button borders. Short landscape uses a single row of the same five labels. R35's touch-target sizes, page footer controls, galleries, modals, safe areas, fallback navigation and short intro are preserved. Desktop CSS and projected controls remain unchanged.

## Implementation
- `src/pages/home-room.js`: add decorative aria-hidden 01-05 indices and the existing diagonal external icon to the same native buttons. No event-handler or route changes.
- `src/styles-mobile.css`: replace the old dock styling in place; remove rounded coloured shells, preserve bounded mobile/coarse-pointer scope and min 48px targets. Use a non-interactive gradient behind the lower-third, with reduced-motion-safe short press feedback.
- `tests/mobile-style-r36.test.mjs`: three regressions first failed against R35 while the prior mobile contract passed; implementation passed all three and the full 424-test local build.
- `tests/mobile-style-r36-browser.cjs`: real-site geometry/screenshot checks for seven viewports, touch hit-testing, compactness, five destinations and reduced motion. Run this plus the full existing `mobile-r35-browser.cjs` before release. A headless/mobile emulator is not physical iPhone/Safari or hardware-FPS validation.

## Validation status
Local Node suite: 424 passed, 0 failed. Visual screenshots and full browser interaction verification must be inspected on the preview before production. Do not reuse old R35 screenshots as evidence of R36.
