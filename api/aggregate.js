/**
 * PERF-019: Aggregate API endpoint
 * Batches multiple API calls into a single request to reduce HTTP round-trips.
 *
 * Usage: GET /api/aggregate?endpoints=hackernews,earthquakes,coingecko
 * Returns: { hackernews: {...}, earthquakes: {...}, coingecko: {...} }
 *
 * Each sub-endpoint is called internally and results are merged.
 */

import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

const ALLOWED_ENDPOINTS = new Set([
  'hackernews',
  'earthquakes',
  'coingecko',
  'yahoo-finance',
  'news',
  'acled-conflict',
  'firms-fires',
  'climate-anomalies',
  'stablecoin-markets',
  'service-status',
  'tech-events',
  'fred-data',
]);

const TIMEOUT_MS = 8000;

async function fetchEndpoint(baseUrl, endpoint, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${baseUrl}/api/${endpoint}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Origin': headers.get('origin') || '',
      },
    });
    if (!res.ok) return { error: `${res.status} ${res.statusText}` };
    return await res.json();
  } catch (err) {
    return { error: err.name === 'AbortError' ? 'Timeout' : (err.message || 'Failed to fetch') };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(request) {
  const cors = getCorsHeaders(request);

  if (isDisallowedOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('endpoints') || '';
  const requested = raw.split(',').map(s => s.trim()).filter(Boolean);

  if (requested.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing ?endpoints= parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const endpoints = requested.filter(ep => ALLOWED_ENDPOINTS.has(ep));

  if (endpoints.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid endpoints requested' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host');
  const baseUrl = `${protocol}://${host}`;

  const results = {};
  const promises = endpoints.map(async (ep) => {
    results[ep] = await fetchEndpoint(baseUrl, ep, request.headers);
  });

  await Promise.allSettled(promises);

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...cors,
      'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
