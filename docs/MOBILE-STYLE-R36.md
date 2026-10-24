# R36: Mobile navigation that belongs to the showroom

## Author feedback
R35 made every route reachable, but the author rejected its standalone rounded, multicoloured button grid as visually inconsistent with the approved DXT scene. Functional validation is not design approval.

## Design and scope
Preserve the actual 3D showroom, car, camera, lights, shaders and all destination pages. Replace only the native mobile navigation's internal presentation and mobile stylesheet: an open, floor-fading lower-third with etched numbers, condensed uppercase type and fine neutral dividers. Berserk Drift X occupies one full-width headline; the other four destinations use two quieter rows. The five routes remain immediately available with direct actions, not a hidden menu or a carousel selection step. No extra images, rendering context, continuous loop or backdrop blur is added.

The visual palette is warm white/black. The small feature line inherits the existing scene accent (neutral white in the resting scene), instead of introducing five permanently competing colour borders. Short landscape uses a single row of the same five labels. R35's touch-target sizes, page footer controls, galleries, modals, safe areas, fallback navigation and short intro are preserved. Desktop CSS and projected controls remain unchanged.

## Implementation
- `src/pages/home-room.js`: add decorative aria-hidden 01-05 indices and the existing diagonal icon to the same native buttons. No event-handler or route changes.
- `src/styles-mobile.css`: replace the old dock styling in place; remove rounded coloured shells, preserve bounded mobile/coarse-pointer scope and min 48px targets. Use a non-interactive gradient behind the lower-third, with reduced-motion-safe short press feedback.
- `tests/mobile-style-r36.test.mjs`: three regressions failed against R35 while the previous mobile contracts passed. The changed source then passed all three and the complete 424-test build.
- `tests/mobile-style-r36-browser.cjs`: seven-viewport DOM geometry, touch hit-testing, compactness, five direct routes and reduced motion. The separate full existing `mobile-r35-browser.cjs` remains the interaction and settled visual-evidence gate.

## Verified evidence
Source under test: product commit `3f75963448233f89d3885d6ff0c3e39386a03ab4`; QA-only commit `ae9770cb914d62fc5534ea5cf7fe3344abcac93c` adds only the read-only workflow. [GitHub Actions run 40050117412](https://github.com/ItsDeimox/checkpoint-portfolio/actions/runs/40050117412) completed successfully.

- Full Node/build suite: **424 passed, 0 failed**, locally and in CI.
- Dedicated navigation geometry: **82 checks passed**, no uncaught JavaScript exceptions.
- Full mobile interaction suite: **275 checks passed**, no uncaught JavaScript exceptions. Five portals and returns, header/audio, footer navigation, gallery arrows/thumbnails, horizontal/vertical group swipes, all six project dialogs, scroll preservation, quality changes, reduced motion and desktop exclusion.
- Chrome **155.0.8059.39**, Linux headless, mobile/touch emulation, DPR 2 and software WebGL. Viewports: 320x568, 360x740, 390x844, 430x932, 768x1024, 844x390 and 568x320; desktop exclusion at 1440x900.
- Measured navigation height: **164px at 390px portrait**, **176.375px at 320px portrait**, **53px in both tested short landscapes**. All five targets remained at least 48px high and unoccluded.
- Manually reviewed the full interaction suite's actual screenshots at 320, 390 and 844px with the live 3D scene rendered. Its artifact is `dxrkths-r36-interaction-review` (12542669806). The earlier fast geometry artifact (12542714019) can capture the cleared canvas between resize and GPU repaint, so it is not used to claim scene-pixel correctness.

Artifacts have limited retention; both browser scripts remain reproducible in the repository. No physical iPhone/Android, Safari/WebKit or hardware-GPU FPS result is claimed. This is the implemented redesign responding to the author's correction, not a claim of subsequent author approval.
