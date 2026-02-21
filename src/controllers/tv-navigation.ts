/**
 * TV Navigation Controller — orchestrates spatial navigation, remote control
 * handling, and TV overlay for the webOS TV variant.
 *
 * This controller is initialised once from `ui-setup.ts` (only when `IS_TV`
 * is true).  It wires together:
 *   - {@link SpatialNavigator} for focus management
 *   - {@link TVRemoteHandler} for key mapping
 *   - {@link TVOverlay} for on-screen hints and crosshair
 *
 * It registers focus zones from the live DOM and keeps them in sync as
 * panels are created/destroyed.
 */

import { SpatialNavigator } from '@/utils/tv-focus';
import { TVRemoteHandler } from '@/utils/tv-remote';
import { TVOverlay } from '@/components/TVOverlay';
import { TVExitDialog } from '@/components/TVExitDialog';
import type { AppContext } from './app-context';

/* ------------------------------------------------------------------ */
/*  TVNavigationController                                             */
/* ------------------------------------------------------------------ */

export class TVNavigationController {
  readonly navigator: SpatialNavigator;
  readonly remote: TVRemoteHandler;
  readonly overlay: TVOverlay;
  readonly exitDialog: TVExitDialog;

  private ctx: AppContext;

  constructor(ctx: AppContext) {
    this.ctx = ctx;

    /* --- Core objects --- */
    this.navigator = new SpatialNavigator();
    this.overlay = new TVOverlay();
    this.exitDialog = new TVExitDialog();
    this.remote = new TVRemoteHandler(this.navigator, {
      openSearch: () => this.openSearch(),
      closeTopModal: () => this.closeTopModal(),
      closePopup: () => this.closePopup(),
      showExitConfirmation: () => this.showExitConfirmation(),
      toggleMapLayer: (layer) => this.toggleMapLayer(layer),
      cycleMapView: () => this.cycleMapView(),
      onMapModeChange: (active) => this.onMapModeChange(active),
      onCursorActivity: () => this.onCursorActivity(),
    });

    /* --- Zone change → overlay context sync --- */
    this.navigator.onZoneChange((zone) => {
      if (zone === 'map-zone') {
        this.overlay.setContext('panels'); // not yet in map mode until OK
      } else if (zone.startsWith('modal')) {
        this.overlay.setContext('modal');
      } else {
        this.overlay.setContext('panels');
      }
    });
  }

  /* ================================================================ */
  /*  Initialisation (called after DOM is ready)                       */
  /* ================================================================ */

  /**
   * Register all focus zones from the live DOM.
   * Should be called after panels have been rendered.
   */
  registerZones(): void {
    /* --- Header zone --- */
    const header = document.querySelector('.header') as HTMLElement | null;
    if (header) {
      this.navigator.registerZone({
        name: 'header-zone',
        container: header,
        mode: 'horizontal',
        priority: 0,
        adjacentZones: { down: 'panels-zone' },
      });
    }

    /* --- Map zone --- */
    const mapSection = document.querySelector('.map-section') as HTMLElement | null;
    if (mapSection) {
      this.navigator.registerZone({
        name: 'map-zone',
        container: mapSection,
        mode: 'grid',
        priority: 0,
        adjacentZones: {
          right: 'panels-zone',
          up: 'header-zone',
        },
      });
    }

    /* --- Panels zone (parent container) --- */
    const panelsGrid = document.querySelector('.panels-grid') as HTMLElement | null;
    if (panelsGrid) {
      this.navigator.registerZone({
        name: 'panels-zone',
        container: panelsGrid,
        mode: 'vertical',
        priority: 0,
        adjacentZones: {
          left: 'map-zone',
          up: 'header-zone',
        },
      });

      // Register individual panels as sub-zones
      this.registerPanelSubZones(panelsGrid);
    }

    /* --- Attach map reference --- */
    if (this.ctx.map) {
      this.remote.setMap(this.ctx.map);
    }

    /* --- Install crosshair --- */
    if (mapSection) {
      this.overlay.installCrosshair(mapSection);
    }

    /* --- Initial focus --- */
    this.navigator.focusFirst('panels-zone');
  }

