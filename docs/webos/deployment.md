# IntelHQ — Production Deployment & Local Dev Guide

> **Audience**: DevOps agent, developers, anyone redeploying the app or setting up a local environment.
>
> **Repository**: `laikhtman/worldmonitor` (fork) — push target via the `fork` remote.
> **Upstream**: `koala73/worldmonitor` (read-only `origin`) — we do **not** auto-sync from upstream.
> **Production**: Hetzner CPX62 server → `intelhq.io`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Production Server (Hetzner)](#2-production-server-hetzner)
3. [Deploying to Production](#3-deploying-to-production)
4. [Subdomain Setup (Future)](#4-subdomain-setup-future)
5. [Environment Variables](#5-environment-variables)
6. [Git Workflow](#6-git-workflow)
7. [Local Development Environment](#7-local-development-environment)
8. [Local webOS / TV Development](#8-local-webos--tv-development)
9. [Verifying the Local Dev Environment Works](#9-verifying-the-local-dev-environment-works)
10. [Testing Checklist Before Production Deploy](#10-testing-checklist-before-production-deploy)
11. [Vercel (Preview / Secondary)](#11-vercel-preview--secondary)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Architecture Overview

```
                     ┌───────────────────────────────────┐
                     │  Hetzner CPX62  (Production)      │
                     │  IP: 49.13.224.43                 │
                     │                                   │
  intelhq.io ────────┤  nginx (SSL, static, SPA)         │
                     │    ├─ /opt/worldmonitor/dist/     │
                     │    └─ /api/* → Node.js :3001      │
                     │                                   │
                     │  Node.js sidecar (local-api-server)│
                     │    port 3001 — runs API handlers  │
                     └──────────────┬────────────────────┘
                                    │
              ┌─────────────────────┴────────────────────┐
              │  Israel VPS  (195.20.17.179:56777)       │
              │  Geo-proxy for Oref siren alerts          │
              │  oref-proxy.mjs on port 3080              │
              └──────────────────────────────────────────┘

  Subdomains NOT live yet:
    tech.intelhq.io     → planned (tech variant)
    finance.intelhq.io  → planned (finance variant)
    tv.intelhq.io       → planned (TV/webOS variant)
```

**Key facts:**

- The app runs on a **Hetzner CPX62** server (Ubuntu, 32 GB RAM).
- **nginx** serves static files from `/opt/worldmonitor/dist/` and proxies `/api/*` to a Node.js sidecar on port 3001.
- The Node.js sidecar (`src-tauri/sidecar/local-api-server.mjs`) runs the same API handler logic as the `api/*.js` files.
- An **Israel VPS** at 195.20.17.179 runs `oref-proxy.mjs` to proxy geo-blocked Israeli API calls.
- Currently only the **full variant** is deployed at `intelhq.io`. Other subdomains are planned.
- The app is a single codebase producing 4 variants via `VITE_VARIANT`: `full`, `tech`, `finance`, `tv`.
- Vercel (`worldmonitor-ivory-eta.vercel.app`) exists as a preview/fallback but is **not** the production deployment.

---

## 2. Production Server (Hetzner)

### 2.1 Server Details

| Property | Value |
|----------|-------|
| Provider | Hetzner Cloud |
| Type | CPX62 (32 GB RAM) |
| OS | Ubuntu |
| IPv4 | `49.13.224.43` |
| SSH User | `root` |
| SSH Key | `~/.ssh/worldmonitor-hetzner` |
| Domain | `intelhq.io` |
| App Root | `/opt/worldmonitor/` |
| Static Files | `/opt/worldmonitor/dist/` |
| API Sidecar Port | `3001` |
| Credentials | See `.credentials` file (gitignored) |

### 2.2 Server Components

```
/opt/worldmonitor/
├── dist/                  ← Built static files (served by nginx)
│   ├── index.html
│   ├── assets/            ← JS/CSS bundles (hashed, immutable cache)
│   └── ...
├── api/                   ← API handler source files
├── src-tauri/sidecar/
│   └── local-api-server.mjs  ← Node.js API sidecar (port 3001)
├── .env                   ← Production environment variables
├── node_modules/          ← Dependencies for API sidecar
└── package.json
```

### 2.3 nginx Configuration

The nginx config is at `/etc/nginx/sites-enabled/intelhq` (source: `deploy/nginx-interlhq.conf`):

- **Ports**: 80 (HTTP) + 443 (HTTPS with HTTP/2)
- **SSL**: Origin certificate at `/etc/ssl/certs/intelhq-origin.crt`
- **Static**: Serves `/opt/worldmonitor/dist/` with SPA fallback to `index.html`
- **Assets**: `/assets/` gets `Cache-Control: public, immutable` with 1-year expiry
- **API proxy**: `/api/*` → `http://127.0.0.1:3001` (Node.js sidecar)
- **Gzip**: Enabled for text, CSS, JS, JSON, SVG
- **Security headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy

### 2.4 API Sidecar (systemd Service)

The API sidecar runs as a systemd service (`deploy/worldmonitor-api.service`):

```bash
# Check status
ssh root@49.13.224.43 -i ~/.ssh/worldmonitor-hetzner "systemctl status worldmonitor-api"

# Restart
ssh root@49.13.224.43 -i ~/.ssh/worldmonitor-hetzner "systemctl restart worldmonitor-api"

# View logs
ssh root@49.13.224.43 -i ~/.ssh/worldmonitor-hetzner "journalctl -u worldmonitor-api -f"
```

Service config:
- **User**: `www-data`
- **Working Directory**: `/opt/worldmonitor`
- **Entry Point**: `node src-tauri/sidecar/local-api-server.mjs`
- **Port**: 3001
- **Env File**: `/opt/worldmonitor/.env`
- **Auto-restart**: On failure (5s delay)

---

## 3. Deploying to Production

### 3.1 Full Deployment (Build + Upload + Restart)

```powershell
# 1. Build locally
npm run build:full

# 2. Upload built files to the server
scp -i ~/.ssh/worldmonitor-hetzner -r dist/* root@49.13.224.43:/opt/worldmonitor/dist/

# 3. Upload API files (if API handlers changed)
scp -i ~/.ssh/worldmonitor-hetzner -r api/* root@49.13.224.43:/opt/worldmonitor/api/

# 4. Restart the API sidecar (if API files changed)
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "systemctl restart worldmonitor-api"

# 5. Reload nginx (only if nginx config changed)
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "nginx -t && systemctl reload nginx"
```

### 3.2 Quick Deploy (Static Files Only)

If only frontend code changed (no API changes):

```powershell
# Build and upload — no service restart needed
npm run build:full
scp -i ~/.ssh/worldmonitor-hetzner -r dist/* root@49.13.224.43:/opt/worldmonitor/dist/
```

nginx serves static files directly — changes are live immediately after upload (users may need a hard-reload to bypass browser cache for `index.html`).

### 3.3 API-Only Deploy

If only `api/*.js` files changed:

```powershell
scp -i ~/.ssh/worldmonitor-hetzner -r api/* root@49.13.224.43:/opt/worldmonitor/api/
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "systemctl restart worldmonitor-api"
```

### 3.4 Full Sync (rsync)

For a comprehensive sync that handles deletions and additions:

```powershell
# Sync entire project (excludes node_modules, .git, etc.)
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.credentials' \
  --exclude='dist-webos' \
  -e "ssh -i ~/.ssh/worldmonitor-hetzner" \
  ./ root@49.13.224.43:/opt/worldmonitor/

# Then on the server: install deps + restart
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "cd /opt/worldmonitor && npm install --production && systemctl restart worldmonitor-api"
```

### 3.5 Updating nginx Config

If you modify `deploy/nginx-interlhq.conf`:

```powershell
# Upload the new config
scp -i ~/.ssh/worldmonitor-hetzner deploy/nginx-interlhq.conf root@49.13.224.43:/etc/nginx/sites-enabled/intelhq

# Test config syntax
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "nginx -t"

# Reload (graceful, no downtime)
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "systemctl reload nginx"
```

### 3.6 Updating Environment Variables

```powershell
# Edit .env on the server directly
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "nano /opt/worldmonitor/.env"

# Restart sidecar to pick up changes
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "systemctl restart worldmonitor-api"
```

Note: `VITE_*` variables are baked into the frontend build at compile time. Changing them on the server has no effect — you must rebuild and re-upload `dist/`.

### 3.7 Verification After Deploy

```powershell
# 1. Check the site loads
curl -sI https://intelhq.io/ | Select-String "HTTP|Content-Type"

# 2. Check an API endpoint
curl -s https://intelhq.io/api/version | ConvertFrom-Json

# 3. Check sidecar is running
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "systemctl is-active worldmonitor-api"

# 4. Check nginx is running
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "systemctl is-active nginx"
```

---

## 4. Subdomain Setup (Future)

The following subdomains are planned but **not yet live**:

| Subdomain | Variant | Build Command | Status |
|-----------|---------|---------------|--------|
| `intelhq.io` | `full` | `npm run build:full` | **Live** |
| `tech.intelhq.io` | `tech` | `npm run build:tech` | Planned |
| `finance.intelhq.io` | `finance` | `npm run build:finance` | Planned |
| `tv.intelhq.io` | `tv` | `npm run build:tv` | Planned |

### 4.1 How to Add a New Subdomain on Hetzner

Each variant produces a separate `dist/` output. To serve multiple variants from the same server:

**Option A: Separate directories + nginx server blocks**

```bash
# Build each variant
npm run build:full    # → dist-full/
npm run build:tech    # → dist-tech/
npm run build:tv      # → dist-tv/

# Upload each to its own directory on the server
scp -r dist-full/* root@server:/opt/worldmonitor/dist-full/
scp -r dist-tech/* root@server:/opt/worldmonitor/dist-tech/
scp -r dist-tv/*   root@server:/opt/worldmonitor/dist-tv/
```

Then add an nginx server block per subdomain (copy `nginx-interlhq.conf` and change `server_name` and `root`):

```nginx
server {
    server_name tech.intelhq.io;
    root /opt/worldmonitor/dist-tech;
    # ... same config as main site ...
}
```

**Option B: Separate Vercel projects per subdomain**

Use Vercel for the subdomains while keeping Hetzner for `intelhq.io`. See [Section 11](#11-vercel-preview--secondary).

### 4.2 DNS Records

Add `A` records for each subdomain pointing to the Hetzner server IP:

| Record | Host | Value |
|--------|------|-------|
| `A` | `@` | `49.13.224.43` |
| `A` | `tech` | `49.13.224.43` |
| `A` | `finance` | `49.13.224.43` |
| `A` | `tv` | `49.13.224.43` |

SSL certificates: use Certbot (Let's Encrypt) on the server:

```bash
sudo certbot --nginx -d tech.intelhq.io -d finance.intelhq.io -d tv.intelhq.io
```

---

## 5. Environment Variables

### 5.1 No Keys Required to Start

The app works with **zero environment variables**. News feeds, earthquakes, GDELT, UCDP, AIS, and many data sources are public APIs requiring no authentication. The dashboard degrades gracefully — panels that need a missing key simply show no data or a fallback.

### 5.2 Where Variables Are Set

| Location | Purpose | Affects |
|----------|---------|---------|
| `/opt/worldmonitor/.env` (on server) | Runtime API keys for the sidecar | API responses |
| `.env.local` (local dev) | Local development API keys | Local dev only |
| Build-time `VITE_*` vars | Baked into the frontend bundle | UI behavior |

### 5.3 Recommended Keys for Full Functionality

| Variable | Purpose | Required? | Get it at |
|----------|---------|-----------|-----------|
| `VITE_VARIANT` | Which variant to build (`full`/`tech`/`finance`/`tv`) | **Yes** (at build time) | Set manually |
| `GROQ_API_KEY` | AI summarization (primary) | No | [console.groq.com](https://console.groq.com/) |
| `OPENROUTER_API_KEY` | AI summarization (fallback) | No | [openrouter.ai](https://openrouter.ai/) |
| `UPSTASH_REDIS_REST_URL` | Cross-user cache (Redis) | No | [upstash.com](https://upstash.com/) |
| `UPSTASH_REDIS_REST_TOKEN` | Cross-user cache (Redis) | No | (same) |
| `FINNHUB_API_KEY` | Stock market quotes | No | [finnhub.io](https://finnhub.io/) |
| `ACLED_ACCESS_TOKEN` | Conflict/protest data | No | [acleddata.com](https://acleddata.com/) |
| `NASA_FIRMS_API_KEY` | Satellite fire detection | No | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/) |
| `EIA_API_KEY` | Energy/oil data | No | [eia.gov/opendata](https://www.eia.gov/opendata/) |
| `FRED_API_KEY` | Federal Reserve economic data | No | [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) |
| `CLOUDFLARE_API_TOKEN` | Internet outage detection | No | Cloudflare dashboard |
| `VITE_SENTRY_DSN` | Error reporting (client-side) | No | [sentry.io](https://sentry.io/) |

See `.env.example` (241 lines) for the **complete** list including AIS relay, OpenSky, cyber threat feeds, desktop/Tauri settings, and advanced tuning options.

### 5.4 Variable Scoping

- **`VITE_*` variables** are embedded in the client bundle at build time. They must be set **before** running `npm run build:*`. Changing them on the server `.env` has no effect — you must rebuild and re-upload `dist/`.
- **Non-`VITE_` variables** (like `GROQ_API_KEY`) are used by the API sidecar at runtime. Change them in `/opt/worldmonitor/.env` and restart the sidecar.

---

## 6. Git Workflow

### 6.1 Remote Configuration

```
origin  → https://github.com/koala73/worldmonitor   (upstream, READ-ONLY)
fork    → https://github.com/laikhtman/worldmonitor  (our fork, PUSH HERE)
```

We never pull from `origin`. Our fork is independent. GitHub's "Sync fork" button should **not** be clicked unless we explicitly want upstream changes.

### 6.2 Standard Workflow

```powershell
# 1. Make changes on main
git add -A
git commit -m "feat: description of changes"

# 2. Push to the fork remote
git push fork main

# 3. Deploy to production (build + upload)
npm run build:full
scp -i ~/.ssh/worldmonitor-hetzner -r dist/* root@49.13.224.43:/opt/worldmonitor/dist/

# 4. If API files changed, also restart sidecar
scp -i ~/.ssh/worldmonitor-hetzner -r api/* root@49.13.224.43:/opt/worldmonitor/api/
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "systemctl restart worldmonitor-api"
```

### 6.3 webOS-Specific Changes

webOS/TV code is part of the same codebase — there's no separate branch. TV-specific code is gated behind:

- `VITE_VARIANT === 'tv'` (compile-time, tree-shaken from other variants)
- `IS_TV` / `IS_WEBOS` runtime guards (in `src/utils/tv-detection.ts`)

Pushing to `main` includes everything: regular changes + webOS changes. The TV code has **zero impact** on the full variant because Vite's dead-code elimination removes it from non-TV builds.

**Key TV-specific files:**
- `src/config/variants/tv.ts` — TV variant configuration
- `src/components/TVOverlay.ts` — TV overlay HUD
- `src/components/TVExitDialog.ts` — exit confirmation dialog
- `src/controllers/tv-navigation.ts` — spatial navigation controller
- `src/utils/tv-remote.ts` — remote control input handler
- `src/utils/tv-focus.ts` — focus ring management
- `src/utils/tv-detection.ts` — TV/webOS detection utilities
- `src/utils/tv-maplibre-layers.ts` — simplified map layers for TV
- `src/styles/tv.css` — TV-specific styles
- `public/webos/` — appinfo.json, icons, splash, store assets

---

## 7. Local Development Environment

### 7.1 Prerequisites

| Tool | Version | Check | Install |
|------|---------|-------|---------|
| Node.js | 20.x+ | `node -v` | [nodejs.org](https://nodejs.org/) |
| npm | 10.x+ | `npm -v` | Comes with Node.js |
| Git | 2.x+ | `git -v` | [git-scm.com](https://git-scm.com/) |

### 7.2 Initial Setup

```powershell
# Clone the fork (if not already cloned)
git clone https://github.com/laikhtman/worldmonitor.git
cd worldmonitor

# If you already have the repo, make sure remotes are correct:
git remote -v
# Should show:
#   fork    https://github.com/laikhtman/worldmonitor.git (push)
#   origin  https://github.com/koala73/worldmonitor (fetch)

# Install dependencies
npm install

# (Optional) Copy env file — not required for basic dev
cp .env.example .env.local
# Edit .env.local and add any API keys you have
```

### 7.3 Running the Dev Server

```powershell
# Full variant (default) — http://localhost:5173
npm run dev

# Tech variant
npm run dev:tech

# Finance variant
npm run dev:finance

# TV variant
npm run dev:tv
```

The Vite dev server starts at `http://localhost:5173` with:
- Hot module replacement (HMR) — changes appear instantly
- API proxy — `/api/*` requests are proxied through Vite's built-in server, which executes the API handlers locally
- Source maps enabled
- TypeScript type checking in a separate process

### 7.4 Building for Production Locally

```powershell
# Build a specific variant
npm run build:full
npm run build:tech
npm run build:finance
npm run build:tv

# Preview the production build locally (serves dist/ at http://localhost:4173)
npm run preview
```

### 7.5 Type Checking

```powershell
# Run TypeScript compiler in check mode (no output, just errors)
npm run typecheck
```

**Always run this before pushing.** All variants share the same typecheck — if it passes, all variants will compile.

---

## 8. Local webOS / TV Development

### 8.1 Running TV Variant Locally

```powershell
npm run dev:tv
```

Open `http://localhost:5173` in Chrome. The TV layout activates automatically (full-screen map, TV overlay, focus ring, no mouse cursor).

### 8.2 Simulating TV in Chrome DevTools

1. Open Chrome DevTools (`F12`)
2. Click the **Device Toolbar** icon (or `Ctrl+Shift+M`)
3. Set dimensions to **1920 × 1080**
4. (Optional) Set user agent to a webOS TV string to trigger webOS-specific code paths:
   ```
   Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager
   ```

### 8.3 Testing on a Real TV via LAN

To test on your LG TV's built-in browser without deploying to a server:

```powershell
# Start TV dev server exposed to all network interfaces
cross-env VITE_VARIANT=tv npx vite --host 0.0.0.0
```

Find your PC's LAN IP:

```powershell
# Windows
ipconfig | Select-String "IPv4"

# macOS / Linux
hostname -I
```

On your LG TV's web browser, navigate to `http://<your-pc-ip>:5173`.

> **Important limitations of LAN testing:**
> - API endpoints will have limited functionality — only the Vite dev proxy runs locally.
> - Data panels may show errors or empty state for some data sources.
> - The map, UI layout, navigation, and TV controls will work correctly.
> - For full data testing, use the production server URL or a Vercel preview deployment.

### 8.4 Testing as a Packaged IPK

For native webOS app testing on a development TV:

```powershell
# Build and package (creates dist-webos/ directory)
npm run package:tv

# Build, package, AND create .ipk file
npm run package:tv:ipk

# Build, package, create .ipk, and install on a connected dev TV
npm run deploy:tv
```

Prerequisites for IPK deployment:
- webOS SDK (ares-cli) installed
- TV in Developer Mode
- TV registered with `ares-setup-device`

See [10-PACKAGING-DEPLOYMENT.md](10-PACKAGING-DEPLOYMENT.md) for detailed IPK deployment instructions.

### 8.5 What to Test on TV

| Area | What to check | How |
|------|--------------|-----|
| Layout | Full-screen map, no scroll bars | Visual |
| Navigation | D-pad up/down/left/right moves focus ring | Use TV remote or arrow keys |
| Panel switching | Left/right cycles panels | D-pad left/right |
| Exit dialog | Back button shows exit confirmation | Press Back/Return |
| Overlay HUD | Clock, panel title, battery visible | Top bar |
| Map interaction | Zoom in/out with remote | Channel up/down or +/- |
| Focus ring | Yellow focus outline visible on active element | Navigate with D-pad |
| Performance | No jank, <60fps drops, no OOM crashes | Run for 5+ minutes |

---

## 9. Verifying the Local Dev Environment Works

After initial setup, run this verification sequence to confirm everything is functional:

### 9.1 Quick Smoke Test (< 2 min)

```powershell
# 1. Dependencies installed?
npm ls --depth=0 2>&1 | Select-String "ERR!" 
# Should return nothing (no errors)

# 2. TypeScript compiles?
npm run typecheck
# Should exit with code 0

# 3. Dev server starts?
npm run dev
# Should show "Local: http://localhost:5173/" in the terminal
# Open the URL — you should see the map + panels loading
# Press Ctrl+C to stop
```

### 9.2 Full Verification (< 10 min)

```powershell
# 1. All 4 variants build successfully
npm run build:full
npm run build:tech
npm run build:finance
npm run build:tv
# All should exit with code 0

# 2. Production preview works
npm run preview
# Open http://localhost:4173 — should show the app
# Press Ctrl+C to stop

# 3. Run data tests
npm run test:data
# Should show all tests passing

# 4. Run E2E tests (requires Playwright browsers installed)
npx playwright install --with-deps chromium
npm run test:e2e:runtime
# Should show test results
```

### 9.3 Common "It's Not Working" Scenarios

| Symptom | Cause | Fix |
|---------|-------|-----|
| `npm install` fails | Node.js version too old | Install Node.js 20+ |
| `npm run dev` shows port in use | Another process on :5173 | Kill it or use `npx vite --port 5174` |
| `npm run typecheck` fails | TypeScript errors from incomplete merge | Run `git status` to check for conflicts |
| Map doesn't load | MapLibre needs WebGL | Use a browser with WebGL support (Chrome/Edge) |
| Blank page on dev | Build error in console | Check browser console (F12) for errors |
| `cross-env` not found | Dependencies not installed | Run `npm install` |
| TV variant looks like desktop | `VITE_VARIANT` not set | Use `npm run dev:tv` (not `npm run dev`) |
| API panels show "Error" | No `.env.local` with API keys | Expected — the app works without keys, some panels just show fallback |
| `ERR_MODULE_NOT_FOUND` | `node_modules` stale | Delete `node_modules` and `npm install` again |

---

## 10. Testing Checklist Before Production Deploy

Run through this before every push to `main`:

```
[ ] npm run typecheck                    — zero errors
[ ] npm run build:full                   — builds without errors
[ ] npm run build:tech                   — builds without errors
[ ] npm run build:finance                — builds without errors
[ ] npm run build:tv                     — builds without errors
[ ] npm run test:data                    — all data tests pass
[ ] Manual: open dev server, verify map loads
[ ] Manual: check at least one panel shows data
[ ] git status                           — no untracked build artifacts
[ ] git diff --stat                      — review what's being committed
```

For TV-related changes, additionally:

```
[ ] npm run dev:tv                       — TV layout renders at 1920×1080
[ ] Verify D-pad navigation works (arrow keys in Chrome)
[ ] Verify exit dialog appears on Escape key
[ ] Verify no console errors related to TV code
```

---

## 11. Vercel (Preview / Secondary)

Vercel is available as a secondary deployment for previews and branch testing, but is **not** the primary production host.

**Vercel domain**: `worldmonitor-ivory-eta.vercel.app`

### 11.1 When to Use Vercel

- **Preview deployments**: Push to any branch → Vercel auto-generates a preview URL
- **Full API testing**: Vercel runs edge functions natively, useful for testing API handlers that may behave differently from the local sidecar
- **Future subdomains**: If setting up tech/finance/tv subdomains on Hetzner is undesirable, Vercel projects per variant are an alternative

### 11.2 Vercel Setup (if needed)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `laikhtman/worldmonitor`
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:full` (or variant-specific)
   - **Output Directory**: `dist`
   - **Node.js Version**: 20.x

Set `VITE_VARIANT` in Vercel env vars to control which variant is built.

### 11.3 Preview URL

Every push creates a preview deployment. To force the TV variant on a preview:
- Set `VITE_VARIANT=tv` in Vercel env vars (scoped to Preview)
- Or append `?variant=tv` to the URL — persists via `localStorage`

---

## 12. Troubleshooting

### Production (Hetzner) Issues

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Site down / 502 | nginx or sidecar crashed | SSH in, check `systemctl status nginx` and `systemctl status worldmonitor-api` |
| Site shows old version | Browser cache | Hard-reload (`Ctrl+Shift+R`). If server-side, re-upload `dist/` |
| API returns 500 | Sidecar error | Check `journalctl -u worldmonitor-api -n 50` for errors |
| SSL certificate expired | Cert needs renewal | Run `certbot renew` or re-upload origin cert |
| Disk full | Builds or logs filling up | `df -h`, clear old logs: `journalctl --vacuum-time=7d` |
| Port 3001 not listening | Sidecar not running | `systemctl restart worldmonitor-api` |
| nginx config syntax error | Bad config edit | `nginx -t` to test, fix the config, then `systemctl reload nginx` |
| Can't SSH | Wrong key or IP | Check `.credentials` for correct IP and key path |

### Local Development Issues

| Problem | Solution |
|---------|----------|
| API calls fail on local dev | Some API handlers may not work perfectly via Vite proxy. Deploy to Hetzner or use Vercel for full testing |
| TV variant not activating | Use `npm run dev:tv`, not `npm run dev` with manual env var |
| CORS errors locally | Shouldn't happen — Vite proxies requests. Check browser console for details |
| HMR not updating | Check terminal for errors, try restarting `npm run dev` |
| `dist/` or `dist-webos/` in git status | These are build artifacts — never commit them |

---

## Quick Reference

```powershell
# ───── Local Development ─────
npm run dev                   # Full variant dev server
npm run dev:tv                # TV variant dev server
npm run dev:tech              # Tech variant dev server
npm run dev:finance           # Finance variant dev server

# ───── Build ─────
npm run build:full            # Production build (full)
npm run build:tv              # Production build (TV/webOS)
npm run build:tech            # Production build (tech)
npm run build:finance         # Production build (finance)

# ───── Validation ─────
npm run typecheck             # TypeScript check (all variants)
npm run test:data             # Unit/data tests
npm run test:e2e              # Full E2E suite (all variants)
npm run preview               # Preview last build at :4173

# ───── TV/webOS Packaging ─────
npm run package:tv            # Build + package for webOS
npm run package:tv:ipk        # Build + package + create .ipk
npm run deploy:tv             # Build + package + install on TV

# ───── Deploy to Hetzner (Production) ─────
npm run build:full
scp -i ~/.ssh/worldmonitor-hetzner -r dist/* root@49.13.224.43:/opt/worldmonitor/dist/
# If API changed:
scp -i ~/.ssh/worldmonitor-hetzner -r api/* root@49.13.224.43:/opt/worldmonitor/api/
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43 "systemctl restart worldmonitor-api"

# ───── Push to GitHub ─────
git push fork main

# ───── Verify Remotes ─────
git remote -v
# fork   → laikhtman/worldmonitor (PUSH here)
# origin → koala73/worldmonitor   (READ-ONLY, do not sync)

# ───── SSH to Production ─────
ssh -i ~/.ssh/worldmonitor-hetzner root@49.13.224.43
```
