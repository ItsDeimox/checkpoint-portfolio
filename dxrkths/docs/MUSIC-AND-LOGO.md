# Music-reactive showroom and click-to-spin brand

## Visitor controls

The provided DJ ROOTS - Lagoon track is the site's sole, fixed soundtrack.
Press Sound to start or pause it, resuming from the same position. Browser
autoplay policies require the first playback to follow a visitor interaction.

There is no music upload, local-file chooser or track-switching control. Under
Music & reactive lights in the settings panel, visitors can adjust volume
and light-response strength. Both settings persist, but audio never begins
automatically after a page reload.

The original WAV was transcoded to a compact 3.07 MB MP3. At build time,
tools/prepare-music.mjs caches the pinned SHA-256-verified user recording
as assets/audio/lagoon.mp3. Clients stream that file from the site itself,
without contacting the original upload host.

The DXT brand now rests exactly facing the viewer. Click, Enter or Space starts
one full eased turn, returning to the same rest pose. Repeated clicks during a
turn do not queue spins or accelerate it. Home and Reset view retain navigation;
clicking the logo does not close an open in-world panel. System reduced-motion
preference suppresses the turn.

## Rendering and audio cost

RoomMusic creates one AudioContext, MediaElementSource, AnalyserNode and output
gain only on first play. The track streams through a media element rather than
being decoded into a whole-track JavaScript AudioBuffer. The source and pooled
2048-point spectrum array are reused when changing tracks.

The existing frame loop reads the analyser at most 30 times per second. Bass is
measured at 35-180 Hz and treble at 2.2-10 kHz, using the actual device sample
rate. Attack/release envelopes and bounded modulation avoid abrupt full-screen
flashes. Bass raises existing red/neon sources and bloom; treble accents the
existing hologram light. No lights, render targets, passes or second animation
loop are added for the music.

Each render temporarily applies the modulation and restores all original values
in a finally block. Saved visual settings, car materials, floor, panels and
camera remain unchanged. Muting, zero volume, zero response, hidden tabs, context
loss and Motion off stop spectrum sampling and restore the approved appearance.
Music can still play while visual Motion is off. Hiding the page suspends audio;
returning resumes only the last explicit playback intent. Disposal closes the
shared context and revokes local file URLs.

## Verification scope

Tests cover sample-rate-independent band isolation, zero/noise handling, FFT
poll limits, pooled output, trusted-gesture call ordering, blocked play, rapid
toggles, default-track integrity, background suspension, renderer-state
restoration, stable settings, native controls and a complete logo turn within
its existing viewport. Browser QA exercises the supplied recording and synthetic
bass/treble tones. Software rendering is not a hardware GPU FPS benchmark.
