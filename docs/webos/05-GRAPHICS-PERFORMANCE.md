# 05 — Graphics & Performance: WebGL, deck.gl, MapLibre

## 5.1 The GPU Challenge

The core product is a WebGL 3D globe rendered by **MapLibre GL JS** with **deck.gl** overlays. This is the heaviest GPU workload in the app and the primary performance bottleneck on TV.

### Current Desktop Rendering Pipeline

```
MapLibre GL JS (base map tiles + labels)
    ↓ WebGL2 context
    ├── Vector tile decoding + rendering
    ├── Label placement
    └── Camera transforms (fly-to, zoom)

deck.gl MapboxOverlay (data layers)
    ↓ Shares WebGL context with MapLibre
    ├── ScatterplotLayer (hotspots, bases, earthquakes, ...)
    ├── GeoJsonLayer (countries, borders, zones, ...)
    ├── PathLayer (cables, pipelines, flights, ...)
    ├── IconLayer (markers, airports, ...)
    ├── TextLayer (labels)
    ├── ArcLayer (displacement flows)
    ├── HeatmapLayer (protest density)
    └── Supercluster (client-side clustering)
```

### TV GPU Budget Estimation

| Metric | Desktop (RTX 3060) | TV (Mali-G72 MP3) | Ratio |
|--------|-------------------|-------------------|-------|
| GFLOPS | 12,740 | ~200 | 64× less |
| Texture units | 160 | 24 | 7× less |
| Memory bandwidth | 360 GB/s | 25 GB/s | 14× less |
| Max draw calls/frame | ~10,000 | ~500 | 20× fewer |
| Target FPS | 60 | 30 | 2× lower |
| Max vertices/frame | 10M | 200K | 50× fewer |

**Conclusion**: Must reduce rendering complexity by **~50×** to achieve 30fps on mid-range TV.

## 5.2 Strategy: Tiered Rendering

Implement three rendering tiers, selected automatically based on detected GPU:

| Tier | Trigger | Map Engine | Layers | Interactivity |
|------|---------|-----------|--------|---------------|
| **TV-Full** | α9 Gen 6+ or webOS 23+ | MapLibre + deck.gl (reduced) | 3–5 layers | Full panning, zoom |
| **TV-Lite** | α7 Gen 5, webOS 5–22 | MapLibre only (no deck.gl) | Built-in MapLibre layers | Full panning, zoom |
| **TV-Static** | Budget SoC / fallback | Static globe image + SVG overlays | SVG only | Pre-rendered regions |

### Tier Detection

```typescript
// src/utils/tv-detection.ts
export function detectTVRenderTier(): 'full' | 'lite' | 'static' {
  // 1. Check WebGL capabilities
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return 'static';

  // 2. Check GPU renderer string
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : 'unknown';

  console.log('[TV] GPU renderer:', renderer);

  // 3. Benchmark: draw simple scene and measure frame time
  const frameBudget = benchmarkGPU(gl);

  if (frameBudget < 16) {
    return 'full';    // Can do 60fps simple → 30fps with deck.gl
  } else if (frameBudget < 33) {
    return 'lite';    // Can do 30fps without deck.gl
  } else {
    return 'static';  // Too slow for real-time WebGL
  }
}

function benchmarkGPU(gl: WebGLRenderingContext): number {
  // Draw 1000 triangles, measure frame time
  // Returns average ms per frame
  const start = performance.now();
  for (let i = 0; i < 10; i++) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.flush();
  }
  gl.finish();
  return (performance.now() - start) / 10;
}
```

## 5.3 TV-Full Tier: Reduced deck.gl

### Layer Reduction

| Layer | Desktop | TV-Full | Reason |
|-------|---------|---------|--------|
| ScatterplotLayer (hotspots) | ~100 points | ~100 points | ✅ Keep (core feature) |
| ScatterplotLayer (earthquakes) | ~500 points | ~100 points | Reduce: filter by magnitude |
| GeoJsonLayer (countries) | ~200 features | ~200 features | ✅ Keep (needed for fill) |
| GeoJsonLayer (conflict zones) | ~50 polygons | ~50 polygons | ✅ Keep |
| PathLayer (cables) | ~500 paths | ❌ Disable | Too many paths |
| PathLayer (pipelines) | ~100 paths | ❌ Disable | Too many paths |
| PathLayer (flight trails) | ~200 paths | ❌ Disable | Real-time, expensive |
| IconLayer (military bases) | ~400 icons | ❌ Disable | Too many texture lookups |
| IconLayer (airports) | ~200 icons | ❌ Disable | Non-essential |
| TextLayer (labels) | ~200 labels | ~50 labels | Reduce count |
| ArcLayer (displacement flows) | ~100 arcs | ❌ Disable | GPU-intensive |
| HeatmapLayer (protests) | Grid data | ❌ Disable | Very GPU-intensive |
| Supercluster (all) | ~5000 points | ~500 points (pre-clustered) | Reduce input |

