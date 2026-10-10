# Music-reactive showroom and click-to-spin brand

## Visitor controls

The header Sound button opens the local music picker until a track is selected.
Selecting a file starts playback. Further Sound clicks pause/resume at the same
position. The settings menu includes Music & reactive lights, with volume,
light-response strength, another-file selection and a clear-track action.

Files are played from a browser object URL, not uploaded by the website. Volume
and effect strength persist; file paths, object URLs and playback permission do
not. Playback never starts on a fresh page without visitor interaction. The
player accepts browser-supported audio up to 64 MB, including MP3 and WAV.

No default soundtrack is bundled in this build. DEFAULT_TRACK in
src/scene/room-music-settings.js is deliberately empty. The supplied Lagoon
recording was used to exercise the player locally, not published as the site's
default track.

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
toggles, track changes, URL disposal, background suspension, renderer-state
restoration, stable settings, native controls and a complete logo turn within
its existing viewport. Browser QA exercises the supplied recording and synthetic
bass/treble tones. Software rendering is not a hardware GPU FPS benchmark.
