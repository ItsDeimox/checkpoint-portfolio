# Commercial Foundation Implementation Plan

Goal: turn the existing demonstration into a more auditable, accessible and integrable prototype without disturbing approved visuals.
Architecture: generic command/session boundary injected into the current app; brand configuration separated from control logic; build-generated HTML catalog and third-party notices; release checks over immutable assets. No runtime analytics or external messaging.
Tech Stack: Three.js 0.180.0, Vite 7, node:test, Playwright and axe-core (test-only).
Spec: ../specs/2026-11-02-commercial-foundation.md

Global constraints: only spacex-fan-concept; preserve licensed geometry/UV/PBR, existing animations and responsive layout; all repository writes through main with compare-and-swap; deployment via existing Vercel Git integration.
Review focus: iframe messages from wrong origin/source; keyboard focus and no-WebGL paths; save-data versus explicit quality selection; source licenses and asset hash mismatch; metadata or technical claims mistaken for approval/certification.

- [x] Baseline: run current tests, dependency scan and actual accessibility checks.
- [x] Add failing tests for generic session commands, authorized bridge, frame budgets and generated catalog escaping.
- [x] Implement session integration, keyboard controls, local diagnostics and data-saving defaults; preserve current visual behavior.
- [x] Generate accessible non-WebGL catalog, provenance/notice inventory and enforce output size/hash checks during build.
- [x] Write scoped commercial offer, rights checklist, acceptance gates and unsent supplier-routing inquiry with verified official policy sources.
- [ ] Validate unit tests, keyboard/accessibility, regression flows and compiled/public behavior. Publish exact tested files; distinguish accomplished versus outstanding gates.

Execution record: 83 unit tests; compiled build; 14 commercial/keyboard/security checks; 15 interior checks; 15 motion checks passed. Axe: zero automated violations in six states, manual canvas contrast review outstanding. Renderer and assets unchanged; measured central-scene screenshot difference zero. Vite 7.3.7 and lockfile installed; full npm audit reports zero known findings. Initial missing blob CSP permission and iframe/UI state refresh were fixed after browser failures. Fixed-delay keyboard assertions were changed to await rendered state; no feature was weakened. Review performed inline; no independent subagent available. Publication remains gated on exact blob comparison and verified Git deployment.
