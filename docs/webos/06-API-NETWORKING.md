# 06 — API & Networking

## 6.1 Network Architecture

The app currently fetches data from 60+ Vercel Edge Functions deployed at `intelhq.io/api/*`. On TV, the same API endpoints are used but with TV-specific considerations.

### Request Flow

```
LG TV (webOS app)
  → WiFi / Ethernet
    → Vercel CDN (Edge Functions)
      → Upstream data sources (USGS, GDELT, Yahoo Finance, etc.)
```

## 6.2 CORS Considerations

webOS apps run in a Chromium web runtime with standard CORS enforcement. Since the app is packaged as an IPK (local `file://` or `app://` origin):

### Problem
Local-origin apps cannot make `fetch()` calls to `https://intelhq.io/api/*` because the origin is `null` or `app://com.intelhq.tv`.

### Solutions (in order of preference)

**Option A: webOS `http` proxy** (Recommended)
```json
// appinfo.json
{
  "enableBackHistory": true,
  "accessibleUrl": [
    "https://intelhq.io/*",
    "https://api.maptiler.com/*",
    "https://*.basemaps.cartocdn.com/*",
    "https://earthquake.usgs.gov/*"
  ]
}
```
The `accessibleUrl` field in `appinfo.json` whitelists external domains, allowing the webOS runtime to bypass same-origin restrictions for those URLs.

**Option B: Hosted app mode**
Instead of packaging as IPK, run as a hosted web app:
```json
// appinfo.json
{
  "main": "https://tv.intelhq.io/",
  "type": "web"
}
```
This loads the app from the web (like a browser), eliminating CORS issues entirely. Downsides: requires internet for initial load, no offline assets.

**Option C: API proxy via Luna Service**
Use the webOS `com.webos.service.downloadmanager` or custom Node.js service to proxy API calls. Overkill for our case.

**Decision**: Use **Option A** (packaged app + `accessibleUrl`) for distribution, with **Option B** as development/testing shortcut.

## 6.3 CSP Policy for TV

The current CSP in `index.html` is comprehensive. For the TV variant, simplify and tighten:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' https: data: blob:;
  connect-src 'self'
    https://intelhq.io/api/*
    https://api.maptiler.com
    https://*.basemaps.cartocdn.com
    wss://stream.aisstream.io;
  worker-src 'self' blob:;
  frame-src 'none';
">
```

Key changes vs desktop:
- **`frame-src 'none'`**: No YouTube iframes on TV (too heavy)
- **Removed** `https://www.youtube.com` from frame-src
- **Kept** `wasm-unsafe-eval` for WebAssembly (MapLibre uses WASM internally)
- **Kept** `worker-src blob:` for analysis worker

## 6.4 API Response Optimization

TV apps should request less data to save bandwidth and parsing time:

### Query Parameter Strategy

```typescript
// src/services/fetch-helpers.ts — TV overrides
const TV_API_LIMITS: Record<string, Record<string, string>> = {
  '/api/rss-proxy': { limit: '30' },           // Was 100+
  '/api/earthquakes': { limit: '50' },          // Was 200+
  '/api/acled': { limit: '50' },                // Was 200+
  '/api/gdelt-doc': { limit: '20', timespan: '24h' },
  '/api/gdelt-geo': { limit: '100' },           // Was 500+
  '/api/cyber-threats': { limit: '20' },
  '/api/polymarket': { limit: '20' },           // Was 100
  '/api/hackernews': { limit: '15' },           // Was 30
  '/api/github-trending': { limit: '10' },      // Was 25
};

export function appendTVLimits(url: string): string {
  if (!IS_TV) return url;

  for (const [path, params] of Object.entries(TV_API_LIMITS)) {
    if (url.includes(path)) {
      const u = new URL(url, location.origin);
      for (const [key, value] of Object.entries(params)) {
        u.searchParams.set(key, value);
      }
      return u.toString();
    }
  }
  return url;
}
```

