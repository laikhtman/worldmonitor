/**
 * PERF-041: SharedArrayBuffer utilities for zero-copy data sharing
 * between main thread and Web Workers.
 *
 * Requires Cross-Origin-Isolation headers:
 *   Cross-Origin-Embedder-Policy: require-corp
 *   Cross-Origin-Opener-Policy: same-origin
 */

/**
 * Check if SharedArrayBuffer is available (requires cross-origin isolation).
 */
export function isSharedBufferAvailable(): boolean {
  return typeof SharedArrayBuffer !== 'undefined' && crossOriginIsolated === true;
}

/**
 * Pack an array of lat/lon coordinates into a SharedArrayBuffer.
 * Each point uses 8 bytes (2 × Float32).
 * Returns the buffer for zero-copy transfer to a worker.
 */
export function packCoordinates(
  points: Array<{ lat: number; lon: number }>,
): { buffer: SharedArrayBuffer; length: number } | null {
  if (!isSharedBufferAvailable()) return null;

  const buffer = new SharedArrayBuffer(points.length * 8);
  const view = new Float32Array(buffer);

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]!;
    view[i * 2] = pt.lat;
    view[i * 2 + 1] = pt.lon;
  }

  return { buffer, length: points.length };
}

/**
 * Unpack coordinates from a SharedArrayBuffer.
 */
export function unpackCoordinates(
  buffer: SharedArrayBuffer,
  length: number,
): Array<{ lat: number; lon: number }> {
  const view = new Float32Array(buffer);
  const points: Array<{ lat: number; lon: number }> = [];

  for (let i = 0; i < length; i++) {
    points.push({
      lat: view[i * 2]!,
      lon: view[i * 2 + 1]!,
    });
  }

  return points;
}

/**
 * Pack numeric values into a SharedArrayBuffer for atomic operations.
 */
export function createSharedCounter(initialValue = 0): {
  buffer: SharedArrayBuffer;
  get: () => number;
  increment: () => number;
  set: (value: number) => void;
} | null {
  if (!isSharedBufferAvailable()) return null;

  const buffer = new SharedArrayBuffer(4);
  const view = new Int32Array(buffer);
  Atomics.store(view, 0, initialValue);

  return {
    buffer,
    get: () => Atomics.load(view, 0),
    increment: () => Atomics.add(view, 0, 1) + 1,
    set: (value: number) => Atomics.store(view, 0, value),
  };
}
