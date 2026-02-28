/**
 * TVRemoteHandler — webOS / TV remote control key mapping.
 *
 * Converts raw `keydown` events from the D-pad, Magic Remote, and colour
 * buttons into high-level navigation actions dispatched through
 * {@link SpatialNavigator}.  Also manages:
 *
 * - Map navigation mode (D-pad pans the map, OK clicks at centre)
 * - BACK button navigation stack (modal → popup → map-mode → exit)
 * - Colour-button quick actions (layer toggles, search)
 * - Key-hold acceleration for scrolling & map panning
 * - Magic Remote cursor hiding/showing
 */

import type { SpatialNavigator, Direction } from './tv-focus';
import type { MapContainer } from '@/components/MapContainer';

/* ------------------------------------------------------------------ */
/*  webOS key codes                                                    */
/* ------------------------------------------------------------------ */

export const TV_KEYS = {
  // Navigation
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  OK: 13,           // Enter — select / click
  BACK: 461,        // webOS Back button

  // Media controls
  PLAY: 415,
  PAUSE: 19,
  STOP: 413,
  FF: 417,
  REW: 412,

  // Colour buttons
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,

  // Numeric
  NUM_0: 48, NUM_1: 49, NUM_2: 50, NUM_3: 51,
  NUM_4: 52, NUM_5: 53, NUM_6: 54, NUM_7: 55,
  NUM_8: 56, NUM_9: 57,

  // Utility
  INFO: 457,
  GUIDE: 458,
  CH_UP: 33,        // PageUp
  CH_DOWN: 34,      // PageDown
} as const;

/* ------------------------------------------------------------------ */
/*  Key-hold acceleration                                              */
/* ------------------------------------------------------------------ */

const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 120;
/** Degrees per single D-pad press for map panning */
const MAP_PAN_STEP = 0.5;

/* ------------------------------------------------------------------ */
/*  Callbacks for external integration                                 */
/* ------------------------------------------------------------------ */

export interface TVRemoteCallbacks {
  /** Open search modal (BLUE button) */
  openSearch?: () => void;
  /** Close the topmost modal */
  closeTopModal?: () => boolean;
  /** Close a MapPopup */
  closePopup?: () => boolean;
  /** Show exit confirmation dialog */
  showExitConfirmation?: () => void;
  /** Toggle a map layer by key name */
  toggleMapLayer?: (layer: string) => void;
  /** Cycle map view (globe ↔ flat) */
  cycleMapView?: () => void;
  /** Show info overlay */
  showInfoOverlay?: () => void;
  /** Called when map mode is entered / exited */
  onMapModeChange?: (active: boolean) => void;
  /** Called on any cursor movement (Magic Remote) — for cursor hide/show */
  onCursorActivity?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Navigation state stack item                                        */
/* ------------------------------------------------------------------ */

type NavStackEntry =
  | { type: 'modal' }
  | { type: 'popup' }
  | { type: 'map-mode' }
  | { type: 'search' };

/* ------------------------------------------------------------------ */
/*  TVRemoteHandler                                                    */
/* ------------------------------------------------------------------ */

export class TVRemoteHandler {
  private navigator: SpatialNavigator;
  private map: MapContainer | null = null;
  private callbacks: TVRemoteCallbacks;

  /** True when D-pad controls the map rather than focus navigation. */
  private mapMode = false;

  /** Navigation stack for BACK button. */
  private navStack: NavStackEntry[] = [];

  /** Key-hold state */
  private holdKey: number | null = null;
  private holdTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private holdIntervalId: ReturnType<typeof setInterval> | null = null;

  /** Magic Remote cursor-hide timer */
  private cursorHideTimerId: ReturnType<typeof setTimeout> | null = null;
  private cursorHidden = false;
  private static readonly CURSOR_HIDE_DELAY_MS = 5_000;

  /** Bound handlers for cleanup */
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;

  constructor(
    navigator: SpatialNavigator,
    callbacks: TVRemoteCallbacks = {},
  ) {
    this.navigator = navigator;
    this.callbacks = callbacks;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);

    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('mousemove', this.boundMouseMove);
  }

  /* ================================================================ */
  /*  Public API                                                       */
  /* ================================================================ */

  /** Attach the map reference (called once map is initialised). */
  setMap(map: MapContainer): void {
    this.map = map;
  }

  /** Enter map navigation mode. */
  enterMapMode(): void {
    if (this.mapMode) return;
    this.mapMode = true;
    this.navigator.clearFocus();
    this.navStack.push({ type: 'map-mode' });
    this.callbacks.onMapModeChange?.(true);
  }

