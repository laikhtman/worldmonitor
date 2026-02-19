# World Monitor — Bug Registry

Bugs are prefixed with `BUG-` and a three-digit number.
Each entry includes severity, description, affected files, and dependencies on other items.

## Estimation Summary

| Bug | Severity | Complexity | Est. Hours | Status |
|-----|----------|------------|------------|--------|
| BUG-001 | Critical | 🔴 Very High | 24–32 h | ✅ Resolved |
| BUG-002 | Critical | 🔴 High | 8–12 h | ✅ Resolved |
| BUG-003 | Critical | 🟢 Low | 1 h | ✅ Resolved |
| BUG-004 | High | 🟢 Trivial | 0.25 h | ✅ Resolved |
| BUG-005 | High | 🟢 Low | 1 h | ✅ Resolved |
| BUG-006 | High | 🟡 Medium | 2–3 h | Open |
| BUG-007 | High | 🟡 Medium | 2 h | ✅ Resolved |
| BUG-008 | High | 🟢 Low | 0.5 h | ✅ Resolved |
| BUG-009 | High | 🟢 Low | 1–2 h | ✅ Resolved |
| BUG-010 | High | 🟢 Low | 1 h | ✅ Resolved |
| BUG-011 | Medium | 🟢 Low | 1 h | Open |
| BUG-012 | Medium | 🟡 Medium | 3–4 h | Open |
| BUG-013 | Medium | 🟢 Low | 1–2 h | ✅ Resolved |
| BUG-014 | Medium | 🔴 Very High | 24–32 h | Open |
| BUG-015 | Medium | 🟢 Low | 1 h | ✅ Resolved |
| BUG-016 | Medium | 🔴 High | 12–16 h | ✅ Resolved |
| BUG-017 | Low | 🟡 Medium | 3–4 h | ✅ Resolved |
| BUG-018 | Low | 🔴 High | 10–16 h | Open |
| BUG-019 | Low | 🟢 Trivial | 0.5 h | ✅ Resolved |
| BUG-020 | Low | 🔴 Very High | 16–24 h | Open |

**Total open backlog: ~77–122 h** (excluding 11 resolved bugs)

---

## Critical

### BUG-001 — Monolithic `App.ts` God-Class (4 357 lines)

| Field | Value |
|---|---|
| **Severity** | Critical (architectural) |
| **Affected** | `src/App.ts` |
| **Status** | ✅ Resolved — Phase 1 + Phase 2 complete |
| **Depends on** | — |
| **Complexity** | 🔴 Very High — major architectural refactoring across entire codebase |
| **Est. Hours** | 24–32 h (completed in two phases) |

**Description**
`App.ts` held the entire application orchestration in a single 4 461-line class with 136 methods.
Any change risked regressions elsewhere; HMR was fragile because the whole class had to reload after every edit.

**AI instructions**
Split `App.ts` into focused controllers (e.g., `DataLoader`, `PanelManager`, `MapController`, `RefreshScheduler`, `DeepLinkHandler`), each in a separate file under `src/controllers/`.
Keep the `App` class as a thin composition root that wires controllers together.

**Resolution progress**
- **Phase 1 ✅** — All seven controllers created under `src/controllers/`:
  - `app-context.ts` (169 lines) — `AppContext` interface: shared mutable state surface
  - `refresh-scheduler.ts` (215 lines) — periodic refresh intervals, snapshot saving
  - `deep-link-handler.ts` (192 lines) — URL state, deep linking, clipboard
  - `desktop-updater.ts` (195 lines) — Tauri update checking, badge display
  - `country-intel.ts` (535 lines) — country briefs, timeline, story, CII signals
  - `ui-setup.ts` (937 lines) — event listeners, search/source modals, idle detection
  - `data-loader.ts` (1 540 lines) — all data loading, news rendering, correlation
  - `panel-manager.ts` (1 028 lines) — panel creation, layout, drag-and-drop, toggles
  - `index.ts` — barrel export
  - **All files pass TypeScript strict-mode compilation with zero errors.**
