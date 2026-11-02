# Source-authored interior inspection implementation plan

Goal: expose available preauthored internal assemblies without fabricating missing rocket internals.
Spec: the user requests faithful real/preauthored internal parts, never procedural fill. Preserve the approved viewer, motion, performance and original asset licenses.
Architecture: explicit, source-specific assembly metadata before batching; preserve original vertices and transforms; restore the Falcon interstage hardware excluded by stage filtering; smoothly attenuate enclosing meshes only where an inspected source assembly exists. Capabilities are per module, never an unsupported global cutaway claim.
Stack: Three.js 0.180.0, Vite, node:test and Playwright/Chromium.

Evidence: baseline e27c5a8, 62 unit tests. Original Stanley Creative F9 includes the vacuum Merlin, interstage pusher/holders and detachers. The stage filter tagged engine holders as upper and excluded all upper geometry in interstage inspection. Original Clarence365 Block3 includes Object_15 / Material.463 and Object_16 / Material.462, an interior cargo rack; the latter material also appears on exterior flaps, so material-only matching is unsafe. Source geometry audit and actual source render reviewed.

Rulings: no new spacecraft geometry or caps. No transplanted generic tanks. Public Clarence F9 V4/Falcon Heavy V4 entries explicitly describe their interiors as inaccurate, so those are rejected. A public Merlin Blender repository has no reuse license, so is not imported. Existing source-authored assemblies are artistic references, not certified manufacturer CAD; internal tank, Heavy and Dragon coverage remains unavailable.

- [x] Add failing metadata, omitted-hardware, partial-coverage, material-sharing and fade composition regressions.
- [x] Preserve assembly membership in the importer and restore the corresponding authored geometry in inspection.
- [x] Add source-structure inspection controls with composable fades and explicit limited-coverage notes.
- [ ] Verify all baseline/motion tests, actual source vertex/triangle conservation, browser interactions and screenshots.
- [ ] Publish tested files on main through Git integration; verify deployment and public build.

Review focus: absent/partial source assemblies, low/high mesh variants, source material reused on exterior flaps, interruption during fade, geometry disposal and switching to unsupported modules. No general claim of complete faithful interiors is authorized by these assets.

Execution: 70 passing unit tests. Source triangle totals and shared inspection geometry verified against all six existing Falcon9/Starship/Heavy high+eco GLBs; zero added triangles. Baseline source and actual integrated WebGL renders reviewed. Interior cover fades are composed with existing view transitions, and inner hardware receives its own centered camera fit. Unsupported modules remain unavailable. Full interior sourcing remains incomplete.
