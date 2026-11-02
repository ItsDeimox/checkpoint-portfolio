# Source-authored internal assemblies

## Delivered scope

This is a partial internal-geometry update, not a complete engineering reconstruction of every vehicle.

- Falcon 9 interstage: restores the source vacuum Merlin, original interstage pusher/holders and separation attachments previously excluded by the generic upper-stage filter.
- Falcon 9 engines: exposes original Merlin assemblies and Octaweb hardware while fading authored covers and thermal-cloth meshes.
- Starship Block 3: exposes the source cargo rack (Object_15 / Material.463 and Object_16 / Material.462). The latter material is also used by exterior flaps; selection matches node, parent and material, not the material alone.
- ASSEMBLED / INTERNAL STRUCTURE controls exist only when the required preauthored members are actually present. Covers fade first; the camera and pivot then center on the original internal hardware. Return reverses that sequence.
- No geometry, caps, bulkheads, plumbing, tanks or interior walls were synthesized. Existing source PBR maps, transforms and shared geometry remain intact.

## Source fidelity and limits

These are components authored in the already licensed Stanley Creative Falcon 9 and Clarence365 Starship files. They are not manufacturer CAD and cannot certify the actual flight configuration. The new mode explicitly describes its partial source coverage and links to the respective creator.

No verified complete tank interiors, Falcon Heavy internals or Dragon cabin were integrated. Missing source geometry is not replaced by guessed parts. The earlier exterior assets and their source limitations remain unchanged.

Sources rejected during the search include Clarence365's Falcon 9 V4 / Falcon Heavy V4, whose own descriptions explicitly say the interior is not accurate, and a public Merlin Blender repository with no reusable license. Historical S24/S25 internals were not transplanted into the Block 3 vehicle.

Reference pages checked:
- https://sketchfab.com/3d-models/spacex-falcon-9-v4-33e974795a21416eaac38d536ae1ceb9
- https://sketchfab.com/3d-models/spacex-falcon-heavy-v4-a91bccdf8e624997892bab2f0fbec28f
- https://github.com/fabbroniko/spacex-merlin-engine-blender
- https://axmpaperspacescalemodels.com/index.php/upcp_product/falcon-9-interstage-stage-separation-pusher/

## Verification

- 70 unit tests, including eight source-membership, missing-coverage, fade-composition and inner-focus regressions.
- The adjacent JSON audit records identical input/output triangle totals for all six existing high/eco rocket assets; every inspection mesh shares a source geometry reference.
- Browser coverage includes original-feature controls, missing-module messages, high/low refresh, return, mobile framing, idle rendering and transition interruption.
- Tests use software-rendered Chromium and mobile emulation, not physical-device frame-rate certification.
