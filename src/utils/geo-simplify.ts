/**
 * PERF-031: Simplify GeoJSON coordinates at low zoom levels.
 * Uses Douglas-Peucker algorithm for coordinate reduction.
 */

/**
 * Douglas-Peucker line simplification.
 * Reduces the number of points in a polyline while preserving shape.
 */
export function simplifyCoords(
    coords: [number, number][],
    tolerance: number,
): [number, number][] {
    if (coords.length <= 2) return coords;

    // Find the point with maximum distance from line between first and last
    let maxDist = 0;
    let maxIdx = 0;
    const start = coords[0]!;
    const end = coords[coords.length - 1]!;
    const [x1, y1] = start;
    const [x2, y2] = end;

    for (let i = 1; i < coords.length - 1; i++) {
        const d = perpendicularDist(coords[i]!, x1, y1, x2, y2);
        if (d > maxDist) {
            maxDist = d;
            maxIdx = i;
        }
    }

    if (maxDist > tolerance) {
        const left = simplifyCoords(coords.slice(0, maxIdx + 1), tolerance);
        const right = simplifyCoords(coords.slice(maxIdx), tolerance);
        return [...left.slice(0, -1), ...right];
    }

    return [coords[0]!, coords[coords.length - 1]!];
}

function perpendicularDist(
    point: [number, number],
    x1: number, y1: number,
    x2: number, y2: number,
): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
        return Math.sqrt((point[0] - x1) ** 2 + (point[1] - y1) ** 2);
    }
    return Math.abs(dy * point[0] - dx * point[1] + x2 * y1 - y2 * x1) / Math.sqrt(dx * dx + dy * dy);
}

/**
 * Simplify a GeoJSON geometry based on zoom level.
 * Higher tolerance at lower zoom = fewer vertices.
 */
export function getToleranceForZoom(zoom: number): number {
    if (zoom < 3) return 0.05;
    if (zoom < 5) return 0.01;
    if (zoom < 7) return 0.005;
    return 0; // No simplification at high zoom
}

/**
 * Simplify a ring (array of coordinates) for a given zoom level.
 */
export function simplifyRing(
    ring: [number, number][],
    zoom: number,
): [number, number][] {
    const tolerance = getToleranceForZoom(zoom);
    if (tolerance === 0) return ring;
    return simplifyCoords(ring, tolerance);
}
