// Escalation variant - Real-time Middle East conflict monitoring
// Stripped-down configuration focused on tactical intelligence, live alerts, and kinetic operations
import type { PanelConfig, MapLayers } from '@/types';
import type { VariantConfig } from './base';

// Re-export base config
export * from './base';

// Geopolitical-specific exports (needed for map data)
export * from '../feeds';
export * from '../geo';
export * from '../irradiators';
export * from '../pipelines';
export * from '../ports';
export * from '../military';
export * from '../airports';
export * from '../entities';

// Panel configuration for escalation monitoring - RUTHLESSLY PRUNED
export const ESCALATION_PANELS: Record<string, PanelConfig> = {
  // Core tactical panels (priority 1 - always visible)
  map: { name: 'Tactical Map', enabled: true, priority: 1 },
  'live-news': { name: 'Breaking OSINT', enabled: true, priority: 1 },
  'oref-sirens': { name: 'Red Alerts (Israel)', enabled: true, priority: 1 },
  'strategic-posture': { name: 'Theater Posture', enabled: true, priority: 1 },
  insights: { name: 'AI Assessment', enabled: true, priority: 1 },
  
  // Regional intelligence (priority 1 - focused on conflict zones)
  middleeast: { name: 'Middle East Intel', enabled: true, priority: 1 },
  politics: { name: 'Geopolitical Wire', enabled: true, priority: 1 },
  intel: { name: 'Defense & Intel', enabled: true, priority: 1 },
  
  // Supporting panels (priority 2 - can be toggled)
  'gdelt-intel': { name: 'Live Events', enabled: true, priority: 2 },
  cii: { name: 'Instability Index', enabled: true, priority: 2 },
  'strategic-risk': { name: 'Risk Matrix', enabled: true, priority: 2 },
  gov: { name: 'Government', enabled: true, priority: 2 },
  thinktanks: { name: 'Analysis', enabled: true, priority: 2 },
  energy: { name: 'Energy & Resources', enabled: true, priority: 2 },
  'satellite-fires': { name: 'Thermal Anomalies', enabled: true, priority: 2 },
  
  // User tools
  monitors: { name: 'My Monitors', enabled: true, priority: 2 },
  
  // EXPLICITLY DISABLED - noise for escalation monitoring
  // crypto: REMOVED
  // markets: REMOVED  
  // economic: REMOVED
  // heatmap: REMOVED
  // 'macro-signals': REMOVED
  // 'etf-flows': REMOVED
  // displacement: REMOVED (humanitarian data - not tactical)
  // 'ucdp-events': REMOVED (academic conflict data - too slow)
  // 'live-webcams': REMOVED (bandwidth waste)
  // All regional news outside MENA: REMOVED
};

// Map layers for escalation monitoring - CONFLICT-FOCUSED
export const ESCALATION_MAP_LAYERS: MapLayers = {
  // Core conflict layers (enabled by default)
  conflicts: true,
  bases: true,
  military: true,        // Naval vessels, military flights
  flights: true,         // Flight delays at conflict-adjacent airports
  hotspots: true,        // Intelligence hotspots
  outages: true,         // Internet disruption = conflict precursor
  cyberThreats: true,    // C2 infrastructure, APT activity
  fires: true,           // NASA FIRMS thermal anomalies (missile impacts, explosions)
  sanctions: true,       // Sanctioned entities overlay
  nuclear: true,         // Nuclear facilities (Iran, etc.)
  waterways: true,       // Suez, Bab el-Mandeb, Strait of Hormuz
  
  // Supporting layers (disabled by default, toggleable)
  ais: false,            // Commercial shipping (enable for SLOC monitoring)
  pipelines: false,      // Energy infrastructure
  economic: false,       // Economic centers
  irradiators: false,    // Gamma irradiators (WMD precursors)
  spaceports: false,     // Launch facilities
  
  // Data layers (heavy, enable as needed)
  ucdpEvents: false,
  displacement: false,
};

// Mobile-specific defaults for escalation (ultra-minimal for fast loading)
export const ESCALATION_MOBILE_MAP_LAYERS: MapLayers = {
  conflicts: true,
  bases: true,
  military: true,
  hotspots: true,
  outages: true,
  fires: true,
  sanctions: false,
  nuclear: false,
  waterways: false,
  ais: false,
  pipelines: false,
  economic: false,
  irradiators: false,
  cyberThreats: false,
  flights: false,
  spaceports: false,
  ucdpEvents: false,
  displacement: false,
};

export const VARIANT_CONFIG: VariantConfig = {
  name: 'escalation',
  description: 'Real-time Middle East conflict monitoring - tactical intelligence only',
  panels: ESCALATION_PANELS,
  mapLayers: ESCALATION_MAP_LAYERS,
  mobileMapLayers: ESCALATION_MOBILE_MAP_LAYERS,
};
