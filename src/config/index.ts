// Configuration exports
// VITE_VARIANT=full → intelhq.io (default)
// VITE_VARIANT=tv → webOS TV

export { SITE_VARIANT } from './variant';

// Shared base configuration (always included)
export {
  API_URLS,
  IDLE_PAUSE_MS,
  REFRESH_INTERVALS,
  MONITOR_COLORS,
  STORAGE_KEYS,
} from './variants/base';

// Market data (shared)
export { SECTORS, COMMODITIES, MARKET_SYMBOLS } from './markets';

// Geo data (shared base)
export { MAP_URLS } from './geo';

// Feeds configuration (shared functions, variant-specific data)
export {
  SOURCE_TIERS,
  getSourceTier,
  SOURCE_TYPES,
  getSourceType,
  getSourcePropagandaRisk,
  ALERT_KEYWORDS,
  ALERT_EXCLUSIONS,
  type SourceRiskProfile,
  type SourceType,
} from './feeds';

// Panel configuration - imported from panels.ts
export {
  DEFAULT_PANELS,
  DEFAULT_MAP_LAYERS,
  MOBILE_DEFAULT_MAP_LAYERS,
  LAYER_TO_SOURCE,
} from './panels';

// ============================================
// VARIANT-SPECIFIC EXPORTS
// Only import what's needed for each variant
// ============================================

// Full variant (geopolitical) - only included in full builds
// These are large data files that should be tree-shaken in tech builds
export {
  FEEDS,
  INTEL_SOURCES,
} from './feeds';

export {
  INTEL_HOTSPOTS,
  CONFLICT_ZONES,
  MILITARY_BASES,
  NUCLEAR_FACILITIES,
  APT_GROUPS,
  STRATEGIC_WATERWAYS,
  ECONOMIC_CENTERS,
  SANCTIONED_COUNTRIES,
  SPACEPORTS,
} from './geo';

export { GAMMA_IRRADIATORS } from './irradiators';
export { PIPELINES, PIPELINE_COLORS } from './pipelines';
export { PORTS } from './ports';
export { MONITORED_AIRPORTS, FAA_AIRPORTS } from './airports';
export {
  ENTITY_REGISTRY,
  getEntityById,
  type EntityType,
  type EntityEntry,
} from './entities';



// Gulf FDI investment database
export { GULF_INVESTMENTS } from './gulf-fdi';
