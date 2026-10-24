/**
 * Fetch official SoundCloud cover metadata *only once the music scene is near
 * the viewport*. This never instantiates the widget and never starts audio.
 * Any absent/private/deleted track or unavailable CDN leaves the existing
 * designed cover intact. Official track artwork, not another artist's cover,
 * is the only accepted replacement.
 */
export interface CoverTrack {
  url: string;
  artwork: string;
}

const OFFICIAL_HER_ARTWORK =
  'https://i1.sndcdn.com/artworks-I7OK8OL2hvltDXaT-IKangQ-t1080x1080.png';

export function officialCoverURL(candidate: unknown): string | null {
  if (typeof candidate !== 'string' || candidate.length > 2048) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.hostname !== 'i1.sndcdn.com') return null;
    if (!/^\/(?:artworks|avatars)-[\w-]+\.(?:jpg|jpeg|png|webp)$/i.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function createSoundCloudCovers(
  room: HTMLElement,
  tracks: readonly CoverTrack[],
  signal: AbortSignal,
): { show(index: number, url: unknown): void; destroy(): void } {
  const scene = document.querySelector<HTMLElement>('#music');
  const rows = [...room.querySelectorAll<HTMLButtonElement>('[data-track]')];
  const replacements = new Map<number, string>();
  const requests = new Set<number>();
  let closed = false;
  let started = false;
  let observer: IntersectionObserver | undefined;
  const pending = new Set<HTMLImageElement>();

  function show(index: number, untrustedURL: unknown) {
    if (closed || index < 0 || index >= tracks.length || tracks[index]?.artwork) return;
    const url = officialCoverURL(untrustedURL);
    const sleeve = rows.find(row => Number(row.dataset.track) === index)
      ?.querySelector<HTMLElement>('.generated-cover');
    if (!url || !sleeve || replacements.has(index)) return;
    const image = new Image();
    pending.add(image);
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      pending.delete(image);
      if (closed || signal.aborted || !sleeve.isConnected) return;
      replacements.set(index, url);
      sleeve.style.backgroundImage = `url("${url}")`;
      sleeve.classList.add('has-cover-art');
      sleeve.dataset.coverSource = 'soundcloud';
    };
    image.onerror = () => pending.delete(image);
    image.src = url;
  }

  async function lookup(index: number) {
    if (closed || signal.aborted || requests.has(index)) return;
    requests.add(index);
    const track = tracks[index];
    if (!track || track.artwork) return;
    try {
      const endpoint = new URL('https://soundcloud.com/oembed');
      endpoint.searchParams.set('format', 'json');
      endpoint.searchParams.set('url', track.url);
      const response = await fetch(endpoint.href, {
        method: 'GET', mode: 'cors', credentials: 'omit',
        referrerPolicy: 'no-referrer', signal,
      });
      if (!response.ok || closed || signal.aborted) return;
      const data: unknown = await response.json();
      if (typeof data !== 'object' || !data) return;
      const metadata = data as { provider_name?: unknown; thumbnail_url?: unknown };
      if (metadata.provider_name !== 'SoundCloud') return;
      show(index, metadata.thumbnail_url);
    } catch {
      // A SoundCloud URL may have been deleted, made private or unavailable.
    }
  }

  function start() {
    if (started || closed || signal.aborted) return;
    started = true;
    observer?.disconnect();
    // Verified directly from the artist's actual HEINEM FLIP SoundCloud page.
    show(4, OFFICIAL_HER_ARTWORK);
    for (let i = 0; i < tracks.length; i++) {
      if (!tracks[i].artwork) void lookup(i);
    }
  }

  if (scene && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) start();
    }, { rootMargin: '120px' });
    observer.observe(scene);
  } else {
    start();
  }

  return {
    show,
    destroy() {
      closed = true;
      observer?.disconnect();
      for (const image of pending) {
        image.onload = null;
        image.onerror = null;
      }
      pending.clear();
    },
  };
}
