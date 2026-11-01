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

A real Three.js/WebGL 3D scene, not a concept screenshot used as a background. Falcon 1, Falcon 9, Falcon Heavy and an early-flight-test Starship + Super Heavy visual configuration. Interactive engines, tanks, interstage and payload section. Crew Dragon is available through Human Spaceflight or search. Hover uses a per-part white Fresnel effect. Camera focus, carousel transitions and return are interpolated. Drag rotates; swipe changes vehicle on touch; Escape returns. Every component also has a DOM button.

## Rendering

Original parametric meshes merged by semantic part and material. Procedural small textures. PBR surfaces, synthetic PMREM studio, area lights, five-tap filtered planar floor reflection, two low-cost haze planes. No video backgrounds or full-screen ray marching. Adaptive DPR 1.25/1.75; reflection target 256/768. Render on demand, pause in hidden tabs, respect reduced motion. Quality selector and explicit WebGL failure state.

Models are artistic visual reconstructions, not official CAD. Internal engine plumbing, display poses and surface finish are illustrative. Side previews are independently framed, not a scale comparison. Starship changes over time; this model intentionally uses an early flight-test reference configuration.

## Asset provenance and sources

- All rocket geometry, procedural textures, shaders and UI implementation were created for this concept.
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
