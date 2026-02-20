import type { NewsItem, Monitor, PanelConfig, MapLayers, CyberThreat } from '@/types';
import {
  DEFAULT_PANELS,
  DEFAULT_MAP_LAYERS,
  MOBILE_DEFAULT_MAP_LAYERS,
  IDLE_PAUSE_MS,
  STORAGE_KEYS,
  SITE_VARIANT,
  LAYER_TO_SOURCE,
} from '@/config';
import { initDB, cleanOldSnapshots, isOutagesConfigured, isAisConfigured, initAisStream, disconnectAisStream } from '@/services';
import { mlWorker } from '@/services/ml-worker';
import { startLearning } from '@/services/country-instability';
import { dataFreshness, type DataSourceId } from '@/services/data-freshness';
import { loadFromStorage, parseMapUrlState, saveToStorage, isMobileDevice } from '@/utils';
import type { ParsedMapUrlState } from '@/utils';
import {
  MapContainer,
  type TimeRange,
  NewsPanel,
  Panel,
  SignalModal,
  SearchModal,
  MobileWarningModal,
  StatusPanel,
  IntelligenceGapBadge,
  LanguageSelector,
} from '@/components';
import { isDesktopRuntime } from '@/services/runtime';
import { preloadCountryGeometry } from '@/services/country-geometry';
import { initI18n } from '@/services/i18n';
import { ExportPanel } from '@/utils';

import type { PredictionMarket, MarketData, ClusteredEvent } from '@/types';
import type { AppContext, IntelligenceCache } from '@/controllers/app-context';
import {
  RefreshScheduler,
  DeepLinkHandler,
  DesktopUpdater,
  CountryIntelController,
  UISetupController,
  DataLoaderController,
  PanelManager,
} from '@/controllers';

import { CountryBriefPage } from '@/components/CountryBriefPage';
import { CountryTimeline } from '@/components/CountryTimeline';
import { PlaybackControl, PizzIntIndicator } from '@/components';

const CYBER_LAYER_ENABLED = import.meta.env.VITE_ENABLE_CYBER_LAYER === 'true';

export type { CountryBriefSignals } from '@/controllers/app-context';
export class App implements AppContext {
  public container: HTMLElement;
  public readonly PANEL_ORDER_KEY = 'panel-order';
  public readonly PANEL_SPANS_KEY = 'worldmonitor-panel-spans';
  public map: MapContainer | null = null;
  public panels: Record<string, Panel> = {};
  public newsPanels: Record<string, NewsPanel> = {};
  public allNews: NewsItem[] = [];
  public newsByCategory: Record<string, NewsItem[]> = {};
  public currentTimeRange: TimeRange = '7d';
  public monitors: Monitor[];
  public panelSettings: Record<string, PanelConfig>;
  public mapLayers: MapLayers;
  public signalModal: SignalModal | null = null;
  public playbackControl: PlaybackControl | null = null;
  public statusPanel: StatusPanel | null = null;
  public exportPanel: ExportPanel | null = null;
  public languageSelector: LanguageSelector | null = null;
  public searchModal: SearchModal | null = null;
  public mobileWarningModal: MobileWarningModal | null = null;
  public pizzintIndicator: PizzIntIndicator | null = null;
  public latestPredictions: PredictionMarket[] = [];
  public latestMarkets: MarketData[] = [];
  public latestClusters: ClusteredEvent[] = [];
  public isPlaybackMode = false;
  public initialUrlState: ParsedMapUrlState | null = null;
  public inFlight: Set<string> = new Set();
  public isMobile: boolean;
  public seenGeoAlerts: Set<string> = new Set();
  public snapshotIntervalId: ReturnType<typeof setInterval> | null = null;
  public refreshTimeoutIds: Map<string, ReturnType<typeof setTimeout>> = new Map();
  public isDestroyed = false;
  public boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  public boundFullscreenHandler: (() => void) | null = null;
  public boundResizeHandler: (() => void) | null = null;
  public boundVisibilityHandler: (() => void) | null = null;
  public idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  public boundIdleResetHandler: (() => void) | null = null;
  public isIdle = false;
  public readonly IDLE_PAUSE_MS = IDLE_PAUSE_MS;
  public disabledSources: Set<string> = new Set();
  public mapFlashCache: Map<string, number> = new Map();
  public readonly MAP_FLASH_COOLDOWN_MS = 10 * 60 * 1000;
  public initialLoadComplete = false;
  public criticalBannerEl: HTMLElement | null = null;
  public countryBriefPage: CountryBriefPage | null = null;
  public countryTimeline: CountryTimeline | null = null;
  public findingsBadge: IntelligenceGapBadge | null = null;
  public pendingDeepLinkCountry: string | null = null;
  public briefRequestToken = 0;
  public readonly isDesktopApp = isDesktopRuntime();
  public readonly UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
  public updateCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  public intelligenceCache: IntelligenceCache = {};
  public cyberThreatsCache: CyberThreat[] | null = null;