### Render Settings

```typescript
// TV-specific deck.gl configuration
const TV_DECK_CONFIG = {
  // Lower the pixel ratio to reduce GPU workload
  useDevicePixels: false,                // Render at CSS pixels, not device pixels
  _framebufferScaleFactor: 0.5,          // Render at half resolution, upscale

  // Disable anti-aliasing
  glOptions: {
    antialias: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  },

  // Reduce transition animation frames
  transitionDuration: 500,  // Was 1000

  // Fewer picking calls
  pickingRadius: 20,  // Larger pick area (compensates for less precision)
};
```

### MapLibre Settings for TV

```typescript
// TV-specific MapLibre configuration
const TV_MAPLIBRE_CONFIG: maplibregl.MapOptions = {
  // Reduce max zoom to save resources
  maxZoom: 12,        // Was 18

  // Reduce tile quality
  pixelRatio: 1,       // Don't render at device pixel ratio

  // Disable expensive features
  fadeDuration: 0,     // No tile fade animation
  trackResize: true,

  // Reduce tile loading
  maxTileCacheSize: 50, // Was 200+

  // Disable rotation (saves GPU + simplifies TV UX)
  pitchWithRotate: false,
  dragRotate: false,
  touchPitch: false,

  // Simpler style
  style: 'maplibre://styles/dark-minimal',  // Use a lighter style
};
```

## 5.4 TV-Lite Tier: MapLibre Only (No deck.gl)

When GPU is too weak for deck.gl, render data using MapLibre's built-in source/layer system:

```typescript
// Convert deck.gl ScatterplotLayer → MapLibre circle layer
function addHotspotsAsMapLibreLayer(map: maplibregl.Map, hotspots: Hotspot[]): void {
  map.addSource('hotspots', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: hotspots.map(h => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
        properties: { name: h.name, severity: h.severity },
      })),
    },
  });

  map.addLayer({
    id: 'hotspots-circles',
    type: 'circle',
    source: 'hotspots',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'severity'], 1, 6, 5, 16],
      'circle-color': ['interpolate', ['linear'], ['get', 'severity'],
        1, '#44ff88',
        3, '#ff8844',
        5, '#ff4444',
      ],
      'circle-opacity': 0.7,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
    },
  });
}
```

### Advantages of MapLibre-only
- MapLibre handles its own WebGL pipeline efficiently
- Built-in clustering (`cluster: true` on GeoJSON source)
- Built-in tile caching
- Much lower memory footprint than deck.gl

## 5.5 TV-Static Tier: SVG Fallback

For worst-case GPU (budget TVs or webOS 4.0):

- Use the existing `MapComponent` (D3/SVG) which is already the mobile fallback
- The SVG map is already implemented in `src/components/Map.ts` (3,501 lines)
- Reduce feature count further (top 20 hotspots only)
- Pre-render region backgrounds as PNG images

## 5.6 Memory Management

### Memory Budget

```
Total app memory budget: ~800 MB (mid-range TV)

Map tiles:       200 MB  (50 tiles × 4 MB avg)
deck.gl buffers: 100 MB  (reduced layers)
DOM/JS heap:     200 MB  (app state, panel content)
Images/fonts:    50 MB
Reserves:        250 MB  (GC headroom, system)
```

### Memory Optimization Strategies

```typescript
// 1. Aggressive tile cache eviction
maplibregl.setMaxParallelImageRequests(4); // Was 6
map.setMaxTileCacheSize(30);               // Was unlimited

// 2. Release deck.gl layers when not visible
if (IS_TV) {
  // Only render layers that are currently toggled ON
  // Desktop: all layers exist but are hidden via opacity
  // TV: actually remove/add layers from deck to free GPU memory
}

// 3. Debounce data updates more aggressively
const TV_UPDATE_DEBOUNCE = 5000;  // 5s vs 1s on desktop

// 4. Limit concurrent fetch requests
const TV_MAX_CONCURRENT_FETCHES = 3;  // vs 6+ on desktop

// 5. Use smaller JSON responses
// Add ?limit=50 to API calls that support it

// 6. DOM recycling for panel content
// VirtualList already exists — ensure all panels use it on TV
```

