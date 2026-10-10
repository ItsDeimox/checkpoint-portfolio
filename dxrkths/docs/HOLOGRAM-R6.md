# Hologram and supplied 3D brand, r6

This build extends the approved r5 showroom. The car, wet floor, room geometry,
turntable, camera controls, in-world menus and visual defaults are unchanged.

## Holographic hover

Three segmented beam layers travel horizontally in opposing directions with
separate rates and parallax depths. Camera-to-panel direction and pointer UV
contribute to the layered offset. A finer downward scan line has a separate
halo; local noise/wave distortion follows that scan band. Only the printed
artwork is optically displaced. Mesh vertices and the menu's UV hit regions
remain fixed. The effect fades to six percent on open menus and artwork
warping fades out completely, keeping the actions readable and clickable.

The red surface emission and existing hover light are strengthened locally.
No general exposure, bloom setting or ambient room light changes are made.
Motion pause and reduced-motion preference freeze the scan and beam travel.

## Supplied logo

The header's DXT image is replaced by the actual DXTlogoPrinted.glb mesh,
not a rotating image. Wrapper transforms face and fit the supplied model.
Its vertex buffers and embedded normal-map reference remain intact. The two
materials are tuned for a polished white face and dark metallic bevels.

The small brand viewport shares the existing WebGL renderer and frame loop.
Its own supersampled target is capped at 384 by 256 pixels. The former DOM
logo remains an accessible layout anchor and failure fallback, hidden only
after the 3D logo is successfully drawn. Header remount, resize and context
loss restore or re-align it without a second canvas or animation loop.

The original uploaded file is cached by tools/prepare-brand.mjs at build,
dev and pretest time. The pinned attachment URL and SHA-256 live there.
SHA-256: 372cf7584a82c7f4b12589e17d5e7cd9ff3abf8962cf4f3caf55e670f753d2da
Size: 273932 bytes. Invalid bytes fail the build before publication.
The deployed asset is served at /assets/models/DXTlogoPrinted.glb on this
site; visitors do not fetch from the source upload service. Offline builds
can place the unchanged original at that path before running npm run build.
The original user attachment remains the source of authorship/license rights.

## Verification

176 automated tests pass, including the supplied binary checksum, wrapper
geometry preservation, directional beam configuration, shader idempotency,
renderer-state restoration and optional-logo failure isolation.

Software WebGL2 checks loaded the full scene and the real logo, exercised
hover, focused menu opening, Escape return, header re-render and mobile resize.
Home, hover, focused and mobile screenshots were inspected. Hardware GPU FPS
and full-resolution animated performance have not been measured here.
