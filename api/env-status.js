import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

/**
 * GET /api/env-status
 *
 * Returns which server-side API keys are configured (set & non-empty)
 * without exposing actual values.  Used by the settings page to show
 * a dashboard of credential status.
 */

const ENV_KEYS = [
  { key: 'GROQ_API_KEY',              label: 'Groq',               group: 'AI Summarization',     module: 'AI story summaries (LiveNewsPanel)' },
  { key: 'OPENROUTER_API_KEY',        label: 'OpenRouter',         group: 'AI Summarization',     module: 'AI summary fallback when Groq is down' },
  { key: 'UPSTASH_REDIS_REST_URL',    label: 'Upstash Redis URL',  group: 'Cache',                module: 'Cross-user AI cache & risk score dedup' },
  { key: 'UPSTASH_REDIS_REST_TOKEN',  label: 'Upstash Redis Token',group: 'Cache',                module: 'Cross-user AI cache & risk score dedup' },
  { key: 'FINNHUB_API_KEY',           label: 'Finnhub',            group: 'Market Data',          module: 'Stock quotes (InvestmentsPanel)' },
  { key: 'EIA_API_KEY',               label: 'EIA',                group: 'Energy Data',          module: 'Oil prices & inventory (EnergyPanel)' },
  { key: 'FRED_API_KEY',              label: 'FRED',               group: 'Economic Data',        module: 'CPI, GDP, interest rates (EconomicPanel)' },
  { key: 'WINGBITS_API_KEY',          label: 'Wingbits',           group: 'Aircraft Tracking',    module: 'Aircraft owner/operator enrichment (map popups)' },
  { key: 'ACLED_ACCESS_TOKEN',        label: 'ACLED',              group: 'Conflict Data',        module: 'Armed conflict events (ConflictPanel & map)' },
  { key: 'CLOUDFLARE_API_TOKEN',      label: 'Cloudflare Radar',   group: 'Internet Outages',     module: 'Internet outage annotations (OutagesPanel)' },
  { key: 'NASA_FIRMS_API_KEY',        label: 'NASA FIRMS',         group: 'Satellite Fire',       module: 'Active fire detections (FiresLayer on map)' },
  { key: 'URLHAUS_AUTH_KEY',          label: 'URLhaus',            group: 'Cyber Threat Intel',   module: 'Malware URL feed (CyberThreatsPanel)' },
  { key: 'OTX_API_KEY',              label: 'AlienVault OTX',     group: 'Cyber Threat Intel',   module: 'Threat indicators (CyberThreatsPanel)' },
  { key: 'ABUSEIPDB_API_KEY',        label: 'AbuseIPDB',          group: 'Cyber Threat Intel',   module: 'IP reputation lookups (CyberThreatsPanel)' },
  { key: 'AISSTREAM_API_KEY',        label: 'AISStream',          group: 'Vessel Tracking',      module: 'Live AIS vessel positions (ShipsLayer on map)' },
  { key: 'OPENSKY_CLIENT_ID',        label: 'OpenSky ID',         group: 'Aircraft Tracking',    module: 'Live aircraft positions (AircraftLayer on map)' },
  { key: 'OPENSKY_CLIENT_SECRET',    label: 'OpenSky Secret',     group: 'Aircraft Tracking',    module: 'Live aircraft positions (AircraftLayer on map)' },
  { key: 'SETTINGS_PASSWORD',        label: 'Settings Password',  group: 'Security',             module: 'Password protection for /settings.html' },
];

export default async function handler(req) {
  const cors = getCorsHeaders(req, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'origin' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const keys = ENV_KEYS.map(({ key, label, group, module }) => ({
    key,
    label,
    group,
    module,
    set: Boolean((process.env[key] || '').trim()),
  }));

  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
