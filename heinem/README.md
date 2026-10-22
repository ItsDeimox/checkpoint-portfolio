# HEINEM

A sunlit artist website with a layered meadow, an interactive iridescent soap-film surface, and a compact-disc interface connected to verified HEINEM releases through the official SoundCloud player.

**Website:** [heinem.vercel.app](https://heinem.vercel.app) · **Version:** 1.0.0 · **Software:** MIT

The site lives independently in [`checkpoint-portfolio/heinem`](https://github.com/ItsDeimox/checkpoint-portfolio/tree/main/heinem). It has its own package, lockfile, license and Vercel project. It does not depend on the other portfolio applications in this repository.

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

`npm run build` includes the TypeScript check and all nine graphics-policy tests, so a failure stops the Vercel build before assets are generated.

Browser checks use Playwright. Install its Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. A preinstalled compatible browser may be supplied through `CHROMIUM_PATH`. `PLAYWRIGHT_BASE_URL` can point the same tests at a deployment.

## What is implemented

- Semantic navigation and biography based on the supplied 1178 × 659 reference.
- Original portrait pixels, separate depth planes, native scroll and foreground grass.
- One small WebGL2 soap-film surface with refraction, soft cloud/grass sampling, color dispersion, animated folds and pointer indentation.
- Auto, Low, Medium and High graphics, with persistent manual choices and independent reduced-motion support.
- Shader and CSS decorative animation pause when the hero leaves the viewport or the tab is hidden.
- A real CD interface, three verified releases, play/pause, track switching, seek, volume and provider fallback.
- Mobile composition, accessible native controls, local fonts, SEO metadata and restrictive response headers.

No audio is downloaded or re-hosted. The SoundCloud SDK and iframe load after a user gesture; the disc rotates only after the provider confirms playback. A provider restriction, ad, blocked network or additional browser gesture requirement cannot be bypassed by the site. The official player and track link remain available.

**Playback verification limit:** the real provider initialized and returned track metadata, but paused at 0:00 in the test browser, including after a direct click in its official player. Continuous audio was not confirmed. The site handles that state explicitly; the passing automated media checks use simulated provider events. See [the full validation record](docs/VALIDATION.md#real-soundcloud-check-and-its-limit).

## Content editing

| Content | File |
| --- | --- |
| Biography, navigation, social URLs, about/contact copy | `index.html` |
| Track IDs, metadata and covers | `src/lib/player.ts` and the track rows in `index.html` |
| Palette, layout, responsive composition and CD material | `src/style.css` |
| Bubble optics and frame budgets | `src/graphics/bubble.ts` |
| Device default, preference persistence and menu | `src/lib/quality.ts` |
| Native scroll depth factors | `data-depth` values in `index.html` |
| Asset origin and rights | `docs/asset-provenance.md`, `docs/artist-sources.json` |

The artist's age is reproduced from the supplied design, not calculated from an unverified birth date. Recheck that copy with the artist before future releases.

## Deployment

Vercel project: **heinem**, in the existing ItsDeimox team. Git repository: **ItsDeimox/checkpoint-portfolio**, production branch **main**, root directory **heinem**, Node **24.x**, framework **Vite**, install **npm ci**, build **npm run build**, output **dist**. The only intended public project alias is `heinem.vercel.app`.

Production was verified on **2026-10-22 UTC**: public HTTPS returned **200**, Vercel reported **READY**, and all **11 browser checks passed against the live URL**. The source commit, deployment ID, headers, bundle sizes and practical limits are recorded in [VALIDATION.md](docs/VALIDATION.md). Code changes use conventional commit messages and the version/changelog in this folder; a package version is not a claim that a GitHub Release or Git tag exists.

## Technical documentation

- [Approved brief](docs/DESIGN.md)
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
