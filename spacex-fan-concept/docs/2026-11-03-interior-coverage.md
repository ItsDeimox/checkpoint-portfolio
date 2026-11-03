# Inspection of authored interiors

The links below open the production viewer on the hardware itself. Drag to rotate. **Assembled** restores the outer surface. A link with `section` opens the assembled module, while `inside` reveals its internal view.

| Vehicle | Visible hardware |
| --- | --- |
| [Starship upper stage](https://spacex-fan-concept.vercel.app/?inside=starship/fairing) | Cargo structure, three tank domes, transfer tube and wall rings. |
| [Super Heavy tanks](https://spacex-fan-concept.vercel.app/?inside=starship/tanks) | Forward and common domes, transfer tube and reinforcements in the Clarence365 Block 3 model. |
| [Hot-staging ring](https://spacex-fan-concept.vercel.app/?inside=starship/interstage) | The authored vent frame lifts above the collar, exposing the forward dome and its mounts. |
| [Super Heavy engine bay](https://spacex-fan-concept.vercel.app/?inside=starship/engines) | Raptor bank exposed behind the outer heat shield. |
| [Falcon 9 first-stage barrel](https://spacex-fan-concept.vercel.app/?inside=falcon-9/tanks) | Open barrel section, interstage base and engine thrust deck. **Assembled** restores the panel. |
| [Falcon Heavy tanks](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/tanks) | Center barrel section and structural end decks from Giroo’s Heavy. The assembled view includes the two side boosters. |
| [Falcon 9 fairing](https://spacex-fan-concept.vercel.app/?inside=falcon-9/fairing) | Original inner wall of one fairing half, fittings, adapter deck and collar. |
| [Falcon 9 interstage](https://spacex-fan-concept.vercel.app/?inside=falcon-9/interstage) | The aft tank dome of the second stage above the vacuum engine, plus the separation hardware. |
| [Falcon Heavy fairing](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/fairing) and [interstage](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/interstage) | These two inspections isolate the shared Falcon fairing or interstage assembly. Opening the sleeve reveals the aft tank dome, vacuum engine and separation hardware. |
| [Falcon Heavy second stage](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/upperstage) | Giroo’s two full-stage covers enclose the modeled upper-stage tank and vacuum engine. Select the center barrel above the interstage or choose **Stage 2** to load this separate asset. |
| [Crew Dragon cabin reference](https://spacex-fan-concept.vercel.app/?reference=crew-dragon-cabin) | Crew-8 seating photograph and ESA’s in-orbit 360° video from Crew-3 Endurance at 5:26. The native capsule model has no cabin mesh. |

## Geometry and sources

Starship’s exporter batched tank walls, domes, reinforcing hoops and piping by material. The build separates selected source faces before producing the quality variants. Tests compare winding, material, transform and vertex attributes with the pinned input. The high-tier model retains all 912,852 source triangles. These are artist-authored depictions. [Clarence365’s Block 3](https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2)

The Falcon upper-stage dome and payload adapter occupy reviewed triangle ranges within a single original material group. Selection is keyed to the exact high and eco files. The shared Heavy views are limited to hardware SpaceX identifies as common to both launchers. The fairing shows an empty payload bay and its actual modeled fittings. [Stanley Creative’s Falcon 9](https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08) · [SpaceX Falcon User’s Guide, section 2.2](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf#page=13)

The Falcon first-stage common propellant bulkhead and central transfer pipe are still missing. The Falcon 9 source has a barrel and modeled decks at both ends. The Heavy’s center barrel comes from [Giroo’s licensed model](https://sketchfab.com/3d-models/falcon-heavy-60030e62373547fa9364171e6095f31e), registered to the overview axis for inspection. The native Dragon asset includes the docking assembly and heat shield. Its separate visual reference identifies the two crews and credits each source. [Crew-8 cabin photograph](https://images.nasa.gov/details/KSC-20240927-PH-SPX01_0001) · [ESA’s Crew-3 flight video](https://www.esa.int/ESA_Multimedia/Videos/2022/02/Columbus_Kibo_and_a_Dragon_Cosmic_Kiss_360)

Both Falcon tank views link to SpaceX’s Falcon 9 diagram. Figure 2-1 on printed page 6 (PDF page 13) shows the first-stage LOX tank, transfer tube and fuel tank. Section 2.3 describes the common dome and transfer tube for the Falcon vehicles. [Falcon User’s Guide, figure 2-1](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf#page=13)

## Reproducing section selection

From the fleet, click the center of the Heavy booster, then select [**Interstage**](https://spacex-fan-concept.vercel.app/?section=falcon-heavy/interstage) in the part navigation. In the previous release both assembled bounds spanned 13.73 of the viewer’s 14 height units and included the nose. The current interstage isolates the dark sleeve. The side booster nose at the same height still selects its own core.

On Starship, click directly on the [collar between the ship and booster](https://spacex-fan-concept.vercel.app/?section=starship/interstage). The grid fins stay with the booster. The interstage assembly is about 1.79 × 1.01 × 1.79 viewer units. Its internal view exposes the forward dome and mounts. The previous assembled width and depth were 2.57 × 3.35 units because it included the detached fins.

[Compare the rendered sections before and after the fix](section-selection.webp)

![Assembled and open views of the Falcon Heavy second stage and Starship hot-staging ring](upper-stage-and-hot-staging-ring.webp)

## Render cost

The high-detail Starship uses 37,022,010 bytes for its prepared geometry buffers, down from 87,633,792. The high-detail Falcon 9 uses 3,933,790 bytes, down from 11,687,832. These counts sum the vertex attributes and indices in Chromium after loading. The Starship still draws from 912,852 authored triangles. The measurements exclude textures and render targets.

During inspection, moving the pointer across blank space leaves the WebGL frame counter unchanged. A direct Starship inspection also skips the Falcon Heavy overview download. The Heavy second-stage file loads when selected and uses 329,504 bytes in Eco or 3,738,004 in High.
