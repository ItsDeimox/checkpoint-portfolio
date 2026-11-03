# Visual review of every available inspection section (3 November 2026)

Captured directly from the production WebGL viewer at 1280×720, assembled and cutaway views, with additional review of source files. This is a visual QA checklist, **not** evidence that the models are engineering CAD.

| Vehicle | Piece | Assembled | Cutaway | Visual finding |
|---|---|---|---|---|
| Falcon 9 | Engines | [view](https://spacex-fan-concept.vercel.app/?section=falcon-9/engines) | [open](https://spacex-fan-concept.vercel.app/?inside=falcon-9/engines) | Recognizable nine nozzles; reflections are strong; no full turbine internals |
| Falcon 9 | Tanks | [view](https://spacex-fan-concept.vercel.app/?section=falcon-9/tanks) | [open](https://spacex-fan-concept.vercel.app/?inside=falcon-9/tanks) | Was two disconnected-looking hull halves; cutaway now retains only the real rear skin/end decks; *bulkhead and feed pipe absent* |
| Falcon 9 | Interstage | [view](https://spacex-fan-concept.vercel.app/?section=falcon-9/interstage) | [open](https://spacex-fan-concept.vercel.app/?inside=falcon-9/interstage) | Vacuum nozzle and aft deck visible, but the cover used to vanish; retain source rear half-shell |
| Falcon 9 | Payload | [view](https://spacex-fan-concept.vercel.app/?section=falcon-9/fairing) | [open](https://spacex-fan-concept.vercel.app/?inside=falcon-9/fairing) | Fairing lining and adapter, empty bay; limited by artist's model |
| Falcon Heavy | Engines | [view](https://spacex-fan-concept.vercel.app/?section=falcon-heavy/engines) | [open](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/engines) | Three clusters of nine; source exterior only |
| Falcon Heavy | Tanks | [view](https://spacex-fan-concept.vercel.app/?section=falcon-heavy/tanks) | [open](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/tanks) | Center barrel originally opened into two detached tubes; hide front skin without inventing a common bulkhead |
| Falcon Heavy | Interstage | [view](https://spacex-fan-concept.vercel.app/?section=falcon-heavy/interstage) | [open](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/interstage) | Uses shared Falcon sleeve and engine hardware; rear half-shell provides context |
| Falcon Heavy | Stage 2 | [view](https://spacex-fan-concept.vercel.app/?section=falcon-heavy/upperstage) | [open](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/upperstage) | Full yellow/orange source tank and engine; artist-authored paint, not verified manufacturer finish |
| Falcon Heavy | Payload | [view](https://spacex-fan-concept.vercel.app/?section=falcon-heavy/fairing) | [open](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/fairing) | Shared Falcon fairing, no payload interior |
| Starship | Raptors | [view](https://spacex-fan-concept.vercel.app/?section=starship/engines) | [open](https://spacex-fan-concept.vercel.app/?inside=starship/engines) | Source Raptor bank is recognizable, no internal engine passages |
| Starship | Super Heavy Tanks | [view](https://spacex-fan-concept.vercel.app/?section=starship/tanks) | [open](https://spacex-fan-concept.vercel.app/?inside=starship/tanks) | Actual domes, transfer pipe and reinforcement rings; sparse with outer skin removed |
| Starship | Hot-staging ring | [view](https://spacex-fan-concept.vercel.app/?section=starship/interstage) | [open](https://spacex-fan-concept.vercel.app/?inside=starship/interstage) | Original vent frame detaches upward from the dome; earlier review found overly hot dome highlights |
| Starship | Ship / Payload | [view](https://spacex-fan-concept.vercel.app/?section=starship/fairing) | [open](https://spacex-fan-concept.vercel.app/?inside=starship/fairing) | Original rack, tank domes and rings are sparse; not a complete interior |
| Crew Dragon | Capsule | [view](https://spacex-fan-concept.vercel.app/?capsule=dragon) | [real cabin references](https://spacex-fan-concept.vercel.app/?reference=crew-dragon-cabin) | Native mesh contains docking hardware and heat shield, **no cabin mesh** |
| Falcon 9 / Heavy | Merlin 1D | [single engine](https://spacex-fan-concept.vercel.app/?engine=falcon-9/engines) | n/a | Separate licensed exterior motor |
| Falcon 9 | Merlin Vacuum | [single engine](https://spacex-fan-concept.vercel.app/?engine=falcon-9/interstage) | n/a | Separate licensed exterior motor |

## Visual corrections from this review

- Removed lateral tilt from both Falcon and Super Heavy tank detail presets.
- Front half-shells of the Falcons now disappear in cutaway rather than slide away as floating cylinders; the rear wall and original structural decks stay aligned.
- The Falcon interstage is separated into front and back halves **using only existing source triangles**. The back half remains visible in internal view so the vacuum engine is not floating without its sleeve.
- No fabricated propellant plumbing, missing internal bulkhead, tank caps or fuel volumes have been added.
- All artist sources stay marked as unverified engineering accuracy; missing internal geometry remains explicitly disclosed.

## Validation boundary

These screenshots are from the live browser, not model-source verification or a benchmark of physical GPU FPS. The goal is a legible honest cutaway; missing physical hardware requires a separately licensed and vetted preauthored 3D model.
