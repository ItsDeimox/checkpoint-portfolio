# Version-aware picking optimization

User requested using newly installed Context7 and Firecrawl to improve the existing viewer. Context7 was resolved to /mrdoob/three.js/r180 and its Raycaster/loader guidance was checked against pinned r180 source. Firecrawl searches source listings and developer skills; no fetched script is executed.

Baseline: df198d1. Existing pick() recursively ray-tests all source meshes and filters hidden objects afterward. Three r180 does not filter Object3D.visible in Raycaster. Hypothesis: prefilter effectively visible/selectable meshes, use a reusable target array and keep exact nearest intersections; reduce hidden work without changing geometry, textures, orientation or visuals.

Scope: one helper, existing pick() wiring, targeted regression tests and documented evidence. No library upgrade, model substitution, synthetic interiors or unrelated redesign.

- [x] Run baseline and reproduce unnecessary hidden-mesh ray tests.
- [x] Implement visible candidate filtering and reusable raycast buffers.
- [x] Compare selections and mesh ray-test counts using real source assets; browser smoke plus build/unit checks.
- [ ] Publish only exact tested files to main, verify Git deployment and domain.

Model acquisition remains distinct: additional engines do not count as additional rockets. Source/license/interior evidence is required before accepting a vehicle. No new rocket is promised by this optimization.

Evidence: 119 unit tests; 15 compiled interaction tests; 486 identical real-source ray selections with hidden mesh calls reduced to zero. Thirteen asset/environment entries unchanged. Publication remains gated on exact tested blob comparison and Git deploy confirmation.