- **Phase 2 ✅** — `App.ts` refactored into thin composition root (531 lines, 88% reduction):
  - All method bodies replaced with direct controller delegation in `init()`
  - 32 DataLoader, 17 UISetup, 12 CountryIntel, 10 PanelManager, 8 DeepLinkHandler, 8 DesktopUpdater, 2 RefreshScheduler methods removed from App.ts
  - Typed callback interfaces (`RefreshCallbacks`, `DeepLinkCallbacks`, `DataLoaderCallbacks`, `PanelManagerCallbacks`, `UICallbacks`) wire controllers without circular deps
  - Dead-code private wrappers removed (`noUnusedLocals` compliance)
  - Remaining in App.ts: constructor (~150 lines), `init()` (~80 lines), `syncDataFreshnessWithLayers()`, `setupMapLayerHandlers()`, `destroy()`, public API
  - `npx tsc --noEmit` — zero errors; `npx vite build` — passes
  - Branch `refactor/app-ts-phase2` merged to `main`

---

### BUG-002 — Unsafe `innerHTML` Assignments with External Data ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | Critical (security) |
| **Affected** | `src/controllers/panel-manager.ts`, `src/components/SignalModal.ts`, `src/components/CountryIntelModal.ts`, `src/components/CountryBriefPage.ts`, `src/components/ServiceStatusPanel.ts` |
| **Depends on** | — |
| **Status** | ✅ Resolved |
| **Resolution** | Full audit of 142 innerHTML sites across `src/`. 8 unsafe interpolations found and fixed: `panel-manager.ts` (theater posture `headline`/`summary`), `SignalModal.ts` (convergence `types`, cascade `sourceType`, `regionName`), `CountryIntelModal.ts` and `CountryBriefPage.ts` (`weekChangePercent`), `ServiceStatusPanel.ts` (`service.status` in class attrs and text). All now wrapped with `escapeHtml()`. Remaining 134 sites verified safe (static HTML, `t()` i18n, already escaped, or clearing). |
| **Complexity** | 🔴 High — requires full audit of every `innerHTML` site across 7+ components, careful escaping without breaking HTML structure |
| **Est. Hours** | 8–12 h (completed) |

**Description**
Despite documentation claiming all external data passes through `escapeHtml()`, many `innerHTML` assignments interpolate feed-sourced strings (headlines, source names, tension labels) without escaping.
An RSS feed with `<img onerror=alert(1)>` in its title could execute arbitrary JS.

**AI instructions**
Audit every `innerHTML` assignment in `src/`.
Replace raw interpolation with either `escapeHtml()` wrapping on every external value, or switch to `textContent` / `createElement` where possible.
Add an ESLint rule or grep pre-commit hook to flag new `innerHTML` usage.

---

### BUG-003 — `youtube/live` Dev Endpoint Always Returns `null` Video ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | Critical (feature broken in dev) |
| **Affected** | `vite.config.ts` (line ~148-151) |
| **Depends on** | — |
| **Status** | ✅ Resolved |
| **Resolution** | Ported the HTML-scraping live detection logic from the production edge function (`api/youtube/live.js`) into the `youtubeLivePlugin()` Vite dev middleware. The dev endpoint now fetches `youtube.com/@channel/live`, extracts `videoId` via regex, and checks `isLive` status — matching production behavior exactly. |
| **Complexity** | 🟢 Low — porting existing logic from production edge function |
| **Est. Hours** | 1 h (completed) |

**Description**
The `youtubeLivePlugin()` Vite middleware hardcoded `{ videoId: null, channel }` with a TODO comment: *"will implement proper detection later"*.
This meant the LiveNewsPanel fell back to static channel-level video IDs during local development, never resolving the actual live stream.

**AI instructions**
Implement the pending live-stream detection using the `youtubei.js` library already in `package.json`, or remove the dev plugin and proxy to the production API route (`/api/youtube/live.js`).

---

## High

### BUG-004 — Panel-Order Migration Log Says "v1.8" but Key Says "v1.9" ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | High (data inconsistency) |
| **Affected** | `src/App.ts` (line ~168) |
| **Depends on** | — |
| **Complexity** | 🟢 Trivial — single string change |
| **Est. Hours** | 0.25 h (completed) |
| **Status** | ✅ Resolved |
| **Resolution** | Changed log message from `v1.8` to `v1.9` to match `PANEL_ORDER_MIGRATION_KEY`. |

