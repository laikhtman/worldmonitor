// TV variant - tv.intelhq.io / LG webOS Smart TVs
import type { PanelConfig, MapLayers } from '@/types';
import type { VariantConfig } from './base';

// Re-export base config
export * from './base';

// Re-export feeds and geo data from full variant (TV inherits full's data)
export {
  FEEDS,
  INTEL_SOURCES,
} from '../feeds';

export * from '../geo';
export { GAMMA_IRRADIATORS } from '../irradiators';
export { PIPELINES, PIPELINE_COLORS } from '../pipelines';
export { PORTS } from '../ports';
export { MONITORED_AIRPORTS, FAA_AIRPORTS } from '../airports';
export {
  ENTITY_REGISTRY,
  getEntityById,
  type EntityType,
  type EntityEntry,
} from '../entities';

// ============================================
// TV PANEL CONFIGURATION
// ============================================
// TV shows a reduced set of panels optimised for passive consumption
// on a 10-foot UI with limited input capabilities.

const TV_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Global Map', enabled: true, priority: 1 },
  'live-news': { name: 'Live News', enabled: true, priority: 1 },
  insights: { name: 'AI Insights', enabled: true, priority: 1 },
  'strategic-risk': { name: 'Strategic Risk', enabled: true, priority: 2 },
  markets: { name: 'Markets', enabled: true, priority: 2 },
  polymarket: { name: 'Predictions', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 3 },
};

// ============================================
// TV MAP LAYERS
// ============================================
// Minimal set of layers to keep GPU usage within TV hardware budget.
// Heavy layers (AIS, military, flights) are disabled.

const TV_MAP_LAYERS: MapLayers = {
  conflicts: true,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: true,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: true,
  weather: true,
  economic: false,
  waterways: false,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  // Data source layers
  ucdpEvents: false,
  displacement: false,
  climate: false,
  // Tech layers (disabled on TV)
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  // Finance layers (disabled on TV)
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
};

// ============================================
// VARIANT CONFIG EXPORT
// ============================================

export const VARIANT_CONFIG: VariantConfig = {
  name: 'IntelHQ TV',
  description: 'Real-time intelligence dashboard for LG Smart TVs',
  panels: TV_PANELS,
  mapLayers: TV_MAP_LAYERS,
  mobileMapLayers: TV_MAP_LAYERS, // Same layer set — TV is always "desktop" resolution
};
