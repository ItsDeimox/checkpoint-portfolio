# Browser verification

These optional Linux checks use Chromium 141 software rendering. They are not physical mobile FPS benchmarks. The application bundle does not include these dependencies.

Run the site locally on port 4173 (or set `BASE_URL` to another development/preview/production URL), then:

```sh
npm --prefix scripts/qa install --no-audit --no-fund
npm --prefix scripts/qa test
```

The host needs Chromium shared libraries (NSS, GBM, ALSA, Pango and X11). Reports and screenshots are written under `/tmp/fidelity-*`.

`authored-browser.mjs` covers the available vehicles/modules, source-only unavailable states, responsive framing, rotation, return, quality tiers/races, idle behavior and repeated-inspection resource counts. `authored-edge.mjs` additionally blocks a model request to test failure/retry without generated fallback, and checks mobile panel clearance, navigation and normal-motion transitions.

`node scripts/qa/viewer-motion.mjs` checks continuous mouse/touch carousel tracking, intermediate isolation fades, camera-relative XY rotation, safe zoom, bloom extraction resolution, interrupted transitions, idle rendering and reduced motion. It uses real pointer events. Motion checks run on the low tier under CPU software rendering; high-tier bloom resolution and static rendering are checked separately. This is not a hardware FPS benchmark.

`node scripts/qa/source-interiors.mjs` checks source-only assembly capabilities, restored Falcon interstage hardware, the Starship cargo rack, per-module missing-coverage messages, internal/assembled controls, quality refresh, camera framing, idle rendering and interruption. It deliberately does not assert that artist geometry is certified flight hardware or that unavailable tank interiors exist.

`npm --prefix scripts/qa run commercial` verifies keyboard inspection, same-origin embedding, the HTML-only catalogue, save-data behavior, third-party notices and automated accessibility in six UI/page states. It injects axe-core only for testing and never adds it to the application bundle. Run with `BASE_URL` pointing to the compiled preview or public deployment. Manual assistive-technology and physical-device review remain required.

`node scripts/qa/max-detail.mjs` verifies the source-preserving high assets, opt-in Merlin/Merlin Vacuum inspection, all three supported entry points, high/low replacement, portrait framing, original interior mode and runtime errors. It uses the same optional QA dependencies. These checks do not certify hidden internals or real-phone frame rates.

`node scripts/qa/engine-edge.mjs` additionally checks failed-request retry without generated fallback, fast quality changes, idle pause and automated accessibility in an individual engine view.

`BASE_URL=http://localhost:4173/ npm --prefix scripts/qa run retention` checks that source-asset quality replacement and portrait/landscape resizing preserve the inspected orientation, while double-click and keyboard reset restore zoom/pose consistently. Covers capsule, standalone engine, engine assembly and supported internal mode.

`npm --prefix scripts/qa run assets` runs the Khronos glTF Validator on losslessly decoded copies of every GLB in the local manifest, checking each original hash first. Install the optional QA dependencies and prepare assets first. It exits nonzero on errors, warnings or truncated output and writes `/tmp/spacex-gltf-validation.json` (override with `ASSET_REPORT`). It never edits source/published models. These are file-format checks, not approval of missing interiors, real-vehicle accuracy or redistribution rights.
