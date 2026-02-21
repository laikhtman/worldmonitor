# Deployment Guide — Testing on a Server

This guide explains how to deploy the World Monitor app (any variant) to a server so you can test it in a browser or on a TV via its hosted URL.

---

## 1. Deployment Options

| Method | Best For | URL |
|--------|----------|-----|
| **Vercel (production)** | Permanent hosting, edge functions, CDN | `intelhq.io` / `tv.intelhq.io` |
| **Vercel Preview** | Testing a branch/PR before merging | Auto-generated `*.vercel.app` URL |
| **Local dev server** | Quick iteration on your machine | `http://localhost:5173` |
| **Local preview (production build)** | Testing the production bundle locally | `http://localhost:4173` |

---

## 2. Vercel Deployment (Recommended)

The project is configured for Vercel out of the box. All 60+ API edge functions in `api/` deploy automatically.

### 2.1 Prerequisites

- A [Vercel](https://vercel.com/) account (free tier works)
- The GitHub repo connected to Vercel (or your fork)

### 2.2 Connect Your Fork

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub fork (`laikhtman/worldmonitor`)
3. Vercel auto-detects the Vite framework — accept the defaults:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 2.3 Environment Variables

Go to **Project Settings → Environment Variables** and add the keys you need. All variables are optional — the app degrades gracefully when keys are missing.

#### Minimum for a working deployment (no keys needed)

The app works with zero environment variables. News feeds, earthquakes, GDELT, UCDP, and many other data sources are public APIs that require no authentication.

#### Recommended keys for full functionality

| Variable | Purpose | Get it at |
|----------|---------|-----------|
| `GROQ_API_KEY` | AI summarization (primary) | [console.groq.com](https://console.groq.com/) |
| `OPENROUTER_API_KEY` | AI summarization (fallback) | [openrouter.ai](https://openrouter.ai/) |
| `UPSTASH_REDIS_REST_URL` | Cross-user cache | [upstash.com](https://upstash.com/) |
| `UPSTASH_REDIS_REST_TOKEN` | Cross-user cache | (same as above) |
| `FINNHUB_API_KEY` | Stock market data | [finnhub.io](https://finnhub.io/) |
| `ACLED_ACCESS_TOKEN` | Conflict/protest data | [acleddata.com](https://acleddata.com/) |
| `NASA_FIRMS_API_KEY` | Satellite fire detection | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/) |

See `.env.example` for the complete list of all supported variables.

#### TV-specific variable

To deploy the TV variant, set:

```
VITE_VARIANT=tv
```

### 2.4 Variant Deployments

Each variant needs its own Vercel project (or use branch-based overrides):

| Variant | `VITE_VARIANT` | Build Command | Domain |
|---------|---------------|---------------|--------|
| Full | `full` (default) | `npm run build:full` | `intelhq.io` |
| Tech | `tech` | `npm run build:tech` | `tech.intelhq.io` |
| Finance | `finance` | `npm run build:finance` | `finance.intelhq.io` |
| **TV** | **`tv`** | **`npm run build:tv`** | **`tv.intelhq.io`** |

To override the build command per variant, go to **Project Settings → General → Build & Development Settings** and set the **Build Command** to the variant-specific one (e.g., `npm run build:tv`).

### 2.5 Deploy a Branch for Testing

Every push to a connected branch creates a **Preview Deployment** with a unique URL:

```
https://worldmonitor-<hash>-<username>.vercel.app
```

To deploy the `feature/webos` branch:

1. Push the branch to the connected GitHub repo
2. Vercel auto-deploys and provides a preview URL
3. Open the preview URL on any device (including a TV's built-in browser)

To force the TV variant on a preview deployment, either:
- Set `VITE_VARIANT=tv` in Vercel environment variables (scoped to Preview)
- Or append `?variant=tv` to the URL and it will persist via `localStorage`

### 2.6 Custom Domain Setup

1. Go to **Project Settings → Domains**
2. Add your domain (e.g., `tv.intelhq.io`)
3. Configure DNS: add a CNAME record pointing to `cname.vercel-dns.com`
4. Vercel auto-provisions an SSL certificate

---

## 3. Local Development Server

For quick testing without deploying:

```bash
# Full variant (default)
npm run dev

# TV variant
npm run dev:tv

# Tech / Finance
npm run dev:tech
npm run dev:finance
```

The dev server starts at `http://localhost:5173`. API edge functions are proxied automatically via Vite's dev server config.

### 3.1 Expose to LAN (for TV browser testing)

To test on a TV's built-in browser from your local machine:

```bash
npx vite --host 0.0.0.0
```

Or with the TV variant:

```bash
cross-env VITE_VARIANT=tv npx vite --host 0.0.0.0
```

Then open `http://<your-pc-ip>:5173` on the TV's browser. Find your PC's IP with:

```powershell
# Windows
ipconfig | Select-String "IPv4"

# macOS / Linux
hostname -I
```

> **Note**: API edge functions (`/api/*`) won't work from LAN since they require Vercel's runtime. The app will still load but some data panels may show errors. For full functionality, use a Vercel deployment.

---

## 4. Local Production Preview

Test the exact production build locally:

```bash
# Build the TV variant
npm run build:tv

# Preview the built output
npm run preview
```

This serves the `dist/` folder at `http://localhost:4173`. Same LAN limitation as dev server — no edge functions.

---

## 5. Testing the TV Variant Specifically

### 5.1 In Desktop Chrome (simulating TV)

1. Deploy or run locally with `VITE_VARIANT=tv`
2. Open Chrome DevTools → Device toolbar
3. Set resolution to **1920 × 1080**
4. The TV layout, focus system, and overlay will activate

### 5.2 In webOS TV Built-in Browser

1. Deploy to Vercel (so edge functions work)
2. On your LG TV, open the **Web Browser** app
3. Navigate to your Vercel preview URL
4. The app detects the TV user agent and applies TV mode

### 5.3 As a Hosted Web App on TV

If you want the app to run more like a native experience on your TV without packaging as an IPK:

1. Deploy to Vercel with `VITE_VARIANT=tv`
2. Open the URL in the TV browser
3. Some LG TVs allow bookmarking / adding to home screen

### 5.4 As a Packaged IPK (native app)

See the webOS packaging docs in [10-PACKAGING-DEPLOYMENT.md](10-PACKAGING-DEPLOYMENT.md) for IPK deployment to a development TV.

---

## 6. Vercel Project Structure

```
worldmonitor/
├── api/                    ← 60+ Vercel Edge Functions (auto-deployed)
│   ├── rss-proxy.js        ← RSS feed proxy
│   ├── groq-summarize.js   ← AI summarization
│   ├── earthquakes.js      ← USGS earthquake data
│   └── ...
├── dist/                   ← Vite build output (deployed as static)
├── vercel.json             ← Cache headers, rewrites
├── vite.config.ts          ← Build config with variant transforms
└── package.json            ← Build scripts
```

### How it works

- **Static files** (`dist/`) are served from Vercel's CDN with cache headers defined in `vercel.json`
- **Edge functions** (`api/*.js`) run on Vercel's edge network, close to users
- **API caching** uses `s-maxage` headers (CDN cache) + Upstash Redis for cross-region deduplication

---

## 7. Troubleshooting

| Problem | Solution |
|---------|----------|
| API calls fail on local dev | Edge functions only run on Vercel. Use `npm run dev` which proxies `/api` requests via Vite config |
| API calls fail on LAN | Deploy to Vercel instead — edge functions don't work over LAN preview |
| TV variant not activating | Ensure `VITE_VARIANT=tv` is set, or add `?variant=tv` to the URL |
| Blank page after deploy | Check Vercel build logs — likely a TypeScript error. Run `npm run typecheck` locally |
| Old version showing | Hard-reload (`Ctrl+Shift+R`) or clear Vercel CDN cache from the dashboard |
| Missing data panels | Some panels require API keys — check which keys are set in Vercel env vars |
| CORS errors | The app uses Vercel's edge proxy for external APIs — shouldn't happen in normal deployment. Check `api/_cors.js` |

---

## 8. Quick Reference

```bash
# Local development (TV variant)
npm run dev:tv

# Build for production
npm run build:tv

# Preview production build locally
npm run build:tv && npm run preview

# Type-check before deploying
npm run typecheck

# Verify all variants still build
npm run build:full && npm run build:tech && npm run build:finance && npm run build:tv
```