  /** Exit map navigation mode and return focus to panels. */
  exitMapMode(): void {
    if (!this.mapMode) return;
    this.mapMode = false;
    // Remove map-mode from nav stack
    let idx = -1;
    for (let i = this.navStack.length - 1; i >= 0; i--) {
      if (this.navStack[i]?.type === 'map-mode') { idx = i; break; }
    }
    if (idx >= 0) this.navStack.splice(idx, 1);
    this.navigator.focusFirst('panels-zone');
    this.callbacks.onMapModeChange?.(false);
  }

  /** Check if map mode is active. */
  isMapMode(): boolean {
    return this.mapMode;
  }

  /** Push a navigation-stack entry (call when opening modal/popup/search). */
  pushNav(entry: NavStackEntry): void {
    this.navStack.push(entry);
  }

  /** Pop the top nav-stack entry. */
  popNav(): NavStackEntry | undefined {
    return this.navStack.pop();
  }

  /** Update callbacks after construction (e.g. when App wires up). */
  setCallbacks(cb: Partial<TVRemoteCallbacks>): void {
    Object.assign(this.callbacks, cb);
  }

  /** Clean up all listeners. */
  destroy(): void {
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
    document.removeEventListener('mousemove', this.boundMouseMove);
    this.cancelHold();
    this.cancelCursorHide();
  }

  /* ================================================================ */
  /*  Key-down handler                                                 */
  /* ================================================================ */

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.keyCode;

