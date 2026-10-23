# Validation — HEINEM 1.1.0

Local verification: **2026-10-22–23 UTC**. This report covers the user-approved meadow/CD revision and the linked bubble/scroll feedback. The [v1.0 baseline](VALIDATION.md#historical-baseline--100) is retained separately.

## Environment and commands

Node 24.19.0, Vite 8.3.5, TypeScript 7.0.2, Playwright 1.64.1 and Linux Chromium 134 with ANGLE/SwiftShader. The browser runs use a software GPU and emulated viewport dimensions, not physical-phone FPS or field Core Web Vitals.

```bash
npm ci
npm run build
CHROMIUM_PATH=/path/to/chromium npm run test:e2e
```

`PLAYWRIGHT_BASE_URL` selects an existing deployment. The disposable browser can use the explicit test-only `PLAYWRIGHT_IGNORE_TLS=1` when the environment's proxy certificate is not trusted; production configuration contains no TLS bypass. Independent public HTTPS checks retain normal TLS verification.

## Local results

| Check | Result |
| --- | --- |
| TypeScript and Vite production build | Passed |
| Build-gated unit/state tests | **25/25**: 9 graphics policy, 8 player and 8 scroll |
| Full browser suite | **15/15 passed**, 1.2 minutes in the stated environment |
| CD center follow-up | **4/4 passed** after adding center hit-testing to the four layout cases |
| Viewports | 1178 × 659, 1440 × 900, 390 × 844 and 320 × 780; additional visual comparison at the concept's 1672 × 941 |
| Layout and control target | No unintended horizontal overflow; biography fits its surface; mobile biography remains at least 12 px; the CD center resolves to the native disc button in every viewport |
| Disc pivot | Button center moves less than 0.6 CSS px during hover; rotor center stays within the same tolerance at five phases covering one complete revolution |
| Silent release browsing | Initial cases match Previous/Next; covers and arrows change the real track metadata without loading the SDK/iframe before play |
| Playback state | Controlled provider events verify confirmed play, pause, seek/progress, track changes, cancellation before READY, stale callback rejection and error/retry behavior |
| Bubble letters | Local HTML glyph displacement and glow are stronger near the pointer; far glyphs remain relatively still; text bounds do not change; styles settle back to rest |
| Hover layout/texture work | **0 layout reads** during the measured hover interval; **4 → 4 texture uploads**, comprising two neutral initialization textures and two image sources |
| Offscreen/reduced motion | No new shader draws during the observed offscreen and reduced-motion windows; no displaced/glowing glyphs with reduced motion |
| Graphics/fallback | Manual High persists despite constrained-device hints; no-WebGL keeps native biography/navigation and the CSS surface |
| Before playback intent | No third-party runtime requests in the layout and silent-selection tests |

The unit/state checks use controlled DOM/provider inputs; the browser checks use the actual page. Simulated media events establish UI behavior, not availability of the external audio stream.

## Defects found and corrected during this revision

- The original music interface and extra sections did not continue the approved scene. The new background and focused alpha grass layer integrate three real jewel cases and the CD into one meadow.
- Mirrored foreground overscan exposed upside-down grass and then a horizontal source edge. It was removed; lower masks and a soft scene reveal now maintain the transition.
- The first generated overlay contained only near bokeh and did not reach the case bases. A second focused-grass layer covers that boundary. Mobile uses a cropped, shorter overlay rather than stretching the landscape into thin vertical blades.
- The former disc hover moved/tilted the containing element. The rotor, centered hub and action glyph are now separate; hover only changes brightness. CSS compensates the generated material's measured margin and small center offset.
- The bubble previously overlaid photographed rim color and heavily softened its interior. The rim now retains only optical highlight residuals, while clearer refraction and glyph deformation share one bounded pointer field.
- Tab did not cancel pending wheel interpolation when the next focused control stayed in view. Tab and Shift+Tab now cancel it, with a focused regression.
- At the exact mobile page end, zero-area edge contact kept `isIntersecting` true. A ratio threshold of 0.001 and matching visibility predicate stop renderer and decorative work at that boundary.
- The initial layout-work test counted Playwright's own trace-snapshot DOM traversal. Captured call stacks identified `visitNode`/`visitChild`, not application work. Tracing is disabled only in the instrumented bubble tests so the probe measures the application; regular browser tests still retain failure traces.

## Visual evidence and limits

The approved [concept](reference/music-approved.webp) was compared with the [desktop implementation](evidence/meadow-desktop.webp) at matching dimensions. [Mobile evidence](evidence/meadow-mobile.webp) records the adapted composition. No page errors were observed during those captures. Cases, CD, controls and text are independent live elements; the concept is not flattened into a nonfunctional page image.

The actual artist/provider covers are retained, including their original marks and typography. Hidden meadow and the occluded half of the CD are generated reconstructions. These facts limit a mathematical pixel-identical claim; the implementation follows the approved composition and interactions. The glow is localized LDR shader/DOM treatment, not a full HDR post-processing pipeline.

## Production build payload

| File | Bytes | Gzip level 9 |
| --- | ---: | ---: |
| `index.html` | 17,912 | 4,264 |
| `assets/index-T397sXNB.js` | 43,413 | 15,985 |
| `assets/index-D1jR06AC.css` | 22,590 | 5,920 |

These counts exclude images/fonts. The new runtime meadow, focused grass and disc total **777,348 bytes**; Poppins Bold adds **7,816 bytes**. Documentation screenshots and the approved concept are outside `public` and are not downloaded by the page. Existing portrait, landscape, release artwork and fonts remain separately documented in [asset provenance](asset-provenance.md).

## Publication

Production verified **2026-10-23 UTC** through the existing Git → Vercel pipeline.

| Evidence | Confirmed result |
| --- | --- |
| Public URL | [heinem.vercel.app](https://heinem.vercel.app/#music) |
| Application source | [`58cb7512d81b48e68a3a022f23155a40d7bd23ae`](https://github.com/ItsDeimox/checkpoint-portfolio/commit/58cb7512d81b48e68a3a022f23155a40d7bd23ae) |
| Vercel deployment | `dpl_6Vupbk9DGjAyj5MRi5mEGLJvL1rB`, **READY**, production, source SHA as above, public alias assigned |
| Public HTTPS | **200 OK**, normal TLS verification, no login |
| Artifact identity | Published HTML, JavaScript and CSS match the local tested production build byte for byte |
| Live browser suite | **15/15 passed**, 1.0 minute; includes the CD center hit-test at all four viewport sizes |

The live command used `PLAYWRIGHT_BASE_URL=https://heinem.vercel.app`, the Chromium path and the documented disposable-test TLS exception. The independent HTTP/artifact comparison retained normal TLS verification. Media checks in this suite still use controlled provider events; they do not claim continuous real streaming.

Publication of this evidence may create a later documentation-only commit and Git deployment. The application source above identifies the revision that received the complete live suite; the bundle names and byte counts allow unchanged runtime output to be verified independently.

## External audio limitation

The prior real-provider test initialized SoundCloud and received a duration, but playback returned to pause at 0:00, including after a direct official-player click. Continuous streaming was not confirmed in this environment. This revision preserves the official iframe and verified track link as fallback, the explicit stopped-before-start message, and state driven by actual provider events. See [the detailed real-provider record](VALIDATION.md#real-soundcloud-check-and-its-limit). Passing deterministic media tests does not remove that limitation.

No Lighthouse score, hardware FPS, battery claim, universal-browser support or successful continuous-audio result is inferred from these tests.
