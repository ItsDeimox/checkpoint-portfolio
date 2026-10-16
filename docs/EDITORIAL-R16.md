# DXT internal pages · Editorial R16

Baseline: `35be659152936746bfb7833903c1adff92999c3b`.

## Changes

- About uses the supplied black DXT wall banner, with the existing biography and supplied Roblox avatar.
- RevLine and Frost group links are distinct banner-backed buttons. The groups are not duplicated in a second list.
- Berserk replaces the concept crop with the actual project logo and a low-opacity supplied racing image on the right. Added a five-image manual gallery, native view-image links, PC controls and development context.
- Play stays centered near the bottom of the viewport and opens the exact supplied Roblox game URL. The footer reserves space for the dock; it is absent from all other destinations and disabled during return travel.
- The redundant RevLine link is removed from the Berserk editorial page only. `ROOM_PANELS`, physical screens and the showroom are unchanged.
- On destination pages, the existing 3D header logo has a left arrow and a native home anchor. It invokes the existing reverse portal journey. In the showroom, the approved click-to-spin behavior remains.

## Media provenance and pending content

Five approved images were retrieved from the game's official Roblox thumbnail list and stored locally as WebP at the original 768x432 resolution. Source asset IDs, URLs and hashes are in `section-media-sources.json`. The stated V / F / Shift+B controls and development status come from the official game description checked 2026-10-16. No counters or release dates were added.

The game-intro video has not been supplied and the public Roblox media list contained no video. It is intentionally not fabricated, substituted with a site recording or autoplayed. Add the actual file/link in a later update.

## Implementation and preservation

`section-pages.js` renders the editorial markup; `berserk-media.js` contains the immutable gallery records. `SectionMedia` delegates controls to the existing stable page host, preloads before swapping, rejects stale image loads and removes its listeners on disposal. The gallery has native buttons, keyboard navigation, labels and reduced-motion support. There is no new WebGL context or continuous animation loop for internal pages.

No source under `src/scene/`, physical panel data, portal route controller, audio controls, 3D geometry or showroom stylesheet was changed. The locally rebuilt showroom bundle SHA-256 is identical to the baseline production bundle: `1c4aa360cfbf24f68ef969e96f0d1d6dfd01fa80f378243bbebf39ddb914f5b4`.

## Validation

The baseline passed 255 CPU tests. Six new editorial requirements failed before implementation, while the existing spin and missing-video guards passed. The final build passes 267 CPU tests, including the existing portal navigation tests and new internal-logo return cases.

The browser report in `editorial-browser-results.json` covers actual Chromium WebGL2 for the persistent logo and reverse journey; gallery selection, fast successive requests, previous/next wrapping, keyboard navigation, dock centering and clickability before/after scroll, all five destinations at 390px and 320px, banners, fallback without WebGL, and restoration of the home-logo spin. No JavaScript errors occurred in the tested flows.

Browser tests use ANGLE SwiftShader and emulated mobile viewports. They do not certify Safari, physical phones or hardware frame rates. Captures are real browser renders, not concept images.

Run `npm test`, `npm run build`, then `NODE_PATH=<playwright installation> DXT_BASE_URL=http://127.0.0.1:3000 node tests/editorial-browser.cjs` with the site server running. The distribution allowlist includes the new modules and all required local images.

Final browser suite: 56 checks passed. A repeated 1440px software-WebGL attempt exceeded its 90-second reverse-portal limit while rendered frames progressed slowly. The final portal acceptance run used 900x650 / Low after validating internal-page layout at 1440px and both phone widths. The existing renderer and its timing were not changed for this content update.
