# 11 — Implementation Roadmap

## 11.1 Phased Approach

The webOS port is split into **4 phases**, each producing a testable milestone.

```
Phase 1 (Foundation)      →  Runs in browser at TV resolution
Phase 2 (Input)           →  Navigable with D-pad and remote
Phase 3 (Performance)     →  Runs on actual TV hardware
Phase 4 (Polish & Ship)   →  Published on LG Content Store
```

---

## Phase 1: Foundation (30–40 hours)

**Goal**: TV variant builds, renders at 1080p, loads data — testable in desktop browser at 1920×1080.

### Tasks

| # | Task | Est. | Priority | Dependencies | Status |
|---|------|------|----------|-------------|--------|
| 1.1 | Create `src/config/variants/tv.ts` with TV panels, map layers, feature flags | 3h | P0 | — | ✅ Done |
| 1.2 | Create `src/utils/tv-detection.ts` — webOS detection, `IS_TV` / `IS_WEBOS` exports | 2h | P0 | — | ✅ Done |
| 1.3 | Update `src/config/variant.ts` to accept `'tv'` variant | 1h | P0 | 1.1 | ✅ Done |
| 1.4 | Add `VARIANT_META.tv` to `vite.config.ts` | 1h | P0 | — | ✅ Done |
| 1.5 | Add npm scripts: `dev:tv`, `build:tv`, `preview:tv` | 0.5h | P0 | 1.4 | ✅ Done |
| 1.6 | Create `src/styles/tv.css` — safe zones, typography scale, layout grid | 6h | P0 | — | ✅ Done |
| 1.7 | Conditionally inject `tv.css` in `main.ts` when `IS_TV` | 1h | P0 | 1.2, 1.6 | ✅ Done |
| 1.8 | Add `body.tv-mode` class to document when TV variant | 0.5h | P0 | 1.2 | ✅ Done |
| 1.9 | Disable ML on TV — short-circuit `detectMLCapabilities()` | 1h | P1 | 1.2 | ✅ Done |
| 1.10 | Disable Service Worker registration for TV variant | 0.5h | P1 | 1.2 | ✅ Done |
| 1.11 | Disable panel drag-drop and resize on TV | 1h | P1 | 1.2 | ✅ Done |
| 1.12 | Disable MobileWarningModal and DownloadBanner on TV | 0.5h | P1 | 1.2 | ✅ Done |
| 1.13 | Adjust refresh intervals for TV (`TV_REFRESH_INTERVALS`) | 1h | P1 | 1.1 | ✅ Done |
| 1.14 | Add TV API limits (`appendTVLimits` function) | 2h | P1 | 1.2 | ⬜ Open |
| 1.15 | Create TV layout (60/40 map/panels, 2-panel max) | 4h | P0 | 1.6 | ✅ Done |
| 1.16 | TypeScript strict mode passes: `npm run typecheck` | 1h | P0 | all above | ✅ Done |
| 1.17 | All 3 existing variants still build: `build:full`, `build:tech`, `build:finance` | 1h | P0 | all above | ✅ Done |
| 1.18 | TV variant builds successfully: `npm run build:tv` | 1h | P0 | all above | ✅ Done |
| 1.19 | Visual smoke test at 1920×1080 in Chrome | 2h | P0 | 1.18 | ⬜ Open |

**Phase 1 Progress: 17/19 tasks complete.** Committed `a367d90` on `feature/webos-phase1`.

### Phase 1 Acceptance Criteria
- [x] `npm run build:tv` succeeds with zero errors
- [x] `npm run build:full && npm run build:tech && npm run build:finance` still work
- [x] `npm run typecheck` passes
- [ ] Opening `http://localhost:3000?variant=tv` shows TV layout
- [ ] Map renders (MapLibre + basic hotspots)
- [ ] News panel shows live data
- [x] ML is skipped (no transformers.js loaded)
- [x] TV CSS applied (larger fonts, safe zone padding)
- [x] No regressions in existing variants

---

## Phase 2: Input & Navigation (30–40 hours)

**Goal**: Full D-pad and Magic Remote navigation — usable without a mouse.

### Tasks

