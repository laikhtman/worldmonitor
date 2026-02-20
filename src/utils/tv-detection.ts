/**
 * webOS / Smart TV detection utilities
 *
 * Detects whether the app is running on a webOS TV (LG Smart TV)
 * and provides TV-specific helpers. The detection is used to activate
 * the `tv` variant at runtime and gate TV-only behaviour in shared code.
 */

import { SITE_VARIANT } from '@/config/variant';

/* ------------------------------------------------------------------ */
/*  Platform detection                                                 */
/* ------------------------------------------------------------------ */

/** True when running inside an LG webOS application runtime. */
export const IS_WEBOS: boolean = typeof window !== 'undefined' && (
  /Web0S|webOS/i.test(navigator.userAgent) ||
  'PalmSystem' in window ||
  'webOS' in window ||
  'webOSSystem' in window
);

/** True when the app was built or detected as the TV variant. */
export const IS_TV: boolean = SITE_VARIANT === 'tv' || IS_WEBOS;

/* ------------------------------------------------------------------ */
/*  TV Feature Flags                                                   */
/* ------------------------------------------------------------------ */

/**
 * Centralised feature flags for the TV variant.
 * Every flag defaults to the non-TV experience when `IS_TV` is false.
 */
export const TV_FEATURES = {
  /** No ML inference on TV hardware */
  enableML: false,
  /** No panel drag-and-drop reordering on TV */
  enableDragDrop: false,
  /** Fixed panel sizes — no resize handles */
  enablePanelResize: false,
  /** YouTube embeds are too heavy for TV GPU */
  enableWebcams: false,
  /** Iframe performance issues with live streams */
  enableLiveYoutube: false,
  /** Simplified country-intel modal works on TV */
  enableCountryBrief: true,
  /** Search is kept (adapted for D-pad in Phase 2) */
  enableSearch: true,
  /** Desktop download banner is irrelevant on TV */
  enableDownloadBanner: false,
  /** Mobile warning modal is irrelevant on TV */
  enableMobileWarning: false,
  /** Canvas-based story sharing is too heavy */
  enableStorySharing: false,
  /** Use IPK pacjaging instead of Service Worker */
  enableServiceWorker: false,
  /** Core feature — always on */
  enableMapGlobe: true,
  /** Limit visible panels for GPU/memory budget */
  maxPanelsVisible: 4,
  /** Reduce news items for rendering performance */
  maxNewsItems: 30,
  /** Cap deck.gl features for GPU budget */
  maxMapFeatures: 500,
  /** Slower refresh to reduce network/CPU usage (2× default) */
  refreshMultiplier: 2,
  /** Force 1080p rendering (TV upscales to 4K) */
  renderResolution: '1080p' as const,
} as const;

/* ------------------------------------------------------------------ */
/*  TV Refresh Intervals                                               */
/* ------------------------------------------------------------------ */

/**
 * TV-specific refresh intervals.
 * Doubles the base intervals to reduce CPU/network usage on constrained hardware.
 */
export const TV_REFRESH_INTERVALS = {
  feeds: 10 * 60 * 1_000,          // 10 min (base: 5 min)
  markets: 4 * 60 * 1_000,         //  4 min (base: 2 min)
  crypto: 4 * 60 * 1_000,          //  4 min (base: 2 min)
  predictions: 10 * 60 * 1_000,    // 10 min (base: 5 min)
  ais: 20 * 60 * 1_000,            // 20 min (base: 10 min)
  arxiv: 120 * 60 * 1_000,         //  2 hr  (base: 1 hr)
  githubTrending: 60 * 60 * 1_000, //  1 hr  (base: 30 min)
  hackernews: 10 * 60 * 1_000,     // 10 min (base: 5 min)
} as const;

/* ------------------------------------------------------------------ */
/*  TV API Limits                                                      */
/* ------------------------------------------------------------------ */

/** Maximum concurrent API fetches on TV to avoid saturating WiFi / CPU. */
export const TV_MAX_CONCURRENT_FETCHES = 3;

/* ------------------------------------------------------------------ */
/*  TV Render Tier Detection                                           */
/* ------------------------------------------------------------------ */

/**
 * Rendering quality tiers for TV hardware.
 *
 * - **full**:   α9 Gen 6+ or webOS 23+ — MapLibre + deck.gl (reduced)
 * - **lite**:   α7 Gen 5, webOS 5–22 — MapLibre only (no deck.gl)
 * - **static**: Budget SoC / fallback — static globe image + SVG overlays
 */
export type TVRenderTier = 'full' | 'lite' | 'static';

let cachedTier: TVRenderTier | null = null;

/**
 * Detect the appropriate rendering tier based on WebGL capabilities
 * and a quick GPU benchmark. Returns a cached result after first call.
 */
