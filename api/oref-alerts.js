import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

/**
 * Oref Siren Alerts — proxied via Israel VPS
 * The oref.org.il API is geo-blocked outside Israel.
 * OREF_PROXY_URL env var points to the Israel VPS proxy (e.g. http://195.20.17.179:3080).
 */
export default async function handler(request) {
    const cors = getCorsHeaders(request);
    if (isDisallowedOrigin(request)) {
        return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers: cors });
    }

    const proxyUrl = process.env.OREF_PROXY_URL;
    if (!proxyUrl) {
        return new Response(JSON.stringify({ configured: false, alerts: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...cors },
        });
    }

    try {
        const response = await fetch(`${proxyUrl}/oref/alerts`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
        });

        let body = await response.text();
        // Oref returns BOM + empty string when no alerts
        body = body.replace(/^\uFEFF/, '').trim();

        let alerts = [];
        if (body && body.startsWith('[')) {
            try {
                alerts = JSON.parse(body);
            } catch {
                // Malformed JSON — treat as empty
            }
        }

        return new Response(JSON.stringify({ configured: true, alerts, timestamp: new Date().toISOString() }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...cors,
                'Cache-Control': 'public, max-age=5, s-maxage=5, stale-while-revalidate=3',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ configured: true, alerts: [], error: 'Proxy unreachable' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...cors },
        });
    }
}
