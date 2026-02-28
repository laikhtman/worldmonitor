# 07 — Storage & Offline Support

## 7.1 Storage Budget on webOS

| Storage Type | Limit | Current Usage | TV Strategy |
|-------------|-------|---------------|-------------|
| localStorage | 5 MB | ~100 KB (settings, theme, variant) | ✅ Keep as-is |
| IndexedDB | ~50 MB (varies by TV) | ~10 MB (cached news, analysis) | Reduce TTL, max entries |
| App sandbox (IPK) | 50–200 MB | N/A (all assets bundled) | Optimize bundle size |
| Cache API | Limited | Used by Service Worker | ❌ Disable SW on TV |

## 7.2 localStorage Usage

Current localStorage keys used by the app:

| Key | Size | TV Action |
|-----|------|-----------|
| `intelhq-variant` | ~8 B | ✅ Keep |
| `intelhq-theme` | ~5 B | ✅ Keep |
| `intelhq-panels` | ~2 KB | ✅ Keep (stores panel on/off) |
| `intelhq-monitors` | ~1 KB | ✅ Keep |
| `intelhq-layers` | ~500 B | ✅ Keep |
| `intelhq-disabled-feeds` | ~500 B | ✅ Keep |
| `wm-keyword-spike-*` | ~5 KB | ✅ Keep (keyword tracking) |
| `wm-mobile-warning-dismissed` | ~10 B | ❌ Remove (not relevant) |
| `wm-debug-log` | ~3 B | ✅ Keep |
| `wm-chunk-reload-*` | ~20 B | ❌ Remove (no chunk reload on IPK) |

**Total**: ~10 KB — well within 5 MB limit.

## 7.3 IndexedDB Adaptation

The app uses IndexedDB via `src/services/storage.ts` for:
1. Cached news articles (offline reading)
2. Analysis results (country scores, hotspot escalation)
3. Feed state (last fetch timestamps, ETags)

### TV-Specific Limits

```typescript
// src/services/storage.ts — TV overrides
const TV_IDB_LIMITS = {
  maxNewsItems: 100,           // Was 500
  maxAnalysisResults: 50,      // Was 200
  newsTTL: 6 * 60 * 60 * 1000, // 6h (was 24h)
  analysisTTL: 2 * 60 * 60 * 1000, // 2h (was 12h)
};

// Periodic cleanup
async function tvCleanupIDB(): Promise<void> {
  const db = await initDB();
  const now = Date.now();

  // Delete entries older than TTL
  const tx = db.transaction('news', 'readwrite');
  const store = tx.objectStore('news');
  const cursor = store.openCursor();

  cursor.onsuccess = (event) => {
    const result = (event.target as IDBRequest).result;
    if (result) {
      if (now - result.value.cachedAt > TV_IDB_LIMITS.newsTTL) {
        result.delete();
      }
      result.continue();
    }
  };
}
```

## 7.4 Service Worker Strategy

### Problem
The app uses VitePWA with Workbox for offline support. On webOS:
- Service Workers are **partially supported** (webOS 22+, Chromium 87+)
- On older webOS (5.0–22), Service Workers may not be available
- IPK-packaged apps already have local assets — SW caching is redundant for static files
- Runtime API caching via SW adds complexity with minimal benefit on TV

### Decision: Disable Service Worker on TV

```typescript
// src/main.ts — conditional SW registration
if (!IS_TV) {
  // Register service worker (desktop/mobile web only)
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
```

### Vite Config

```typescript
// vite.config.ts — conditional PWA plugin
VitePWA({
  // ...existing config...
  injectRegister: activeVariant === 'tv' ? false : 'auto',
  // Disable manifest for TV variant
  ...(activeVariant === 'tv' ? { manifest: false } : {}),
}),
```

## 7.5 Offline Behavior

Since the TV app is packaged as IPK:

| Resource | Online | Offline |
|----------|--------|---------|
| HTML/CSS/JS | ✅ From IPK | ✅ From IPK |
| Map tiles | ✅ Fetch from CDN | ❌ Show placeholder |
| API data | ✅ Fetch from Vercel | ❌ Show last cached (IDB) |
| Fonts | ✅ From IPK bundle | ✅ From IPK bundle |
| Icons/images | ✅ From IPK bundle | ✅ From IPK bundle |

### Offline UI

```typescript
// Show offline banner when network unavailable
watchNetworkStatus((online, type) => {
  if (!online) {
    showTVBanner('No internet connection — showing cached data', 'warning');
    // Switch map to static mode (cached tiles only)
  } else {
    hideTVBanner();
    // Resume normal operation
  }
});
```

## 7.6 Bundle Size Optimization

IPK apps have limited sandbox storage. Optimize the bundle:

### Current Bundle Analysis (estimated from Vite build)

| Chunk | Size (gzip) | TV Action |
|-------|------------|-----------|
| `ml.js` (transformers + ONNX RT) | ~2.5 MB | ❌ **Exclude entirely** |
| `map.js` (deck.gl + MapLibre + h3) | ~800 KB | ✅ Keep (core feature) |
| `d3.js` | ~200 KB | ⚠️ Conditional (SVG fallback only) |
| `sentry.js` | ~80 KB | ✅ Keep |
| `i18n.js` | ~30 KB | ✅ Keep |
| `topojson.js` | ~20 KB | ✅ Keep |
| Main app bundle | ~300 KB | ✅ Keep |
| CSS | ~100 KB | ✅ Keep |
| **Total (TV)** | **~1.5 MB** | Down from ~4 MB |

### Tree-Shaking the ML Chunk

The `ml.js` chunk (~2.5 MB) contains `@xenova/transformers` and `onnxruntime-web`. Since ML is disabled on TV:

```typescript
// vite.config.ts — TV variant exclusion
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        // Exclude ML chunks for TV variant
        if (activeVariant === 'tv') {
          if (id.includes('/@xenova/transformers/') || id.includes('/onnxruntime-web/')) {
            return undefined; // Let tree-shaking remove unused code
          }
        }
        // ...existing chunk logic
      },
    },
    // Explicitly mark ML packages as external for TV variant
    ...(activeVariant === 'tv' ? {
      external: [
        '@xenova/transformers',
        'onnxruntime-web',
      ],
    } : {}),
  },
},
```

## 7.7 Font Bundling

Currently, fonts are loaded from Google Fonts CDN. For TV:

```css
/* Bundle Inter/Mono fonts in the IPK for instant rendering */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}

/* Monospace for data/stats */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

Download and include in `public/fonts/` — total ~200 KB for 3 font files.