**Description**
`PANEL_ORDER_MIGRATION_KEY` is `worldmonitor-panel-order-v1.9` but the `console.log` says `"Migrated panel order to v1.8 layout"`.
This is confusing for anyone debugging migrations.

**AI instructions**
Change the log message to `v1.9`.

---

### BUG-005 — Duplicate `layerToSource` Mapping ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | High (maintenance risk) |
| **Affected** | `src/App.ts`, `src/config/panels.ts` |
| **Depends on** | BUG-001 (Phase 2) |
| **Complexity** | 🟢 Low — extract constant to config, update two import sites |
| **Est. Hours** | 1 h (completed) |
| **Status** | ✅ Resolved |
| **Resolution** | Extracted `LAYER_TO_SOURCE` constant to `src/config/panels.ts`, exported via barrel `src/config/index.ts`, and imported in both `syncDataFreshnessWithLayers()` and `setupMapLayerHandlers()` in App.ts. Duplicate inline definitions removed. |

**Description**
The `layerToSource` map is copy-pasted in two places. If a new layer is added to one and not the other, freshness tracking silently breaks for that layer.
Note: These methods remain in `App.ts` and were not extracted into controllers (they bridge map and freshness). Once BUG-001 Phase 2 wires the composition root, this becomes easier to refactor.

**AI instructions**
Extract `layerToSource` to a shared constant (e.g., in `src/config/panels.ts`), import it in both locations.

---

### BUG-006 — RSS Proxy Mirrors Polymarket Through Production URL

| Field | Value |
|---|---|
| **Severity** | High (reliability / circular dependency) |
| **Affected** | `vite.config.ts` (line ~348) |
| **Depends on** | — |
| **Complexity** | 🟡 Medium — need to understand Polymarket API auth/shape, implement or repoint proxy |
| **Est. Hours** | 2–3 h |

**Description**
The Polymarket dev proxy targets `https://worldmonitor.app` (the live production site).
This creates a circular dependency in dev → prod, means dev can break when prod is deploying, and masks local proxy bugs until they hit production.

**AI instructions**
Proxy directly to `gamma-api.polymarket.com` or implement the same edge-function logic locally in a Vite middleware plugin (similar to `youtubeLivePlugin`).

---

### BUG-007 — No Error Boundary on News Cluster Rendering ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | High |
| **Affected** | `src/components/NewsPanel.ts` |
| **Depends on** | — |
| **Complexity** | 🟡 Medium — identify all render loops, add try/catch with fallback UI |
| **Est. Hours** | 2 h (completed) |
| **Status** | ✅ Resolved |
| **Resolution** | Wrapped both render paths (WindowedList callback and direct `.map()` render) in try/catch. On failure, logs the bad cluster ID and renders a `"Failed to display story"` placeholder so remaining clusters still appear. |

**Description**
If the clustering worker returns malformed data (e.g., a cluster with `undefined` headline), the `NewsPanel` render loop throws, leaving the panel blank.
There is no try/catch wrapping individual cluster renders.

**AI instructions**
Wrap each cluster card render in a try/catch. Log the bad cluster and render a "failed to display" placeholder so the remaining clusters still appear.

---

### BUG-008 — `setInterval` Clock Leak in `startHeaderClock()` ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | High (memory leak on HMR) |
| **Affected** | `src/App.ts`, `src/controllers/ui-setup.ts` |
| **Status** | ✅ Resolved |
| **Depends on** | — |
| **Complexity** | 🟢 Low — store interval ID, clear in `destroy()` |
| **Est. Hours** | 0.5 h (completed) |
| **Resolution** | `UISetupController` stores interval in `clockIntervalId` and exposes `clearClockInterval()`. `App.destroy()` now calls `this.uiSetup.clearClockInterval()` to clean up on HMR reload. |

**Description**
`setInterval(tick, 1000)` in `startHeaderClock()` was never stored or cleared.
On Vite HMR reload the old interval kept ticking, doubling DOM writes each hot reload until the page was hard-refreshed.

