# 01 — Platform Overview: LG webOS TV

## 1.1 webOS Version Matrix

| webOS Version | Year | LG TV Series | Chromium Base | WebGL | ES Version | Notes |
|---------------|------|-------------|---------------|-------|------------|-------|
| 3.x | 2016–2017 | UJ/SJ | Chromium 38 | 1.0 | ES5 | Too old — **not targeted** |
| 4.0 | 2018 | SK/UK | Chromium 53 | 1.0 | ES2015 | Minimum viable target |
| 5.0 | 2020 | CX/GX/BX | Chromium 68 | 2.0 | ES2017 | Good baseline |
| 6.0 | 2021 | C1/G1/A1 | Chromium 79 | 2.0 | ES2020 | Recommended minimum |
| 22 | 2022 | C2/G2/A2 | Chromium 87 | 2.0 | ES2020 | Strong support |
| 23 | 2023 | C3/G3/A3 | Chromium 94 | 2.0 | ES2021 | Near-modern |
| 24 | 2024 | C4/G4/M4 | Chromium 108 | 2.0 | ES2022 | Full modern |

**Decision**: Target **webOS 5.0+** (Chromium 68+) as minimum. This covers 2020+ TVs with WebGL 2.0 and async/await support. webOS 4.0 is optional stretch goal.

## 1.2 Browser Engine Details

webOS TV apps run inside a **Chromium-based web runtime** managed by the Luna Service Bus:

- **Engine**: Based on Chromium (NOT a full Chrome install — no extensions, limited DevTools)
- **JS Engine**: V8 (version depends on Chromium base)
- **Rendering**: Blink engine with hardware-accelerated compositing
- **Not available**: WebRTC (partial), WebBluetooth, WebUSB, WebXR, Notifications API, Push API
- **Available**: WebGL 1.0/2.0, WebAssembly, Web Workers, IndexedDB, localStorage, Fetch API, CSS Grid/Flexbox, CSS Custom Properties, IntersectionObserver, ResizeObserver, MutationObserver

## 1.3 Hardware Constraints

### SoC Profiles (representative)

| TV Tier | SoC | CPU | GPU | RAM (App) | Notes |
|---------|-----|-----|-----|-----------|-------|
| Budget (A-series) | MediaTek MT5895 | 4× Cortex-A53 @ 1.5 GHz | Mali-G52 MC1 | ~600 MB | Very constrained |
| Mid (B/C-series) | α7 Gen 5 | 4× Cortex-A73 @ 1.5 GHz | Mali-G72 MP3 | ~1 GB | Acceptable baseline |
| Premium (G-series) | α9 Gen 6 | 4× Cortex-A76 @ 2.0 GHz | Mali-G78 MP4 | ~1.5 GB | Good performance |

### Key Constraints vs Desktop

| Constraint | Desktop | TV | Impact Factor |
|------------|---------|-----|---------------|
| CPU clock | 3–5 GHz | 1.5–2 GHz | **2–3× slower** |
| CPU cores (available to app) | 8–16 | 2–4 | **4× fewer** |
| GPU GFLOPS | 5,000–15,000 | 100–400 | **20–50× weaker** |
| Available RAM | 8–32 GB | 0.6–1.5 GB | **10–20× less** |
| Network I/O | WiFi 6 / Ethernet | WiFi 5 / 100Mbps Ethernet | Similar (WiFi potentially weaker) |
| Storage (app sandbox) | Unlimited | 50–200 MB | Very limited |
| Display resolution | Variable | 4K (3840×2160) fixed | Large canvas, weak GPU |
| Input | Mouse + keyboard | D-pad + Magic Remote(pointer) | Fundamentally different |

### Critical Performance Implications

