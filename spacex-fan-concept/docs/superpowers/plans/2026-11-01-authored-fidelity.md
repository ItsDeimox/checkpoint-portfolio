# Authored fidelity plan and execution record

Spec: the user requires preauthored/real spacecraft assets only, no procedural substitutes, improved visual fidelity and visual bug fixes. Existing approved layout, studio, adaptive performance and Git deployment remain.

- [x] Inspect sources, licenses and baseline: main 08b9a91; 44 baseline tests.
- [x] Add regression cases for PBR/attribute preservation, source-only runtime and no fabricated internals. Initial five regressions failed, then passed after implementation.
- [x] Replace generated Heavy and Dragon with pinned licensed authored models; remove spacecraft and interior generators.
- [x] Verify visual composition, mobile framing, interactions, asset failures and quality races.
- [ ] Verify production build/tests, publish atomic main commit and check live Git deployment.

Rulings: Falcon 1 has no verified reusable source, so its catalog entry is disabled rather than replaced by generated geometry. Dragon is Jon Ross' historical exterior design study, not a current flight configuration. Heavy is Antonio_Adams' complete low-poly source, not official CAD. No supplied source has verified internal assemblies; original exterior inspection remains, fabricated cutaways are removed. Existing triangles may be partitioned for selection, without adding surfaces or caps.

Importer defects fixed: discarded tangents; first-material-only handling; global PBR clamping; mirrored-transform winding; generation during asset failures. Runtime fixes include source-specific asset mapping, lazy standalone Dragon, stale-LOD request protection and hiding non-neighbor geometry.

Verification: 49 passing unit tests; production build; 29 compiled-preview browser checks plus 7 failure/recovery and interaction checks. Actual render screenshots reviewed. Source asset limitations remain disclosed.
