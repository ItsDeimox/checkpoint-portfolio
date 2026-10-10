# Music-reactive showroom and click-to-spin brand

## Visitor controls

The provided DJ ROOTS - Lagoon track is the site's sole, fixed soundtrack.
The first click on the DXT introduction starts the track at 20% volume.
Sound in the header pauses/resumes it; its adjacent speaker button exposes
volume and Light response controls. The default Light response is 85%.
Playback begins inside that first gesture, even while the renderer is loading.

There is no music upload, local-file chooser or track-switching control. Under
the speaker menu beside Sound, visitors can adjust volume
and light-response strength. Both controls persist after the new visitor preset is applied once.
A fresh page stays silent until its entry click; later clicks never undo mute.

The original WAV was transcoded to a compact 3.07 MB MP3. At build time,
tools/prepare-music.mjs caches the pinned SHA-256-verified user recording
as assets/audio/lagoon.mp3. Clients stream that file from the site itself,
without contacting the original upload host.

The DXT brand now rests exactly facing the viewer. Click, Enter or Space starts
one full eased turn, returning to the same rest pose. Repeated clicks during a
turn do not queue spins or accelerate it. Home retains showroom navigation;
clicking the logo does not close an open in-world panel. System reduced-motion
preference suppresses the turn.

## Rendering and audio cost

RoomMusic creates one AudioContext, MediaElementSource, AnalyserNode and output
gain only on first play. The track streams through a media element rather than
being decoded into a whole-track JavaScript AudioBuffer. The source and pooled
2048-point spectrum array are reused across playback toggles.

The existing frame loop reads the analyser at most 30 times per second. Bass is
measured at 35-180 Hz and treble at 2.2-10 kHz, using the actual device sample
rate. Attack/release envelopes and bounded modulation avoid abrupt full-screen
flashes. Bass raises existing red/neon sources and bloom; treble accents the
existing hologram light. No lights, render targets, passes or second animation
loop are added for the music.

Each render temporarily applies the modulation and restores all original values
in a finally block. Saved visual settings, car materials, floor, panels and
camera remain unchanged. Muting, zero volume, zero response, hidden tabs, context
loss and system reduced-motion stop spectrum sampling and restore the approved appearance.
Music can still play with reduced visual motion. Hiding the page suspends audio;
returning resumes only the last explicit playback intent. Disposal closes the
shared audio context.

## Verification scope

Tests cover sample-rate-independent band isolation, zero/noise handling, FFT
poll limits, pooled output, trusted-gesture call ordering, blocked play, rapid
toggles, default-track integrity, background suspension, renderer-state
restoration, stable settings, native controls and a complete logo turn within
its existing viewport. Browser QA exercises the supplied recording and synthetic
bass/treble tones. Software rendering is not a hardware GPU FPS benchmark.

## Visitor introduction and quality

The initial HTML contains the opaque introduction, so archived fallback links
cannot flash before JavaScript. Real renderer stages update its status; no
percentage is invented. The cover fades after both entry and the first prepared
3D frame. A 60-second startup timeout leaves usable non-3D navigation.

The public header exposes only soundtrack controls and Low / Medium / High
quality. Medium uses the existing middle renderer budget (internal auto key).
The old optical control panel is not mounted. Material and optical defaults
are unchanged. Older settings migrate once to Medium, 20% volume and 85%
response; subsequent visitor choices persist. System reduced-motion is honored.

The main page owns music lifetime, separate from the GPU context. Audio can
start during loading and remains controllable if WebGL fails. No SFX are used.
