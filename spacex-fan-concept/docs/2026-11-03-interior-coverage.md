# Inspection of authored interiors

The links below open the production viewer on the hardware itself. Drag to rotate. **Assembled** restores the outer surface.

| Vehicle | Visible hardware |
| --- | --- |
| [Starship upper stage](https://spacex-fan-concept.vercel.app/?inside=starship/fairing) | Cargo structure, three tank domes, transfer tube and wall rings. |
| [Super Heavy tanks](https://spacex-fan-concept.vercel.app/?inside=starship/tanks) | Forward and common domes, transfer tube and reinforcements in the Clarence365 Block 3 model. |
| [Hot-staging ring](https://spacex-fan-concept.vercel.app/?inside=starship/interstage) | Vent posts, attachments and ring surrounding the forward dome. |
| [Super Heavy engine bay](https://spacex-fan-concept.vercel.app/?inside=starship/engines) | Raptor bank exposed behind the outer heat shield. |
| [Falcon 9 fairing](https://spacex-fan-concept.vercel.app/?inside=falcon-9/fairing) | Original inner wall of one fairing half, fittings, adapter deck and collar. |
| [Falcon 9 interstage](https://spacex-fan-concept.vercel.app/?inside=falcon-9/interstage) | The aft tank dome of the second stage above the vacuum engine, plus the separation hardware. |
| [Falcon Heavy fairing](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/fairing) and [second stage](https://spacex-fan-concept.vercel.app/?inside=falcon-heavy/interstage) | The assembled view uses the Heavy model. The internal view uses just the shared standard fairing or the second-stage aft tank dome and vacuum engine from Stanley Creative’s Falcon 9. |
| [Crew Dragon cabin reference](https://spacex-fan-concept.vercel.app/?reference=crew-dragon-cabin) | Crew-8 seating photograph and ESA’s in-orbit 360° video from Crew-3 Endurance at 5:26. The native capsule model has no cabin mesh. |

## Geometry and sources

Starship’s exporter batched tank walls, domes, reinforcing hoops and piping by material. The build separates selected source faces before producing the quality variants. Tests compare winding, material, transform and vertex attributes with the pinned input. The high-tier model retains all 912,852 source triangles. These are artist-authored depictions. [Clarence365’s Block 3](https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2)

The Falcon upper-stage dome and payload adapter occupy reviewed triangle ranges within a single original material group. Selection is keyed to the exact high and eco files. The shared Heavy views are limited to hardware SpaceX identifies as common to both launchers. The fairing shows an empty payload bay and its actual modeled fittings. [Stanley Creative’s Falcon 9](https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08) · [SpaceX Falcon User’s Guide, section 2.2](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf#page=13)

The Falcon first-stage common propellant bulkhead and central transfer pipe are still missing. The pinned Falcon 9 stage body contains only its outer tube. Inspection of additional CC-licensed models by Forest Katsch, artemycz and Giroo did not verify the missing first-stage assembly. The native Dragon asset includes the docking assembly and heat shield. Its separate visual reference identifies the two crews and credits each source. [Crew-8 cabin photograph](https://images.nasa.gov/details/KSC-20240927-PH-SPX01_0001) · [ESA’s Crew-3 flight video](https://www.esa.int/ESA_Multimedia/Videos/2022/02/Columbus_Kibo_and_a_Dragon_Cosmic_Kiss_360)
