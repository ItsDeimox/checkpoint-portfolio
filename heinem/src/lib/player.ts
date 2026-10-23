/** Official SoundCloud embeds; no audio is downloaded or re-hosted. */
type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type DiscPhase = 'idle' | 'inserting' | 'swapping' | 'ejecting';

interface Track {
  title: string;
  credit: string;
  displayCredit?: string;
  id: number;
  duration: number;
  url: string;
  artwork: string;
}

const TRACKS: readonly Track[] = [
  {
    title: 'Memories Of You',
    credit: 'Aye Bay · HEINEM x Hyru Remix',
    displayCredit: 'HEINEM x Hyru Remix',
    id: 2230667804,
    duration: 228233,
    url: 'https://soundcloud.com/heinemstrange/aye-bay-memories-of-you-heinem-x-hyru-remix',
    artwork: '/assets/memories-of-you.jpg',
  },
  {
    title: 'MHA 50k DROP',
    credit: 'HEINEM x DEIMOX',
    id: 1649117949,
    duration: 135998,
    url: 'https://soundcloud.com/heinemstrange/mha-50k-drop-heinem-x-deimox',
    artwork: '/assets/mha-50k-drop.jpg',
  },
  {
    title: 'Show Me Love',
    credit: 'WizTheMc, bees & honey · HEINEM Remix',
    id: 2085224397,
    duration: 243533,
    url: 'https://soundcloud.com/heinemstrange/wizthemc-bees-honey-show-me',
    artwork: '/assets/show-me-love.jpg',
  },
];

interface SoundCloudProgress {
  currentPosition?: number;
  relativePosition?: number;
  loadProgress?: number;
}

interface SoundCloudWidget {
  bind(event: string, listener: (event?: SoundCloudProgress) => void): void;
  unbind(event: string): void;
  play(): void;
  pause(): void;
  seekTo(milliseconds: number): void;
  setVolume(value: number): void;
  getDuration(callback: (milliseconds: number) => void): void;
}

interface SoundCloudFactory {
  (iframe: HTMLIFrameElement): SoundCloudWidget;
  Events: {
    READY: string;
    PLAY: string;
    PAUSE: string;
    FINISH: string;
    PLAY_PROGRESS: string;
    SEEK: string;
    ERROR: string;
  };
}

interface SoundCloudAPI {
  Widget: SoundCloudFactory;
}

