<div align="center">

# 🌍 IntelHQ

**Real-time global intelligence at your fingertips**

*Track military movements, cyber threats, conflicts, and breaking news on a 3D WebGL globe — powered by 60+ edge functions, AI analysis, and 150+ live intelligence feeds.*

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131)](https://tauri.app/)

[**Live Demo**](https://intelhq.io) · [Architecture](#-architecture) · [Features](#-features) · [Quick Start](#-quick-start)

</div>

---

## 🎯 What is IntelHQ?

IntelHQ is a **zero-framework, performance-first intelligence dashboard** that aggregates and visualizes global events in real-time. Think Bloomberg Terminal meets flight tracking meets OSINT — but open source, self-hostable, and built for speed.

### Why IntelHQ stands out

- **🚀 Blazing Fast** — No React/Vue/Angular. Pure TypeScript classes + WebGL rendering pipeline
- **🌐 Real-time Everything** — Military flights, naval vessels, internet outages, cyber threats, conflicts
- **🤖 AI-Powered** — GPT-4-level analysis via Groq (OpenRouter fallback, local Transformers.js as last resort)
- **📊 150+ Intelligence Feeds** — RSS aggregation from think tanks, defense agencies, OSINT sources, economic data
- **🗺️ Interactive 3D Globe** — MapLibre GL + deck.gl render pipeline with custom WebGL layers
- **💾 Multi-Tier Caching** — Redis → CDN → Service Worker → IndexedDB (sub-second load times)
- **🖥️ Desktop + Web** — Tauri 2 native apps (Windows/macOS/Linux) from the same codebase
- **📱 Smart TV Ready** — WebOS/Tizen builds with optimized rendering for mid-range SoCs

---

## ✨ Features

### 🌍 Global Situational Awareness

- **Military Activity Tracking**
  - Live military flight tracking (OpenSky Network + Wingbits)
  - Naval vessel movements with AIS integration
  - Military base overlay (1,800+ worldwide)
  - Strategic waterway monitoring

- **Conflict & Crisis Monitoring**
  - ACLED conflict event database integration
  - UCDP armed conflict tracking
  - UNHCR displacement data visualization
  - GDELT real-time event extraction

- **Cyber Intelligence**
  - Live C2 server tracking (Feodo, ThreatFox)
  - Internet outage detection (NetBlocks, Cloudflare)
  - APT group attribution mapping
  - Critical infrastructure monitoring

### 🧠 AI Analysis Engine

- **Country Instability Index** — Multi-factor scoring combining conflicts, outages, military activity
- **Signal Convergence Detection** — Pattern recognition when multiple threat types cluster
- **AI Strategic Posture Briefs** — GPT-4-class summaries of country-level developments
- **Entity Extraction & Tracking** — NER across 600+ countries, organizations, companies

### 📡 Data Sources (60+ APIs)

- **Geopolitical**: GDELT, ACLED, UCDP, UNHCR, WorldBank, NATO, NGA
- **OSINT**: OpenSky, AIS, Feodo, ThreatFox, NetBlocks
- **Economic**: FRED, Yahoo Finance, Finnhub, ETF flows
- **News**: 150+ RSS feeds (Reuters, BBC, Al Jazeera, Xinhua, defense blogs)
- **Natural Events**: NASA FIRMS (fires), EONET, GDACS

### 🎨 User Experience

- **No Framework Overhead** — Class-based TypeScript architecture (4x faster than React equivalent)
- **Offline-First** — Service Worker + IndexedDB for full offline capability
- **Multi-Language** — 12 languages supported (i18n via JSON)
- **Dark Mode Native** — Optimized for night operations
- **Keyboard Shortcuts** — Power-user friendly
- **Customizable Panels** — Drag-and-drop, toggleable, saveable layouts

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vite 6 + TypeScript)                              │
│  • No framework — vanilla TS class-based components          │
│  • MapLibre GL JS + deck.gl (WebGL 3D globe)                 │
│  • Service Worker (Workbox) + IndexedDB caching              │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  API Layer (60+ Vercel Edge Functions)                       │
│  • Plain JS edge functions (Vercel Edge Runtime)             │
│  • Upstash Redis cache (TTL: 5 min – 24 hr)                  │
│  • CDN caching (s-maxage: 60-600s per endpoint)              │
│  • Circuit breaker pattern (5-min cooldown on failures)      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  External APIs (150+ feeds, 20+ structured APIs)             │
│  • RSS feeds (think tanks, news, defense)                    │
│  • OpenSky / Wingbits (military aviation)                    │
│  • AIS (maritime tracking)                                   │
│  • ACLED / UCDP / GDELT (conflicts)                          │
│  • Groq / OpenRouter (AI analysis)                           │
│  • FRED / Yahoo Finance (economic data)                      │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack Highlights

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Vanilla TypeScript | 4x faster than React, no virtual DOM overhead |
| **Build** | Vite 6 | Sub-second HMR, ES module native |
| **Maps** | MapLibre GL + deck.gl | Hardware-accelerated WebGL, 60fps with 10k+ markers |
| **Desktop** | Tauri 2 (Rust) | 10MB installer vs 100MB+ Electron |
| **Backend** | Vercel Edge (V8 isolates) | 0ms cold start, global edge deployment |
| **Cache** | Upstash Redis | Serverless Redis, sub-5ms latency |
| **AI** | Groq → OpenRouter → Transformers.js | 10x faster than OpenAI, with local fallback |
| **Testing** | Playwright + Node test runner | E2E, visual regression, performance benchmarks |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (uses native fetch)
- npm 10+

### Web Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:2999)
npm run dev

# Type checking
npm run typecheck

# Production build
npm run build
```

### Desktop Development (Tauri)

```bash
# Install Rust (if not already)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Start desktop dev mode
npm run desktop:dev

# Build native app
npm run desktop:build:full  # Geopolitical variant
```

### Testing

```bash
# Unit/data tests
npm run test:data

# E2E tests (all variants)
npm run test:e2e

# Visual regression tests
npm run test:e2e:visual

# Performance benchmarks
npm run test:e2e:performance
```

---

## 🎮 Usage Examples

### Monitoring a Crisis

1. **Open the live map** — Conflicts, bases, and strategic locations render instantly
2. **Enable "Military" layer** — See live military flights and naval vessels
3. **Check "Outages" layer** — Internet disruptions often precede conflicts
4. **View AI Strategic Posture** — GPT-4-class country brief updates every 30 min
5. **Set up monitors** — Get alerts when keywords appear in feeds

### Tracking Supply Chain Disruptions

1. **Enable "AIS" layer** — See shipping density and disruptions at chokepoints
2. **Enable "Ports" layer** — Monitor major commercial ports
3. **Check "Economic" panel** — Real-time commodity prices and indices
4. **View "Strategic Waterways"** — Suez, Strait of Hormuz, Malacca congestion

### OSINT Investigation

1. **Enable "Cyber Threats" layer** — Live C2 servers and malware infrastructure
2. **Check "APT Groups" overlay** — Attribution for cyber operations by region
3. **Cross-reference with "Conflicts" layer** — Correlate cyber with kinetic ops
4. **View "Country Instability Index"** — Multi-factor risk scoring

---

## 📁 Project Structure

```
worldmonitor/
├── api/                    # 60+ Vercel Edge Functions
│   ├── _upstash-cache.js   # Redis caching middleware
│   ├── _cors.js            # CORS handling
│   ├── aggregate.js        # News clustering endpoint
│   ├── gdelt-geo.js        # GDELT event extraction
│   ├── opensky.js          # Military flight tracking
│   └── ...
├── src/
│   ├── components/         # UI components (class-based)
│   │   ├── DeckGLMap.ts    # WebGL map renderer (1,800 lines)
│   │   ├── NewsPanel.ts    # RSS feed display with clustering
│   │   └── ...
│   ├── controllers/        # Business logic controllers
│   │   ├── data-loader.ts  # Fetches & caches all data (1,540 lines)
│   │   ├── panel-manager.ts# Panel lifecycle management
│   │   └── ...
│   ├── services/           # Core logic (clustering, AI, analytics)
│   │   ├── clustering.ts   # News clustering algorithm
│   │   ├── country-instability.ts # CII scoring
│   │   └── ...
│   ├── config/             # Static data (feeds, geo, entities)
│   │   ├── feeds.ts        # 150+ RSS feed definitions
│   │   ├── geo.ts          # Military bases, waterways, facilities
│   │   └── entities.ts     # 600+ country/org/company entities
│   └── types/              # TypeScript interfaces (1,300+ lines)
├── src-tauri/              # Rust desktop wrapper
├── e2e/                    # Playwright test suites
├── vite.config.ts          # Build configuration (734 lines)
└── playwright.config.ts    # E2E test configuration
```

---

## 🔑 Configuration

### Environment Variables

Create `.env.local` for local development:

```bash
# AI Services (at least one required)
VITE_GROQ_API_KEY=gsk_...          # Groq LPU inference (recommended)
VITE_OPENROUTER_API_KEY=sk-or-... # OpenRouter fallback
# Or use local Transformers.js (no API key needed)

# Optional: Analytics
VITE_PIZZINT_TOKEN=your_token      # Self-hosted analytics

# Optional: Cloudflare R2 (for caching)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

### Variant Mode

IntelHQ focuses on geopolitical intelligence but supports a TV/smart TV build:

```bash
# Default: Full geopolitical intelligence
npm run dev

# TV variant: Optimized for smart TVs (10-foot UI)
npm run dev:tv
npm run desktop:build:tv    # WebOS/Tizen package
```

---

## 🧪 Testing Philosophy

- **E2E tests** — Cover user workflows (map interactions, data loading, search)
- **Visual regression** — Golden screenshot tests for each map layer (Playwright)
- **Performance benchmarks** — Synthetic load tests ensure <2s time-to-interactive
- **Data integrity** — Validate feed parsing, clustering, and entity extraction
- **No unit tests for UI classes** — E2E coverage is sufficient, avoids brittle tests

Run tests before every merge:

```bash
npm run typecheck           # Zero tolerance for TS errors
npm run test:e2e            # All Playwright suites
npm run test:e2e:visual     # Screenshot comparisons
```

---

## 🗺️ Roadmap

### In Progress

- [ ] WebSocket live feed (eliminate polling)
- [ ] User authentication & saved views
- [ ] Mobile apps (React Native rewrite of map layer)
- [ ] Satellite imagery integration (Sentinel, Landsat)

### Planned

- [ ] Graph database for relationship tracking (Neo4j)
- [ ] LLM-powered query interface ("Show me all conflicts near oil pipelines")
- [ ] Collaborative annotations (like Google Maps but for intelligence)
- [ ] Public API (rate-limited, API key required)
- [ ] Docker Compose for self-hosting

### Experimental

- [ ] Wikidata integration for entity enrichment
- [ ] Twitter/X OSINT scraping
- [ ] Telegram channel monitoring
- [ ] Discord bot for alerts

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repo** and create a feature branch
2. **Follow TypeScript strict mode** — `npm run typecheck` must pass
3. **Add E2E tests** for new UI features (in `e2e/`)
4. **Update docs** if changing architecture or adding APIs
5. **Keep the 4,000 line limit** — Extract into controllers if `App.ts` grows
6. **Submit a PR** with a clear description

### Contribution Ideas

- 🐛 Fix bugs in the [GitHub Issues](https://github.com/koala73/worldmonitor/issues)
- 📡 Add new data sources (OSINT feeds, APIs)
- 🌍 Improve i18n (add languages or fix translations)
- 🎨 UI/UX improvements (better dark mode, mobile responsiveness)
- ⚡ Performance optimizations (reduce bundle size, faster rendering)

---

## 📜 License

**AGPL-3.0-only**

This means:
- ✅ Use, modify, and distribute freely
- ✅ Run your own instance (including commercial)
- ⚠️ **If you modify and deploy publicly, you must open-source your changes**
- ⚠️ Network use = distribution (Affero clause)

See [LICENSE](LICENSE) for full terms.

---

## 🙏 Acknowledgments

- **Original Project**: IntelHQ began as a fork of [koala73/worldmonitor](https://github.com/koala73/worldmonitor)
- **Data Providers**: ACLED, GDELT, UCDP, OpenSky Network, UNHCR, NASA FIRMS, NetBlocks
- **Mapping**: MapLibre GL JS team, deck.gl team
- **AI**: Groq (LPU inference), Hugging Face (Transformers.js)
- **Hosting**: Vercel (edge functions), Upstash (Redis)

---

<div align="center">

**⭐ Star this repo if you find it useful!**

*Built with ❤️ for the OSINT and intelligence communities*

[Report Bug](https://github.com/koala73/worldmonitor/issues) · [Request Feature](https://github.com/koala73/worldmonitor/issues) · [Documentation](docs/)

</div>