| # | Task | Est. | Priority | Dependencies |
|---|------|------|----------|-------------|
| 2.1 | Create `src/utils/tv-focus.ts` — SpatialNavigator class | 8h | P0 | Phase 1 |
| 2.2 | Create `src/utils/tv-remote.ts` — TVRemoteHandler with key mapping | 4h | P0 | 2.1 |
| 2.3 | Register focus zones for header, map, panels | 3h | P0 | 2.1 |
| 2.4 | Implement D-pad panel scrolling (↑↓ scroll, item snap) | 4h | P0 | 2.1 |
| 2.5 | Implement panel switching (←→ between panels, CH+/CH-) | 2h | P0 | 2.1 |
| 2.6 | Implement map navigation mode (D-pad pan, OK click at center) | 6h | P0 | 2.2 |
| 2.7 | Add map crosshair cursor for D-pad mode | 2h | P1 | 2.6 |
| 2.8 | Implement BACK button navigation stack | 3h | P0 | 2.2 |
| 2.9 | Color button bindings (RED/GREEN/YELLOW/BLUE) | 2h | P1 | 2.2 |
| 2.10 | Create `src/components/TVOverlay.ts` — footer hints + status | 3h | P1 | 2.9 |
| 2.11 | Adapt MapPopup for TV (centered, larger, focusable close) | 2h | P1 | 2.2 |
| 2.12 | Adapt SearchModal for D-pad (BLUE button trigger) | 2h | P1 | 2.2 |
| 2.13 | Adapt CountryIntelModal for D-pad | 1h | P2 | 2.2 |
| 2.14 | Focus ring CSS polish (visibility, contrast, animation) | 2h | P0 | 2.1 |
| 2.15 | Magic Remote cursor hiding/showing logic | 1h | P1 | 2.2 |
| 2.16 | E2E tests: `e2e/tv-navigation.spec.ts` | 4h | P1 | all above |

### Phase 2 Acceptance Criteria
- [ ] All UI navigable with arrow keys + Enter only
- [ ] BACK closes modals/popups in correct order
- [ ] Map pannable with D-pad, features clickable with OK
- [ ] Color buttons toggle layers / open settings
- [ ] Focus ring always visible during D-pad navigation
- [ ] Magic Remote (mouse) still works
- [ ] No focus traps
- [ ] E2E navigation tests pass

---

## Phase 3: Performance & Optimization (30–40 hours)

**Goal**: App runs smoothly on actual LG TV hardware.

### Tasks

| # | Task | Est. | Priority | Dependencies |
|---|------|------|----------|-------------|
| 3.1 | Implement tier detection (`detectTVRenderTier()`) | 3h | P0 | Phase 1 |
| 3.2 | TV-Full tier: reduce deck.gl layers, lower quality settings | 6h | P0 | 3.1 |
| 3.3 | TV-Lite tier: MapLibre-only rendering (no deck.gl) | 8h | P1 | 3.1 |
| 3.4 | TV-Static tier: SVG fallback with pre-rendered backgrounds | 4h | P2 | 3.1 |
| 3.5 | Create minimal TV map style (`tv-dark.json`) | 3h | P1 | 3.2 |
| 3.6 | MapLibre TV config (maxZoom, tileCache, no rotation) | 2h | P0 | 3.2 |
| 3.7 | Memory monitoring + emergency cleanup | 2h | P0 | 1.2 |
| 3.8 | Frame budget enforcement (30fps target) | 2h | P1 | 3.2 |
| 3.9 | WebGL context loss recovery | 2h | P1 | 3.2 |
| 3.10 | Disable/simplify CSS animations for TV | 1h | P1 | Phase 1 |
| 3.11 | Tree-shake ML modules from TV build | 2h | P0 | 1.9 |
| 3.12 | Concurrent fetch limiting (max 3) | 1h | P1 | Phase 1 |
| 3.13 | WebSocket throttling for AIS (if enabled) | 1h | P2 | Phase 1 |
| 3.14 | Bundle font files in IPK | 2h | P1 | Phase 1 |
| 3.15 | Verify bundle size < 10 MB | 1h | P0 | 3.11 |
| 3.16 | Test on webOS emulator | 4h | P0 | all above |
| 3.17 | Test on physical LG TV (if available) | 6h | P0 | all above |
| 3.18 | Performance E2E tests: `e2e/tv-performance.spec.ts` | 3h | P1 | 3.16 |

