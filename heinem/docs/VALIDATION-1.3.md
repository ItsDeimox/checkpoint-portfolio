# Validation — HEINEM 1.3.0

Revision: **22 October 2026, America/Sao_Paulo** (23 October UTC). This record distinguishes focused tests, integrated application verification, production checks, simulated media events and hardware limits. The [1.2 record](VALIDATION-1.2.md) remains historical evidence.

## Reproduce

```bash
npm ci
npm run build
CHROMIUM_PATH=/path/to/chromium npm run test:e2e
PLAYWRIGHT_BASE_URL=https://heinem.vercel.app CHROMIUM_PATH=/path/to/chromium npm run test:e2e
```

The build includes TypeScript and all configured unit/controller tests. Browser checks are a separate gate. Focused commands:

```bash
node --test --test-isolation=none tests/smooth-scroll.test.mjs
CHROMIUM_PATH=/path/to/chromium npm run test:e2e -- tests/browser/parallax.spec.ts
CHROMIUM_PATH=/path/to/chromium npm run test:e2e -- tests/browser/field.spec.ts
CHROMIUM_PATH=/path/to/chromium npm run test:e2e -- tests/browser/meadow.spec.ts
```

Browser evidence uses Chromium 134 with ANGLE/SwiftShader in the task environment. This establishes behavior and work counts, not physical-device FPS or battery use. If a disposable browser needs the documented `PLAYWRIGHT_IGNORE_TLS=1` proxy-CA exception, record it separately from independent public HTTP checks with normal TLS verification; no production TLS setting is changed.

## Focused evidence available before the integrated gate

| Check | Observed result or current boundary |
| --- | --- |
| Smooth-scroll controller | **9/9 passed**, including same-frame notification only after actual movement, no rounded/idle duplicates, no animation layout reads, native input ownership and reduced motion |
| Sky browser regressions | **2/2 passed in 15.7 s**: stop/reversal and each completed wheel-write frame |
| Sky geometric contract | Depth mismatch and stationary drift below **0.1 CSS px** after 280 → 130 px movement; each wheel write also below 0.1 px within its own frame |
| Field detail browser checks | **3/3 passed**: mobile/Low request avoidance, desktop shared-plane/one-load behavior, failed-tile fallback |
| Field network/geometry observations | Initial mobile/Low made no detail requests; eligible desktop requested four unique tiles once; one detail plane followed its foreground parent with opacity 1; switching to Low hid it without new requests |
| Player controller | **16/16 passed** in the focused controller run; integrated visual/pointer checks are separate |
| CD browser regressions | **7/7 passed in 40.8 s**: coordinated case/disc transfer, centered pivot, silent browsing, reduced motion, gradual drag/click suppression, inner-surface tilt and real touch input ownership |
| Real touch regression | **1/1 passed in 7.5 s** after the fix, then passed again in the seven-case run. Inner-element implicit capture loss bubbles during transfer to the stage; stage-only loss handling prevents premature cancellation |
| Approved bubble | Shader and approved optical behavior preserved; historical 1.2 measurements are not automatically relabeled as a new full-suite pass |
| Final integrated build/browser suite | TypeScript and 34/34 unit tests passed; 26/26 browser tests passed locally, then 26/26 on the public alias |
| Public deployment and artifact equality | READY for the exact source SHA; all 28 deployed files returned 200 and matched the tested bytes |

## Why the sky correction is supported

The wheel controller used a 125 ms response on real document position, then parallax applied a second 95 ms filter. A baseline at 1178 × 659 on High moved the document instantly to 280 px. Frames 2–13 still changed the sky transform from 102.57 to 179.15 px while document position remained fixed. Measured reverse drift was **76.58 px**, with **76.63 px** maximum depth mismatch. The correct transform is `280 × .64 = 179.2`.

Removing the extra filter eliminated the settling tail but left a first-frame ordering problem. Native `scroll` dispatch could update depth after the wheel's `scrollTo` frame. A real-wheel probe observed 172 px of movement with sky translation still zero. A regression sampling the completed wheel animation callback measured a maximum mismatch of **176 px** before synchronization.

The final path calls `parallax.syncScroll()` immediately after an actual document change, cancels the queued native update and uses the current position before paint. Tests sample through a microtask after each write callback, avoiding dependence on the registration order of independent RAF observers. The controller regression also verifies that rounded-identical/idle writes do not request more work. Native controls, touch, keyboard, focus navigation and reduced motion retain ownership.

## Asset facts

| Resource | Actual dimensions | Encoded bytes | Role |
| --- | --- | ---: | --- |
| `artist-light.webp` | 802 × 1774 | 291,154 | Brighter generated candidate selected in the user feedback |
| `field-detail-tl.webp`, `-tr`, `-bl`, `-br` | 1080 × 1457 each | 2,057,858 combined | Optional native detail inside the same foreground |
| `field-continuous.webp` | 1080 × 1456 | 414,856 | Complete base, mask silhouette and low-cost path |

The assembled detail has approximately **1964 × 2648 effective density**, about **3.31 times the effective pixel count** of the base field over the same area. Static overlaps reduce the distinct coverage of the four full tiles; counting raw file pixels alone would overstate the effective detail. These are image resource figures, not total page payload or presented-frame performance.

