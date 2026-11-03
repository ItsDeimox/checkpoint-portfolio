# Connected tools and visible picking | 2026-11-03

## Tools used, not merely recommended

Context7 was exercised against the exact `/mrdoob/three.js/r180` documentation for loaders and raycasting. The official r180 Raycaster implementation was independently read: it traverses descendants and checks layers, not Object3D.visible. Firecrawl search, live page scraping and developer skill search were exercised for authored rocket sourcing and version-aware asset guidance. Neither tool is part of the visitor bundle. No new runtime dependency or library upgrade was added.

Official versioned reference: https://github.com/mrdoob/three.js/blob/r180/src/core/Raycaster.js

## Measured change

Previously, picking ray-tested hidden geometry and filtered its hits afterward. The replacement builds a visible/selectable candidate list first, reuses intersection arrays and delegates exact intersections to the existing Three.js implementation. It checks hidden ancestors, respects current visibility on every call and clears references to retired inspection meshes.

On six real-model configurations (Falcon 9 engines/interstage and Starship cargo inspection in eco/high), 81 rays each produced exactly the same hit/miss, mesh, face index and distance: **486 matching comparisons**. Mesh ray-test calls per ray changed as follows:

| Internal inspection | Previous | Updated |
|---|---:|---:|
| Falcon 9 engines, eco/high | 6 | 4 |
| Falcon 9 interstage, eco/high | 11 | 6 |
| Starship cargo, eco | 20 | 2 |
| Starship cargo, high | 27 | 2 |

The adjacent JSON retains raw diagnostic counters and single-run timings. They are not randomized hardware benchmarks, frame-rate gains or a claim about every camera angle. The improvement removes work on hidden meshes; it does not simplify a single triangle or texture.

## Verification

Baseline: 112 passing tests. Four of the seven new targeted tests failed against the original picking code and all seven pass with the change. Full suite: 119 passing tests. Compiled browser suite: 15 passing motion/interaction scenarios, no JavaScript/shader errors. Actual desktop/mobile screenshots were captured and reviewed. All 13 model/environment manifest entries remain identical to the preceding source-detail build. Tests use software-rendered Chromium and mobile emulation, not the user's Brave session or physical phone.

## Whole-rocket sourcing remains separate

Firecrawl's additional research was bounded to 30 credits and stopped at that limit, returning incomplete candidate evidence. It did not verify any new whole rocket with the required detailed internal structure and reusable source rights. No assets were bought, ripped, generated or added in this patch. Engines are not counted as extra rockets.

The Stanley Creative Falcon 1 listing was read live and still did not expose a download control or reusable license for that model: https://sketchfab.com/3d-models/falcon-1-spacex-baaf7ee5861a4d818fe9c479ef557a7e

Partial research leads, **not accepted assets**: Alby312's printable Falcon 1 (reported noncommercial terms), TweetTweetPewPew's Blender F9R (inconsistent license wording and no confirmed interiors), Echo_3's low-poly Grasshopper, and AF267's low-detail Starhopper. These require first-party license/download and actual file inspection before acceptance; a search result does not establish eligibility. The investigation is not an exhaustive claim that no suitable asset exists.