### Phase 3 Acceptance Criteria
- [ ] 30+ fps on mid-range LG TV (C-series 2021+)
- [ ] JS heap < 800 MB after 30 minutes
- [ ] No WebGL context loss under normal use
- [ ] Map panning smooth, tiles load within 2s
- [ ] Bundle size < 10 MB (gzip)
- [ ] No ML modules in TV build
- [ ] App doesn't crash after 1 hour continuous use

---

## Phase 4: Polish & Ship (30–40 hours)

**Goal**: App is polished, packaged, and submitted to LG Content Store.

### Tasks

| # | Task | Est. | Priority | Dependencies |
|---|------|------|----------|-------------|
| 4.1 | Create app icons (80×80, 130×130) | 2h | P0 | — |
| 4.2 | Create splash screen (1920×1080) | 2h | P0 | — |
| 4.3 | Create `public/webos/appinfo.json` | 1h | P0 | — |
| 4.4 | Create `scripts/webos-package.mjs` | 2h | P0 | — |
| 4.5 | Add `npm run package:tv` and `deploy:tv` scripts | 0.5h | P0 | 4.4 |
| 4.6 | Create `TVSettingsPanel.ts` (simplified in-app settings) | 4h | P1 | Phase 2 |
| 4.7 | webOS app lifecycle (suspend/resume/relaunch) | 3h | P0 | 1.2 |
| 4.8 | Network status detection via Luna API | 2h | P1 | 1.2 |
| 4.9 | Offline UI (cached data banner) | 2h | P1 | 4.8 |
| 4.10 | i18n: match TV system language | 1h | P1 | 4.8 |
| 4.11 | Exit confirmation dialog | 1h | P0 | Phase 2 |
| 4.12 | Complete TV test checklist on LG TV | 8h | P0 | all above |
| 4.13 | Store screenshots (5 min) | 2h | P0 | 4.12 |
| 4.14 | Store description (localized) | 2h | P0 | — |
| 4.15 | Privacy policy page | 1h | P0 | — |
| 4.16 | Submit to LG Content Store | 1h | P0 | all above |
| 4.17 | Address LG review feedback (buffer) | 4h | P0 | 4.16 |
| 4.18 | CI pipeline for TV build (`tv-build.yml`) | 2h | P1 | 4.5 |

### Phase 4 Acceptance Criteria
- [ ] IPK packages successfully
- [ ] IPK installs and launches on dev TV
- [ ] App lifecycle (suspend/resume) works
- [ ] Network status detection works
- [ ] Offline mode shows cached data
- [ ] All store assets prepared (icons, screenshots, description)
- [ ] Submitted to LG Content Store
- [ ] Passes LG QA review

---

## 11.2 Effort Summary

| Phase | Hours | Calendar (1 dev) | Calendar (2 devs) |
|-------|-------|-------------------|-------------------|
| Phase 1: Foundation | 30–40h | 2 weeks | 1 week |
| Phase 2: Input | 30–40h | 2 weeks | 1.5 weeks |
| Phase 3: Performance | 30–40h | 2 weeks | 1.5 weeks |
| Phase 4: Polish & Ship | 30–40h | 2 weeks | 1.5 weeks |
| **Total** | **120–160h** | **8 weeks** | **5.5 weeks** |

## 11.3 Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| WebGL too slow on budget TVs | High | Medium | TV-Lite fallback (MapLibre only) |
| LG Content Store rejection | Medium | High | Follow guidelines exactly, test on hardware |
| webOS 4.0 incompatibility | Medium | Low | Target webOS 5.0+ only |
| Memory crashes | Medium | High | Aggressive memory monitoring + cleanup |
| D-pad navigation edge cases | High | Medium | Extensive testing + focus trap detection |
| API CORS issues in IPK mode | Low | High | `accessibleUrl` in appinfo.json |
| Dev Mode 50-hour expiry | Low | Low | Re-enable; doesn't affect production |
| MapLibre tile loading over WiFi | Medium | Medium | Tile caching, lower zoom limits |

## 11.4 Dependencies & Tooling Required

