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
