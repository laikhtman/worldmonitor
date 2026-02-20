/**
 * PERF-028: Viewport bounds checking for map layer culling.
 * Determines if a set of coordinates is within or overlaps the current viewport.
 */

export interface ViewportBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Check if any point in the dataset falls within the given viewport bounds.
 * Returns false if ALL points are outside the viewport (layer can be culled).
 */
export function hasPointsInViewport(
  points: Array<{ lat: number; lon: number } | { latitude: number; longitude: number } | [number, number]>,
  bounds: ViewportBounds,
  margin = 2, // degrees of margin for smoother transitions
): boolean {
  if (points.length === 0) return false;

  const west = bounds.west - margin;
  const east = bounds.east + margin;
  const south = bounds.south - margin;
  const north = bounds.north + margin;

  for (const p of points) {
    let lat: number, lon: number;
    if (Array.isArray(p)) {
      [lon, lat] = p;
    } else if ('latitude' in p) {
      lat = p.latitude;
      lon = p.longitude;
    } else {
      lat = p.lat;
      lon = p.lon;
    }
    if (lat >= south && lat <= north && lon >= west && lon <= east) {
      return true;
    }
  }
  return false;
}

/**
 * Quick bounding-box overlap check between two rectangles.
 */
export function boundsOverlap(a: ViewportBounds, b: ViewportBounds): boolean {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}
