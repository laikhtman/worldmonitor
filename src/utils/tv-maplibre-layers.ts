/**
 * TV-Lite MapLibre native layers — renders essential data directly
 * through MapLibre's built-in source/layer system instead of deck.gl.
 *
 * Used on mid-range TV SoCs that can run MapLibre but not deck.gl.
 */
import type maplibregl from 'maplibre-gl';
import type { Hotspot } from '@/types';
import { INTEL_HOTSPOTS, CONFLICT_ZONES } from '@/config';

/* ------------------------------------------------------------------ */
/*  Source / Layer IDs                                                  */
/* ------------------------------------------------------------------ */
const SRC = {
  HOTSPOTS: 'tv-hotspots',
  CONFLICTS: 'tv-conflicts',
} as const;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Add all TV-Lite native layers to the map.
 * Call once after `map.on('load')`.
 */
export function addTVLiteLayers(map: maplibregl.Map): void {
  addConflictZonesLayer(map);
  addHotspotsLayer(map);
}

/**
 * Update hotspot data on the map (for dynamic escalation changes).
 */
export function updateTVLiteHotspots(map: maplibregl.Map, hotspots: Hotspot[]): void {
  const source = map.getSource(SRC.HOTSPOTS) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData({
    type: 'FeatureCollection',
    features: hotspots.map(h => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [h.lon, h.lat] },
      properties: {
        name: h.name,
        severity: h.escalationScore ?? 3,
        id: h.id,
      },
    })),
  });
}

/**
 * Remove all TV-Lite layers and sources from the map.
 */
export function removeTVLiteLayers(map: maplibregl.Map): void {
  const layerIds = [
    'tv-hotspots-circles', 'tv-hotspots-labels',
    'tv-conflicts-fill', 'tv-conflicts-outline',
  ];
  for (const id of layerIds) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of Object.values(SRC)) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

/* ------------------------------------------------------------------ */
/*  Private helpers                                                    */
/* ------------------------------------------------------------------ */

function addHotspotsLayer(map: maplibregl.Map): void {
  map.addSource(SRC.HOTSPOTS, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: INTEL_HOTSPOTS.map(h => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [h.lon, h.lat] },
        properties: {
          name: h.name,
          severity: h.escalationScore ?? 3,
          id: h.id,
        },
      })),
    },
  });

  map.addLayer({
    id: 'tv-hotspots-circles',
    type: 'circle',
    source: SRC.HOTSPOTS,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['get', 'severity'],
        1, 6,
        3, 10,
        5, 16,
      ],
      'circle-color': [
        'interpolate', ['linear'], ['get', 'severity'],
        1, '#44ff88',
        3, '#ff8844',
        5, '#ff4444',
      ],
      'circle-opacity': 0.7,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
    },
  });

  map.addLayer({
    id: 'tv-hotspots-labels',
    type: 'symbol',
    source: SRC.HOTSPOTS,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 12,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#ccddcc',
      'text-halo-color': '#000000',
      'text-halo-width': 1,
    },
    minzoom: 3,
  });
}

function addConflictZonesLayer(map: maplibregl.Map): void {
  // Convert CONFLICT_ZONES static data to GeoJSON polygons
  // CONFLICT_ZONES uses `coords` as [lon, lat] coordinate arrays
  const features = CONFLICT_ZONES
    .filter(cz => cz.coords && cz.coords.length > 0)
    .map(cz => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [cz.coords],
      },
      properties: {
        name: cz.name,
        id: cz.id,
      },
    }));

  map.addSource(SRC.CONFLICTS, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  });

  map.addLayer({
    id: 'tv-conflicts-fill',
    type: 'fill',
    source: SRC.CONFLICTS,
    paint: {
      'fill-color': '#ff4444',
      'fill-opacity': 0.12,
    },
  });

  map.addLayer({
    id: 'tv-conflicts-outline',
    type: 'line',
    source: SRC.CONFLICTS,
    paint: {
      'line-color': '#ff4444',
      'line-width': 1,
      'line-opacity': 0.5,
    },
  });
}
