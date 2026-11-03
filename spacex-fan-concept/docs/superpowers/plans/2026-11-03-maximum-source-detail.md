# Maximum source detail and model acquisition implementation plan

Goal: preserve the highest detail actually present in the licensed model sources, while evaluating replacements against the requested real-vehicle/internal-geometry standard.
Architecture: lossless high-tier asset path, untouched existing mobile variants, per-asset source-detail evidence and bounded release budgets. Do not manufacture missing internals or mislabel artist models as manufacturer CAD.
Stack: Three.js 0.180.0, glTF Transform 4.5.1, Meshoptimizer 1.3.0, Vite 7.3.7, Node 22.
Spec: user's request for maximized real-model fidelity, complete internal parts, and additional SpaceX rockets only at comparable quality. No purchase or outreach was authorized.

- [x] Read main and baseline (104 tests), inspect licensed sources and alternative GLB/USDZ models.
- [x] Add failing tests for float/normal/UV/index/image preservation through high-tier compression and bounded output sizes.
- [x] Remove high-tier geometric simplification, additional attribute quantization and lossy image transcoding. Keep low/medium files unchanged.
- [x] Decode outputs and prove every high-tier mesh attribute/index and texture matches the pinned source after its existing approved pose adaptation.
- [ ] Render actual low/high views, rotation/zoom/interiors and adaptive quality; inspect screenshots; publish exact tested files via Git integration.

Acquisition outcome so far: S24/B7 has source-authored assemblies but is not accepted as a new faithful flight configuration (includes landing-leg and payload interpretations not verified against that vehicle). Clarence Falcon 9/Heavy V4 and Block 3 creator descriptions explicitly disclaim interior accuracy. The sampled alternative Heavy source is not an upgrade sufficient to justify replacement. Falcon 1 source quality/download/license are not verified. STL downloads inspected return access errors; do not invent downloads or bypass required authentication. No new model has yet passed all acceptance criteria.

This delivery must not claim the complete-interior request is solved by source preservation. Preserve missing-coverage messages and all approved UI, lighting and motion. Research decisions are recorded separately from shipped functionality.

Additional accepted scope: two separately licensed MartianDays engine GLBs, explicitly labeled artist exterior references, loaded only on FULL ENGINE selection. They are not transplanted into existing clusters. New state/selection tests pass. All candidate research files are excluded from the release. Source-attribute and image equality was verified after encoding; triangle comparison accepts only cyclic rotation and rejects reversed winding. 112 unit tests pass. Public deployment remains to be verified.