  /* ---- Controllers ---- */
  private refreshScheduler!: RefreshScheduler;
  private deepLinkHandler!: DeepLinkHandler;
  private desktopUpdater!: DesktopUpdater;
  private countryIntel!: CountryIntelController;
  private uiSetup!: UISetupController;
  private dataLoader!: DataLoaderController;
  private panelManager!: PanelManager;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = el;

    this.isMobile = isMobileDevice();
    this.monitors = loadFromStorage<Monitor[]>(STORAGE_KEYS.monitors, []);

    // Use mobile-specific defaults on first load (no saved layers)
    const defaultLayers = this.isMobile ? MOBILE_DEFAULT_MAP_LAYERS : DEFAULT_MAP_LAYERS;

    // Check if variant changed - reset all settings to variant defaults
    const storedVariant = localStorage.getItem('worldmonitor-variant');
    const currentVariant = SITE_VARIANT;
    console.log(`[App] Variant check: stored="${storedVariant}", current="${currentVariant}"`);
    if (storedVariant !== currentVariant) {
      // Variant changed - use defaults for new variant, clear old settings
      console.log('[App] Variant changed - resetting to defaults');
      localStorage.setItem('worldmonitor-variant', currentVariant);
      localStorage.removeItem(STORAGE_KEYS.mapLayers);
      localStorage.removeItem(STORAGE_KEYS.panels);
      localStorage.removeItem(this.PANEL_ORDER_KEY);
      localStorage.removeItem(this.PANEL_SPANS_KEY);
      this.mapLayers = { ...defaultLayers };
      this.panelSettings = { ...DEFAULT_PANELS };
    } else {
      this.mapLayers = loadFromStorage<MapLayers>(STORAGE_KEYS.mapLayers, defaultLayers);
      this.panelSettings = loadFromStorage<Record<string, PanelConfig>>(
        STORAGE_KEYS.panels,
        DEFAULT_PANELS
      );
      console.log('[App] Loaded panel settings from storage:', Object.entries(this.panelSettings).filter(([_, v]) => !v.enabled).map(([k]) => k));

      // One-time migration: reorder panels for existing users (v1.9 panel layout)
      // Puts live-news, insights, strategic-posture, cii, strategic-risk at the top
      const PANEL_ORDER_MIGRATION_KEY = 'worldmonitor-panel-order-v1.9';
      if (!localStorage.getItem(PANEL_ORDER_MIGRATION_KEY)) {
        const savedOrder = localStorage.getItem(this.PANEL_ORDER_KEY);
        if (savedOrder) {
          try {
            const order: string[] = JSON.parse(savedOrder);
            // Priority panels that should be at the top (after live-news which is handled separately)
            const priorityPanels = ['insights', 'strategic-posture', 'cii', 'strategic-risk'];
            // Remove priority panels from their current positions
            const filtered = order.filter(k => !priorityPanels.includes(k) && k !== 'live-news');
            // Find live-news position (should be first, but just in case)
            const liveNewsIdx = order.indexOf('live-news');
            // Build new order: live-news first, then priority panels, then rest
            const newOrder = liveNewsIdx !== -1 ? ['live-news'] : [];
            newOrder.push(...priorityPanels.filter(p => order.includes(p)));
            newOrder.push(...filtered);
            localStorage.setItem(this.PANEL_ORDER_KEY, JSON.stringify(newOrder));
            console.log('[App] Migrated panel order to v1.9 layout');
          } catch {
            // Invalid saved order, will use defaults
          }
        }
        localStorage.setItem(PANEL_ORDER_MIGRATION_KEY, 'done');
      }

      // Tech variant migration: move insights to top (after live-news)
      if (currentVariant === 'tech') {
        const TECH_INSIGHTS_MIGRATION_KEY = 'worldmonitor-tech-insights-top-v1';
        if (!localStorage.getItem(TECH_INSIGHTS_MIGRATION_KEY)) {
          const savedOrder = localStorage.getItem(this.PANEL_ORDER_KEY);
          if (savedOrder) {
            try {
              const order: string[] = JSON.parse(savedOrder);
              // Remove insights from current position
              const filtered = order.filter(k => k !== 'insights' && k !== 'live-news');
              // Build new order: live-news, insights, then rest
              const newOrder: string[] = [];
              if (order.includes('live-news')) newOrder.push('live-news');
              if (order.includes('insights')) newOrder.push('insights');
              newOrder.push(...filtered);
              localStorage.setItem(this.PANEL_ORDER_KEY, JSON.stringify(newOrder));
              console.log('[App] Tech variant: Migrated insights panel to top');
            } catch {
              // Invalid saved order, will use defaults
            }
          }
          localStorage.setItem(TECH_INSIGHTS_MIGRATION_KEY, 'done');
        }
      }
    }

