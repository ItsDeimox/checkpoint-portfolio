# Security

This is a static public artist website. It has no application backend, account system, database, forms, uploads, payments, analytics or server secrets.

Vercel response headers restrict scripts to this origin and the official SoundCloud SDK; frames to SoundCloud; images to local/data and SoundCloud artwork; fonts to this origin. Framing this website is denied. Camera, microphone, location and payment APIs are disabled. External new-tab links use `noopener noreferrer`.

Inline style values are permitted because CSS transforms, shader layout and player artwork/progress update dynamically. Inline scripts and eval are not permitted. Only the official player frame receives `autoplay` and `encrypted-media` permissions. SoundCloud's embedded frame manages its own origin, streaming, policies and cookies; it is loaded only after a playback gesture. No pre-consent cookie or tracking layer is introduced by this application.

Hardware hints and graphics preference stay on-device. The only application storage key is `heinem.graphics.v1`; denied storage falls back to an in-memory preference.

Maintain the lockfile and inspect dependency updates. Do not place tokens or artist private contact details in source, browser bundles or documentation. Report a security issue through the repository maintainer's available private contact, without publishing exploit details or secrets in a public issue.

MIT covers the software; it does not authorize reuse of artist media or identity. See the asset manifest.
