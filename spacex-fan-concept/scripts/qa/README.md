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
