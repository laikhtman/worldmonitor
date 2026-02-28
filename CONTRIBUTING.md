# Contributing to IntelHQ

Thank you for your interest in contributing to **IntelHQ** — an open-source geospatial intelligence dashboard built with TypeScript, MapLibre GL JS, deck.gl, and Tauri 2.

This guide covers code style, branching, commit conventions, PR process, and step-by-step instructions for common contribution tasks.

> **License**: MIT — see [LICENSE](LICENSE) for details.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Code Style & Conventions](#code-style--conventions)
3. [Branch Naming Strategy](#branch-naming-strategy)
4. [Commit Message Format](#commit-message-format)
5. [Pull Request Process](#pull-request-process)
6. [How to Add a New Panel](#how-to-add-a-new-panel)
7. [How to Add a New API Endpoint](#how-to-add-a-new-api-endpoint)
8. [How to Add a New Data Source / Service](#how-to-add-a-new-data-source--service)
9. [How to Add a New Map Layer](#how-to-add-a-new-map-layer)
10. [How to Add a New Locale](#how-to-add-a-new-locale)
11. [Coding Patterns](#coding-patterns)
12. [Project Structure Overview](#project-structure-overview)

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/laikhtman/IntelHQ.git
cd IntelHQ

# Install dependencies
npm install

# Start the development server (full variant)
npm run dev

# Run type checking
npm run typecheck

# Run E2E tests
npm run test:e2e
```

### Application Variants

IntelHQ ships in three variants. Every change must be validated against all three:

| Variant   | URL                          | Build Command            |
| --------- | ---------------------------- | ------------------------ |
| **Full**  | `intelhq.io`           | `npm run build:full`     |
| **Tech**  | `tech.intelhq.io`      | `npm run build:tech`     |
| **Finance** | `finance.intelhq.io` | `npm run build:finance`  |

---

## Code Style & Conventions

### TypeScript

- **Strict mode** is enabled (`"strict": true` in `tsconfig.json`). All code must compile without errors.
- **No framework** — the entire UI is vanilla TypeScript with class-based components.
- **No default exports** — always use named exports.

```ts
// ✅ Correct
export class WeatherPanel extends Panel { ... }
export function fetchWeatherData(): Promise<WeatherData> { ... }

// ❌ Incorrect
export default class WeatherPanel extends Panel { ... }
```

### Import Alias

Use the `@/` path alias for all imports from `src/`:

```ts
// ✅ Correct
import { WeatherPanel } from '@/components/WeatherPanel';
import { fetchWeatherData } from '@/services/weather';
import type { WeatherData } from '@/types';

// ❌ Incorrect
import { WeatherPanel } from '../../components/WeatherPanel';
```

### Components

- All UI panels extend the `Panel` base class, which provides drag, resize, and collapse behavior.
- Components live in `src/components/` (50+ components).

```ts
import { Panel } from '@/components/Panel';

export class MyNewPanel extends Panel {
  constructor() {
    super({
      id: 'my-new-panel',
      title: 'My New Panel',
      // ...panel options
    });
  }

  protected override render(): void {
    // Build panel content here
  }
}
```

### Services

- Services are **stateless fetcher functions** — no class instances, no side effects.
- Services live in `src/services/` (70+ services).

```ts
// src/services/my-source.ts
export async function fetchMySourceData(): Promise<MySourceData[]> {
  const response = await fetch('/api/my-source');
  return response.json();
}
```

### Barrel Exports

Register all new modules in their respective barrel export file:

- `src/components/index.ts` — all components
- `src/services/index.ts` — all services
- `src/config/index.ts` — all config modules

### Security

**Always** sanitize user-facing content to prevent XSS:

```ts
import { escapeHtml, sanitizeUrl } from '@/utils/security';

// ✅ Correct
element.innerHTML = `<span>${escapeHtml(userInput)}</span>`;
link.href = sanitizeUrl(userProvidedUrl);

// ❌ Incorrect — XSS vulnerability
element.innerHTML = `<span>${userInput}</span>`;
```

---

## Branch Naming Strategy

All branches must use one of the following prefixes:

| Prefix       | Purpose                         | Example                              |
| ------------ | ------------------------------- | ------------------------------------ |
| `feat/`      | New features                    | `feat/satellite-imagery-layer`       |
| `fix/`       | Bug fixes                       | `fix/map-popup-overflow`             |
| `docs/`      | Documentation only              | `docs/api-endpoint-guide`            |
| `refactor/`  | Code restructuring              | `refactor/panel-lifecycle`           |
| `test/`      | Test additions/modifications    | `test/earthquake-panel-e2e`          |
| `chore/`     | Maintenance, dependency updates | `chore/upgrade-vite-6`              |

The default branch is **`main`**. Always branch from `main` for new work.

```bash
git checkout main
git pull origin main
git checkout -b feat/my-new-feature
```

---

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

### Types

| Type       | Description                                    |
| ---------- | ---------------------------------------------- |
| `feat`     | A new feature                                  |
| `fix`      | A bug fix                                      |
| `docs`     | Documentation changes only                     |
| `style`    | Formatting, whitespace (no logic changes)      |
| `refactor` | Code restructuring (no feature/fix)            |
| `test`     | Adding or updating tests                       |
| `chore`    | Maintenance, deps, build config                |
| `perf`     | Performance improvement                        |

### Scopes

| Scope      | Area                                           |
| ---------- | ---------------------------------------------- |
| `map`      | Map rendering, layers, popups                  |
| `panel`    | Panel components, layout                       |
| `api`      | Vercel Edge Functions (`api/` directory)        |
| `config`   | Configuration, entities, feeds                 |
| `i18n`     | Localization, translations                     |
| `desktop`  | Tauri desktop app                              |
| `pwa`      | Progressive Web App, service worker            |
| `services` | Data fetcher services                          |
| `types`    | TypeScript type definitions                    |

### Examples

```
feat(panel): add satellite imagery panel with timeline slider
fix(map): prevent popup overflow on mobile viewports
docs(api): document rate limiting for ACLED endpoint
refactor(services): extract common polling logic into shared utility
test(panel): add E2E tests for earthquake panel filters
chore(deps): upgrade MapLibre GL JS to 4.x
perf(map): lazy-load deck.gl layers on first interaction
```

---

## Pull Request Process

### Before Submitting

Run through this checklist locally before opening a PR:

- [ ] **TypeScript compiles** without errors:
  ```bash
  npm run typecheck
  ```
- [ ] **All 3 variants build** successfully:
  ```bash
  npm run build:full && npm run build:tech && npm run build:finance
  ```
- [ ] **E2E tests pass**:
  ```bash
  npm run test:e2e
  ```
- [ ] **No new circular dependencies** introduced
- [ ] **Bundle size delta < 5%** compared to `main`

### PR Description Template

When opening a PR, include:

1. **What** — A clear summary of the change
2. **Why** — The motivation or issue being addressed
3. **How** — Key implementation details
4. **Testing** — How the change was tested
5. **Screenshots** — For any UI changes (all 3 variants if applicable)

### Review Process

1. Open a PR against `main`
2. Ensure all CI checks pass
3. Request review from a maintainer
4. Address review feedback with fixup commits
5. Squash-merge once approved

---

## How to Add a New Panel

Panels are the primary UI unit in IntelHQ. Follow these steps to add a new one:

### Step 1: Define the TypeScript Interface

Add your data type to `src/types/index.ts`:

```ts
// src/types/index.ts
export interface SatelliteImagery {
  id: string;
  timestamp: string;
  coordinates: [number, number];
  resolution: number;
  source: string;
  imageUrl: string;
}
```

### Step 2: Create the Component

Create `src/components/SatellitePanel.ts` extending `Panel`:

```ts
// src/components/SatellitePanel.ts
import { Panel } from '@/components/Panel';
import { fetchSatelliteImagery } from '@/services/satellite';
import { escapeHtml } from '@/utils/security';
import type { SatelliteImagery } from '@/types';

export class SatellitePanel extends Panel {
  constructor() {
    super({
      id: 'satellite-panel',
      title: 'Satellite Imagery',
    });
  }

  protected override render(): void {
    // Build and populate panel content
  }
}
```

### Step 3: Register in Barrel Export

Add the export to `src/components/index.ts`:

```ts
export { SatellitePanel } from './SatellitePanel';
```

### Step 4: Add a Service Fetcher

Create `src/services/satellite.ts` with a stateless fetcher:

```ts
// src/services/satellite.ts
import type { SatelliteImagery } from '@/types';

export async function fetchSatelliteImagery(): Promise<SatelliteImagery[]> {
  const res = await fetch('/api/satellite');
  if (!res.ok) throw new Error(`Satellite API error: ${res.status}`);
  return res.json();
}
```

Register in `src/services/index.ts`:

```ts
export { fetchSatelliteImagery } from './satellite';
```

### Step 5: Register in Panel Config

Add the panel to `src/config/panels.ts` with variant visibility:

```ts
{
  id: 'satellite-panel',
  component: 'SatellitePanel',
  variants: ['full', 'tech'],  // not shown in finance variant
}
```

### Step 6: Wire in App.ts

Register the panel in `src/App.ts` so it is initialized at startup.

### Step 7: Add i18n Keys

Add translation keys for the panel title and any UI strings to **all 14 locale files** under `src/locales/`:

```
en.json, fr.json, de.json, es.json, it.json, pt.json,
nl.json, sv.json, pl.json, ru.json, ar.json, zh.json, ja.json, he.json
```

At minimum, add:

```json
{
  "satellite_panel_title": "Satellite Imagery",
  "satellite_panel_no_data": "No satellite imagery available"
}
```

### Step 8: Add an E2E Test

Create `e2e/satellite-panel.spec.ts` using Playwright:

```ts
import { test, expect } from '@playwright/test';

test('satellite panel loads and displays data', async ({ page }) => {
  await page.goto('/');
  // ... test panel rendering, interactions, etc.
});
```

---

## How to Add a New API Endpoint

API endpoints are Vercel Edge Functions located in the `api/` directory.

### Step 1: Create the Edge Function

Create `api/my-endpoint.js`:

```js
// api/my-endpoint.js
import { cors } from './_cors.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS preflight
  const corsResponse = cors(req);
  if (corsResponse) return corsResponse;

  try {
    const upstream = await fetch('https://api.example.com/data', {
      headers: { Authorization: `Bearer ${process.env.EXAMPLE_API_KEY}` },
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'Upstream error' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...cors.headers,
        },
      });
    }

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
        ...cors.headers,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors.headers },
    });
  }
}
```

### Step 2: Add CORS Handling

Import and use the shared `_cors.js` helper (already shown above). This handles `OPTIONS` preflight requests automatically.

### Step 3: Add Caching (Optional)

For endpoints that benefit from Redis caching, use the Upstash cache helper:

```js
import { cachedFetch } from './_upstash-cache.js';

const data = await cachedFetch('cache-key', 300, async () => {
  const res = await fetch('https://api.example.com/data');
  return res.json();
});
```

### Step 4: Set Cache Headers

Always include appropriate cache headers:

| Header                       | Purpose                           | Typical Value |
| ---------------------------- | --------------------------------- | ------------- |
| `s-maxage`                   | CDN cache duration (seconds)      | `300`         |
| `stale-while-revalidate`     | Serve stale while revalidating    | `600`         |

### Step 5: Add Circuit Breaker

For upstream APIs that may be unreliable, implement a circuit breaker pattern to avoid cascading failures. See [Coding Patterns — Circuit Breaker](#circuit-breaker) below.

### Step 6: Document Environment Variables

Add any required environment variables to the project documentation. Include the variable name, description, and where to obtain an API key.

### Step 7: Test Locally

```bash
vercel dev
# Then visit http://localhost:3000/api/my-endpoint
```

---

## How to Add a New Data Source / Service

### Step 1: Create the Service File

Create `src/services/my-source.ts`:

```ts
// src/services/my-source.ts
import type { MySourceData } from '@/types';

export async function fetchMySourceData(): Promise<MySourceData[]> {
  const res = await fetch('/api/my-source');
  if (!res.ok) throw new Error(`MySource API error: ${res.status}`);
  return res.json();
}
```

### Step 2: Export Stateless Fetcher Functions

Services must be pure, stateless fetcher functions. Do not store state or create singletons:

```ts
// ✅ Correct — stateless
export async function fetchData(): Promise<Data[]> { ... }

// ❌ Incorrect — stateful singleton
class DataService {
  private cache: Data[] = [];
  async fetch(): Promise<Data[]> { ... }
}
export const dataService = new DataService();
```

### Step 3: Register in Barrel Export

Add to `src/services/index.ts`:

```ts
export { fetchMySourceData } from './my-source';
```

### Step 4: Wire in App.ts

Register the data source in `src/App.ts` initialization, setting up the fetch call and connecting the data to relevant panels.

### Step 5: Add Refresh Interval / Polling

If the data source requires periodic updates, wire polling in `App.ts` with an appropriate interval. Common intervals:

| Data Type          | Interval    |
| ------------------ | ----------- |
| Real-time feeds    | 30–60s      |
| Market data        | 1–5 min     |
| News / OSINT       | 5–15 min    |
| Static reference   | 1–24 hr     |

---

## How to Add a New Map Layer

### Step 1: Add Data Configuration

Add the data source configuration in the appropriate `src/config/` file (e.g., entities, feeds, or a dedicated config for your layer type).

### Step 2: Create the deck.gl Layer

Add the layer definition in `src/components/DeckGLMap.ts`. Use the appropriate deck.gl layer type:

```ts
import { ScatterplotLayer } from '@deck.gl/layers';

const myLayer = new ScatterplotLayer({
  id: 'my-data-layer',
  data: myDataSource,
  getPosition: (d) => [d.longitude, d.latitude],
  getRadius: 5000,
  getFillColor: [255, 140, 0],
  pickable: true,
});
```

### Step 3: Add Layer Toggle Control

Add a toggle control so users can show/hide the layer from the UI. Ensure the toggle state is persisted if applicable.

### Step 4: Register Variant Visibility

Not all layers apply to all variants. Register which variants display the layer in the variant configuration:

```ts
{
  layerId: 'my-data-layer',
  variants: ['full'],  // only in the full variant
}
```

### Step 5: Add Popup Content

Add popup content rendering in `src/components/MapPopup.ts` for when users click or hover on layer features. Use `escapeHtml()` for all dynamic content.

---

## How to Add a New Locale

IntelHQ supports 14 locales. Currently supported:

`en` · `fr` · `de` · `es` · `it` · `pt` · `nl` · `sv` · `pl` · `ru` · `ar` · `zh` · `ja` · `he`

### Step 1: Create the Locale File

Copy the English locale as a starting template:

```bash
cp src/locales/en.json src/locales/xx.json
```

### Step 2: Translate All Keys

Translate all **1,100+ keys** in the new locale file. Maintain the same JSON structure and key names — only translate the values.

### Step 3: Register in i18n Initialization

Register the new locale in the i18n initialization code so it is recognized by the application.

### Step 4: Enable the Locale

If the application uses an allowlist, add the new locale code to `VITE_ENABLED_LANGUAGES` in the environment configuration.

### Step 5: RTL Support

For right-to-left locales (e.g., Arabic `ar`, Hebrew `he`), ensure RTL CSS overrides are applied. The application should detect RTL locales and apply the `dir="rtl"` attribute and any necessary layout adjustments.

---

## Coding Patterns

### Circuit Breaker

Located in `src/utils/circuit-breaker.ts`, the circuit breaker provides per-feed failure tracking with automatic cooldown:

- **Failure threshold**: After repeated failures, the circuit "opens" and stops calling the upstream source.
- **Cooldown period**: 5 minutes. After cooldown, the circuit enters "half-open" state and allows a single test request.
- **Recovery**: If the test request succeeds, the circuit closes and normal operation resumes.

Use the circuit breaker for any unreliable external data source.

### Caching Strategy

IntelHQ uses a multi-layer caching approach:

```
┌──────────────────────────────────────────────────────┐
│  Redis (Upstash)  →  Server-side cache               │
│  CDN (Vercel)     →  s-maxage / stale-while-revalidate│
│  Service Worker   →  Offline-first PWA cache          │
│  IndexedDB        →  Client-side persistent cache     │
└──────────────────────────────────────────────────────┘
```

| Layer          | Location    | TTL              | Purpose                          |
| -------------- | ----------- | ---------------- | -------------------------------- |
| Redis          | Server      | 1–15 min         | Reduce upstream API calls        |
| CDN            | Edge        | `s-maxage` value | Serve cached responses globally  |
| Service Worker | Client      | Varies           | Offline support, fast loads      |
| IndexedDB      | Client      | Varies           | Persistent structured data       |

### Error Handling

- **Always use `try/catch`** around async operations.
- **Graceful degradation** — never show blank or broken panels. Display a user-friendly message when data is unavailable.
- **Log errors** for debugging but do not expose internal details to users.

```ts
try {
  const data = await fetchMyData();
  this.renderData(data);
} catch (err) {
  console.error('[MyPanel] Failed to fetch data:', err);
  this.renderError('Unable to load data. Will retry shortly.');
}
```

### HTML Escaping & Sanitization

**All** user-facing dynamic content must be escaped to prevent XSS:

```ts
import { escapeHtml, sanitizeUrl } from '@/utils/security';

// Text content
container.innerHTML = `<p>${escapeHtml(item.title)}</p>`;

// URLs
link.href = sanitizeUrl(item.url);
```

Never use `.innerHTML` with raw, unsanitized input.

---

## Project Structure Overview

```
intelhq/
├── api/                    # 60+ Vercel Edge Functions
│   ├── _cors.js            # Shared CORS handler
│   ├── _upstash-cache.js   # Redis caching utility
│   └── ...
├── e2e/                    # Playwright E2E & visual regression tests
├── public/                 # Static assets, offline fallback
├── scripts/                # Build & utility scripts
├── src/
│   ├── App.ts              # Main orchestrator (4,300+ lines)
│   ├── main.ts             # Entry point
│   ├── components/         # 50+ UI components (Panel subclasses)
│   │   └── index.ts        # Barrel export
│   ├── config/             # Variant configs, 600+ entities, 150+ feeds
│   │   └── index.ts        # Barrel export
│   ├── locales/            # 14 locale JSON files (1,100+ keys each)
│   ├── services/           # 70+ stateless fetcher services
│   │   └── index.ts        # Barrel export
│   ├── types/
│   │   └── index.ts        # Central type definitions (1,300+ lines)
│   ├── utils/              # Shared utilities (circuit breaker, security, etc.)
│   └── workers/            # Web Workers
├── src-tauri/              # Tauri 2 (Rust) desktop wrapper
├── tests/                  # Unit & data tests (Node.js test runner)
├── CHANGELOG.md
├── CONTRIBUTING.md         # ← You are here
├── package.json
├── tsconfig.json
├── vite.config.ts
└── playwright.config.ts
```

---

## Questions?

If you're unsure about anything, feel free to [open an issue](https://github.com/laikhtman/IntelHQ/issues) or start a discussion. We're happy to help you get started.