**AI instructions**
Store the interval ID and clear it in `App.destroy()`.
Note: The extracted `UISetupController` already stores the interval in `clockIntervalId` and provides `clearClockInterval()`. Once BUG-001 Phase 2 wires the composition root, this bug will be fully resolved.

---

### BUG-009 — `deepLinkCountry` Polling Has No Maximum Retry ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | High |
| **Affected** | `src/controllers/deep-link-handler.ts` — `handleDeepLinks()` |
| **Depends on** | — |
| **Complexity** | 🟢 Low — add counter + ceiling + user-facing error toast |
| **Est. Hours** | 1–2 h (completed) |
| **Status** | ✅ Resolved |
| **Resolution** | Added `MAX_DEEP_LINK_RETRIES = 60` (30 s) static constant. Both `checkAndOpen()` and `checkAndOpenBrief()` now increment a retry counter and stop with a `console.warn` when the limit is reached, preventing infinite polling. |

**Description**
`checkAndOpen()` and `checkAndOpenBrief()` used `setTimeout(…, 500)` recursively with no cap. If the data source was permanently down, the browser spun polling forever.

**AI instructions**
Add a max retry counter (e.g., 60 attempts = 30 seconds) and show a user-facing error ("Data not available") if exceeded.

---

### BUG-010 — Finance Variant Missing Desktop Packaging Scripts ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | High |
| **Affected** | `package.json` |
| **Depends on** | — |
| **Complexity** | 🟢 Low — copy existing tech variant scripts, adjust config path |
| **Est. Hours** | 1 h (completed) |
| **Status** | ✅ Resolved |
| **Resolution** | Added 4 scripts to `package.json`: `desktop:package:macos:finance`, `desktop:package:windows:finance`, `desktop:package:macos:finance:sign`, `desktop:package:windows:finance:sign` — all using `--variant finance` flag with the existing `desktop-package.mjs` script. |

**Description**
The `finance` variant had `dev:finance`, `build:finance`, and `desktop:build:finance` scripts, but there were no `desktop:package:*:finance` scripts.
Running `desktop:package` for the finance variant would fail silently or produce the wrong build.

**AI instructions**
Add `desktop:package:macos:finance`, `desktop:package:windows:finance`, and their `:sign` variants, pointing to a `tauri.finance.conf.json` config.

---

## Medium

### BUG-011 — Inconsistent Idle Timeout Values

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Affected** | `src/App.ts` (2 min), `src/components/LiveNewsPanel.ts` (5 min), `src/components/LiveWebcamsPanel.ts` (5 min) |
| **Depends on** | — |
| **Complexity** | 🟢 Low — unify constant or document intentional difference |
| **Est. Hours** | 1 h |

**Description**
Documentation says "5 min idle" pauses the stream, but `App.ts` uses a 2-minute `IDLE_PAUSE_MS`.
The mismatch means map animations pause 3 minutes before the live stream panels, which may confuse users.

**AI instructions**
Unify idle timeouts via a shared constant in config, or document the intentional difference.

---

### BUG-012 — Missing `GDELT Doc` in Data Freshness Tracker

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Affected** | `src/services/data-freshness.ts`, `src/App.ts` — `syncDataFreshnessWithLayers()` |
| **Depends on** | BUG-005 |
| **Complexity** | 🟡 Medium — register all untracked sources, add `recordUpdate()` calls after each fetch |
| **Est. Hours** | 3–4 h |

**Description**
`layerToSource` maps layers to freshness source IDs, but several API-backed data sources (GDELT Doc intelligence feed, FRED, EIA oil, USASpending, PizzINT, Polymarket, Predictions) are not tracked in the freshness system.
The Status Panel cannot report staleness for these feeds.

**AI instructions**
Register all backend data sources in `data-freshness.ts` and call `dataFreshness.recordUpdate(sourceId)` after each successful fetch.

---

