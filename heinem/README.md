# HEINEM

A sunlit artist website with a layered meadow, an interactive iridescent soap-film surface, and a six-release CD interface connected to the official SoundCloud player.

**Website:** [heinem.vercel.app](https://heinem.vercel.app) · **Version:** 1.5.6 · **Software:** MIT

The music carousel has six releases and displays the current sleeve with its previous and next neighbors. New release covers are lazily resolved through SoundCloud's public oEmbed artwork metadata when the Music section enters view. The actual SoundCloud player remains unloaded until a click. When a track or thumbnail is unavailable, a self-hosted abstract poster for that release stays visible (a clearly local design, not an invented official SoundCloud cover). The first three verified album JPGs are eager-loaded to avoid a blank frame during fast swipes.\n\nUp to three subtle cool-lilac butterflies in the hero and one near the edge of Music now follow separate closed, curving paths. A single lightweight controller synchronizes the paired wingbeats, gently banks the thorax and inserts short glides; animations stop outside the visible section and under reduced motion. Lower graphics and mobile modes show fewer butterflies. The left logo uses a tight SVG viewBox for consistent alignment.\n\nThe site lives independently in [`checkpoint-portfolio/heinem`](https://github.com/ItsDeimox/checkpoint-portfolio/tree/main/heinem). It has its own package, lockfile, license and Vercel project. It does not depend on the other portfolio applications in this repository.

## Run locally

Node.js 24 or later is required.

```bash
cd heinem
npm ci
npm run dev
```

```bash
npm run check
npm run build
npm run preview
```

`npm run build` includes TypeScript and the graphics-policy, player-state and scroll-input tests, so a failure stops the Vercel build before assets are generated.

Browser checks use Playwright. Install its Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. A preinstalled compatible browser may be supplied through `CHROMIUM_PATH`. `PLAYWRIGHT_BASE_URL` can point the same tests at a deployment.

## What is implemented

- Hero composition rebuilt to the artist-approved **1809 × 586 reference** using two brand-new high-resolution scene assets, not crops of that screenshot. The portrait, bubble copy, navigation and music controls remain independent.
- Four compositing roles: a generated sky/tree/horizon background (1672 × 941), a generated transparent foreground meadow extended downward into the music section (1672 × 2380), the previously approved bright portrait, and the interactive film shader. The 1.2 original-RGB portrait remains archived; the 1.3 bright portrait has reconstructed RGB.
- One continuous native-resolution alpha grass plane covers the scroll and CD section. The old four-tile field and duplicate distant vegetation are no longer requested; the two current scene assets total approximately 1.48 MiB.
- One bounded WebGL2 mesh renders the soap film, clear refraction, title, biography, underline and sparkle. Up to six independent spring impulses give each touched region a lingering jelly response.
- Typography and two glow masks are rasterized once on font/layout changes and packed into one GPU texture. Hover produces no glyph DOM writes, geometry reads or texture uploads; there is no full-screen bloom chain.
- Gentle wheel interpolation on the real document scroll position, with parallax synchronized in the same write frame. The sky has no second easing delay. Native touch/keyboard/control behavior and immediate cancellation on focus navigation remain.
- Auto, Low, Medium and High graphics, with persistent manual choices and independent reduced-motion support.
- Shader and CSS decorative animation pause when the hero leaves the viewport or the tab is hidden.
- Three physical jewel-case buttons and a reversible CD timeline. **One horizontal mouse/touch drag can pass through multiple covers and wrap around endlessly without lifting**; the cases and CD move continuously through every index. Releasing eases into the nearest release, while reversing or cancelling remains smooth. The real player track updates only once at release, not at every artwork crossed. Click navigation and bounded 3D hover keep their approved behavior. Bounded 3D hover tilt lives inside the position wrappers, preserving the rotor pivot and native play target. Vertical touch scrolling and reduced motion remain supported.
- Browsing releases is silent and does not initialize the media provider; playback begins only after an explicit play request. The external player panel is removed; a compact source link accompanies the native CD, seek and volume controls.
- Reference-calibrated Frutiger Aero grading: steel-blue sky, sage/teal shadows and luminous sunlit grass. Balanced saturation and restored contrast replace the overly-flat 1.4.2 look; artist, album art and bubble movement stay untouched.
- Four official social profiles (YouTube, Spotify, Instagram and SoundCloud); X/Twitter is intentionally excluded.
- Mobile composition, accessible native controls, local fonts, SEO metadata and restrictive response headers.

No audio is downloaded or re-hosted. The SoundCloud SDK and iframe load after a user gesture; the disc rotates only after the provider confirms playback. A provider restriction, ad, blocked network or additional browser gesture requirement cannot be bypassed by the site. The official widget remains the playback transport behind the custom controls; the verified source link opens the track when needed.

**Playback verification limit:** the real provider initialized and returned track metadata, but paused at 0:00 in the test browser, including after a direct click in its official player. Continuous audio was not confirmed. The site handles that state explicitly; the passing automated media checks use simulated provider events. See [the full validation record](docs/VALIDATION.md#real-soundcloud-check-and-its-limit).

## Content editing

| Content | File |
| --- | --- |
| Biography, navigation and social URLs | `index.html` |
| Track IDs, metadata and covers | `src/lib/player.ts` and the jewel-case buttons in `index.html` |
| Hero type and controls | `src/style.css` |
| Two generated layers, portrait layout and continuous field | `src/scenery.css`, `public/assets/layers/reference-*` |
| Former tiled field (historical; no longer active) | `src/lib/field-detail.ts` |
| Music composition, jewel-case materials and disc pivot | `src/music.css` |
| CD timeline, pointer dragging, capture, hover tilt and cancellation | `src/lib/disc-interaction.ts` |
| Bubble optics, frame budgets and optical field | `src/graphics/bubble.ts` |
| Cached GPU typography, underline and packed glow masks | `src/lib/bubble-text.ts` |
| Wheel interpolation, same-frame depth synchronization and input ownership | `src/lib/smooth-scroll.ts`, `src/lib/parallax.ts`, `src/main.ts` |
| Device default, preference persistence and menu | `src/lib/quality.ts` |
| Native scroll depth factors | `data-depth` values in `index.html` |
| Asset origin, exact prompts and rights | `docs/LAYER-ASSETS.md`, `docs/asset-provenance.md`, `docs/artist-sources.json` |

The artist's age is reproduced from the supplied design, not calculated from an unverified birth date. Recheck that copy with the artist before future releases.

## Deployment

Vercel project: **heinem**, in the existing ItsDeimox team. Git repository: **ItsDeimox/checkpoint-portfolio**, production branch **main**, root directory **heinem**, Node **24.x**, framework **Vite**, install **npm ci**, build **npm run build**, output **dist**. The only intended public project alias is `heinem.vercel.app`.

The **v1.5 reference artwork and layer rebuild** is documented in [REFERENCE-HERO-1.5.md](docs/REFERENCE-HERO-1.5.md). The historical **v1.3 scroll, asset-detail and disc-interaction revision** is documented in [VALIDATION-1.3.md](docs/VALIDATION-1.3.md), with [implementation decisions](docs/INTERACTION-REFINEMENT-1.3.md). That record separates focused tests, integrated results, published verification and playback/hardware limits. The [v1.2 GPU-typography record](docs/VALIDATION-1.2.md), [v1.1 record](docs/VALIDATION-1.1.md) and [v1.0 baseline](docs/VALIDATION.md) remain historical evidence. Code uses conventional commits and the version/changelog in this folder; a package version does not imply a GitHub Release or tag.

## Technical documentation

- [Approved brief](docs/DESIGN.md)
- [Approved artwork and exact implementation — v1.5](docs/REFERENCE-HERO-1.5.md)
- [Scroll, field detail, selected portrait and CD interaction — v1.3 (historical)](docs/INTERACTION-REFINEMENT-1.3.md)
- [Current verification — v1.3](docs/VALIDATION-1.3.md)
- [Layered assets and v1.2 decisions](docs/LAYERED-REVISION.md)
- [Asset files and complete generation prompts](docs/LAYER-ASSETS.md)
- [Approved meadow concept and v1.1 decisions](docs/MEADOW-REVISION.md)
- [Implementation plan](docs/IMPLEMENTATION-PLAN.md)
- [Architecture and performance](docs/ARCHITECTURE.md)
- [Validation](docs/VALIDATION.md)
- [Asset provenance](docs/asset-provenance.md)
- [Artist source manifest](docs/artist-sources.json)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)
- Reusable Cortex guidance: [Português](https://github.com/ItsDeimox/Deimox-Cortex/blob/main/Programming/Web3D/Layered-Artist-Sites.md) · [English](https://github.com/ItsDeimox/Deimox-Cortex/blob/main/EN/Programming/Web3D/Layered-Artist-Sites.md)

## License

Original application code and documentation are MIT licensed. The artist's photograph, identity, logo, album artwork and music remain with their respective rightsholders. The Poppins fonts use the SIL Open Font License included in `public/assets/poppins-OFL.txt`.
