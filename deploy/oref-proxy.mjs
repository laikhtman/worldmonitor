#!/usr/bin/env node
/**
 * Oref Proxy Server — runs on Israel VPS
 * Proxies requests to oref.org.il which is geo-blocked outside Israel.
 * Caches responses for 5 seconds to avoid hammering upstream.
 */
import http from 'node:http';
import https from 'node:https';

const PORT = parseInt(process.env.PORT || '3080', 10);
const CACHE_TTL_MS = 5000; // 5 seconds

// Oref endpoints
const ENDPOINTS = {
    '/oref/alerts': 'https://www.oref.org.il/WarningMessages/alert/alerts.json',
    '/oref/history': 'https://www.oref.org.il/WarningMessages/History/AlertsHistory.json',
};

// Simple in-memory cache
const cache = new Map();

function fetchUpstream(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'Referer': 'https://www.oref.org.il/',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
                'User-Agent': 'Mozilla/5.0 (compatible; IntelHQ/1.0)',
            },
            timeout: 8000,
        }, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: Buffer.concat(chunks).toString('utf8'),
                });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function handleRequest(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Health check
    if (req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
        return;
    }

    const upstreamUrl = ENDPOINTS[req.url];
    if (!upstreamUrl) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    // Check cache
    const cached = cache.get(req.url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        res.writeHead(200, { 'X-Cache': 'HIT' });
        res.end(cached.body);
        return;
    }

    try {
        const result = await fetchUpstream(upstreamUrl);
        // Cache successful responses
        if (result.status === 200) {
            cache.set(req.url, { body: result.body, timestamp: Date.now() });
        }
        res.writeHead(result.status, { 'X-Cache': 'MISS' });
        res.end(result.body);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Upstream error for ${req.url}: ${err.message}`);
        // Return cached data even if stale, on error
        if (cached) {
            res.writeHead(200, { 'X-Cache': 'STALE' });
            res.end(cached.body);
            return;
        }
        res.writeHead(502);
        res.end(JSON.stringify({ error: 'Upstream unavailable', detail: err.message }));
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[oref-proxy] Listening on :${PORT}`);
    console.log(`[oref-proxy] Endpoints: ${Object.keys(ENDPOINTS).join(', ')}`);
});
