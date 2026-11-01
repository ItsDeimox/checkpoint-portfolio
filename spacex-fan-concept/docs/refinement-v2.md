# Showroom refinement v2

Scope: licensed models, studio environment, material calibration and performance while preserving the approved black showroom interface. Only spacex-fan-concept is changed.

## Asset and rendering changes

Falcon 9: Stanley Creative, CC BY 4.0. High mesh approximately 127,560 triangles / 919 KiB; eco approximately 70,557 triangles / 533 KiB. Falcon Heavy uses instanced Falcon cores plus original side nosecones, not an independently sourced Heavy CAD model.

Starship Block 3: Clarence365, CC BY 4.0. Source approximately 912,852 triangles, optimized to 236,923 high and 165,100 eco. Download is deferred until selection. Textures are resized to WebP and GLBs compressed with Meshopt. Models and textures are self-hosted after SHA-256-verified build-time ingestion. About and ATTRIBUTION.json retain authors, licenses, source links and modifications.

Studio Small 03: Greg Zaal / Poly Haven, CC0. HDR illumination is filtered through PMREM, while the background remains black. Area uplight and rim lighting, metallic roughness, floor-reflection falloff/blur and contact shadow are recalibrated. A lightweight synthetic studio and original procedural models remain nonfatal network fallbacks.

Quantized mesh attributes are expanded before world transforms. Semantic mesh merging preserves engine/tank/interstage/payload picking. Shared geometry and textures have explicit ownership. Reduced-motion preferences also disable hover interpolation. Render-on-demand remains active.

## Validation before release

33 Node tests pass, including classification, normalization, quantized-coordinate regression, independent hover uniforms, ancestor visibility, Dragon masking and Heavy instancing.

22 Chromium checks pass: high-detail Falcon, HDR environment, deferred Starship download, real pointer hover and raycast click, Escape/back, Dragon configuration, Heavy and Starship loading, semantic parts, Heavy mesh count, rapid navigation, idle rendering, mobile eco selection, no mobile horizontal overflow, mobile detail/back, failed GLB fallback and interaction, same-origin runtime assets, and no JavaScript or shader errors.

Desktop layouts and mobile 390 x 844 were exercised in Chromium with software WebGL. Full-resolution screenshots can exceed the software renderer's capture timeout; lower-resolution review frames were used. This is not a physical-phone FPS benchmark. No independent reviewer agent was available; code and resource lifecycles were reviewed directly.

## Remaining boundaries

Falcon 1 and Crew Dragon retain the original procedural reconstructions. Falcon Heavy is an adaptation. Third-party models are visualization assets, not official SpaceX engineering data. Exact reference-render equivalence and physical-device performance are not claimed.
