# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.4.x   | :white_check_mark: |
| < 2.4   | :x:                |

## Reporting a Vulnerability

**Please do NOT open public issues for security vulnerabilities.**

If you discover a security vulnerability in World Monitor, please report it through one of the following channels:

1. **GitHub Security Advisories** (preferred): Open a [private security advisory](https://github.com/koala73/worldmonitor/security/advisories/new) on this repository.
2. **Email**: Contact the maintainer, Elie Habib, directly via his GitHub profile.

### What to Include

- A clear description of the vulnerability and its potential impact.
- Steps to reproduce, including any relevant configurations or payloads.
- Affected version(s) and platform(s) (Web, Desktop, PWA).
- Any suggested mitigation or fix, if available.

### Response Timeline

| Stage                  | Target            |
| ---------------------- | ----------------- |
| Acknowledgement        | Within 48 hours   |
| Initial assessment     | Within 7 days     |
| Fix for critical issues| Within 30 days    |

### Scope

**In scope:**
- All code in this repository
- Deployed API endpoints (`api/`)
- Desktop application (Tauri 2)
- PWA and Service Worker behavior

**Out of scope:**
- Vulnerabilities in third-party APIs consumed by World Monitor
- Denial-of-service attacks against upstream API providers
- Issues in dependencies that have already been reported upstream

## Security Architecture

World Monitor employs a defense-in-depth approach across its web, API, and desktop layers.

### CORS Origin Allowlist

API endpoints enforce a strict CORS origin allowlist (implemented in `api/_cors.js`). Only the following origins are permitted:

- `worldmonitor.app`
- `tech.worldmonitor.app`
- `finance.worldmonitor.app`
- `localhost:*` (development only)

All other cross-origin requests are rejected.

### API Key Isolation

All third-party API keys are stored server-side as Vercel environment variables. The browser client never receives or transmits API credentials. Every external API call is proxied through serverless functions that inject credentials on the server side.

### Input Sanitization

User-supplied and external content is sanitized before rendering to prevent XSS:

- `escapeHtml()` — escapes HTML entities in dynamic content
- `sanitizeUrl()` — validates and sanitizes URLs
- `escapeAttr()` — escapes values used in HTML attributes
- Query parameter validation uses regex patterns (e.g., stablecoin IDs are validated against `[a-z0-9-]+`)

### Rate Limiting

AI-powered endpoints (classification, summarization) are protected by IP-based rate limiting backed by Upstash Redis. Other endpoints rely on Vercel's built-in DDoS protection.

### RSS and Railway Domain Allowlists

- The RSS proxy (`api/rss-proxy.js`) only fetches from ~90+ explicitly listed domains.
- The Railway relay uses a separate domain allowlist for relay feeds.

Requests to domains not on the allowlists are rejected.

### Desktop Sidecar Authentication

The Tauri 2 desktop application runs a localhost sidecar process for local API access. Security is enforced by:

- A per-session Bearer token generated at application launch
- The token is stored in Rust application state and required for all sidecar API calls
- The sidecar only listens on `localhost`

### OS Keychain Integration

On desktop, user-configured API keys are stored using the operating system's native secret storage:

- **macOS**: Keychain
- **Windows**: Credential Manager

Keys are never written to disk in plaintext.

### Content Security Policy

The Tauri desktop application enforces a Content Security Policy configured in `tauri.conf.json`, restricting the sources from which scripts, styles, and other resources can be loaded.

### No Debug Endpoints in Production

The `api/debug-env.js` endpoint returns a `404` response in production environments, ensuring no diagnostic information is exposed.

## Known Security Boundaries

These are intentional design boundaries that users and contributors should be aware of:

- **Client-side ML**: Transformers.js models run in the browser. Model outputs (classification, embeddings) should not be trusted for security-critical decisions.
- **Proxy endpoints**: The RSS proxy and Railway relay are domain-allowlisted but ultimately fetch and relay external content. Content is escaped before display but originates from third parties.
- **Rate limiting coverage**: AI endpoints are explicitly rate-limited. Other endpoints depend on Vercel's platform-level DDoS protection rather than application-level rate limiting.
- **Desktop sidecar**: Token-based auth secures the localhost sidecar API, but overall security is bounded by the security posture of the user's local machine.
- **External API data**: Data from 30+ external sources is rendered to users. Content is HTML-escaped, but the factual accuracy and integrity of external data is not independently verified.
- **Service Worker caching**: The PWA Service Worker caches API responses in the browser. Cached data may persist beyond the lifecycle of the session or any upstream authentication state.
