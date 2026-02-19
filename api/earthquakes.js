import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = getCorsHeaders(request);
  if (isDisallowedOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers: cors });
  }
  try {
    const response = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    const raw = await response.json();

    // PERF-024: prune unused upstream fields to reduce payload by ~30%
    if (raw && Array.isArray(raw.features)) {
      raw.features = raw.features.map(f => ({
        type: f.type,
        id: f.id,
        geometry: f.geometry,
        properties: {
          mag: f.properties?.mag,
          place: f.properties?.place,
          time: f.properties?.time,
          updated: f.properties?.updated,
          url: f.properties?.url,
          title: f.properties?.title,
          status: f.properties?.status,
          tsunami: f.properties?.tsunami,
          sig: f.properties?.sig,
          type: f.properties?.type,
          felt: f.properties?.felt,
          cdi: f.properties?.cdi,
          mmi: f.properties?.mmi,
          alert: f.properties?.alert,
        },
      }));
      // Strip top-level metadata but keep bbox
      raw.metadata = {
        generated: raw.metadata?.generated,
        count: raw.metadata?.count,
        title: raw.metadata?.title,
      };
    }

    return new Response(JSON.stringify(raw), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...cors,
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }
}
