# Host integration v1

`src/platform/session.js` is independent of the model vendor and Three.js. It receives a catalog and control adapter. The current renderer still has rocket-specific rules; full SDK extraction is not claimed.

Embedding is opt-in via `/?embed=1`. Only the exact same-origin parent window is allowed by default. For another host, approve its exact HTTPS origin in `siteConfig.allowedEmbedOrigins` AND `frame-ancestors` in `vercel.json`, rebuild and test. Wildcards, opaque origins, runtime model URLs and arbitrary code commands are not supported.

Example, after the iframe initializes (use bounded getState retries and timeout):

```js
const frame = document.querySelector('iframe');
const origin = location.origin;
frame.contentWindow.postMessage({
  channel: 'deimox-viewer/v1', requestId: 'request-1',
  command: { type: 'selectPart', id: 'engines' }
}, origin);
window.addEventListener('message', event => {
  if (event.origin !== origin || event.source !== frame.contentWindow) return;
  if (event.data?.channel !== 'deimox-viewer/v1') return;
  // Correlate requestId. Handle ok:false as a rejected command.
});
```

Commands: getState; selectVehicle(id); selectPart(id); back; setQuality(value: auto/low/medium/high); setInternal(boolean value, only supported modules); rotate(finite x/y, each within +/-60); zoom(value 0.7-1.8); resetView. Replies contain selected vehicle/name/part, not model bytes or private data.

This command filter does not secure confidential CAD. Host authentication, asset authorization and restricted-data handling require separate design. No analytics or SpaceX communication is performed.