| Tool | Purpose | When Needed |
|------|---------|-------------|
| Node.js 20+ | Build system | Phase 1 |
| webOS CLI (`ares-*`) | Packaging, installing, debugging | Phase 3 |
| webOS TV Emulator | Testing without hardware | Phase 3 |
| VirtualBox 6+ | Runs emulator | Phase 3 |
| LG TV (physical) | Hardware testing | Phase 3–4 |
| LG Developer Account | Content Store submission | Phase 4 |
| Playwright | E2E testing | Phase 1+ |

## 11.5 Files Created/Modified Summary

### New Files (17)

| File | Phase | Purpose | Status |
|------|-------|---------|--------|
| `src/config/variants/tv.ts` | 1 | TV variant config | ✅ Created |
| `src/utils/tv-detection.ts` | 1 | webOS detection + helpers | ✅ Created |
| `src/utils/tv-focus.ts` | 2 | Spatial navigation engine | ⬜ |
| `src/utils/tv-remote.ts` | 2 | Remote control key handler | ⬜ |
| `src/styles/tv.css` | 1 | TV-specific CSS | ✅ Created |
| `src/components/TVOverlay.ts` | 2 | Footer hints + status | ⬜ |
| `src/components/TVSettingsPanel.ts` | 4 | Simplified settings | ⬜ |
| `scripts/webos-package.mjs` | 4 | IPK packaging script | ⬜ |
| `scripts/webos-icons/icon.png` | 4 | App icon 80×80 | ⬜ |
| `scripts/webos-icons/largeIcon.png` | 4 | App icon 130×130 | ⬜ |
| `scripts/webos-icons/splash.png` | 4 | Splash screen | ⬜ |
| `public/webos/appinfo.json` | 4 | webOS manifest | ⬜ |
| `public/styles/tv-dark.json` | 3 | Minimal map style | ⬜ |
| `e2e/tv-navigation.spec.ts` | 2 | Navigation E2E tests | ⬜ |
| `e2e/tv-visual.spec.ts` | 2 | Visual regression tests | ⬜ |
| `e2e/tv-performance.spec.ts` | 3 | Performance tests | ⬜ |
| `.github/workflows/tv-build.yml` | 4 | CI pipeline | ⬜ |

### Modified Files (12)

| File | Phase | Change | Status |
|------|-------|--------|--------|
| `src/config/variant.ts` | 1 | Accept `'tv'` variant | ✅ Done |
| `src/main.ts` | 1 | TV-specific init, disable SW | ✅ Done |
| `vite.config.ts` | 1 | Add TV variant meta, conditional PWA | ✅ Done |
| `package.json` | 1 | Add TV scripts | ✅ Done |
| `src/services/ml-capabilities.ts` | 1 | Short-circuit on TV | ✅ Done |
| `src/components/Panel.ts` | 1 | Disable drag/resize on TV | ✅ Done |
| `src/components/MapContainer.ts` | 3 | TV render tier selection | ⬜ |
| `src/components/DeckGLMap.ts` | 3 | TV quality settings | ⬜ |
| `src/components/MapPopup.ts` | 2 | TV centered popup | ⬜ |
| `src/controllers/ui-setup.ts` | 2 | TV keyboard integration | ⬜ |
| `src/services/storage.ts` | 1 | TV IDB limits | ⬜ |
| `index.html` | 1 | TV CSP policy | ⬜ |
| `src/config/panels.ts` | 1 | TV panels/layers + `selectVariant()` helper | ✅ Done |
| `src/controllers/panel-manager.ts` | 1 | Skip `makeDraggable()` on TV | ✅ Done |
| `src/controllers/refresh-scheduler.ts` | 1 | 2× refresh multiplier for TV | ✅ Done |
| `src/components/DownloadBanner.ts` | 1 | Early return if `IS_TV` | ✅ Done |
| `src/components/MobileWarningModal.ts` | 1 | `shouldShow()` returns false on TV | ✅ Done |

## 11.6 Definition of Done

The webOS port is considered **complete** when:

1. ✅ TV variant builds with `npm run build:tv` (zero errors)
2. ✅ All 3 existing variants unaffected
3. ✅ TypeScript strict mode passes
4. ✅ App navigable entirely with D-pad
5. ✅ App navigable with Magic Remote
6. ✅ 30+ fps on mid-range LG TV
7. ✅ No crashes after 1 hour continuous use
8. ✅ IPK packages and installs successfully
9. ✅ E2E tests pass (navigation + visual + performance)
10. ✅ Published on LG Content Store
