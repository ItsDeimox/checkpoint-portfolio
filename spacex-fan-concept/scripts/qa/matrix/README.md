# Three-engine regression checks

This test-only package runs the compiled/public viewer sequentially in Playwright Chromium, Firefox and WebKit. It is separate from the older Chromium-only helper package and never enters the application bundle.

```sh
npm --prefix scripts/qa/matrix install --no-audit --no-fund
cd scripts/qa/matrix
npx playwright install --with-deps chromium firefox webkit
BASE_URL=https://your-reviewed-deployment.example/ xvfb-run -a npm test
```

The lab used Ubuntu 26.04 and Playwright 1.64.0. Firefox runs headed under Xvfb because headless Firefox in this software-only environment blocked WebGL2. No security bypass flags or custom Firefox preferences are used. Chromium uses its software WebGL backend; WebKit uses the Linux port. This is NOT physical-device performance data, branded Safari/iOS validation or an accessibility certification.

Checks cover HDR compilation, XY interaction, source-only internals, the actual capsule accessible description, browser navigation return, pointer-following carousel, portrait controls, idle pause, two deliberate context-loss/restoration cycles, and source metadata in the release report. Failures are not silently retried. Results are written to `/tmp/browser-matrix.json`; captures to `/tmp/<engine>-*.png`.

A test failure does not automatically identify an app bug: distinguish unsupported lab graphics, asynchronous test synchronization and real application regressions. Keep browser versions and environment in the reported evidence.
