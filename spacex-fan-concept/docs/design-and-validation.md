# Approved design and implementation ledger

## Authority
Deimox explicitly approved five concept images on November 1, 2026 and authorized implementation, GitHub publication and a Git-connected Vercel deployment. No redesign or additional approval round. Preserve the monochrome studio, full-height rocket, right-side title, dim adjacent vehicles, white highlights, engine/fairing close-ups and soft reflective floor.

## Decisions
Isolated vanilla JavaScript/Three.js/Vite application under `spacex-fan-concept/`. No existing site changed. Original segmented visual geometry chosen over downloading a model with unverified rights. No representation of official engineering CAD or current Starship manufacturing detail. English UI follows the approved images. Source information and an unofficial-concept disclaimer are accessible in About.

The alternative of a screenshot as the hero was rejected because actual picking, rotation and camera transitions are required. Heavy photogrammetry or path tracing was rejected for mobile suitability. The DXT source was inspected for PMREM, planar reflection, input and rendering-budget techniques.

## Execution
1. State/layout tests written and observed failing before implementation, then passing.
2. Geometry contract tests written and observed failing before geometry implementation.
3. Isolated remote browser validation is used because the local container cannot resolve outbound hosts.
4. Publication must follow source commit -> Git integration -> verify exact SHA/READY/domain. A commit alone is not deployment proof.

## Pending at initial implementation checkpoint
Run geometry tests after dependency installation; inspect desktop/mobile screenshots, exercise all controls, check console and idle frame count, then record results before production publication.
