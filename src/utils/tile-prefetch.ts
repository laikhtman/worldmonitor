/**
 * PERF-026: Idle-time map tile prefetching for common regions.
 * Pre-fetches tiles for high-interest regions at zoom levels 3-6
 * during browser idle time. Tiles are stored in the service worker cache.
 */

interface Region {
  name: string;
  center: [number, number]; // [lat, lon]
  zoomRange: [number, number];
}

const COMMON_REGIONS: Region[] = [
  { name: 'Middle East', center: [30, 45], zoomRange: [3, 5] },
  { name: 'Europe', center: [50, 10], zoomRange: [3, 5] },
  { name: 'East Asia', center: [35, 120], zoomRange: [3, 5] },
  { name: 'United States', center: [38, -97], zoomRange: [3, 5] },
  { name: 'Africa', center: [5, 20], zoomRange: [3, 4] },
];

/**
 * Convert lat/lon/zoom to tile coordinates.
 */
function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

/**
 * Generate tile URLs for a region at a given zoom level.
 * Uses the MapTiler API URL pattern.
 */
function getTileUrls(
  center: [number, number],
  zoom: number,
  tileUrlTemplate: string,
  radius = 2,
): string[] {
  const { x: cx, y: cy } = latLonToTile(center[0], center[1], zoom);
  const urls: string[] = [];

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const url = tileUrlTemplate
        .replace('{z}', String(zoom))
        .replace('{x}', String(cx + dx))
        .replace('{y}', String(cy + dy));
      urls.push(url);
    }
  }
  return urls;
}

/**
 * Prefetch map tiles for common regions during idle time.
 * Uses requestIdleCallback to avoid impacting user interaction.
 */
export function prefetchCommonRegionTiles(
  tileUrlTemplate: string,
): void {
  const allUrls: string[] = [];

  for (const region of COMMON_REGIONS) {
    for (let z = region.zoomRange[0]; z <= region.zoomRange[1]; z++) {
      allUrls.push(...getTileUrls(region.center, z, tileUrlTemplate));
    }
  }

  let index = 0;

  function prefetchBatch(): void {
    if (index >= allUrls.length) return;

    const batch = allUrls.slice(index, index + 4);
    index += 4;

    for (const url of batch) {
      fetch(url, { mode: 'no-cors', cache: 'force-cache' }).catch(() => {});
    }

    // Schedule next batch during idle time
    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(prefetchBatch, { timeout: 30000 });
    } else {
      setTimeout(prefetchBatch, 2000);
    }
  }

  // Start prefetching after a delay to not compete with initial load
  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(prefetchBatch, { timeout: 30000 });
    } else {
      setTimeout(prefetchBatch, 5000);
    }
  }, 15000);
}