### BUG-013 — `VITE_VARIANT` Env Var Not Windows-Compatible in npm Scripts ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Affected** | `package.json` (all `VITE_VARIANT=…` scripts) |
| **Depends on** | — |
| **Complexity** | 🟢 Low — add `cross-env` dependency, prefix all affected scripts |
| **Est. Hours** | 1–2 h (completed) |
| **Status** | ✅ Resolved |
| **Resolution** | Installed `cross-env` as devDependency. Prefixed all 17 scripts that use `VITE_VARIANT=` or `VITE_DESKTOP_RUNTIME=` with `cross-env`. Verified `build:tech` runs successfully on Windows. |

**Description**
Scripts like `"build:tech": "VITE_VARIANT=tech tsc && VITE_VARIANT=tech vite build"` used Unix shell syntax.
On Windows (the project's primary development OS per user profile) these silently ignored the variable, building the wrong variant.

**AI instructions**
Use `cross-env` (npm package) to set environment variables portably, e.g., `"build:tech": "cross-env VITE_VARIANT=tech tsc && cross-env VITE_VARIANT=tech vite build"`.
Alternatively, use `.env` file-based variant selection.

---

### BUG-014 — No Automated Tests for API Handler Input Validation

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Affected** | `api/*.js` (55 handlers) |
| **Depends on** | — |
| **Complexity** | 🔴 Very High — 52 untested handlers, each needs mocked request/response, env vars, and edge-case coverage |
| **Est. Hours** | 24–32 h |

**Description**
Only `api/_cors.test.mjs`, `api/cyber-threats.test.mjs`, and `api/youtube/embed.test.mjs` have unit tests.
The remaining 52 API handlers have no tests, including security-critical endpoints like `rss-proxy.js`, `groq-summarize.js`, and `openrouter-summarize.js` that accept user-controlled input.

**AI instructions**
Write unit tests for all API handlers using the node built-in test runner. Prioritize endpoints that accept user parameters: `yahoo-finance.js`, `coingecko.js`, `polymarket.js`, `rss-proxy.js`, `finnhub.js`, `groq-summarize.js`, `openrouter-summarize.js`.

---

### BUG-015 — Service Worker Excludes ML WASM but Still Caches 60+ MB ML JS Chunk ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Affected** | `vite.config.ts` (Workbox config) |
| **Depends on** | — |
| **Complexity** | 🟢 Low — verify chunk output filename, adjust `globIgnores` pattern |
| **Est. Hours** | 1 h (completed) |
| **Status** | ✅ Resolved |
| **Resolution** | Verified `globIgnores: ['**/ml-*.js', '**/onnx*.wasm']` correctly matches the `ml` manual chunk (`ml-{hash}.js`). Added `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` (5 MB) as a safety net to prevent any oversized chunk from being precached. |

**Description**
`globIgnores` excludes `**/onnx*.wasm` but the `ml` chunk (Xenova Transformers JS code) is still matched by `**/*.{js,…}` and will be precached by Workbox.
This inflates the initial service worker cache by ~60 MB, wasting bandwidth for users who never use browser ML.

**AI instructions**
Add `**/ml-*.js` to `globPatterns` exclude (it's in `globIgnores` already — verify it's working; if the chunk name doesn't start with `ml-` adjust the pattern to match the actual output filename).

---

### BUG-016 — `MapPopup.ts` at 113 KB — Largest Component ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | Medium (maintainability) |
| **Affected** | `src/components/MapPopup.ts` (113 133 bytes) |
| **Depends on** | BUG-001 (Phase 2 — independent of `App.ts`, but same decomposition pattern applies) |
| **Complexity** | 🔴 High — split 113 KB into ~10 per-layer popup renderers + dispatcher, extensive regression testing |
| **Est. Hours** | 12–16 h |
| **Status** | ✅ Resolved |
| **Resolution** | Decomposed into 9 domain popup modules under `src/components/popups/` (conflict, natural-hazard, military, maritime-infra, security, civil, tech, finance) plus shared `popup-types.ts` and `popup-utils.ts`. `MapPopup.ts` reduced from 2,493 lines to ~270 lines — a thin dispatcher class that delegates to imported renderers. Public API unchanged; all 3 consumers (`Map.ts`, `DeckGLMap.ts`, `mobile-map-harness.ts`) unaffected. |

**Description**
A single file handling popup rendering for every data layer type (conflicts, bases, cables, pipelines, ports, vessels, aircraft, protests, earthquakes, nuclear, datacenters, tech HQs, etc.).
Changes to one popup type risk breaking all others.

**AI instructions**
Split into per-layer popup renderers (e.g., `popups/ConflictPopup.ts`, `popups/MilitaryPopup.ts`, etc.) with a dispatcher in `MapPopup.ts`.

---

## Low

### BUG-017 — Magic Numbers Across Scoring Algorithms ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | Low |
| **Affected** | `src/services/country-instability.ts`, `src/services/hotspot-escalation.ts`, `src/services/military-surge.ts`, `src/services/geo-convergence.ts` |
| **Depends on** | — |
| **Complexity** | 🟡 Medium — audit 4 services, extract ~20-30 constants, verify scoring behavior unchanged |
| **Est. Hours** | 3–4 h |
| **Status** | ✅ Resolved |
| **Resolution** | Extracted ~50 constants across 4 domains (CII, Escalation, Surge, Geo-Convergence) into `src/utils/analysis-constants.ts`. All weights, caps, multipliers, thresholds, and timing constants are now centrally tunable. All 4 scoring services import from the shared constants file. Zero TypeScript errors. |

**Description**
Scoring thresholds (e.g., `0.35`, `0.25`, `0.15`, `min(50, count × 8)`) are scattered as raw numbers.
The documentation describes them well, but the code is hard to tune without grepping across files.

**AI instructions**
Extract all scoring weights and thresholds into `src/utils/analysis-constants.ts` (which already exists for some constants), making them centrally tunable.

---

### BUG-018 — Localization Coverage Gaps

| Field | Value |
|---|---|
| **Severity** | Low |
| **Affected** | `src/locales/` (22 locale files), various components |
| **Depends on** | — |
| **Complexity** | 🔴 High — full codebase audit for hardcoded strings, add keys to 22 locale files |
| **Est. Hours** | 10–16 h |

**Description**
Several components use hardcoded English strings (e.g., `"No instability signals detected"` in `CIIPanel.ts` line 114, `"Hide Intelligence Findings"` in `IntelligenceGapBadge.ts` line 161).
The i18n system (`i18next`) is initialized but not consistently applied.

**AI instructions**
Audit all user-facing strings for missing `t(…)` calls. Add keys to `en.json` and all other locale files.

---

### BUG-019 — `test:e2e` Scripts Fail on Windows Due to Shell Syntax ✅ Resolved

| Field | Value |
|---|---|
| **Severity** | Low |
| **Affected** | `package.json` — all `test:e2e:*` scripts |
| **Depends on** | BUG-013 |
| **Complexity** | 🟢 Trivial — same `cross-env` fix as BUG-013, applied to test scripts |
| **Est. Hours** | 0.5 h (completed alongside BUG-013) |
| **Status** | ✅ Resolved |
| **Resolution** | Fixed as part of BUG-013. All 7 `test:e2e:*` and `test:e2e:visual:*` scripts now use `cross-env VITE_VARIANT=...`. |

**Description**
Same issue as BUG-013 — `VITE_VARIANT=full playwright test` was Unix-only.
E2E tests were untestable on the primary development platform (Windows).

**AI instructions**
Fix alongside BUG-013 using `cross-env`.

---

### BUG-020 — `DeckGLMap.ts` at 156 KB — Largest File in Project

| Field | Value |
|---|---|
| **Severity** | Low (maintainability) |
| **Affected** | `src/components/DeckGLMap.ts` (156 750 bytes) |
| **Depends on** | BUG-016 |
| **Complexity** | 🔴 Very High — 156 KB file, split into 3–4 modules (layers, controls, interaction), heavy regression risk |
| **Est. Hours** | 16–24 h |

**Description**
The WebGL map implementation handles all deck.gl layer construction, interaction, controls, and popups in one massive file.
IDE performance suffers, and code review is impractical.

**AI instructions**
Extract logical sections into separate modules: `DeckGLLayers.ts` (layer factories), `DeckGLControls.ts` (UI controls), `DeckGLInteraction.ts` (picking/click handlers).
