# R30: Future Projects detail dialog

## Author's correction, 2026-10-22
Keep the current Games/Addons/Systems cards and turn each frame into a button. Clicking opens information in a centered modal over a darkened page, with room for photos and videos. Do not revert the approved layout or change Groups scrolling, the car, lighting, hover, portal camera or antialiasing.

## Implementation
A full-card native button is added to each existing article, preserving the original layout/list semantics. One lazy HTML dialog lives outside the cached destination root. Its top-layer backdrop darkens and blocks the rest of the page. Opening rises gently; reduced-motion disables that animation. The close button, backdrop and Escape restore focus/scroll. Escape is intercepted only while the dialog owns it, including held-key repeats, so it cannot trigger the underlying showroom return. History navigation, root replacement and disposal release the dialog.

The root is temporarily inert and the existing DestinationExperience sleeps while the dialog is open. No new WebGL context, renderer, library, perpetual animation loop or asset warmup is added. Media is mounted only when selected. Native videos use controls/playsinline/preload=none without autoplay and stop/release their source on selection change or close. Images have alt text, captions and a readable error state; gallery controls support keyboard navigation.

## Content is intentionally not fabricated
All seven names, categories and platforms come from `src/pages/destination-data.js`. No project-specific descriptions, photos or videos were supplied for these upcoming titles. Existing Berserk Drift X screenshots are NOT evidence for BERSERK DRIFT: RALLY, and are not reused. Production displays an honest preview-coming-soon state until the owner provides the actual material. Test media is not published.

Edit `PROJECT_DETAILS` in `src/pages/future-project-details.js`. Keys follow the unchanged catalogue positions: `0-0` Rally, `0-1` Unnamed Drift Game, `0-2` Right Cut!, `1-0` Tiremark Generator, `1-1` Vegetation Placer, `2-0` Drift Judge, `2-1` FFB. Each record accepts `description: ['paragraph', ...]` and `media: [{type:'image',src:'/assets/projects/example.webp',alt:'Owner-provided description',caption:'Caption'}, {type:'video',src:'/assets/projects/demo.mp4',poster:'/assets/projects/poster.webp',alt:'Demo'}]`. These paths are examples, NOT shipped files. Add every supplied local asset to `RUNTIME_FILES` in `tools/build.mjs`; its explicit allowlist does not automatically publish new folders. HTTPS media is supported but should be reviewed for permissions/third-party requests. No arbitrary embeds, iframe trackers, release claims or invented features.

## Evidence and limits
Four new Node tests first failed because the feature was missing, then passed. An isolated offline Chromium page loaded the actual controller/data/styles and passed 37 behavioral checks: all seven cards, top-layer modality, dark backdrop, focus, Tab/Enter/Escape, restored scroll/styles, 390/320px layout, image display, native video playback and release, missing-media fallback, gallery keys, reduced motion, history and lifecycle cleanup. No JavaScript exceptions. The fixture uses authentic catalogue metadata, not the whole WebGL showroom; it does not measure visitor hardware FPS. Full-project build/test results are separately enforced by the Vercel preview before production.

Scope review: no new account/form/payment/cookie/tracking flow; no fabricated publicity or third-party imagery. Native media descriptions and focus controls are implemented. Modal text colors were checked against their dark backgrounds; small footer text was brightened. This is a technical feature review, not a claim of legal or whole-site WCAG certification.

Native dialog reference: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