export function detectTVRenderTier(): TVRenderTier {
  if (cachedTier) return cachedTier;
  if (!IS_TV) { cachedTier = 'full'; return cachedTier; }

  // 1. Check WebGL availability
  const canvas = document.createElement('canvas');
  const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
  if (!gl) {
    console.warn('[TV] No WebGL support — falling back to static tier');
    cachedTier = 'static';
    return cachedTier;
  }

  // 2. Inspect GPU renderer string for known chipsets
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo
    ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
    : 'unknown';
  console.log('[TV] GPU renderer:', renderer);

  // High-end LG SoCs (α9 Gen 5+/6+) use Mali-G710 or newer
  const HIGH_END = /Mali-G7[1-9]\d|Mali-G8\d\d|Apple GPU|ANGLE.*Direct3D|NVIDIA|Adreno 7/i;
  // Mid-range (α7 Gen 5, α5) use Mali-G52/G72
  const MID_RANGE = /Mali-G[5-7]\d|Adreno [5-6]\d\d|PowerVR/i;

  if (HIGH_END.test(renderer)) {
    cachedTier = 'full';
  } else if (MID_RANGE.test(renderer)) {
    cachedTier = 'lite';
  } else {
    // 3. Unknown GPU — run a quick benchmark
    cachedTier = benchmarkGPU(gl);
  }

  // Clean up
  const loseExt = gl.getExtension('WEBGL_lose_context');
  loseExt?.loseContext();

  console.log('[TV] Render tier:', cachedTier);
  return cachedTier;
}

/**
 * Quick GPU benchmark: draw simple triangles and measure frame time.
 * Returns the appropriate tier based on measured performance.
 */
function benchmarkGPU(gl: WebGLRenderingContext): TVRenderTier {
  const ITERATIONS = 10;
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.flush();
  }
  // gl.finish() blocks until GPU is done
  gl.finish();
  const avgMs = (performance.now() - start) / ITERATIONS;
  console.log('[TV] GPU benchmark: avg frame', avgMs.toFixed(2), 'ms');

  if (avgMs < 16) return 'full';    // Can sustain 60fps simple → 30fps deck.gl
  if (avgMs < 33) return 'lite';    // Can sustain 30fps MapLibre only
  return 'static';                  // Too slow for real-time WebGL
}

/* ------------------------------------------------------------------ */
/*  Memory Monitoring & Emergency Cleanup                              */
/* ------------------------------------------------------------------ */

/** Callbacks invoked by the memory monitor when cleanup is needed. */
export interface TVMemoryCallbacks {
  /** Called at warning threshold (>70%). Reduce non-essential data. */
  onWarning?: (usedMB: number, limitMB: number) => void;
  /** Called at critical threshold (>85%). Aggressive cleanup required. */
  onCritical?: (usedMB: number, limitMB: number) => void;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

const MEMORY_CHECK_INTERVAL_MS = 30_000;
const MEMORY_WARNING_THRESHOLD = 0.70;
const MEMORY_CRITICAL_THRESHOLD = 0.85;

let memoryMonitorTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start periodic memory monitoring. Only active on TV (requires
 * `performance.memory` — Chromium-based browsers / webOS).
 *
 * Returns a cleanup function to stop the monitor.
 */
export function startMemoryMonitor(callbacks?: TVMemoryCallbacks): () => void {
  stopMemoryMonitor();
  if (!IS_TV) return () => { /* noop */ };

  const perf = performance as Performance & { memory?: PerformanceMemory };
  if (!perf.memory) {
    console.log('[TV] performance.memory not available — skipping monitor');
    return () => { /* noop */ };
  }

  memoryMonitorTimer = setInterval(() => {
    const mem = (performance as Performance & { memory?: PerformanceMemory }).memory;
    if (!mem) return;

    const usedMB = mem.usedJSHeapSize / (1024 * 1024);
    const limitMB = mem.jsHeapSizeLimit / (1024 * 1024);
    const usage = usedMB / limitMB;

    if (usage > MEMORY_CRITICAL_THRESHOLD) {
      console.warn(`[TV] CRITICAL memory: ${usedMB.toFixed(0)}/${limitMB.toFixed(0)} MB (${(usage * 100).toFixed(0)}%)`);
      callbacks?.onCritical?.(usedMB, limitMB);
    } else if (usage > MEMORY_WARNING_THRESHOLD) {
      console.warn(`[TV] Memory warning: ${usedMB.toFixed(0)}/${limitMB.toFixed(0)} MB (${(usage * 100).toFixed(0)}%)`);
      callbacks?.onWarning?.(usedMB, limitMB);
    }
  }, MEMORY_CHECK_INTERVAL_MS);

  console.log('[TV] Memory monitor started (interval:', MEMORY_CHECK_INTERVAL_MS / 1000, 's)');
  return () => stopMemoryMonitor();
}

/** Stop the memory monitor if running. */
export function stopMemoryMonitor(): void {
  if (memoryMonitorTimer) {
    clearInterval(memoryMonitorTimer);
    memoryMonitorTimer = null;
  }
}

/* ------------------------------------------------------------------ */
/*  webOS Lifecycle Helpers                                            */
/* ------------------------------------------------------------------ */

/** Register webOS-specific lifecycle handlers (relaunch, close, visibility). */
export function registerWebOSLifecycle(callbacks?: {
  onRelaunch?: () => void;
  onBackground?: () => void;
  onForeground?: () => void;
}): void {
  if (!IS_WEBOS) return;

  // webOS relaunch — app is reopened while already running
  document.addEventListener('webOSRelaunch', () => {
    console.log('[webOS] App relaunched');
    callbacks?.onRelaunch?.();
  });

  // Visibility change — app backgrounded / foregrounded
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('[webOS] App backgrounded');
      callbacks?.onBackground?.();
    } else {
      console.log('[webOS] App foregrounded');
      callbacks?.onForeground?.();
    }
  });

  // webOS close handler
  const webOSSystem = (window as unknown as Record<string, unknown>).webOSSystem as
    | { onclose?: (() => void) | null }
    | undefined;
  if (webOSSystem) {
    webOSSystem.onclose = () => {
      console.log('[webOS] App closing');
    };
  }
}