    switch (key) {
      /* ----- D-pad arrows ----- */
      case TV_KEYS.UP:
      case TV_KEYS.DOWN:
      case TV_KEYS.LEFT:
      case TV_KEYS.RIGHT: {
        e.preventDefault();
        const dir = this.keyToDirection(key)!;
        if (this.mapMode) {
          this.panMap(dir);
        } else {
          this.navigator.navigate(dir);
        }
        // Start hold acceleration if not already holding
        if (this.holdKey !== key) {
          this.startHold(key, dir);
        }
        this.hideCursor();
        break;
      }

      /* ----- OK / Enter ----- */
      case TV_KEYS.OK: {
        e.preventDefault();
        if (this.mapMode) {
          this.clickMapCenter();
        } else {
          this.activateFocused();
        }
        this.hideCursor();
        break;
      }

      /* ----- BACK ----- */
      case TV_KEYS.BACK:
      case 8: { // Backspace fallback
        e.preventDefault();
        this.handleBack();
        this.hideCursor();
        break;
      }

      /* ----- Colour buttons ----- */
      case TV_KEYS.RED:
        e.preventDefault();
        this.callbacks.toggleMapLayer?.('hotspots');
        break;
      case TV_KEYS.GREEN:
        e.preventDefault();
        this.callbacks.toggleMapLayer?.('conflicts');
        break;
      case TV_KEYS.YELLOW:
        e.preventDefault();
        this.callbacks.cycleMapView?.();
        break;
      case TV_KEYS.BLUE:
        e.preventDefault();
        this.callbacks.openSearch?.();
        this.navStack.push({ type: 'search' });
        break;

      /* ----- Channel ± → panel switching ----- */
      case TV_KEYS.CH_UP:
        e.preventDefault();
        this.navigator.previousPanel();
        this.hideCursor();
        break;
      case TV_KEYS.CH_DOWN:
        e.preventDefault();
        this.navigator.nextPanel();
        this.hideCursor();
        break;

      /* ----- Info button ----- */
      case TV_KEYS.INFO:
        e.preventDefault();
        this.callbacks.showInfoOverlay?.();
        break;
    }
  }

  /* ================================================================ */
  /*  Key-up handler                                                   */
  /* ================================================================ */

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.keyCode === this.holdKey) {
      this.cancelHold();
    }
  }

  /* ================================================================ */
  /*  Mouse-move handler (Magic Remote cursor logic)                   */
  /* ================================================================ */

  private handleMouseMove(_e: MouseEvent): void {
    this.showCursor();
    this.callbacks.onCursorActivity?.();
    this.resetCursorHideTimer();
  }

  /* ================================================================ */
  /*  BACK button logic                                                */
  /* ================================================================ */

  /**
   * BACK navigation priority:
   * 1. Close topmost modal / search
   * 2. Close popup
   * 3. Exit map mode
   * 4. Show exit confirmation
   */
  private handleBack(): void {
    // Try nav stack first
    const top = this.navStack[this.navStack.length - 1];

    if (top?.type === 'modal' || top?.type === 'search') {
      const closed = this.callbacks.closeTopModal?.();
      if (closed) {
        this.navStack.pop();
        this.navigator.popFocusHistory();
        return;
      }
    }

    if (top?.type === 'popup') {
      const closed = this.callbacks.closePopup?.();
      if (closed) {
        this.navStack.pop();
        this.navigator.popFocusHistory();
        return;
      }
    }

    if (this.mapMode) {
      this.exitMapMode();
      return;
    }

    // BUG-TV-004: Even without a navStack entry, try to close any visible modal
    // (e.g. Sources modal opened via direct click rather than TV navigation)
    const closedAny = this.callbacks.closeTopModal?.();
    if (closedAny) return;

    // Nothing to go back to — show exit confirmation
    this.callbacks.showExitConfirmation?.();
  }

  /* ================================================================ */
  /*  Map interaction                                                  */
  /* ================================================================ */

  private panMap(direction: Direction): void {
    if (!this.map) return;

    const center = this.map.getCenter();
    if (!center) return;

    // Use small lat/lon offsets for panning
    let dlat = 0;
    let dlon = 0;

    switch (direction) {
      case 'up': dlat = MAP_PAN_STEP; break;
      case 'down': dlat = -MAP_PAN_STEP; break;
      case 'left': dlon = -MAP_PAN_STEP; break;
      case 'right': dlon = MAP_PAN_STEP; break;
    }

    this.map.setCenter(
      center.lat + dlat,
      center.lon + dlon,
    );
  }

  private clickMapCenter(): void {
    // Query map features at the canvas center
    // The map crosshair always sits at center, so "OK" clicks there
    if (!this.map) return;

    const container = document.querySelector('.map-section canvas') as HTMLCanvasElement | null;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Dispatch a synthetic click at the center of the map canvas
    const clickEvent = new MouseEvent('click', {
      clientX: centerX,
      clientY: centerY,
      bubbles: true,
    });
    container.dispatchEvent(clickEvent);
  }

  /* ================================================================ */
  /*  Focus activation                                                 */
  /* ================================================================ */

  private activateFocused(): void {
    const el = this.navigator.getCurrentFocus();
    if (!el) return;

    // Check if focused element is the map zone — enter map mode
    const zone = this.navigator.getCurrentZone();
    if (zone === 'map-zone') {
      this.enterMapMode();
      return;
    }

    // Click the focused element
    el.click();
  }

  /* ================================================================ */
  /*  Key-hold acceleration                                            */
  /* ================================================================ */

  private startHold(key: number, direction: Direction): void {
    this.cancelHold();
    this.holdKey = key;

    this.holdTimeoutId = setTimeout(() => {
      // After initial delay, repeat at interval
      this.holdIntervalId = setInterval(() => {
        if (this.mapMode) {
          this.panMap(direction);
        } else {
          this.navigator.navigate(direction);
        }
      }, HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  }

  private cancelHold(): void {
    this.holdKey = null;
    if (this.holdTimeoutId !== null) {
      clearTimeout(this.holdTimeoutId);
      this.holdTimeoutId = null;
    }
    if (this.holdIntervalId !== null) {
      clearInterval(this.holdIntervalId);
      this.holdIntervalId = null;
    }
  }

  /* ================================================================ */
  /*  Cursor hiding (Magic Remote)                                     */
  /* ================================================================ */

  private hideCursor(): void {
    if (this.cursorHidden) return;
    this.cursorHidden = true;
    document.body.classList.add('tv-cursor-hidden');
  }

  private showCursor(): void {
    if (!this.cursorHidden) return;
    this.cursorHidden = false;
    document.body.classList.remove('tv-cursor-hidden');
  }

  private resetCursorHideTimer(): void {
    this.cancelCursorHide();
    this.cursorHideTimerId = setTimeout(() => {
      this.hideCursor();
    }, TVRemoteHandler.CURSOR_HIDE_DELAY_MS);
  }

  private cancelCursorHide(): void {
    if (this.cursorHideTimerId !== null) {
      clearTimeout(this.cursorHideTimerId);
      this.cursorHideTimerId = null;
    }
  }

  /* ================================================================ */
  /*  Helpers                                                          */
  /* ================================================================ */

  private keyToDirection(keyCode: number): Direction | null {
    switch (keyCode) {
      case TV_KEYS.UP: return 'up';
      case TV_KEYS.DOWN: return 'down';
      case TV_KEYS.LEFT: return 'left';
      case TV_KEYS.RIGHT: return 'right';
      default: return null;
    }
  }
}
