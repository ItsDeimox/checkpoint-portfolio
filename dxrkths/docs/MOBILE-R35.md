# R35: Mobile navigation, touch targets and verification

Date: 23 October 2026. Baseline: `a4b7d9e1c82ec37b4cd5e3792b9a09e15444fa37`. Scope is DXRKTHS only; desktop art, world camera, shaders, car, supplied media and the approved project modal are preserved.

## Report and diagnosis
The five 3D destination panels were designed for a wide composition. At a 390px portrait viewport, projecting the actual room layout put the two outside panels completely beyond the viewport and partly clipped the neighboring panels. Zooming out far enough would make the car and text too small. The old mobile strip exposed only the current selection and depended on tiny footer steps; it did not provide a clear overview of the five destinations. Several header, gallery and footer controls were smaller than a comfortable touch target.

## Minimal mobile-specific solution
- `home-room.js` now renders five labelled native buttons inside the existing mobile navigation region. Each uses the established `data-open-panel` route, so the original portal entrance and return animations remain. The cards are 48px or taller and retain the five destination accents.
- `styles-mobile.css` is loaded last and explicitly included in the production allowlist. Its main scope is narrow screens (740px or less) or coarse-pointer devices up to 1024px. It does not change the desktop 3D composition.
- Portrait uses two columns, with the last destination spanning both. Short phone landscape uses five columns. Safe-area insets keep the dock away from notches and bottom home indicators. Grid items stretch equally when a title wraps.
- Mobile hides the small projected DOM targets and step dots in favor of the five complete native controls. The 3D scene itself remains visible; the ordinary WebGL-unavailable fallback remains intact.
- Header controls, audio sliders, gallery buttons, modal close/arrows, group selectors and footer navigation receive at least 44px target dimensions. The audio popup can scroll within a short viewport; native horizontal touch scrolling remains independent from vertical page movement.
- A compact short-landscape introduction keeps the Enter button reachable. Existing project descriptions, metadata placement, gallery images and page-scroll preservation are unchanged.
- No new JavaScript renderer, animation loop, WebGL context, media download or scene-quality reduction was introduced.

## Verified results
- New mobile Node regressions failed against the original navigation/stylesheet contract before the correction. The complete updated build passed **421 tests, zero failures**.
- The full site was exercised in **Chrome 155.0.8059.39**, Linux headless with mobile/coarse-pointer/touch emulation, DPR 2 and software WebGL. **275 checks passed, zero uncaught JavaScript errors.**
- Tested showroom/header sizes: **320x568, 360x740, 390x844, 430x932, 768x1024, 844x390 and 568x320**. Every destination button was inside the viewport and received the hit test. Header controls and audio sliders were similarly tested.
- Tapped all five showroom entries and returned through the real portal flow. Verified all destination pages and footer links at 320px, 390px and 844px landscape without horizontal page overflow.
- Exercised Berserk thumbnails and previous/next controls, both group selectors, a native horizontal touch swipe, a vertical swipe over the group gallery, all six project dialogs, both supplied galleries, dialog closing and stable page scroll.
- Checked project modals at 320px, 390px and 844px; sound toggle; Low/Medium/High quality cycling; reduced-motion navigation; and desktop hiding of the mobile dock at 1440px.
- Reviewed real browser screenshots of the showroom, all five destinations and the project modal. The test does not claim to validate third-party Roblox/Discord/YouTube service availability.

Browser evidence: [Actions run 40032914234](https://github.com/ItsDeimox/checkpoint-portfolio/actions/runs/40032914234), artifact `dxrkths-r35-mobile-confirmed` (ID 12535673600, seven-day retention). That run applied and tested source revision `75a59807346cc1e685ae6d6d1ce7c15d7691dbc8`; release removes temporary audit scripts/workflows without changing the tested runtime files. The browser script is retained at `tests/mobile-r35-browser.cjs` for reproduction.

## Reproduce
From `dxrkths/`, run `npm ci && npm run build`. To run the optional browser suite, install `playwright@1.56.1` without saving or changing the lockfile, provide system Chrome via `CHROME_PATH` (or install its Chromium), then run `node tests/mobile-r35-browser.cjs`. It starts the local server and writes screenshots plus `docs/r35-mobile-qa/audit.json`.

Two QA pitfalls found and corrected: (1) gallery selection is announced before the async main image replacement, so wait for the selected source before `decode()`; (2) `locator.tap()` may auto-scroll before dispatch, which must not be mistaken for a modal scroll jump. For the strict scroll-preservation check, hit-test the visible button first, record the page offset, then send touchscreen coordinates directly.

## Limits
This is browser-emulated mobile functional/layout validation, not a test on physical iPhones/Android devices, Safari/WebKit certification, or a hardware GPU/FPS benchmark. Safe-area rules are implemented, but real notched hardware, browser chrome and device-specific performance remain separate checks. Do not turn these results into an unconditional every-device claim.
