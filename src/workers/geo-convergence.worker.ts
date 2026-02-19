/**
 * PERF-039: Web Worker for geo-convergence calculations.
 * Offloads O(n²) pairwise distance calculations from the main thread.
 */

interface GeoEvent {
  lat: number;
  lon: number;
  type: string;
  timestamp: string;
}

interface ConvergenceMessage {
  type: 'detect';
  id: string;
  events: GeoEvent[];
  thresholdKm: number;
}

interface ConvergenceResult {
  type: 'convergence-result';
  id: string;
  clusters: Array<{
    lat: number;
    lon: number;
    eventCount: number;
    typeCount: number;
    types: string[];
    radius: number;
  }>;
}

/**
 * Haversine distance between two points in km.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

self.onmessage = (event: MessageEvent<ConvergenceMessage>) => {
  const { type, id, events, thresholdKm } = event.data;
  if (type !== 'detect') return;

  // Group events into clusters using simple distance-based clustering
  const visited = new Set<number>();
  const clusters: ConvergenceResult['clusters'] = [];

  for (let i = 0; i < events.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);

    const evI = events[i]!;
    const cluster = [evI];
    const types = new Set([evI.type]);

    for (let j = i + 1; j < events.length; j++) {
      if (visited.has(j)) continue;
      const evJ = events[j]!;
      if (haversineKm(evI.lat, evI.lon, evJ.lat, evJ.lon) <= thresholdKm) {
        visited.add(j);
        cluster.push(evJ);
        types.add(evJ.type);
      }
    }

    if (types.size >= 2) {
      const avgLat = cluster.reduce((s, e) => s + e.lat, 0) / cluster.length;
      const avgLon = cluster.reduce((s, e) => s + e.lon, 0) / cluster.length;
      clusters.push({
        lat: avgLat,
        lon: avgLon,
        eventCount: cluster.length,
        typeCount: types.size,
        types: Array.from(types),
        radius: thresholdKm,
      });
    }
  }

  const result: ConvergenceResult = { type: 'convergence-result', id, clusters };
  self.postMessage(result);
};

self.postMessage({ type: 'ready' });
