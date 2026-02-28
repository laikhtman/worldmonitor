# webOS TV Compatibility Plan — IntelHQ

> **Status**: Planning  
> **Target**: LG webOS Smart TVs (webOS 4.0+, 2018 and later)  
> **Estimated effort**: 120–180 hours  
> **Priority**: P2 (new platform target)

---

## Table of Contents

| # | Document | Description |
|---|----------|-------------|
| 1 | [01-PLATFORM-OVERVIEW.md](01-PLATFORM-OVERVIEW.md) | webOS capabilities, browser engine, hardware constraints |
| 2 | [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | Build variant, project structure, packaging pipeline |
| 3 | [03-INPUT-NAVIGATION.md](03-INPUT-NAVIGATION.md) | D-pad / Magic Remote, spatial focus, keyboard handling |
| 4 | [04-UI-UX-ADAPTATION.md](04-UI-UX-ADAPTATION.md) | 10-foot UI, safe zones, typography, theming |
| 5 | [05-GRAPHICS-PERFORMANCE.md](05-GRAPHICS-PERFORMANCE.md) | WebGL / deck.gl / MapLibre, GPU budget, fallbacks |
| 6 | [06-API-NETWORKING.md](06-API-NETWORKING.md) | CORS, CSP, proxy, WebSocket, API restrictions |
| 7 | [07-STORAGE-OFFLINE.md](07-STORAGE-OFFLINE.md) | localStorage, IndexedDB, service worker, PWA on TV |
| 8 | [08-ML-WASM.md](08-ML-WASM.md) | ONNX Runtime / Transformers.js on TV SoCs |
| 9 | [09-TESTING-QA.md](09-TESTING-QA.md) | Emulator, physical devices, E2E, visual regression |
| 10 | [10-PACKAGING-DEPLOYMENT.md](10-PACKAGING-DEPLOYMENT.md) | IPK packaging, LG Content Store, OTA updates |
| 11 | [11-IMPLEMENTATION-ROADMAP.md](11-IMPLEMENTATION-ROADMAP.md) | Phased rollout, task breakdown, milestones |

---

## Quick Context

IntelHQ is a real-time global intelligence dashboard built with:

- **Vanilla TypeScript** (no framework) with class-based components
- **MapLibre GL JS + deck.gl** for WebGL 3D globe visualization
- **Vite 6** build system with 3 existing variants (`full`, `tech`, `finance`)
- **Tauri 2** for desktop app packaging with Node.js sidecar
- **VitePWA** for offline support (Workbox service worker)
- **@xenova/transformers** for in-browser ML inference (ONNX/WASM)
- **60+ Vercel Edge Functions** for backend API layer

The webOS port will introduce a **4th variant** (`tv`) that reuses the existing codebase with TV-specific adaptations for input, layout, performance, and packaging.
