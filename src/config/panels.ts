import type { PanelConfig, MapLayers } from '@/types';
import type { DataSourceId } from '@/services/data-freshness';

/**
 * Maps map-layer toggle keys to their corresponding data-freshness source IDs.
 * Used by both `syncDataFreshnessWithLayers()` and `setupMapLayerHandlers()`
 * in App.ts to avoid duplicate definitions. (BUG-005 fix)
 */
export const LAYER_TO_SOURCE: Partial<Record<keyof MapLayers, DataSourceId[]>> = {
  military: ['opensky', 'wingbits'],
  ais: ['ais'],
  outages: ['outages'],
  cyberThreats: ['cyber_threats'],
  ucdpEvents: ['ucdp_events'],
  displacement: ['unhcr'],
};
import { SITE_VARIANT } from './variant';
import { ESCALATION_PANELS, ESCALATION_MAP_LAYERS, ESCALATION_MOBILE_MAP_LAYERS } from './variants/escalation';

// ============================================
// FULL VARIANT (Geopolitical)
// ============================================
// Panel order matters! First panels appear at top of grid.
// Desired order: live-news, AI Insights, AI Strategic Posture, cii, strategic-risk, then rest
const FULL_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Global Map', enabled: true, priority: 1 },
  'live-news': { name: 'Live News', enabled: true, priority: 1 },
  'live-webcams': { name: 'Live Webcams', enabled: true, priority: 1 },
  insights: { name: 'AI Insights', enabled: true, priority: 1 },
  'strategic-posture': { name: 'AI Strategic Posture', enabled: true, priority: 1 },
  cii: { name: 'Country Instability', enabled: true, priority: 1 },
  'strategic-risk': { name: 'Strategic Risk Overview', enabled: true, priority: 1 },
  intel: { name: 'Intel Feed', enabled: true, priority: 1 },
  'gdelt-intel': { name: 'Live Intelligence', enabled: true, priority: 1 },
  politics: { name: 'World News', enabled: true, priority: 1 },
  middleeast: { name: 'Middle East', enabled: true, priority: 1 },
  africa: { name: 'Africa', enabled: true, priority: 1 },
  latam: { name: 'Latin America', enabled: true, priority: 1 },
  asia: { name: 'Asia-Pacific', enabled: true, priority: 1 },
  energy: { name: 'Energy & Resources', enabled: true, priority: 1 },
  gov: { name: 'Government', enabled: true, priority: 1 },
  thinktanks: { name: 'Think Tanks', enabled: true, priority: 1 },
  commodities: { name: 'Commodities', enabled: true, priority: 1 },
  markets: { name: 'Markets', enabled: true, priority: 1 },
  economic: { name: 'Economic Indicators', enabled: true, priority: 1 },
  finance: { name: 'Financial', enabled: true, priority: 1 },
  tech: { name: 'Technology', enabled: true, priority: 2 },
  heatmap: { name: 'Sector Heatmap', enabled: true, priority: 2 },
  ai: { name: 'AI/ML', enabled: true, priority: 2 },
  layoffs: { name: 'Layoffs Tracker', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 2 },
  'satellite-fires': { name: 'Fires', enabled: true, priority: 2 },
  'macro-signals': { name: 'Market Radar', enabled: true, priority: 2 },
  'ucdp-events': { name: 'UCDP Conflict Events', enabled: true, priority: 2 },
  displacement: { name: 'UNHCR Displacement', enabled: true, priority: 2 },
  'population-exposure': { name: 'Population Exposure', enabled: true, priority: 2 },
};

const FULL_MAP_LAYERS: MapLayers = {
  conflicts: true,
  bases: true,
  pipelines: false,
  hotspots: true,
  ais: false,
  nuclear: true,
  irradiators: false,
  sanctions: true,
  economic: true,
  waterways: true,
  outages: true,
  cyberThreats: false,
  flights: false,
  military: true,
  spaceports: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
};

const FULL_MOBILE_MAP_LAYERS: MapLayers = {
  conflicts: true,
  bases: false,
  pipelines: false,
  hotspots: true,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: true,
  economic: false,
  waterways: false,
  outages: true,
  cyberThreats: false,
  flights: false,
  military: false,
  spaceports: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
};

// ============================================
// TV VARIANT (Smart TV / webOS)
// ============================================
const TV_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Global Map', enabled: true, priority: 1 },
  'live-news': { name: 'Live News', enabled: true, priority: 1 },
  insights: { name: 'AI Insights', enabled: true, priority: 1 },
  'strategic-risk': { name: 'Strategic Risk', enabled: true, priority: 2 },
  markets: { name: 'Markets', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 3 },
};

const TV_MAP_LAYERS: MapLayers = {
  conflicts: true,
  bases: false,
  pipelines: false,
  hotspots: true,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: true,
  economic: false,
  waterways: false,
  outages: true,
  cyberThreats: false,
  flights: false,
  military: false,
  spaceports: false,
  fires: false,
  ucdpEvents: false,
  displacement: false,
};

// ============================================
// VARIANT-AWARE EXPORTS
// ============================================
export const DEFAULT_PANELS = 
  SITE_VARIANT === 'tv' ? TV_PANELS :
  SITE_VARIANT === 'escalation' ? ESCALATION_PANELS :
  FULL_PANELS;

export const DEFAULT_MAP_LAYERS = 
  SITE_VARIANT === 'tv' ? TV_MAP_LAYERS :
  SITE_VARIANT === 'escalation' ? ESCALATION_MAP_LAYERS :
  FULL_MAP_LAYERS;

export const MOBILE_DEFAULT_MAP_LAYERS = 
  SITE_VARIANT === 'tv' ? TV_MAP_LAYERS :
  SITE_VARIANT === 'escalation' ? ESCALATION_MOBILE_MAP_LAYERS :
  FULL_MOBILE_MAP_LAYERS;

// Monitor palette — fixed category colors persisted to localStorage (not theme-dependent)
export const MONITOR_COLORS = [
  '#44ff88',
  '#ff8844',
  '#4488ff',
  '#ff44ff',
  '#ffff44',
  '#ff4444',
  '#44ffff',
  '#88ff44',
  '#ff88ff',
  '#88ffff',
];

export const STORAGE_KEYS = {
  panels: 'intelhq-panels',
  monitors: 'intelhq-monitors',
  mapLayers: 'intelhq-layers',
  disabledFeeds: 'intelhq-disabled-feeds',
} as const;