    // One-time migration: clear stale panel ordering and sizing state that can
    // leave non-draggable gaps in mixed-size layouts on wide screens.
    const LAYOUT_RESET_MIGRATION_KEY = 'worldmonitor-layout-reset-v2.5';
    if (!localStorage.getItem(LAYOUT_RESET_MIGRATION_KEY)) {
      const hadSavedOrder = !!localStorage.getItem(this.PANEL_ORDER_KEY);
      const hadSavedSpans = !!localStorage.getItem(this.PANEL_SPANS_KEY);
      if (hadSavedOrder || hadSavedSpans) {
        localStorage.removeItem(this.PANEL_ORDER_KEY);
        localStorage.removeItem(this.PANEL_SPANS_KEY);
        console.log('[App] Applied layout reset migration (v2.5): cleared panel order/spans');
      }
      localStorage.setItem(LAYOUT_RESET_MIGRATION_KEY, 'done');
    }

    // Desktop key management panel must always remain accessible in Tauri.
    if (this.isDesktopApp) {
      const runtimePanel = this.panelSettings['runtime-config'] ?? {
        name: 'Desktop Configuration',
        enabled: true,
        priority: 2,
      };
      runtimePanel.enabled = true;
      this.panelSettings['runtime-config'] = runtimePanel;
      saveToStorage(STORAGE_KEYS.panels, this.panelSettings);
    }