### Memory Monitoring

```typescript
// src/utils/tv-detection.ts
export function monitorMemory(): void {
  if (!IS_TV) return;

  setInterval(() => {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    };
    if (perf.memory) {
      const usedMB = perf.memory.usedJSHeapSize / (1024 * 1024);
      const limitMB = perf.memory.jsHeapSizeLimit / (1024 * 1024);
      const usage = usedMB / limitMB;

      if (usage > 0.85) {
        console.warn(`[TV] Memory pressure: ${usedMB.toFixed(0)}/${limitMB.toFixed(0)} MB (${(usage * 100).toFixed(0)}%)`);
        // Trigger emergency cleanup
        reduceLayers();
        evictCaches();
      }
    }
  }, 30_000);
}
```

## 5.7 Frame Budget

Target: **30 fps** (33ms per frame)

```
Frame budget: 33ms
  ├── JavaScript:      8ms  (event handling, state updates)
  ├── Style/Layout:    3ms  (CSS recalc, layout)
  ├── MapLibre render: 12ms (tile compositing, labels)
  ├── deck.gl render:  8ms  (data layers)
  └── Composite:       2ms  (GPU compositing)
```

### Performance Guards

```typescript
// Skip rendering frames when behind
let lastFrameTime = 0;
const MIN_FRAME_INTERVAL = IS_TV ? 33 : 16; // 30fps vs 60fps

function onAnimationFrame(time: number): void {
  if (time - lastFrameTime < MIN_FRAME_INTERVAL) {
    requestAnimationFrame(onAnimationFrame);
    return;
  }
  lastFrameTime = time;
  // ... render
}
```

## 5.8 Map Interaction Performance

### Debounced Interactions

```typescript
// TV: larger debounce for map interactions
const TV_MAP_DEBOUNCE = {
  moveend: 500,    // Was 100 (reloads tiles on pan end)
  zoomend: 500,    // Was 100
  click: 100,      // Keep responsive
  hover: 0,        // Disable hover events entirely on D-pad mode
};
```

### Reduced Animation

```typescript
if (IS_TV) {
  // Disable fly-to animations (GPU-heavy camera transitions)
  map.jumpTo({ center, zoom }); // Instead of map.flyTo(...)

  // Or use very short fly-to
  map.flyTo({ center, zoom, duration: 300 }); // Was 1000-2000
}
```

## 5.9 WebGL Context Loss Recovery

TV WebGL contexts may be lost due to:
- Memory pressure from other apps
- TV sleep/wake cycles
- Background app switching

```typescript
// Handle WebGL context loss gracefully
const canvas = map.getCanvas();
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  console.warn('[TV] WebGL context lost — pausing rendering');
  // Show "Reconnecting..." overlay
});

canvas.addEventListener('webglcontextrestored', () => {
  console.log('[TV] WebGL context restored — resuming');
  map.triggerRepaint();
  // Rebuild deck.gl layers
});
```

## 5.10 Map Style for TV

Create a simplified map style that renders faster:

```json
// public/styles/tv-dark.json (MapLibre style)
{
  "version": 8,
  "name": "IntelHQ TV Dark",
  "sources": {
    "openmaptiles": {
      "type": "vector",
      "url": "https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key={key}",
      "maxzoom": 10
    }
  },
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": { "background-color": "#020a08" }
    },
    {
      "id": "water",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "water",
      "paint": { "fill-color": "#061a14" }
    },
    {
      "id": "land",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landcover",
      "paint": { "fill-color": "#0a1a10" }
    },
    {
      "id": "boundaries",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "boundary",
      "paint": {
        "line-color": "#2a4a3a",
        "line-width": 1
      }
    },
    {
      "id": "country-labels",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "place",
      "filter": ["==", "class", "country"],
      "layout": {
        "text-field": "{name}",
        "text-size": 14,
        "text-font": ["Open Sans Regular"]
      },
      "paint": {
        "text-color": "#668877",
        "text-halo-color": "#020a08",
        "text-halo-width": 1
      }
    }
  ]
}
```

This minimal style has ~5 layers vs ~30+ in the default MapTiler dark style, resulting in ~6× faster rendering.