1. **4K rendering on weak GPU**: The display is 3840×2160 but the GPU has 1/50th the power of a desktop GPU. Must render at lower resolution and upscale, or reduce visual complexity drastically.
2. **Memory pressure**: With only 600 MB–1.5 GB for the app, loading all map tiles + deck.gl layers + ML models simultaneously is impossible. Need aggressive memory management.
3. **CPU bottleneck**: JavaScript execution is 2–3× slower. Parsing large JSON responses (GDELT, ACLED, USGS feeds) will cause visible jank. Must use Web Workers aggressively.
4. **No WebGPU**: TV Chromium versions don't ship WebGPU. ML inference falls back to WebGL or WASM (much slower).
5. **Thermal throttling**: TVs are passively cooled. Sustained heavy compute causes thermal throttling after 10–20 minutes.

## 1.4 webOS App Types

| Type | Technology | Distribution | Best For |
|------|-----------|--------------|----------|
| **Web App** | HTML/CSS/JS in webOS runtime | LG Content Store (IPK) | Our use case |
| Hosted Web App | URL launched in Smart TV browser | Direct URL (no install) | Simple dashboards |
| Native (NDK) | C/C++ with webOS NDK | LG Content Store | Games, media players |

**Decision**: Build as a **packaged Web App** (IPK) for Content Store distribution. This gives us:
- Full screen with no browser chrome
- Access to Luna Service Bus APIs (system info, storage, network status)
- Offline asset caching (all static assets bundled in IPK)
- App lifecycle events (suspend/resume/relaunch)

## 1.5 webOS-Specific APIs (Luna Service Bus)

The webOS web runtime exposes platform APIs through `webOS.service.request()`:

| API | Purpose | Relevance |
|-----|---------|-----------|
| `com.webos.service.tv.systemproperty` | Get TV model, firmware, region | Platform detection |
| `com.webos.service.connectionmanager` | Network status, WiFi signal | Connection quality |
| `com.webos.applicationManager` | App lifecycle, launch params | Suspend/resume |
| `com.webos.service.settings` | System settings (language, locale) | i18n sync |
| `com.webos.notification` | System toast notifications | Alert events |
| `com.palm.systemservice/time` | System clock, timezone | Time sync |
| `luna://com.webos.service.tv.display` | Display resolution, HDR | Rendering config |

## 1.6 webOS SDK Requirements

```
# Required tools
npm install -g @anthropic/webos-cli   # (or LG's ares-cli)
ares-setup-device                      # Register dev TV
ares-install                           # Install IPK on device
ares-inspect                           # Chrome DevTools remote debugging
ares-package                           # Build IPK from dist/
```

### SDK Components
- **ares-cli**: Command-line tools for packaging, installing, inspecting
- **webOS TV Emulator**: VirtualBox-based emulator (limited WebGL support)
- **Chrome DevTools**: Remote debugging via `ares-inspect --device <TV> --app <appId>`
- **Developer Mode App**: Must be installed on physical TV, renewed every 50 hours

## 1.7 Compatibility Summary

| Feature | Status | Notes |
|---------|--------|-------|
| ES2020+ JavaScript | ✅ Supported (webOS 5+) | Target ES2017 for safety |
| CSS Grid + Flexbox | ✅ Supported | Current layout works |
| CSS Custom Properties | ✅ Supported | Theme system works |
| WebGL 2.0 | ✅ Supported (webOS 5+) | Performance-limited |
| WebAssembly | ✅ Supported | Used by ONNX RT |
| Web Workers | ✅ Supported | Used by analysis + ML |
| Shared Array Buffer | ⚠️ Partial (webOS 22+) | May need COOP/COEP headers |
| IndexedDB | ✅ Supported | Size-limited |
| localStorage | ✅ Supported | 5 MB limit |
| Fetch API | ✅ Supported | CORS restrictions apply |
| WebSocket | ✅ Supported | AIS stream, live data |
| Service Worker | ⚠️ Limited | PWA model differs on TV |
| WebGPU | ❌ Not available | ML fallback to WASM |
| WebRTC | ⚠️ Partial | Not needed |
| Gamepad API | ✅ Supported | Magic Remote / Bluetooth gamepad |
| Notifications API | ❌ Use Luna notifications | Platform-specific |
| Fullscreen API | ✅ Always fullscreen | Apps run fullscreen by default |
