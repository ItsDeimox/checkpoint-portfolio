# SpaceX Fan Concept

Independent interactive concept by Deimox, based on the five approved cinematic showroom references. Not affiliated with or endorsed by SpaceX.

## Run

Node.js 22. From this directory:

```sh
npm install
npm test
npm run dev
```

`npm run build` outputs the static application in `dist/`. Vercel project root: `spacex-fan-concept/`. Production source: `ItsDeimox/checkpoint-portfolio`, `main`. Do not deploy other monorepo directories or use an unrelated project.

## Experience

A real Three.js/WebGL 3D scene, not a concept screenshot used as a background. Falcon 1, Falcon 9, Falcon Heavy and a licensed Starship Block 3 + Super Heavy visual configuration. Interactive engines, tanks, interstage and payload section. Crew Dragon is available through Human Spaceflight or search. Hover uses a per-part white Fresnel effect. Camera focus, carousel transitions and return are interpolated. Drag rotates; swipe changes vehicle on touch; Escape returns. Every component also has a DOM button.

## Rendering

Licensed GLBs and fallback parametric meshes merged by semantic part and material. PBR surfaces, CC0 HDRI with synthetic PMREM fallback, area lights, five-tap filtered planar floor reflection, contact shadow and two low-cost haze planes. No video backgrounds or full-screen ray marching. Adaptive DPR 1.25/1.75; reflection target 256/768. Render on demand, pause in hidden tabs, respect reduced motion. Quality selector and explicit WebGL failure state.

Models are artistic visual reconstructions, not official CAD. Internal engine plumbing, display poses and surface finish are illustrative. Side previews are independently framed, not a scale comparison. Starship changes over time; the licensed Block 3 asset is a fixed visual reference, not continuously updated CAD.

## Asset provenance and sources

- Licensed model and HDRI authors are credited below and in the About dialog. The original procedural fallback geometry, shaders and UI were created for this concept.
- SpaceX wordmark: https://commons.wikimedia.org/wiki/File:SpaceX_logo_black.svg ; adapted to white. SpaceX is the relevant trademark owner. No endorsement is implied.
- Three.js 0.180.0: MIT, https://threejs.org/
- Michroma and Barlow: SIL Open Font License, via pinned Fontsource packages. Similar geometric title treatment, not a claim to possess SpaceX's proprietary typeface.
- Falcon 9: https://www.spacex.com/vehicles/falcon-9/
- Falcon Heavy: https://www.spacex.com/vehicles/falcon-heavy/
- Dragon: https://www.spacex.com/vehicles/dragon/
- Starship: https://www.spacex.com/vehicles/starship/
- History: https://www.spacex.com/mission/
- Falcon 1 historical engine reference: NASA NLS contract https://www.nasa.gov/wp-content/uploads/2016/08/541918main_nls-contract.pdf

## Structure

`src/data.js`: content and camera focus presets. `src/state.js`: pure state/layout/quality functions. `src/models.js`: geometry and component naming. `src/materials.js`: textures and Fresnel highlight. `src/scene.js`: lighting, reflections, camera, picking and lifecycle. `src/main.js` and `src/style.css`: responsive accessible UI.

Append `?qa=1` to expose a read-only state/stats interface plus a state action dispatcher for automated testing. It contains no credentials or private data.


## Refinement v2: licensed geometry and studio

- Falcon 9 by **Stanley Creative**, CC BY 4.0. Falcon Heavy assembles adapted Falcon 9 cores with original side nosecones.
- Starship Block 3 by **Clarence365**, CC BY 4.0; source geometry including baked outer engines is preserved, with mesh/texture optimization.
- **Studio Small 03** by Greg Zaal / Poly Haven, CC0, replaces the synthetic IBL when available. Background stays black.
- Falcon 1 and Crew Dragon are still original procedural approximations. No model is official SpaceX CAD.
- Source links, authors, license links and modifications are visible in About. `/assets/ATTRIBUTION.json` records exact upstream URLs and hashes.

`npm run assets` downloads pinned public sources, verifies SHA-256, and builds Meshopt-compressed GLBs with WebP textures at two quality levels. `npm run build` runs this automatically; deployed browsers fetch only our own `/assets/` URLs, never third-party model hosts. `.cache/3d/` speeds repeat builds. A source or hash failure fails the build rather than silently substituting different data.

Models are transformed from quantized GLB positions into float coordinates before normalization, then merged by material and semantic part. Low-memory devices select the smaller meshes. Detailed Starship downloads only when requested. The procedural model remains a functional fallback on network failure; source-model textures and geometry are shared and disposed independently from instances. Rendering sleeps when there is no interaction.

The five approved concepts remain the art-direction reference, not a claim of pixel-identical rendering. Browser tests do not establish frame rate on a physical phone.
