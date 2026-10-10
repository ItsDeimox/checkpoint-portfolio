# DXT showroom r5: wet reflective showcase

The existing room, rigid panels and in-world menus remain intact.

## Controls

Drag the car or central stage to rotate them together. Pointer look still controls
the camera outside that gesture. Release adds damped inertia when Motion is on;
pause, reduced motion, cancellation and panel approach stop inertia. Touch uses
the same turntable target; dragging outside it retains the existing touch look.

Approved defaults: exposure 1.13, bloom 0.65, depth of field 1.50, motion blur
1.00, lens 1.00, contrast 1.26, sharpness 0.35. Restore visual defaults reapplies
these values. Migration replaces only the preceding experimental defaults.

## Rendering

The red Body/Hood retain their meshes, color and texture maps. Metalness is
0.86, roughness 0.115, environment response 1.9 and clearcoat roughness 0.05.
The floor uses three octaves of gradient Perlin noise to distribute wet patches.
Wet and dry regions use different reflection blur, darkening and Fresnel response.
Slow subpixel ripples disturb the existing planar scene reflection. Only the
central floor texture domain rotates; the surrounding room stays fixed.

Bloom combines six progressively smaller Gaussian scales with a restrained gain.
High quality uses 32 aperture samples and 32 volumetric beam samples; lower
profiles reduce sample counts. Red backlight and reflection strips are reinforced.
The holographic hover adds red emissive grid fragments, a scanning line and edges,
without displacing the screen or artwork. The overlay recedes when menus open.

Camera motion uses depth reprojection. Rotating opaque car/stage surfaces add an
isolated velocity capture using shared geometry, at half resolution capped at
768 pixels. It runs only while moving with valid HDR history. Transparent glass
and moving reflections are not separately velocity-rendered. The effect is a
bounded screen-space approximation, not path tracing or layered bokeh.

## Verification

npm test and npm run build both passed all 164 tests. Coverage includes stable
world transforms, turntable gesture ownership and cancellation, inertia settling,
motion-history guards, six bloom scales, visual persistence and prior navigation.
Software WebGL2 testing confirmed startup, car drag, hover, panel opening and
Escape return with no reported JavaScript or shader errors. A static home capture
was inspected. Capturing some subsequent animated frames timed out in SwiftShader;
this is not a hardware frame-rate benchmark or a full-resolution visual audit.

Generated renderer bundles are rebuilt by the existing Vercel build command.
