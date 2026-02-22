import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { createIpRateLimiter } from './_ip-rate-limit.js';

export const config = { runtime: 'edge' };

// Brute-force protection: 5 attempts per IP within 15 minutes
const limiter = createIpRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,   // 15-minute window
  maxEntries: 10_000,
});

function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

/**
 * POST /api/settings-auth
 *   Body: { "password": "..." }
 *
 * Returns:
 *   { "ok": true }                                  — password correct
 *   { "ok": false, "error": "..." }                 — wrong password
 *   { "ok": false, "error": "...", "locked": true } — rate-limited
 *
 * GET /api/settings-auth
 *   Returns { "protected": true|false } so the client knows whether
 *   to show the password gate at all.
 */
export default async function handler(req) {
  const cors = getCorsHeaders(req, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'origin' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const password = (process.env.SETTINGS_PASSWORD || '').trim();

  // GET — tell the client whether a password is configured
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ protected: password.length > 0 }), {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  // POST — verify password
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // No password configured — always allow
  if (!password) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const ip = getClientIp(req);

  if (!limiter.check(ip)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Too many failed attempts. Try again in 15 minutes.',
        locked: true,
      }),
      {
        status: 429,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Retry-After': '900',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid request body' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const attempt = String(body?.password || '').trim();

  // Constant-time comparison to prevent timing attacks
  if (attempt.length !== password.length || !timingSafeEqual(attempt, password)) {
    // The rate-limiter already counted this request.
    // On the 5th failed attempt the next request will be blocked.
    return new Response(JSON.stringify({ ok: false, error: 'Wrong password' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * Constant-time string comparison (edge-compatible, no Node crypto needed).
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
