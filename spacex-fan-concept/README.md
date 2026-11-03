# SpaceX Fan Concept

An independent Three.js/WebGL design study by Deimox. Not commissioned, affiliated with or endorsed by SpaceX.

## Run

```sh
npm ci
npm run assets
npm run dev
npm test
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

The build fetches pinned, SHA-256-verified source files, optimizes copies and self-hosts content-addressed GLBs and textures. Source models are not downloaded from third-party hosts at runtime.

## Authored geometry only

Falcon 9, the complete Falcon Heavy, Starship Block 3 and the Dragon 2 capsule use preauthored licensed files. Falcon 1 remains in the historical catalog but is unavailable until a suitable reusable asset is verified. No spacecraft generator, synthetic fallback or invented internal assembly is used.

Select a module to isolate its geometry. **Tanks** hides the outer front half for a source-authored section on the first click or tap; it does not create a missing internal bulkhead. Select **Assembled** to close it. Falcon 9 exposes the barrel and structural end decks. Falcon Heavy shows Giroo’s center barrel and the side booster bodies from Antonio_Adams’ model. Its standard fairing and interstage use the shared Falcon reference. Select **Stage 2** above the Heavy interstage to load Giroo’s separate upper-stage model. The cutaway shows its modeled fuel tank and vacuum engine. On Starship, **Lift vent frame** raises the cage above the fixed forward dome and collar. The grid fins stay with the booster. The artist models omit the Falcon first-stage propellant divider and transfer pipe. Coverage and direct links are in [the interior inventory](docs/2026-11-03-interior-coverage.md).

The studio retains HDR reflections, restrained bloom, floor reflection, Fresnel hover and adaptive low/medium/high budgets. Rendering pauses while idle. Import preserves original PBR maps, material groups, UV channels, normals and tangents. Mobile variants reduce geometry and texture size; detailed assets load only when needed. Failed requests show retry rather than replacement geometry.

## Sources and licenses

- Falcon 9, Stanley Creative, CC BY 4.0: https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08
- Falcon Heavy center-core and upper-stage inspection meshes by Giroo, CC BY 4.0. https://sketchfab.com/3d-models/falcon-heavy-60030e62373547fa9364171e6095f31e
- Falcon Heavy (Low Poly), Antonio_Adams, CC BY 4.0: https://sketchfab.com/3d-models/spacex-falcon-heavylow-poly-0dc068a462e34258b3872085a7f592c8
- Starship Block 3, Clarence365, CC BY 4.0: https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2
- Dragon 2, KUBAHA, CC BY 4.0: https://sketchfab.com/3d-models/spacex-dragon-2-1b125e30a2cb442288580290536fbe5d
- Studio Small 03, Greg Zaal / Poly Haven, CC0: https://polyhaven.com/a/studio_small_03

Pinned mirrors and checksums are in `scripts/prepare-assets.mjs` and `scripts/authored-assets.json`. The build writes `/assets/ATTRIBUTION.json`; the About dialog records authors, licenses and adaptations. Michroma and Barlow use the SIL Open Font License. SpaceX marks identify this independent concept.

## Validation and boundaries

`npm test` runs source-preservation, navigation, framing, quality and ownership regressions. Optional reproducible Linux browser checks are documented in `scripts/qa/README.md`; they cover desktop, portrait, landscape, errors, retry, quality switching and idle rendering.

Models are artistic references, not official engineering CAD. Heavy's source is low-poly; Dragon includes its source-authored docking hardware and heat shield, but no cabin. No invented internals are presented as real. The approved concepts remain an art-direction target, not a claim of identical rendering. Software-rendered mobile emulation does not establish physical-phone frame rates.

## Commercial-readiness work

The current phase adds a vendor-neutral command adapter, keyboard inspection, a static HTML catalogue, third-party notices and build integrity/size gates. It does not establish legal clearance or complete engineering fidelity. See [commercial preparation](docs/commercial/README.md), [executed validation](docs/commercial/validation.md) and [integration protocol](docs/commercial/integration.md). No outreach was sent.

## Source detail and individual engines

High quality preserves source vertex attributes and uses lossless Meshopt encoding. In the Heavy, the losslessly repacked texture maps are checked pixel for pixel. Source triangles and winding are conserved; the codec may cyclically rotate face indices. Low and Medium use the lighter geometry and texture budgets. This maximizes the available source detail, not manufacturer accuracy or missing interiors.

Select Falcon 9 or Falcon Heavy engines, then **FULL ENGINE**, to inspect a separate authored Merlin 1D. Falcon 9's interstage also offers a separate Merlin Vacuum model. These files are by MartianDays, CC BY 4.0, pinned through the public Objaverse mirror with original source metadata. They show their supplied upper assembly/nozzle; hidden combustion and turbine internals are not modeled. ASSEMBLED returns to the original rocket component. No new fleet vehicle passed the fidelity/internal-coverage review in this update.
