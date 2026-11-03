# Source detail and authored engine inspection

## Delivered

High quality now preserves the pinned source vertex attributes, normal/UV/tangent channels, triangles and original encoded texture images. Lossless Meshopt compression may cyclically rotate triangle index triples without changing face order or winding. The build decodes each high-tier output and compares attribute, face and image signatures with the source before accepting it. This preserves the available artist-source detail; it does not turn that source into exact manufacturer geometry.

Falcon 9: 147,215 to 157,889 triangles. Starship Block 3: 608,667 to 912,852. The Heavy retains 15,670 triangles with its original 2K maps rather than another lossy image conversion. Dragon retains 42,974 source triangles and its existing approved docking pose. The four previous eco model files and studio HDR have identical hashes; Low and Medium therefore keep their existing assets.

Two actual licensed models have been added: Merlin 1D and Merlin 1D Vacuum by MartianDays. Sources and hashes are pinned in `scripts/authored-assets.json`, with the creator's attribution preserved inside the GLBs. They are fetched on explicit selection, not on landing. Select engines on Falcon 9 or Heavy, then FULL ENGINE; select Falcon 9 interstage for the vacuum version. ASSEMBLED restores the original component. Their upper assemblies and nozzles are supplied geometry, not procedural fill. The vacuum creator describes a minimalist interpretation; neither file includes a complete internal turbine/combustion cutaway.

## Boundaries

This is a partial response to the complete-fidelity request. No new fleet rocket passed the requested quality/internal-coverage standard. The current tanks and Dragon cabin still do not have complete verified internal assets. No generated caps, fake plumbing, unsupported interiors or manufacturer-CAD claims were added. Original internal-structure controls remain limited to the existing source hardware.

High files are larger: Falcon 9 3,601,276 bytes, Heavy 8,979,476, Dragon 706,740, Starship 8,554,532. Per-file release limits are 10 MB / 1 million triangles for High and the previous 8 MB / 700,000 for eco. This is not a physical-device FPS guarantee. Automatic graphics selection, idle pause and the original lighter tiers remain active.

## Sources

- Merlin 1D: https://sketchfab.com/3d-models/merlin-1d-088a207cae57488f876bbc16daf2148d
- Merlin 1D Vacuum: https://sketchfab.com/3d-models/merlin-1d-vacuum-f20ebb6e857b405cbdc66568d48d2fcb
- Public distribution mirror: https://huggingface.co/datasets/allenai/objaverse/tree/556637099bf4fa79ea7b239d0d9c328b8a2e9ac8

Each asset's own CC BY 4.0 metadata applies; the dataset's general terms are not used as a substitute for the asset license.

## Verification

112 unit tests pass. The compiled build with production CSP passed eight new-view/source-detail checks, fifteen prior internal-hardware regressions, fifteen motion regressions, and four failure/retry, rapid-quality, idle and automated-accessibility checks. Chromium software rendering with a portrait viewport was used; not physical-device benchmarking. Original eco files were compared by SHA-256. The public deployment is checked separately after Git publication.
