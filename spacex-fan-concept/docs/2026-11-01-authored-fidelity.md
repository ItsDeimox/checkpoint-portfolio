# Authored geometry and visual fidelity

This update supersedes the generated spacecraft and illustrative-internals approach described in the earlier cinematic-inspection report.

## Changes

- Removed procedural spacecraft, generated side nosecones, invented internal assemblies and generated asset-failure fallbacks.
- Falcon Heavy uses Antonio_Adams' complete CC BY 4.0 model. Dragon uses Jon Ross' CC BY 4.0 historical exterior study, explicitly labeled as such.
- Disabled Falcon 1 until a suitable reusable source is verified. An unavailable source is never replaced by invented geometry.
- Preserved source PBR factors/maps, every material group, tangents and UV attributes. Corrected mirrored-transform winding.
- Corrected Falcon 9's default authored-model orientation. Landing gear remains in the overview but no longer enlarges the engine-inspection bounds.
- Corrected mobile module placement to clear the information panel. Isolated views retain supplied geometry only; no clipping, caps or fabricated internal components.
- Kept adaptive graphics, HDR bloom/reflection and idle-render pause. Added last-request-wins asset switching, retry, bounded anisotropy and content-addressed asset cleanup.

## Evidence

- 49 unit tests passing, 0 failures.
- Production build completed with pinned asset verification and self-hosted outputs.
- 29 browser checks plus 7 error/recovery/interaction checks passed on the compiled production preview, using Chromium 141 and Playwright 1.56.1.
- Checked 1440x900, 390x844, 320x568 and 844x390 layouts; inspected actual WebGL screenshots, including model orientation, Heavy/Dragon and mobile engine framing.
- Browser tests use software rendering and mobile emulation, not physical-device performance certification.

## Remaining fidelity limits

These licensed artistic models are not official CAD. Heavy is a low-poly source, Dragon is historical, Falcon 1 is unavailable, and verified internals are absent. This update does not claim complete concept-render parity or elimination of every possible visual defect. No generated images are used as the 3D viewport.