    this.initialUrlState = parseMapUrlState(window.location.search, this.mapLayers);
    if (this.initialUrlState.layers) {
      // For tech variant, filter out geopolitical layers from URL
      if (currentVariant === 'tech') {
        const geoLayers: (keyof MapLayers)[] = ['conflicts', 'bases', 'hotspots', 'nuclear', 'irradiators', 'sanctions', 'military', 'protests', 'pipelines', 'waterways', 'ais', 'flights', 'spaceports', 'minerals'];
        const urlLayers = this.initialUrlState.layers;
        geoLayers.forEach(layer => {
          urlLayers[layer] = false;
        });
      }
      this.mapLayers = this.initialUrlState.layers;
    }
    if (!CYBER_LAYER_ENABLED) {
      this.mapLayers.cyberThreats = false;
    }
    this.disabledSources = new Set(loadFromStorage<string[]>(STORAGE_KEYS.disabledFeeds, []));
  }

  public async init(): Promise<void> {
    await initDB();
    await initI18n();

    // Initialize ML worker (desktop only - automatically disabled on mobile)
    await mlWorker.init();

    // Check AIS configuration before init
    if (!isAisConfigured()) {
      this.mapLayers.ais = false;
    } else if (this.mapLayers.ais) {
      initAisStream();
    }

    // ---- Instantiate controllers ----
    this.refreshScheduler = new RefreshScheduler(this);
    this.deepLinkHandler = new DeepLinkHandler(this);
    this.desktopUpdater = new DesktopUpdater(this);
    this.dataLoader = new DataLoaderController(this, {
      shouldShowIntelligenceNotifications: () => this.shouldShowIntelligenceNotifications(),
      renderCriticalBanner: (postures) => this.panelManager.renderCriticalBanner(postures),
      updateSearchIndex: () => this.uiSetup.updateSearchIndex(),
    });
    this.panelManager = new PanelManager(this, {
      openCountryStory: (code, name) => this.countryIntel.openCountryStory(code, name),
      loadAllData: () => this.dataLoader.loadAllData(),
      applyTimeRangeFilterToNewsPanelsDebounced: () => this.dataLoader.applyTimeRangeFilterToNewsPanelsDebounced(),
      applyInitialUrlState: () => this.deepLinkHandler.applyInitialUrlState(),
    });
    this.countryIntel = new CountryIntelController(this, {
      getShareUrl: () => this.deepLinkHandler.getShareUrl(),
    });
    this.uiSetup = new UISetupController(this);
    this.uiSetup.setCallbacks({
      getShareUrl: () => this.deepLinkHandler.getShareUrl(),
      copyToClipboard: (text) => this.deepLinkHandler.copyToClipboard(text),
      setCopyLinkFeedback: (btn, msg) => this.deepLinkHandler.setCopyLinkFeedback(btn, msg),
      updateSearchIndex: () => this.uiSetup.updateSearchIndex(),
      openCountryBriefByCode: (code, name) => this.countryIntel.openCountryBriefByCode(code, name),
    });

    // ---- Render layout & wire UI ----
    this.panelManager.renderLayout();
    this.uiSetup.startHeaderClock();
    this.signalModal = new SignalModal();
    this.signalModal.setLocationClickHandler((lat, lon) => {
      this.map?.setCenter(lat, lon, 4);
    });
    if (!this.isMobile) {
      this.findingsBadge = new IntelligenceGapBadge();
      this.findingsBadge.setOnSignalClick((signal) => {
        if (this.countryBriefPage?.isVisible()) return;
        this.signalModal?.showSignal(signal);
      });
      this.findingsBadge.setOnAlertClick((alert) => {
        if (this.countryBriefPage?.isVisible()) return;
        this.signalModal?.showAlert(alert);
      });
    }
    this.uiSetup.setupMobileWarning();
    this.panelManager.setupPlaybackControl();
    this.uiSetup.setupStatusPanel();
    this.uiSetup.setupPizzIntIndicator();
    this.uiSetup.setupExportPanel();
    this.uiSetup.setupLanguageSelector();
    this.uiSetup.setupSearchModal();
    this.setupMapLayerHandlers();
    this.countryIntel.setupCountryIntel();
    this.uiSetup.setupEventListeners();
    // Capture ?country= BEFORE URL sync overwrites it
    const initState = parseMapUrlState(window.location.search, this.mapLayers);
    this.pendingDeepLinkCountry = initState.country ?? null;
    this.deepLinkHandler.setupUrlStateSync();
    this.syncDataFreshnessWithLayers();
    await preloadCountryGeometry();
    await this.dataLoader.loadAllData();

    // Start CII learning mode after first data load
    startLearning();

    // Hide unconfigured layers after first data load
    if (!isAisConfigured()) {
      this.map?.hideLayerToggle('ais');
    }
    if (isOutagesConfigured() === false) {
      this.map?.hideLayerToggle('outages');
    }
    if (!CYBER_LAYER_ENABLED) {
      this.map?.hideLayerToggle('cyberThreats');
    }

    this.refreshScheduler.setupRefreshIntervals({
      loadNews: () => this.dataLoader.loadNews(),
      loadMarkets: () => this.dataLoader.loadMarkets(),
      loadPredictions: () => this.dataLoader.loadPredictions(),
      loadPizzInt: () => this.dataLoader.loadPizzInt(),
      loadNatural: () => this.dataLoader.loadNatural(),
      loadWeatherAlerts: () => this.dataLoader.loadWeatherAlerts(),
      loadFredData: () => this.dataLoader.loadFredData(),
      loadOilAnalytics: () => this.dataLoader.loadOilAnalytics(),
      loadGovernmentSpending: () => this.dataLoader.loadGovernmentSpending(),
      loadIntelligenceSignals: () => this.dataLoader.loadIntelligenceSignals(),
      loadFirmsData: () => this.dataLoader.loadFirmsData(),
      loadAisSignals: () => this.dataLoader.loadAisSignals(),
      loadCableActivity: () => this.dataLoader.loadCableActivity(),
      loadFlightDelays: () => this.dataLoader.loadFlightDelays(),
      loadCyberThreats: () => this.dataLoader.loadCyberThreats(),
    });
    this.refreshScheduler.setupSnapshotSaving();
    cleanOldSnapshots().catch((e) => console.warn('[Storage] Snapshot cleanup failed:', e));

    // Handle deep links for story sharing
    this.deepLinkHandler.handleDeepLinks({
      openCountryStory: (code, name) => this.countryIntel.openCountryStory(code, name),
      openCountryBriefByCode: (code, name) => this.countryIntel.openCountryBriefByCode(code, name),
      resolveCountryName: (code) => CountryIntelController.resolveCountryName(code),
    });

    this.desktopUpdater.setupUpdateChecks();
  }


  // ── Kept in App (own logic, not extractable) ────────────────────────

  private syncDataFreshnessWithLayers(): void {
    for (const [layer, sourceIds] of Object.entries(LAYER_TO_SOURCE)) {
      const enabled = this.mapLayers[layer as keyof MapLayers] ?? false;
      for (const sourceId of sourceIds) {
        dataFreshness.setEnabled(sourceId as DataSourceId, enabled);
      }
    }

    // Mark sources as disabled if not configured
    if (!isAisConfigured()) {
      dataFreshness.setEnabled('ais', false);
    }
    if (isOutagesConfigured() === false) {
      dataFreshness.setEnabled('outages', false);
    }
  }

  private setupMapLayerHandlers(): void {
    this.map?.setOnLayerChange((layer, enabled) => {
      console.log(`[App.onLayerChange] ${layer}: ${enabled}`);
      // Save layer settings
      this.mapLayers[layer] = enabled;
      saveToStorage(STORAGE_KEYS.mapLayers, this.mapLayers);

      // Sync data freshness tracker
      const sourceIds = LAYER_TO_SOURCE[layer as keyof MapLayers];
      if (sourceIds) {
        for (const sourceId of sourceIds) {
          dataFreshness.setEnabled(sourceId, enabled);
        }
      }

      // Handle AIS WebSocket connection
      if (layer === 'ais') {
        if (enabled) {
          this.map?.setLayerLoading('ais', true);
          initAisStream();
          this.waitForAisData();
        } else {
          disconnectAisStream();
        }
        return;
      }

      // Load data when layer is enabled (if not already loaded)
      if (enabled) {
        this.loadDataForLayer(layer);
      }
    });
  }

  private shouldShowIntelligenceNotifications(): boolean {
    return !this.isMobile && !!this.findingsBadge?.isEnabled();
  }

  // ── Public API ──────────────────────────────────────────────────────

  public async openCountryBrief(lat: number, lon: number): Promise<void> {
    return this.countryIntel.openCountryBrief(lat, lon);
  }

  public async openCountryBriefByCode(code: string, country: string): Promise<void> {
    return this.countryIntel.openCountryBriefByCode(code, country);
  }

  public static resolveCountryName(code: string): string {
    return CountryIntelController.resolveCountryName(code);
  }

  // ── Delegation wrappers (called from setupMapLayerHandlers) ────────

  private async loadDataForLayer(layer: keyof MapLayers): Promise<void> {
    return this.dataLoader.loadDataForLayer(layer);
  }

  private waitForAisData(): void {
    this.dataLoader.waitForAisData();
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  public destroy(): void {
    this.isDestroyed = true;

    // Clear header clock interval (BUG-008 fix)
    this.uiSetup.clearClockInterval();

    // Clear snapshot saving interval
    if (this.snapshotIntervalId) {
      clearInterval(this.snapshotIntervalId);
      this.snapshotIntervalId = null;
    }

    if (this.updateCheckIntervalId) {
      clearInterval(this.updateCheckIntervalId);
      this.updateCheckIntervalId = null;
    }

    // Clear all refresh timeouts
    for (const timeoutId of this.refreshTimeoutIds.values()) {
      clearTimeout(timeoutId);
    }
    this.refreshTimeoutIds.clear();

    // Remove global event listeners
    if (this.boundKeydownHandler) {
      document.removeEventListener('keydown', this.boundKeydownHandler);
      this.boundKeydownHandler = null;
    }
    if (this.boundFullscreenHandler) {
      document.removeEventListener('fullscreenchange', this.boundFullscreenHandler);
      this.boundFullscreenHandler = null;
    }
    if (this.boundResizeHandler) {
      window.removeEventListener('resize', this.boundResizeHandler);
      this.boundResizeHandler = null;
    }
    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }

    // Clean up idle detection
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }
    if (this.boundIdleResetHandler) {
      ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(event => {
        document.removeEventListener(event, this.boundIdleResetHandler!);
      });
      this.boundIdleResetHandler = null;
    }

    // Clean up map and AIS
    this.map?.destroy();
    disconnectAisStream();
  }
}