Eligibility is viewport width ≥1000 px, Medium/High and no `saveData` hint. The loader assigns URLs only after eligibility, waits for every decode, and keeps the original field if any tile fails. Already downloaded detail is hidden on a later Low choice; the browser cannot undo those earlier requests. The field preserves its original alpha silhouette and underlay, one parent transform and continuous page coverage.

The selected portrait is `exec-bbc57ac2-ed6d-4111-9d4b-1d0d7080e545.png`, cropped at `47,10,802,1774`, WebP quality 94/alpha 100. Its RGB is reconstructed, including the face. The original-RGB 1.2 portrait is now [archived for reference](reference/artist-photo-v1.2.webp). The asset change must not be described as displaying only original photo pixels.

## Integrated results

The final local application passed **TypeScript, 34/34 unit/controller tests and 26/26 browser tests**. The complete browser suite finished in **1.9 minutes** with one worker. The suite includes the approved bubble regression, graphics preferences, provider-state/failure simulation, continuous field coverage, same-frame sky synchronization, real mouse/touch gestures, reduced motion and missing-detail fallback.

The production build contains **49.82 kB JavaScript / 18.31 kB gzip**, **24.32 kB CSS / 6.57 kB gzip**, and **17.93 kB HTML / 4.34 kB gzip**. No runtime animation dependency was added. These bundle figures exclude images, fonts and third-party media requested after play.

Integrated captures cover **2560 × 1440, 1672 × 941, 390 × 844 and 320 × 780**, each at scroll fractions 0, .25, .5, .75 and 1. All 20 capture states reported zero horizontal document overflow, no page exceptions and no failed resource requests. Desktop detail reached `ready`; both mobile widths retained `idle` without requesting the patches. The brighter portrait decoded at 802 × 1774 with no CSS color filter. Direct inspection found continuous terrain coverage and no visible rectangular patch seam in the reviewed desktop hero, transition and music views.

The separate 14-phase CD capture records idle, hover, drag start, concealed transfer, emergence, completion and reversal at 1440 × 900 and 390 × 844. Both directions completed and returned to the first release. The seven music browser cases include an actual Chromium touch sequence; simulated pointer dispatch alone would have missed the implicit-capture regression. The rotor geometry assertion allows at most 0.6 CSS px of center drift.

Evidence retained with the source:

- [Desktop hero](evidence/refinement-hero-desktop.webp) and [2560 px music view](evidence/refinement-music-desktop.webp).
- [Mobile hero](evidence/refinement-hero-mobile.webp) and [mobile music](evidence/refinement-music-mobile.webp).
- [Concealed CD transfer](evidence/refinement-disc-transfer.webp).
- [20-state visual report](evidence/refinement-visual-report.json) and [release record](evidence/release-1.3.json).

### Production verification

The same complete suite passed **26/26 tests on https://heinem.vercel.app in 1.8 minutes**. The public tests include the new field gating/failure cases, same-frame sky synchronization and actual touch gesture sequence, together with the approved bubble and existing media-state regressions.

All **28 files in `dist`** returned **HTTP 200** and matched the tested local build byte for byte by SHA-256. This independent check used `curl` with normal TLS certificate verification and no bypass. The disposable Playwright browser used `PLAYWRIGHT_IGNORE_TLS=1` for the environment proxy CA; that exception is limited to the browser test session. No production TLS setting was changed. Vercel build logs also confirm **34 passed / 0 failed** unit tests and the same generated JS/CSS filenames.

The [release record](evidence/release-1.3.json) retains each resource hash, byte count, HTTP status and verification result. Follow-up documentation commits do not change these build inputs; any final alias check must still confirm the served artifacts rather than infer publication from an earlier READY state.

## Published revision

Application source: [`90ec8f6eab62c09d7f453cf2442c009d93ba9d5c`](https://github.com/ItsDeimox/checkpoint-portfolio/commit/90ec8f6eab62c09d7f453cf2442c009d93ba9d5c).

Vercel deployment: `dpl_47ycuswP7gdGRo6skiWrA8ULjeG8` (**READY**, production target).

Vercel confirmed the exact source SHA above and the production alias **heinem.vercel.app** on this READY deployment. The address [heinem.vercel.app](https://heinem.vercel.app) serves the source verified by the public suite and the 28-file equality check. Earlier releases remain separate historical evidence.

## Practical limits

Continuous real SoundCloud playback remains unconfirmed in this environment. The earlier real-provider run returned metadata but paused at 0:00 without progress. Controller and browser media tests use simulated provider events and prove interaction/state handling, not an audible continuous stream. The official transport and verified external track link remain.

SwiftShader tests do not establish device-specific frame rates, refresh-rate behavior, battery consumption or thermal performance. Image detail is selectively budgeted, but no Lighthouse score or field Core Web Vitals result is asserted. Static tile blending and generated portrait RGB also have documented visual/provenance limits; the supplied hidden scenery cannot be recovered pixel for pixel from the flattened reference.

See [interaction decisions](INTERACTION-REFINEMENT-1.3.md), [architecture](ARCHITECTURE.md) and [asset generation/provenance](LAYER-ASSETS.md) for the implementation context.
