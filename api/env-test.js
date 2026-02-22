import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { createIpRateLimiter } from './_ip-rate-limit.js';

export const config = { runtime: 'edge' };

// Rate-limit test calls: 20 per IP per 5 minutes
const limiter = createIpRateLimiter({ limit: 20, windowMs: 5 * 60 * 1000 });

function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

/**
 * POST /api/env-test
 *   Body: { "key": "GROQ_API_KEY" }
 *
 * Makes a lightweight upstream ping to verify the credential works.
 * Returns: { "ok": true/false, "ms": <latency>, "detail": "..." }
 */

const TESTERS = {
  GROQ_API_KEY: async (val) => {
    const r = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${val}` },
    });
    if (r.ok) return { ok: true, detail: 'Models endpoint reachable' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  OPENROUTER_API_KEY: async (val) => {
    const r = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${val}` },
    });
    if (r.ok) return { ok: true, detail: 'Models endpoint reachable' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  UPSTASH_REDIS_REST_URL: async (_val, env) => {
    const url = env.UPSTASH_REDIS_REST_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return { ok: false, detail: 'URL or token missing' };
    const r = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) return { ok: true, detail: 'PONG received' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  FINNHUB_API_KEY: async (val) => {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${val}`);
    if (r.ok) {
      const d = await r.json();
      return { ok: d.c > 0, detail: d.c > 0 ? `AAPL: $${d.c}` : 'Empty response' };
    }
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  EIA_API_KEY: async (val) => {
    const r = await fetch(`https://api.eia.gov/v2/seriesid/PET.RWTC.W?api_key=${val}&num=1`);
    if (r.ok) return { ok: true, detail: 'EIA series reachable' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  FRED_API_KEY: async (val) => {
    const r = await fetch(`https://api.stlouisfed.org/fred/series?series_id=GDP&api_key=${val}&file_type=json`);
    if (r.ok) return { ok: true, detail: 'FRED series reachable' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  WINGBITS_API_KEY: async (val) => {
    const r = await fetch('https://customer-api.wingbits.com/v1/flights/details/a00001', {
      headers: { 'x-api-key': val },
    });
    if (r.status === 200 || r.status === 404) return { ok: true, detail: 'API key accepted' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  ACLED_ACCESS_TOKEN: async (val) => {
    const r = await fetch('https://api.acleddata.com/acled/read?limit=1&terms=accept', {
      headers: { Authorization: `Bearer ${val}` },
    });
    if (r.ok) return { ok: true, detail: 'ACLED API reachable' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  CLOUDFLARE_API_TOKEN: async (val) => {
    const r = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { Authorization: `Bearer ${val}` },
    });
    if (r.ok) {
      const d = await r.json();
      return { ok: d.success === true, detail: d.success ? 'Token valid' : 'Token invalid' };
    }
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  NASA_FIRMS_API_KEY: async (val) => {
    const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${val}/VIIRS_SNPP_NRT/0,0,1,1/1`);
    if (r.ok) return { ok: true, detail: 'FIRMS API reachable' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  OTX_API_KEY: async (val) => {
    const r = await fetch('https://otx.alienvault.com/api/v1/user/me', {
      headers: { 'X-OTX-API-KEY': val },
    });
    if (r.ok) return { ok: true, detail: 'OTX user verified' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  ABUSEIPDB_API_KEY: async (val) => {
    const r = await fetch('https://api.abuseipdb.com/api/v2/check?ipAddress=8.8.8.8&maxAgeInDays=1', {
      headers: { Key: val, Accept: 'application/json' },
    });
    if (r.ok) return { ok: true, detail: 'AbuseIPDB reachable' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },

  OPENSKY_CLIENT_ID: async (_val, env) => {
    const id = env.OPENSKY_CLIENT_ID;
    const secret = env.OPENSKY_CLIENT_SECRET;
    if (!id || !secret) return { ok: false, detail: 'Client ID or secret missing' };
    const r = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}`,
    });
    if (r.ok) return { ok: true, detail: 'OAuth2 token obtained' };
    return { ok: false, detail: `HTTP ${r.status}` };
  },
};

// Keys that share a tester with a compound key
const TESTER_ALIASES = {
  UPSTASH_REDIS_REST_TOKEN: 'UPSTASH_REDIS_REST_URL',
  OPENSKY_CLIENT_SECRET: 'OPENSKY_CLIENT_ID',
};

export default async function handler(req) {
  const cors = getCorsHeaders(req, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'origin' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const ip = getClientIp(req);
  if (!limiter.check(ip)) {
    return new Response(JSON.stringify({ ok: false, detail: 'Rate limited — try again in 5 minutes' }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '300' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, detail: 'Invalid body' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const keyName = String(body?.key || '');
  const resolvedName = TESTER_ALIASES[keyName] || keyName;
  const tester = TESTERS[resolvedName];

  if (!tester) {
    return new Response(JSON.stringify({ ok: false, detail: `No tester for ${keyName}` }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const envVal = (process.env[keyName] || process.env[resolvedName] || '').trim();
  if (!envVal) {
    return new Response(JSON.stringify({ ok: false, detail: 'Key not configured in environment' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const start = Date.now();
  try {
    const result = await tester(envVal, process.env);
    const ms = Date.now() - start;
    return new Response(JSON.stringify({ ...result, ms, testedAt: new Date().toISOString() }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const ms = Date.now() - start;
    return new Response(JSON.stringify({ ok: false, detail: `Error: ${err.message || err}`, ms, testedAt: new Date().toISOString() }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
