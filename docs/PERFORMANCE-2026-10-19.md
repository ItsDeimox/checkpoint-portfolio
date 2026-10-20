# DXRKTHS motion continuity and panel energy

Baseline: `23cc76ab88ca2bffd8a33525e18fb70225b69438` (2026-10-19).

The reference is the WebGL portfolio shipped under `deimoxportfolios/release` in this repository. Its useful techniques are local effect state, sleeping simulations, versioned texture uploads and avoiding inactive rendering work. Existing DXRKTHS optimizations were retained, including uncapped desktop refresh, the bounded GPU submission queue, prepared portal paths, reduced reflection atmosphere and the analytic portal shader.

## Reproduced faults and fixes

| Fault | Evidence | Correction |
| --- | --- | --- |
| Continuous portal zoom discarded motion history | The portal owns `cameraRig.mode = 'portal'`, but optics recognized only the ordinary approach/return modes. | Explicitly authorize portal projection animation. Default camera-cut rules remain in force outside that journey. |
| Approved doorway motion exceeded ordinary speed guards | Actual paths reached 47.460533 units/s on mobile and 2.758918 rad/s across sampled viewport/pointer extremes. | Portal-only limits of 48 units/s and 3 rad/s, retaining absolute limits of 3 units and 0.25 radians per draw. Camera paths, FOV and duration are unchanged. |
| Page presentation ran ahead of the tunnel under GPU backpressure | Two simulation updates after a drawn pose published two additional CSS transforms without a new tunnel frame. | Retain only the latest progress sample and publish it in `prepareFrame()`. Completion still hands over on the authored clock, with the final page pose preceding navigation. |
| Car velocity referred to the last simulation tick | Skipped submissions advanced the car without advancing the previous rendered camera/depth frame. | Calculate car rotation from its last rendered angle. Repeated draws of one pose have zero object motion. |

The behavior tests exercise the actual camera, portal, route-presentation and optics classes. Entry and retreat cover all five doors at desktop, portrait mobile and ultrawide dimensions. Camera cuts, pauses, stalled draws, cancellation, disposal and ordinary external zoom retain their safeguards.

## Rendering work removed

- The lens gathers the same sample counts using a precomputed aperture basis. Standard projections recover view distance from depth coefficients; oblique projections retain the original reconstruction.
- When both depth of field and motion blur are inactive, the first active effect reads the resolved scene directly. The scene target stays independent from the composer's alternating buffers; portal, bloom, grading and output order are preserved.
- Display restoration noise and content sampling run only when their contribution is active. Transparent smoke corners exit before noise work. Flat display cover glass uses one transparent draw.
- Quality preparation batches up to four cheap target initializations, yielding after a costly allocation. It still waits for submitted GPU work. Warmup no longer resets the canvas and its prepared storage. A real viewport resize during asynchronous warmup remains authoritative, keeping the renderer, optics and camera in agreement.

High quality keeps its existing resolution budget, antialiasing and 32-sample aperture. No automatic quality downgrade or new frame-rate cap was introduced.

## Distinct panel hover

Physical panels now own a planar lattice of zigzag rails and alternating cross-ribs. Every interior junction has three neighbours; waves split and rejoin around elongated six-edge cells. The solver and shader use the same connections, so propagation stays on the visible material. Original emission gains, pointer interaction and afterglow remain. The separate Play Now cube is unchanged.

For a square panel, the new field has **1,044 vertices and 1,516 edges**, versus **3,458 vertices and 6,912 edges** in the former six-face field. Its atlas contains **4,176 floats rather than 15,000**. Actual dimensions follow each panel's physical aspect ratio. Pointer injection touches a local neighbourhood; fixed substeps are bounded, frame buffers are reused, and sleeping fields generate no uploads.

## Validation

- `npm run build`: all **65 test files pass**, then 68 deployment files are generated. The bundle is rebuilt from the final sources.
- Native EGL/GLES3 compiles and renders the fully composed materials of all five panels, in active and idle states. Released-wave previews verify the pattern at 200 ms and 600 ms.
- The native lens comparison uses identical 1280×720 HDR color, perspective depth and motion fixtures for the baseline and optimized shaders. Across seven cases, the maximum HDR error is **2.43187e-5**, RMS at most **1.09901e-7**, with zero pixels above 0.001 error. Identity and motion-only output are identical.
- `git diff --check` passes.

The numeric shader evidence and compact previews are in `performance-2026-10-19/native`. Reproduce the full native fixture with `python tools/native-optics-check.py --baseline 23cc76ab88ca2bffd8a33525e18fb70225b69438`; use `--help` for output options.

The available browser cannot create a WebGL context. Native shader validation and motion tests therefore do **not** establish browser FPS or a full-scene GPU timing on the visitor's hardware. Software-renderer timings are not presented as user GPU performance.
