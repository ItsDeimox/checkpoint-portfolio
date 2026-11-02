# Dragon source replacement

Replaces the Jon Ross historical exterior asset with KUBAHA's preauthored SpaceX Dragon 2. Source: https://sketchfab.com/3d-models/spacex-dragon-2-1b125e30a2cb442288580290536fbe5d (CC BY 4.0). The public mirror, exact commit and SHA-256 are pinned in scripts/authored-assets.json. Embedded source/author/license metadata agrees with the attribution.

This is an actual GLB replacement, not a shader repair or generated cap. The capsule supplies its own docking interface, nose cover and heat-shield geometry. Capsule inspection omits the separate cargo trunk but retains the pressure-shell and bottom hardware. The nose uses the original creator's open-cover rotation keyframe at 100/24 seconds. No authored surface, material response or normal is regenerated.

Both high and eco versions were rendered from multiple directions and checked with rays through the capsule axis: the original docking-side surface and lower shield are both present. These two ray checks are a regression guard, not proof of watertightness at every possible point. The adjacent JSON records the measurements. The high model is 244,232 bytes / 42,974 triangles; eco 177,860 bytes / 27,230 triangles. Falcon 9, Falcon Heavy, Starship and studio files retain identical hashes to the previous build.

**Scope not completed:** this source does not contain a furnished cabin. It does not supply the missing Falcon tank or engine plumbing internals. No such completeness is claimed and no substitute interior was fabricated. Original internal-hardware modes on the other vehicles are unchanged. Full interior sourcing remains unresolved.
