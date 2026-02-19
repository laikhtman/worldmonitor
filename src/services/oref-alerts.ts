/**
 * Oref Siren Alerts Service
 * Fetches active siren alerts from the Israel Home Front Command (Pikud HaOref)
 * via the Israel VPS proxy → API handler pipeline.
 */

export interface OrefAlert {
    data: string;      // Area name (Hebrew)
    date: string;      // Date string
    time: string;      // Time string
    datetime?: string; // ISO datetime
    title?: string;    // Alert type description
    category?: number; // Alert category ID
}

export interface OrefAlertsResponse {
    configured: boolean;
    alerts: OrefAlert[];
    timestamp?: string;
    error?: string;
}

let _cachedResponse: OrefAlertsResponse | null = null;
let _lastFetch = 0;
const POLL_INTERVAL_MS = 10_000; // 10 seconds
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _listeners: Array<(data: OrefAlertsResponse) => void> = [];

export async function fetchOrefAlerts(): Promise<OrefAlertsResponse> {
    // In-memory cache: avoid hammering API
    if (_cachedResponse && Date.now() - _lastFetch < POLL_INTERVAL_MS) {
        return _cachedResponse;
    }

    try {
        const res = await fetch('/api/oref-alerts');
        if (!res.ok) {
            return { configured: false, alerts: [] };
        }
        const data: OrefAlertsResponse = await res.json();
        _cachedResponse = data;
        _lastFetch = Date.now();
        return data;
    } catch {
        return _cachedResponse || { configured: false, alerts: [] };
    }
}

export function onOrefAlertsUpdate(cb: (data: OrefAlertsResponse) => void): () => void {
    _listeners.push(cb);
    return () => {
        _listeners = _listeners.filter(l => l !== cb);
    };
}

export function startOrefPolling(): void {
    if (_pollTimer) return;
    _pollTimer = setInterval(async () => {
        const data = await fetchOrefAlerts();
        _listeners.forEach(cb => cb(data));
    }, POLL_INTERVAL_MS);

    // Initial fetch
    fetchOrefAlerts().then(data => {
        _listeners.forEach(cb => cb(data));
    });
}

export function stopOrefPolling(): void {
    if (_pollTimer) {
        clearInterval(_pollTimer);
        _pollTimer = null;
    }
}