  /**
   * Register individual panel elements as sub-zones.
   * Called when panels are first rendered and can be refreshed.
   */
  registerPanelSubZones(panelsGrid?: HTMLElement): void {
    const grid = panelsGrid ?? document.querySelector('.panels-grid') as HTMLElement | null;
    if (!grid) return;

    const panels = grid.querySelectorAll<HTMLElement>('.panel');
    panels.forEach((panel, i) => {
      const zoneName = `panel-${i}`;
      // Skip if already registered
      if (this.navigator.hasZone(zoneName)) return;

      this.navigator.registerZone({
        name: zoneName,
        container: panel,
        mode: 'vertical',
        priority: 0,
        parent: 'panels-zone',
      });
    });
  }

  /**
   * Register a modal as a focus-trapping zone.
   * Called when a modal/popup is opened.
   */
  registerModal(name: string, container: HTMLElement): void {
    this.navigator.pushFocusHistory();
    this.navigator.registerZone({
      name,
      container,
      mode: 'vertical',
      priority: 10,
    });
    this.navigator.focusFirst(name);
    this.remote.pushNav({ type: 'modal' });
    this.overlay.setContext('modal');
  }

  /**
   * Unregister a modal zone.
   * Called when a modal/popup is closed.
   */
  unregisterModal(name: string): void {
    this.navigator.unregisterZone(name);
    this.navigator.popFocusHistory();
    this.overlay.setContext('panels');
  }

  /** Refresh focusable elements (call after dynamic content updates). */
  refreshZones(): void {
    for (const name of this.navigator.getPanelZoneNames()) {
      this.navigator.refreshZone(name);
    }
    this.navigator.refreshZone('panels-zone');
  }

  /** Clean up all resources. */
  destroy(): void {
    this.remote.destroy();
    this.navigator.destroy();
    this.overlay.destroy();
    this.exitDialog.destroy();
  }

  /* ================================================================ */
  /*  Callback implementations                                        */
  /* ================================================================ */

  private openSearch(): void {
    if (this.ctx.searchModal?.isOpen()) {
      this.ctx.searchModal.close();
    } else {
      this.ctx.searchModal?.open();
    }
  }

  private closeTopModal(): boolean {
    // Try SearchModal first
    if (this.ctx.searchModal?.isOpen()) {
      this.ctx.searchModal.close();
      return true;
    }

    // Try CountryIntelModal (look for active overlay)
    const countryOverlay = document.querySelector('.country-intel-overlay.active');
    if (countryOverlay) {
      const closeBtn = countryOverlay.querySelector('.country-intel-close') as HTMLElement | null;
      closeBtn?.click();
      return true;
    }

    // Try any generic modal overlay (BUG-TV-008: also match .modal-close)
    const genericModal = document.querySelector('.modal-overlay.active, .modal-overlay:not(.hidden)');
    if (genericModal) {
      const closeBtn = genericModal.querySelector('.modal-close-btn, .modal-close, .close-btn') as HTMLElement | null;
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
      // Fallback: remove 'active' class directly
      genericModal.classList.remove('active');
      return true;
    }

    return false;
  }

  private closePopup(): boolean {
    const popup = document.querySelector('.map-popup');
    if (popup) {
      const closeBtn = popup.querySelector('.popup-close') as HTMLElement | null;
      closeBtn?.click();
      return true;
    }
    return false;
  }

  private showExitConfirmation(): void {
    if (this.exitDialog.isOpen()) return;
    this.exitDialog.show().catch(console.error);
  }

  private toggleMapLayer(layer: string): void {
    if (!this.ctx.map) return;
    const current = this.ctx.mapLayers[layer as keyof typeof this.ctx.mapLayers];
    if (current === undefined) return;

    const updated = { ...this.ctx.mapLayers, [layer]: !current };
    this.ctx.mapLayers = updated;
    this.ctx.map.setLayers(updated);
  }

  private cycleMapView(): void {
    this.ctx.map?.setView('global');
  }

  private onMapModeChange(active: boolean): void {
    this.overlay.setMapMode(active);
    this.overlay.setContext(active ? 'map' : 'panels');

    const mapSection = document.querySelector('.map-section');
    if (mapSection) {
      mapSection.classList.toggle('tv-zone-active', active);
    }
  }

  private onCursorActivity(): void {
    // Mouse movement detected — could restore focus ring styles or
    // switch to pointer mode. Currently handled by TVRemoteHandler's
    // cursor hide/show logic.
  }
}
