# 08 — ML & WebAssembly on TV

## 8.1 Current ML Pipeline

The app uses `@xenova/transformers` (Transformers.js) with ONNX Runtime Web for:

1. **News classification** — categorizes articles by topic (conflict, economy, tech, etc.)
2. **Sentiment analysis** — scores article sentiment (-1 to +1)
3. **Embedding generation** — creates vector embeddings for semantic similarity
4. **Trend detection** — identifies keyword spikes and emerging narratives

This runs in a dedicated Web Worker (`src/workers/ml.worker.ts`) managed by `src/services/ml-worker.ts`.

## 8.2 Why ML Must Be Disabled on TV

| Factor | Desktop | TV | Verdict |
|--------|---------|-----|---------|
| CPU for WASM inference | 3–5 GHz, 8+ cores | 1.5 GHz, 2–4 cores | **3–5× slower** |
| Available RAM for model | 4+ GB spare | 200–400 MB spare | **Model may not fit** |
| WebGL backend for ONNX | Full GPU | GPU busy with map | **Contention** |
| Inference time per article | ~200ms | ~1–3 seconds | **Too slow for real-time** |
| Thermal impact | Fan-cooled | Passive cooling | **Throttle risk** |
| WASM SIMD | ✅ Available | ⚠️ Partial (varies) | **Unpredictable** |
| SharedArrayBuffer | ✅ Available | ⚠️ webOS 22+ only | **Threading limited** |

**Decision**: **Completely disable ML on TV**. Use server-side classification via API instead.

## 8.3 Server-Side ML Fallback

Instead of in-browser ML, the TV variant will rely on:

1. **Pre-classified news** — The backend already classifies articles via Groq API (`/api/classify-batch`). TV just consumes the pre-classified data.
2. **AI Insights** — Generated server-side via `/api/groq-summarize` and `/api/openrouter-summarize`. TV displays these as-is.
3. **No local embeddings** — Skip semantic similarity features on TV. Users can still search by keyword.

### Implementation

```typescript
// src/services/ml-capabilities.ts
export async function detectMLCapabilities(): Promise<MLCapabilities> {
  if (IS_TV) {
    cachedCapabilities = {
      isSupported: false,
      isDesktop: false,
      hasWebGL: true,
      hasWebGPU: false,
      hasSIMD: false,
      hasThreads: false,
      estimatedMemoryMB: 0,
      recommendedExecutionProvider: 'wasm',
      recommendedThreads: 1,
    };
    return cachedCapabilities;
  }
  // ... existing logic
}
```

### Analysis Worker on TV

The analysis worker (`src/workers/analysis.worker.ts`) performs non-ML tasks too:
- Country instability scoring (pure math)
- Hotspot escalation detection (pure math)
- Geo-convergence analysis (pure math)
- Military surge detection (pure math)

These are lightweight and should **continue running on TV** with reduced frequency:

```typescript
// src/services/analysis-worker.ts — TV adjustment
const TV_ANALYSIS_INTERVAL = 60_000; // 1 minute (was ~10s real-time)

if (IS_TV) {
  // Run analysis less frequently
  setInterval(() => this.runAnalysis(), TV_ANALYSIS_INTERVAL);
} else {
  // Real-time on desktop
  this.runAnalysis(); // triggered on data updates
}
```

## 8.4 WebAssembly on TV

WebAssembly is used by:
1. **ONNX Runtime Web** (ML inference) — ❌ Disabled on TV
2. **MapLibre GL JS** (internally, for protobuf tile decoding) — ✅ Required
3. **h3-js** (H3 geospatial indexing) — ✅ Used for geo-convergence

WASM works on webOS 5.0+ but with caveats:

| WASM Feature | webOS 5+ | webOS 22+ | Notes |
|-------------|----------|-----------|-------|
| Basic WASM | ✅ | ✅ | All WASM works |
| WASM SIMD | ❌ | ⚠️ Partial | MapLibre doesn't need SIMD |
| WASM Threads | ❌ | ⚠️ Requires COOP/COEP | h3-js is single-threaded |
| WASM Exceptions | ❌ | ✅ | Not critical |

### WASM Memory

```typescript
// Ensure WASM modules don't allocate too much memory on TV
if (IS_TV) {
  // Limit h3-js resolution to avoid large memory allocations
  // Use resolution 3–4 instead of 5–6
  const TV_H3_RESOLUTION = 3; // Larger hexagons, fewer cells
}
```

## 8.5 Feature Availability Matrix (TV vs Desktop)

| Feature | Desktop | TV | Notes |
|---------|---------|-----|-------|
| News classification (local) | ✅ ML worker | ❌ | Use server-side |
| Sentiment analysis (local) | ✅ ML worker | ❌ | Use server-side |
| Semantic search | ✅ Embeddings | ❌ | Keyword search only |
| AI Insights panel | ✅ Server-generated | ✅ Same | No change needed |
| Country instability scoring | ✅ Analysis worker | ✅ Reduced frequency | Runs in analysis worker |
| Hotspot escalation | ✅ Analysis worker | ✅ Reduced frequency | Runs in analysis worker |
| Geo-convergence | ✅ Analysis worker | ✅ Reduced frequency | Runs in analysis worker |
| Military surge detection | ✅ Analysis worker | ✅ Reduced frequency | Runs in analysis worker |
| Intelligence gap badge | ✅ ML-powered | ❌ | Depends on local ML |
| Verification checklist | ✅ UI component | ❌ | Requires keyboard input |

## 8.6 Insights Panel on TV

The Insights panel currently checks `isMobileDevice()` to decide behavior:

```typescript
// src/components/InsightsPanel.ts (current)
if (isMobileDevice()) {
  // Simplified mobile view
}
```

Add TV check:

```typescript
if (isMobileDevice() || IS_TV) {
  // Simplified view — show server-generated insights only
  // No local ML badge, no classification confidence scores
}
```

## 8.7 Bundle Size Impact

By excluding ML modules from the TV build:

| Module | Bundled Size (gzip) | TV Status |
|--------|-------------------|-----------|
| `@xenova/transformers` | ~1.8 MB | ❌ Excluded |
| `onnxruntime-web` (WASM) | ~700 KB | ❌ Excluded |
| ONNX model files (.onnx) | ~50 MB (lazy loaded) | ❌ Never loaded |
| **Total savings** | **~2.5 MB bundle + ~50 MB runtime** | — |

This is the single largest optimization for the TV variant.
