/**
 * TVOverlay — persistent on-screen hints and status indicators for TV mode.
 *
 * Renders:
 * - Footer bar with colour-button legends and navigation hints
 * - Status badge (connection status, data freshness)
 * - Map crosshair (when in map navigation mode)
 *
 * The overlay updates its footer hints based on the active focus zone
 * so the user always sees relevant key bindings.
 */

import { IS_TV } from '@/utils/tv-detection';

/* ------------------------------------------------------------------ */
/*  Hint definitions per context                                       */
/* ------------------------------------------------------------------ */

interface HintDef {
  key: string;
  cssClass: string;
  label: string;
}

const HINTS_PANELS: HintDef[] = [
  { key: 'RED',    cssClass: 'key-red',    label: 'Hotspots' },
  { key: 'GREEN',  cssClass: 'key-green',  label: 'Conflicts' },
  { key: 'YELLOW', cssClass: 'key-yellow', label: 'View' },
  { key: 'BLUE',   cssClass: 'key-blue',   label: 'Search' },
  { key: 'OK',     cssClass: 'key-ok',     label: 'Select' },
  { key: 'BACK',   cssClass: 'key-back',   label: 'Back' },
];

const HINTS_MAP: HintDef[] = [
  { key: '↑↓←→',  cssClass: 'key-ok',     label: 'Pan Map' },
  { key: 'OK',     cssClass: 'key-ok',     label: 'Click' },
  { key: 'CH±',    cssClass: 'key-ok',     label: 'Zoom' },
  { key: 'RED',    cssClass: 'key-red',    label: 'Hotspots' },
  { key: 'GREEN',  cssClass: 'key-green',  label: 'Conflicts' },
  { key: 'BACK',   cssClass: 'key-back',   label: 'Exit Map' },
];

const HINTS_MODAL: HintDef[] = [
  { key: '↑↓',    cssClass: 'key-ok',     label: 'Navigate' },
  { key: 'OK',     cssClass: 'key-ok',     label: 'Select' },
  { key: 'BACK',   cssClass: 'key-back',   label: 'Close' },
];

/* ------------------------------------------------------------------ */
/*  TVOverlay                                                          */
/* ------------------------------------------------------------------ */

export class TVOverlay {
  private container: HTMLElement;
  private footerEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private crosshairEl: HTMLElement | null = null;
  private currentContext: 'panels' | 'map' | 'modal' = 'panels';

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'tv-overlay';
    this.container.setAttribute('aria-hidden', 'true');

    if (!IS_TV) return;

    this.render();
    document.body.appendChild(this.container);
    this.createStatusBadge();
  }

  /* ================================================================ */
  /*  Public API                                                       */
  /* ================================================================ */

  /** Update the footer hints for the current navigation context. */
  setContext(context: 'panels' | 'map' | 'modal'): void {
    if (context === this.currentContext) return;
    this.currentContext = context;
    this.updateFooter();
  }

  /** Show/hide the map crosshair. */
  setMapMode(active: boolean): void {
    if (active) {
      document.body.classList.add('tv-map-active');
    } else {
      document.body.classList.remove('tv-map-active');
    }
  }

  /** Update the connection status indicator. */
  setOnline(online: boolean): void {
    const dot = this.statusEl?.querySelector('.status-dot');
    const label = this.statusEl?.querySelector('.status-label');
    if (dot) {
      dot.classList.toggle('offline', !online);
    }
    if (label) {
      label.textContent = online ? 'Live' : 'Offline';
    }
  }

  /** Install the map crosshair into the map container. */
  installCrosshair(mapContainer: HTMLElement): void {
    if (this.crosshairEl) return;
    this.crosshairEl = document.createElement('div');
    this.crosshairEl.className = 'tv-map-crosshair';
    this.crosshairEl.innerHTML = `
      <div class="crosshair-h"></div>
      <div class="crosshair-v"></div>
      <div class="crosshair-center"></div>
      <div class="crosshair-label">Press OK to select</div>
    `;
    mapContainer.style.position = 'relative';
    mapContainer.appendChild(this.crosshairEl);
  }

  /** Clean up. */
  destroy(): void {
    this.container.remove();
    this.statusEl?.remove();
    this.crosshairEl?.remove();
  }

  /* ================================================================ */
  /*  Private                                                          */
  /* ================================================================ */

  private render(): void {
    this.footerEl = document.createElement('div');
    this.footerEl.className = 'tv-overlay-footer';
    this.container.appendChild(this.footerEl);
    this.updateFooter();
  }

  private createStatusBadge(): void {
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'tv-overlay-status';
    this.statusEl.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-label">Live</span>
    `;
    document.body.appendChild(this.statusEl);
  }

  private updateFooter(): void {
    if (!this.footerEl) return;

    let hints: HintDef[];
    switch (this.currentContext) {
      case 'map':   hints = HINTS_MAP; break;
      case 'modal': hints = HINTS_MODAL; break;
      default:      hints = HINTS_PANELS;
    }

    this.footerEl.innerHTML = hints
      .map(h => `<span class="hint"><span class="hint-key ${h.cssClass}">${h.key}</span> ${h.label}</span>`)
      .join('');
  }
}