## 6.5 Refresh Intervals

TV variant uses longer refresh intervals to reduce CPU/network pressure:

```typescript
// src/config/variants/tv.ts
export const TV_REFRESH_INTERVALS = {
  feeds: 10 * 60 * 1000,        // 10min (was 5min)
  markets: 5 * 60 * 1000,       // 5min (was 2min)
  crypto: 5 * 60 * 1000,        // 5min (was 2min)
  predictions: 15 * 60 * 1000,  // 15min (was 5min)
  ais: 30 * 60 * 1000,          // 30min (was 10min)
  arxiv: 120 * 60 * 1000,       // 2h (was 1h)
  githubTrending: 60 * 60 * 1000, // 1h (was 30min)
  hackernews: 15 * 60 * 1000,   // 15min (was 5min)
};
```

## 6.6 WebSocket Handling

The AIS vessel tracking uses WebSocket. On TV:

```typescript
if (IS_TV) {
  // Disable AIS WebSocket by default (real-time vessel tracking is heavy)
  // User can enable it explicitly in TV settings
  config.mapLayers.ais = false;
}
```

If enabled, rate-limit incoming messages:

```typescript
const TV_WS_THROTTLE_MS = 5000; // Process at most 1 message per 5s
let lastWsProcessed = 0;

ws.onmessage = (event) => {
  if (IS_TV && Date.now() - lastWsProcessed < TV_WS_THROTTLE_MS) return;
  lastWsProcessed = Date.now();
  // ... process message
};
```

## 6.7 Concurrent Request Limiting

```typescript
// Limit concurrent API fetches on TV
const TV_MAX_CONCURRENT = 3;
let activeFetches = 0;
const fetchQueue: (() => void)[] = [];

export async function tvFetch(url: string, init?: RequestInit): Promise<Response> {
  if (!IS_TV) return fetch(url, init);

  while (activeFetches >= TV_MAX_CONCURRENT) {
    await new Promise<void>(resolve => fetchQueue.push(resolve));
  }

  activeFetches++;
  try {
    return await fetch(appendTVLimits(url), init);
  } finally {
    activeFetches--;
    fetchQueue.shift()?.();
  }
}
```

## 6.8 Network Status Detection

Use webOS Luna API for network status:

```typescript
// src/utils/tv-detection.ts
export function watchNetworkStatus(
  callback: (online: boolean, type: 'wifi' | 'wired' | 'none') => void
): void {
  if (!IS_WEBOS) {
    // Fallback: standard navigator.onLine
    window.addEventListener('online', () => callback(true, 'wifi'));
    window.addEventListener('offline', () => callback(false, 'none'));
    return;
  }

  // webOS-specific network monitoring
  if ('webOS' in window) {
    (window as any).webOS.service.request('luna://com.webos.service.connectionmanager', {
      method: 'getStatus',
      parameters: { subscribe: true },
      onSuccess: (res: any) => {
        const isOnline = res.isInternetConnectionAvailable;
        const type = res.wired?.state === 'connected' ? 'wired'
          : res.wifi?.state === 'connected' ? 'wifi'
          : 'none';
        callback(isOnline, type);
      },
      onFailure: () => {
        callback(navigator.onLine, 'wifi');
      },
    });
  }
}
```

## 6.9 Error Handling on TV

Network errors on TV are more common (WiFi instability, TV sleep/wake). Enhance circuit breaker:

```typescript
// TV-specific circuit breaker adjustments
if (IS_TV) {
  // Longer cooldown (TV users may not notice failures)
  CircuitBreaker.defaultCooldownMs = 10 * 60 * 1000; // 10min vs 5min

  // More retries (TV is unattended)
  CircuitBreaker.defaultMaxFailures = 5; // vs 3

  // Show non-intrusive status indicator instead of error toasts
  CircuitBreaker.onTrip = (feedId) => {
    tvOverlay.showStatus(`${feedId} temporarily unavailable`);
  };
}
```
