/**
 * Centralized branding — single source of truth for app identity.
 *
 * All display names and URLs derive from two env vars:
 *   VITE_APP_TITLE  — e.g. "IntelHQ"
 *   VITE_APP_URL    — e.g. "intelhq.io"  (domain, no protocol)
 *
 * To rebrand the app, change .env — no source code edits needed.
 */

/** App display name, e.g. "IntelHQ" */
export const APP_TITLE = (import.meta.env.VITE_APP_TITLE as string) || 'IntelHQ';

/** Primary domain without protocol, e.g. "intelhq.io" */
export const APP_DOMAIN = (import.meta.env.VITE_APP_URL as string) || 'intelhq.io';

/** Full origin URL, e.g. "https://intelhq.io" */
export const APP_ORIGIN = `https://${APP_DOMAIN}`;

/** User-Agent string for third-party API requests */
export const APP_USER_AGENT = `${APP_TITLE}/2.0 (${APP_ORIGIN})`;

/** Watermark text for story images — uppercased domain */
export const APP_WATERMARK = APP_DOMAIN.toUpperCase();

/** Default OG image URL */
export const APP_OG_IMAGE = `${APP_ORIGIN}/favico/og-image.png`;

/** App tagline */
export const APP_TAGLINE = 'Global Situation with AI Insights';

/** Full title with tagline, e.g. "IntelHQ - Global Situation with AI Insights" */
export const APP_FULL_TITLE = `${APP_TITLE} - ${APP_TAGLINE}`;

/** Set of known app hostnames (for origin detection) */
export const APP_HOSTS = new Set([
  APP_DOMAIN,
  `www.${APP_DOMAIN}`,
  `tech.${APP_DOMAIN}`,
  `finance.${APP_DOMAIN}`,
  `tv.${APP_DOMAIN}`,
  'localhost',
  '127.0.0.1',
]);

/** Check whether a hostname belongs to the app */
export function isAppHost(host: string): boolean {
  return APP_HOSTS.has(host) || host.endsWith(`.${APP_DOMAIN}`);
}

/** Remote API base URLs per variant */
export const REMOTE_HOSTS: Record<string, string> = {
  tech: `https://tech.${APP_DOMAIN}`,
  full: APP_ORIGIN,
  world: APP_ORIGIN,
};