const TIMEOUT_MS = 12_000;
// Keep these in step with the transform/carousel durations in music.css.
const DISC_SLIDE_MS = 180;
const CASE_EXCHANGE_MS = 220;
const soundCloud = () => (window as Window & { SC?: SoundCloudAPI }).SC;
const timeLabel = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** Call once after the document is ready. All network work waits for a click. */
export function initPlayer(): { destroy(): void } {
  const room = document.getElementById('listening-room');
  if (!room) return { destroy() {} };

  const required = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing player element: ${id}`);
    return element as T;
  };

  const disc = required<HTMLButtonElement>('disc-button');
  const miniPlay = document.getElementById('mini-play') as HTMLButtonElement | null;
  const playButtons = miniPlay ? [disc, miniPlay] : [disc];
  const next = required<HTMLButtonElement>('next-track');
  const previous = required<HTMLButtonElement>('previous-track');
  const seek = required<HTMLInputElement>('seek');
  const volume = required<HTMLInputElement>('volume');
  const elapsed = required('elapsed');
  const durationLabel = required('duration');
  const title = required('track-title');
  const credit = required('track-credit');
  const counter = required('track-counter');
  const external = required<HTMLAnchorElement>('track-external');
  const kicker = required('player-kicker');
  const hint = required('disc-hint');
  const message = required('player-message');
  const mount = required('embed-mount');
  const artwork = room.querySelector<HTMLElement>('.disc-artwork');
  const rows = [...room.querySelectorAll<HTMLButtonElement>('[data-track]')];
  const events = new AbortController();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let state: PlayerState = 'idle';
  let selected = 0;
  let requested = 0;
  let discPhase: DiscPhase = 'idle';
  let transitionTimer: ReturnType<typeof setTimeout> | undefined;
  let duration = TRACKS[0].duration;
  let position = 0;
  let ready = false;
  let wantsPlay = false;
  let hasOpenedPlayer = false;
  let destroyed = false;
  let generation = 0;
  let widget: SoundCloudWidget | undefined;
  let widgetEvents: string[] = [];
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let script: HTMLScriptElement | undefined;
  let sdkPromise: Promise<SoundCloudAPI> | undefined;
  let cancelSDK: (() => void) | undefined;

  function clearWatchdog() {
    if (watchdog !== undefined) clearTimeout(watchdog);
    watchdog = undefined;
  }

  function setState(value: PlayerState) {
    state = value;
    room!.dataset.state = value;
    room!.setAttribute('aria-busy', String(value === 'loading'));
    const playing = value === 'playing';
    const action = playing ? 'Pause'
      : value === 'loading' && wantsPlay ? 'Cancel loading'
        : value === 'error' ? 'Retry' : 'Play';
    for (const button of playButtons) {
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', `${action} ${TRACKS[selected].title}`);
    }
    seek.disabled = !ready;
    const labels: Record<PlayerState, [string, string]> = {
      idle: ['Ready when you are', 'A whole world, one press away'],
      loading: ['Connecting to SoundCloud', 'Your next escape is loading'],
      playing: ['Now playing', 'Press the disc to pause'],
      paused: ['Take your time', 'Press the disc to keep listening'],
      error: ['Keep the music close', 'Press the disc to try again'],
    };
    kicker.textContent = labels[value][0];
    hint.textContent = labels[value][1];
  }

  function updateProgress(milliseconds: number) {
    position = Math.min(duration, Math.max(0, milliseconds));
    elapsed.textContent = timeLabel(position);
    seek.value = String(duration > 0 ? Math.round((position / duration) * 1000) : 0);
    seek.setAttribute('aria-valuetext', `${timeLabel(position)} of ${timeLabel(duration)}`);
    seek.style.setProperty('--progress', `${duration > 0 ? (position / duration) * 100 : 0}%`);
  }

  function updateTrack() {
    const track = TRACKS[selected];
    room!.dataset.activeTrack = String(selected);
    title.textContent = track.title;
    credit.textContent = track.displayCredit ?? track.credit;
    credit.setAttribute('title', track.credit);
    counter.textContent = `${String(selected + 1).padStart(2, '0')} / ${String(TRACKS.length).padStart(2, '0')}`;
    external.href = track.url;
    external.setAttribute('aria-label', `Open ${track.title}, ${track.credit} on SoundCloud`);
    duration = track.duration;
    durationLabel.textContent = timeLabel(duration);
    if (artwork) artwork.style.backgroundImage = `url("${track.artwork}")`;
    for (const row of rows) {
      const index = Number(row.dataset.track);
      const release = TRACKS[index];
      if (release) row.setAttribute('aria-label', `Select ${release.title}, ${release.credit}`);
      const active = index === selected;
      row.classList.toggle('selected', active);
      row.setAttribute('aria-pressed', String(active));
      row.dataset.position = active
        ? 'active'
        : index === (selected + TRACKS.length - 1) % TRACKS.length
          ? 'previous'
          : 'next';
    }
    updateProgress(0);
  }

  function releaseWidget() {
    if (widget) {
      // Unbind first so the retiring frame cannot update the selected track.
      for (const event of widgetEvents) widget.unbind(event);
      widget.pause();
    }
    widget = undefined;
    widgetEvents = [];
    ready = false;
  }

  function fail(text: string) {
    if (destroyed) return;
    clearWatchdog();
    wantsPlay = false;
    setState('error');
    message.textContent = text;
    mount.hidden = false;
  }

  function startWatchdog(current: number, text: string) {
    clearWatchdog();
    watchdog = setTimeout(() => {
      if (!destroyed && current === generation) fail(text);
    }, TIMEOUT_MS);
  }

  function loadSDK(): Promise<SoundCloudAPI> {
    const existing = soundCloud();
    if (existing?.Widget) return Promise.resolve(existing);
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise<SoundCloudAPI>((resolve, reject) => {
      const element = document.createElement('script');
      script = element;
      element.src = 'https://w.soundcloud.com/player/api.js';
      element.async = true;
      let settled = false;
      const timer = setTimeout(() => finish(new Error('SoundCloud script timed out.')), TIMEOUT_MS);

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        element.onload = null;
        element.onerror = null;
        cancelSDK = undefined;
        const api = soundCloud();
        if (error || !api?.Widget) {
          element.remove();
          sdkPromise = undefined;
          reject(error ?? new Error('SoundCloud API is unavailable.'));
        } else {
          resolve(api);
        }
      };

      cancelSDK = () => finish(new Error('Player was closed.'));
      element.onload = () => finish();
      element.onerror = () => finish(new Error('SoundCloud script could not load.'));
      document.head.append(element);
    });
    return sdkPromise;
  }

  function requestPlay() {
    if (!widget || !ready || destroyed) return;
    wantsPlay = true;
    message.textContent = '';
    setState('loading');
    startWatchdog(generation, 'Playback has not started. Press the disc to retry or use the SoundCloud link beside the volume control.');
    if (position >= duration - 250) {
      widget.seekTo(0);
      updateProgress(0);
    }
    // Never mark the disc playing until SoundCloud confirms a PLAY event.
    widget.play();
  }

  async function loadTrack(index: number, playOnReady = true) {
    const current = ++generation;
    clearWatchdog();
    releaseWidget();
    selected = (index + TRACKS.length) % TRACKS.length;
    wantsPlay = playOnReady;
    hasOpenedPlayer = true;
    updateTrack();
    message.textContent = '';
    setState('loading');

    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      url: `https://api.soundcloud.com/tracks/${TRACKS[selected].id}`,
      auto_play: 'false',
      visual: 'false',
      show_artwork: 'false',
      show_comments: 'false',
      show_playcount: 'false',
      show_user: 'true',
      sharing: 'false',
      buying: 'false',
      download: 'false',
      color: '#8b8fba',
    });
    iframe.title = `${TRACKS[selected].title}, ${TRACKS[selected].credit} — official SoundCloud player`;
    iframe.src = `https://w.soundcloud.com/player/?${params.toString()}`;
    iframe.width = '100%';
    iframe.height = '106';
    // SoundCloud's current widget can request encrypted media even for an
    // otherwise public track. Delegate it only to this provider frame.
    iframe.allow = 'autoplay; encrypted-media';
    // The native disc, seek and volume controls expose the same actions. Keep
    // the transport iframe out of the keyboard/screen-reader control sequence.
    iframe.tabIndex = -1;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.border = '0';
    iframe.style.display = 'block';
    mount.hidden = false;
    mount.replaceChildren(iframe);
    startWatchdog(current, 'The track is taking longer than expected. Press the disc to retry or open the SoundCloud link beside the volume control.');

    try {
      const api = await loadSDK();
      if (destroyed || current !== generation) return;
      const controller = api.Widget(iframe);
      widget = controller;
      const bind = (event: string, callback: (progress?: SoundCloudProgress) => void) => {
        widgetEvents.push(event);
        controller.bind(event, (progress) => {
          if (!destroyed && current === generation) callback(progress);
        });
      };

      const onReady = () => {
        if (ready) return;
        ready = true;
        clearWatchdog();
        controller.setVolume(Number(volume.value));
        controller.getDuration((value) => {
          if (destroyed || current !== generation || !Number.isFinite(value) || value <= 0) return;
          duration = value;
          durationLabel.textContent = timeLabel(duration);
          updateProgress(position);
        });
        if (wantsPlay) requestPlay();
        else if (state !== 'error') setState('paused');
      };

      bind(api.Widget.Events.READY, onReady);
      bind(api.Widget.Events.PLAY, () => {
        ready = true;
        wantsPlay = true;
        clearWatchdog();
        message.textContent = '';
        setState('playing');
      });
      bind(api.Widget.Events.PAUSE, () => {
        const stoppedBeforeAudio = wantsPlay && position === 0;
        wantsPlay = false;
        clearWatchdog();
        setState('paused');
        if (stoppedBeforeAudio) {
          message.textContent = 'Playback paused before audio started. Press the disc to retry or open the SoundCloud link beside the volume control.';
        }
      });
      bind(api.Widget.Events.FINISH, () => {
        wantsPlay = false;
        clearWatchdog();
        updateProgress(duration);
        setState('paused');
        kicker.textContent = 'One more listen?';
      });
      const progress = (data?: SoundCloudProgress) => {
        if (typeof data?.currentPosition === 'number' && Number.isFinite(data.currentPosition)) {
          updateProgress(data.currentPosition);
        }
      };
      bind(api.Widget.Events.PLAY_PROGRESS, progress);
      bind(api.Widget.Events.SEEK, progress);
      bind(api.Widget.Events.ERROR, () => fail('This track could not be played here. Press the disc to retry or open the SoundCloud link beside the volume control.'));

      // The iframe may have loaded while the SDK was downloading. A real
      // duration response also confirms readiness if its initial event passed.
      controller.getDuration((value) => {
        if (!destroyed && current === generation && Number.isFinite(value) && value > 0) onReady();
      });
    } catch {
      if (!destroyed && current === generation) {
        fail('The player could not connect. Press the disc to retry or open the SoundCloud link beside the volume control.');
      }
    }
  }

  function applySelection(nextIndex: number) {
    if (nextIndex === selected) return;
    // Respect both confirmed playback and an explicit play request still
    // loading. A pending pause must never turn into playback on navigation.
    const wasPlaying = wantsPlay && (state === 'playing' || state === 'loading');
    if (hasOpenedPlayer) {
      void loadTrack(nextIndex, wasPlaying);
    } else {
      // Browsing cover art before pressing the CD needs no third-party player.
      selected = nextIndex;
      updateTrack();
      setState('idle');
    }
  }

  function clearTransitionTimer() {
    if (transitionTimer !== undefined) clearTimeout(transitionTimer);
    transitionTimer = undefined;
  }

  function setDiscPhase(value: DiscPhase) {
    discPhase = value;
    room!.dataset.discPhase = value;
  }

  function scheduleTransition(callback: () => void, delay: number) {
    clearTransitionTimer();
    transitionTimer = setTimeout(() => {
      transitionTimer = undefined;
      if (!destroyed) callback();
    }, delay);
  }

  function finishTransition() {
    clearTransitionTimer();
    applySelection(requested);
    setDiscPhase('idle');
  }

  function ejectDisc() {
    setDiscPhase('ejecting');
    scheduleTransition(() => setDiscPhase('idle'), DISC_SLIDE_MS);
  }

  function exchangeCases() {
    if (requested === selected) {
      // Reversing navigation while the disc enters cancels the cover change.
      ejectDisc();
      return;
    }
    setDiscPhase('swapping');
    applySelection(requested);
    scheduleTransition(ejectDisc, CASE_EXCHANGE_MS);
  }

  function selectTrack(index: number) {
    if (destroyed) return;
    const nextIndex = (index + TRACKS.length) % TRACKS.length;
    if (nextIndex === requested) return;
    requested = nextIndex;
    if (motion.matches) {
      finishTransition();
    } else if (discPhase === 'swapping') {
      // Latest input wins while the disc is concealed; never accumulate a
      // backlog of visual swaps or leave the selected cover and audio apart.
      exchangeCases();
    } else if (discPhase !== 'inserting') {
      setDiscPhase('inserting');
      scheduleTransition(exchangeCases, DISC_SLIDE_MS);
    }
  }

  function toggle() {
    if (destroyed) return;
    // A keyboard activation can arrive while the CD is inside its sleeve.
    // Apply the latest explicit selection before interpreting play/pause.
    if (discPhase !== 'idle') finishTransition();
    if (state === 'playing') {
      wantsPlay = false;
      widget?.pause();
    } else if (state === 'loading') {
      if (wantsPlay) {
        wantsPlay = false;
        clearWatchdog();
        widget?.pause();
        setState('paused');
      } else {
        // A paused track can be loading after carousel navigation. Pressing
        // the CD now requests playback instead of cancelling that silent load.
        wantsPlay = true;
        if (ready) requestPlay();
        else setState('loading');
      }
    } else if (state === 'error' || !widget || !ready) {
      void loadTrack(selected);
    } else {
      requestPlay();
    }
  }

  const listenerOptions = { signal: events.signal };
  disc.addEventListener('click', toggle, listenerOptions);
  miniPlay?.addEventListener('click', toggle, listenerOptions);
  next.addEventListener('click', () => selectTrack(requested + 1), listenerOptions);
  previous.addEventListener('click', () => selectTrack(requested - 1), listenerOptions);
  motion.addEventListener('change', () => {
    if (motion.matches && discPhase !== 'idle') finishTransition();
  }, listenerOptions);
  for (const row of rows) {
    row.addEventListener('click', () => {
      const index = Number(row.dataset.track);
      if (!Number.isInteger(index) || index < 0 || index >= TRACKS.length) return;
      selectTrack(index);
    }, listenerOptions);
  }
  seek.addEventListener('input', () => {
    if (!ready || !widget) return;
    const milliseconds = Math.max(0, Math.min(1000, Number(seek.value))) * duration / 1000;
    widget.seekTo(milliseconds);
    updateProgress(milliseconds);
  }, listenerOptions);
  volume.addEventListener('input', () => {
    const value = Math.max(0, Math.min(100, Number(volume.value)));
    volume.setAttribute('aria-valuetext', `${value}%`);
    if (ready) widget?.setVolume(value);
  }, listenerOptions);

  updateTrack();
  setDiscPhase('idle');
  setState('idle');
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation++;
      events.abort();
      clearTransitionTimer();
      setDiscPhase('idle');
      clearWatchdog();
      cancelSDK?.();
      releaseWidget();
      script?.remove();
      mount.replaceChildren();
      mount.hidden = true;
      setState('idle');
    },
  };
}
