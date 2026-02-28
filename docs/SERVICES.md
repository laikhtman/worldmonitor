# Services Documentation — IntelHQ

> Reference for all service modules in `src/services/`.
> Last updated: 2026-02-19

---

## Table of Contents

1. [Overview](#overview)
2. [Intelligence Analysis](#intelligence-analysis)
   - [analysis-core](#analysis-core)
   - [analysis-worker](#analysis-worker)
   - [signal-aggregator](#signal-aggregator)
   - [correlation](#correlation)
   - [focal-point-detector](#focal-point-detector)
   - [hotspot-escalation](#hotspot-escalation)
   - [trending-keywords](#trending-keywords)
   - [threat-classifier](#threat-classifier)
   - [cached-risk-scores](#cached-risk-scores)
   - [cached-theater-posture](#cached-theater-posture)
3. [Data Ingestion](#data-ingestion)
   - [rss / live-news](#rss--live-news)
   - [conflicts](#conflicts)
   - [earthquakes](#earthquakes)
   - [climate](#climate)
   - [ais](#ais)
   - [markets](#markets)
   - [firms-satellite](#firms-satellite)
   - [gdelt-intel](#gdelt-intel)
   - [gdacs](#gdacs)
   - [eonet](#eonet)
   - [ucdp / ucdp-events](#ucdp--ucdp-events)
   - [hapi](#hapi)
   - [worldbank](#worldbank)
   - [unhcr](#unhcr)
   - [protests](#protests)
   - [fred](#fred)
   - [polymarket](#polymarket)
   - [cyber-threats](#cyber-threats)
   - [arxiv](#arxiv)
   - [hackernews](#hackernews)
   - [github-trending](#github-trending)
   - [oil-analytics](#oil-analytics)
   - [usa-spending](#usa-spending)
   - [investments-focus](#investments-focus)
   - [wingbits](#wingbits)
   - [pizzint](#pizzint)
   - [oref-alerts](#oref-alerts)
   - [weather](#weather)
4. [ML / AI](#mlai)
   - [ml-worker](#ml-worker)
   - [ml-capabilities](#ml-capabilities)
   - [summarization](#summarization)
   - [entity-extraction](#entity-extraction)
   - [clustering](#clustering)
   - [parallel-analysis](#parallel-analysis)
5. [Geospatial](#geospatial)
   - [country-geometry](#country-geometry)
   - [geo-convergence](#geo-convergence)
   - [geo-activity](#geo-activity)
   - [geo-hub-index](#geo-hub-index)
   - [velocity](#velocity)
   - [population-exposure](#population-exposure)
6. [Military](#military)
   - [military-flights](#military-flights)
   - [military-surge](#military-surge)
   - [military-vessels](#military-vessels)
   - [military-bases](#military-bases)
   - [flights](#flights)
7. [Infrastructure](#infrastructure)
   - [infrastructure-cascade](#infrastructure-cascade)
   - [cable-activity](#cable-activity)
   - [outages](#outages)
   - [data-freshness](#data-freshness)
   - [desktop-readiness](#desktop-readiness)
8. [Platform](#platform)
   - [runtime](#runtime)
   - [tauri-bridge](#tauri-bridge)
   - [runtime-config](#runtime-config)
   - [i18n](#i18n)
   - [persistent-cache](#persistent-cache)
   - [storage](#storage)
   - [activity-tracker](#activity-tracker)
   - [entity-index](#entity-index)
   - [cross-module-integration](#cross-module-integration)
9. [Content](#content)
   - [story-data](#story-data)
   - [story-renderer](#story-renderer)
   - [story-share](#story-share)
   - [meta-tags](#meta-tags)
   - [related-assets](#related-assets)
   - [tech-activity](#tech-activity)
   - [tech-hub-index](#tech-hub-index)
10. [Conflict Analysis](#conflict-analysis)
    - [conflict-impact](#conflict-impact)
    - [country-instability (CII)](#country-instability-cii)
    - [temporal-baseline](#temporal-baseline)
11. [Key Algorithms](#key-algorithms)
    - [News Clustering](#news-clustering)
    - [Threat Classification](#threat-classification)
    - [Signal Correlation](#signal-correlation)
    - [Hotspot Escalation Scoring](#hotspot-escalation-scoring)
    - [Country Instability Index (CII)](#country-instability-index-cii)
    - [Temporal Baseline Anomaly Detection](#temporal-baseline-anomaly-detection)
    - [Trending Keywords Spike Detection](#trending-keywords-spike-detection)
    - [Infrastructure Cascade (BFS)](#infrastructure-cascade-bfs)
    - [Geo-Convergence](#geo-convergence-1)
    - [Circuit Breaker](#circuit-breaker)

---

## Overview

All application logic — data fetching, analysis, ML, geospatial computation,
platform adapters — lives in `src/services/`. Services are plain TypeScript
modules (no DI framework) and are wired together manually in `src/App.ts`.

### Service count

| Domain | Count |
|---|---|
| Intelligence Analysis | 10 |
| Data Ingestion | 27 |
| ML / AI | 6 |
| Geospatial | 6 |
| Military | 5 |
| Infrastructure | 5 |
| Platform | 9 |
| Content | 7 |
| Conflict Analysis | 3 |
| **Total** | **~77** |

### Common patterns

- **Circuit breakers** — most data-fetching services use `createCircuitBreaker()`
  from `@/utils/circuit-breaker`. After `maxFailures` (default 2) failures the
  breaker enters a 5-minute cooldown and returns cached data.
- **Persistent cache** — RSS and map-overlay data is serialised to
  `localStorage` (or Tauri keychain on desktop) via `persistent-cache.ts`.
- **`runtime-config.ts`** feature flags — services check
  `isFeatureAvailable(featureId)` before calling premium APIs.
- **Barrel export** — `src/services/index.ts` re-exports the public surface of
  each service for use by components and `App.ts`.

---

## Intelligence Analysis

### analysis-core

**File:** `src/services/analysis-core.ts`

Pure-function module shared between the main thread and the Web Worker. All
functions are side-effect-free, making the module safe for both environments.

**Responsibility:** Single source of truth for news clustering and correlation
signal detection algorithms.

**Exported API (selection)**

| Symbol | Type | Description |
|---|---|---|
| `clusterNewsCore(items, getTierFn)` | function | Jaccard-based clustering of raw news items. |
| `analyzeCorrelationsCore(events, predictions, markets, snapshot, …)` | function | Detects cross-source correlation signals. |
| `SIMILARITY_THRESHOLD` | const | Jaccard threshold for merging items into a cluster. |
| `tokenize(text)` | function | Lowercase word tokeniser (≥3 chars, stop-word filtered). |
| `jaccardSimilarity(a, b)` | function | Intersection-over-union on token sets. |
| `generateSignalId()` | function | Deterministic UUID for deduplication. |

**Dependencies:** `@/utils/analysis-constants`, `entity-extraction`,
`entity-index`, `threat-classifier`.

---

### analysis-worker

**File:** `src/services/analysis-worker.ts`

Singleton wrapper that communicates with a Vite Web Worker
(`src/workers/ml.worker?worker`). Offloads CPU-intensive clustering and
correlation analysis from the main thread.

**Exported API**

| Symbol | Description |
|---|---|
| `analysisWorker` | Singleton instance. |
| `analysisWorker.runAnalysis(input)` | Posts a message to the worker; resolves with `AnalysisResult`. |

---

### signal-aggregator

**File:** `src/services/signal-aggregator.ts`

Collects geospatial signals from all live data streams and correlates them
by country and region. Feeds geographic context into the AI Insights panel.

**Signal types:** `internet_outage`, `military_flight`, `military_vessel`,
`protest`, `ais_disruption`, `satellite_fire`, `temporal_anomaly`.

**Exported API**

| Symbol | Description |
|---|---|
| `signalAggregator` | Singleton `SignalAggregator` instance. |
| `signalAggregator.ingestOutages(outages)` | Ingests `InternetOutage[]`. |
| `signalAggregator.ingestFlights(flights)` | Ingests `MilitaryFlight[]`. |
| `signalAggregator.ingestVessels(vessels)` | Ingests `MilitaryVessel[]`. |
| `signalAggregator.ingestProtests(events)` | Ingests `SocialUnrestEvent[]`. |
| `signalAggregator.ingestAisDisruptions(events)` | Ingests `AisDisruptionEvent[]`. |
| `signalAggregator.ingestSatelliteFires(fires)` | Ingests NASA FIRMS thermal anomalies. |
| `signalAggregator.ingestTemporalAnomalies(anomalies)` | Ingests anomaly alerts from `temporal-baseline`. |
| `signalAggregator.getSummary()` | Returns `SignalSummary` with counts, convergence zones, and AI context string. |
| `signalAggregator.getCountryClusters()` | Returns `CountrySignalCluster[]` sorted by convergence score. |
| `signalAggregator.getRegionalConvergence()` | Returns `RegionalConvergence[]` for 6 defined regions. |
| `signalAggregator.generateAIContext()` | Returns plain-text summary for AI prompt injection. |
| `logSignalSummary()` | Debug helper: logs signal table to browser console. |

**Window:** 24-hour rolling window; signals older than 24 h are pruned.

**Convergence score formula:**
```
score = min(100, typeBonus + countBonus + severityBonus)
  typeBonus    = signalTypes.size × 20
  countBonus   = min(30, totalSignals × 5)
  severityBonus = highSeverityCount × 10
```

---

### correlation

**File:** `src/services/correlation.ts`

Main-thread wrapper around `analyzeCorrelationsCore` from `analysis-core.ts`.
Manages per-session state: previous stream snapshot (for delta detection) and
a 30-minute signal history with per-type deduplication TTLs.

**Exported API**

| Symbol | Description |
|---|---|
| `analyzeCorrelations(events, predictions, markets)` | Runs correlation logic; returns new `CorrelationSignal[]`. |
| `getRecentSignals()` | Returns signals from the last 30 minutes. |
| `addToSignalHistory(signals)` | Appends signals to the rolling 100-item history. |

**Deduplication TTLs:**

| Signal type | TTL |
|---|---|
| `silent_divergence` | 6 hours |
| `flow_price_divergence` | 6 hours |
| `explained_market_move` | 6 hours |
| `prediction_leads_news` | 2 hours |
| `keyword_spike` | 30 minutes |
| *(all others)* | 30 minutes |

---

### focal-point-detector

**File:** `src/services/focal-point-detector.ts`

Intelligence synthesis layer that identifies "main characters" (focal points)
appearing across multiple intelligence streams: news clusters, map signals,
and entity mentions.

Example: Iran mentioned in 12 news clusters + 5 military flights + internet
outage = CRITICAL focal point with rich narrative for AI prompts.

**Exported API**

| Symbol | Description |
|---|---|
| `focalPointDetector` | Singleton `FocalPointDetector` instance. |
| `focalPointDetector.detect(clusters, signalSummary)` | Correlates news entities with `SignalSummary`; returns `FocalPointSummary`. |
| `focalPointDetector.getCountryUrgencyMap()` | Returns `Map<string, 'critical'|'elevated'>` used by CII. |
| `focalPointDetector.getCountryUrgency(code)` | Returns urgency level for a single country code. |

---

### hotspot-escalation

**File:** `src/services/hotspot-escalation.ts`

Computes a dynamic escalation score (1–5 scale) for each configured geopolitical
hotspot. Blends a static baseline with four live signal components.

**Exported API**

| Symbol | Description |
|---|---|
| `updateHotspotEscalation(id, newsMatches, hasBreaking, newsVelocity)` | Triggers a full score recalculation for one hotspot. |
| `calculateDynamicScore(id, inputs)` | Low-level calculation; returns `DynamicEscalationScore`. |
| `getHotspotEscalation(id)` | Returns current `DynamicEscalationScore` or `null`. |
| `getAllEscalationScores()` | Returns all scored hotspots. |
| `setCIIGetter(fn)` | Injects CII getter dependency (wired by `App.ts`). |
| `setGeoAlertGetter(fn)` | Injects geo-alert getter dependency. |
| `setMilitaryData(flights, vessels)` | Injects latest military data for proximity checks. |
| `shouldEmitSignal(id, oldScore, newScore)` | Returns signal reason if threshold was crossed. |
| `getEscalationChange24h(id)` | Returns score delta over the last 24 hours. |

**Dependencies:** `@/config/geo` (INTEL_HOTSPOTS), `country-instability`, `geo-convergence`.

---

### trending-keywords

**File:** `src/services/trending-keywords.ts`

Detects keyword spikes in ingested news headlines using a 2-hour rolling
window vs. 7-day baseline. Emits `CorrelationSignal` items of type
`keyword_spike` when spikes are detected.

**Exported API**

| Symbol | Description |
|---|---|
| `ingestHeadlines(headlines)` | Processes `TrendingHeadlineInput[]`; updates internal state and fires spike checks. |
| `drainTrendingSignals()` | Returns and clears the pending `CorrelationSignal[]` queue. |
| `extractEntities(text)` | Regex-based entity extraction (CVE, APT, FIN patterns, world leaders). |
| `extractEntitiesWithML(text)` | ML-enhanced entity extraction (NER via `ml-worker`). |
| `getTrendingConfig()` | Returns current `TrendingConfig` from localStorage. |
| `updateTrendingConfig(update)` | Persists updated config. |
| `suppressTrendingTerm(term)` | Adds term to blocked list. |
| `unsuppressTrendingTerm(term)` | Removes term from blocked list. |
| `getTrackedTermCount()` | Number of terms currently tracked. |

**Thresholds (defaults):**

| Parameter | Default |
|---|---|
| Rolling window | 2 hours |
| Baseline window | 7 days |
| Min spike count | 5 mentions |
| Spike multiplier | 3× baseline |
| Spike cooldown | 30 minutes |
| Max tracked terms | 10,000 |

---

### threat-classifier

**File:** `src/services/threat-classifier.ts`

Classifies news headline text into a threat level and event category.
Uses a two-stage pipeline: fast keyword matching followed by optional LLM
batch classification.

**Exported API**

| Symbol | Description |
|---|---|
| `classifyByKeyword(title, variant?)` | Synchronous keyword classifier; returns `ThreatClassification`. |
| `classifyWithAI(title, variant)` | Async LLM classifier via `/api/classify-batch`; returns `ThreatClassification | null`. |
| `aggregateThreats(items)` | Aggregates multiple threat classifications into one (max level, majority category, weighted confidence). |
| `getThreatColor(level)` | Returns CSS colour string for a threat level. |
| `getThreatLabel(level)` | Returns i18n label for a threat level. |
| `THREAT_PRIORITY` | Record mapping level → numeric priority (info=1 … critical=5). |

**Threat levels:** `critical` · `high` · `medium` · `low` · `info`

**Event categories:** `conflict` · `protest` · `disaster` · `diplomatic` ·
`economic` · `terrorism` · `cyber` · `health` · `environmental` · `military` ·
`crime` · `infrastructure` · `tech` · `general`

---

### cached-risk-scores

**File:** `src/services/cached-risk-scores.ts`

Fetches pre-computed CII risk scores from the `/api/risk-scores` Vercel edge
function, which stores them in Upstash Redis. Used to skip the 15-minute
learning warm-up on first page load.

---

### cached-theater-posture

**File:** `src/services/cached-theater-posture.ts`

Fetches cached theater posture data from `/api/theater-posture`. Provides
a Redis-backed snapshot so military posture is available instantly on load.

**Exported API**

| Symbol | Description |
|---|---|
| `fetchCachedTheaterPosture()` | Returns cached `TheaterPosture[]` from the API. |

---

## Data Ingestion

### rss / live-news

**Files:** `src/services/rss.ts`, `src/services/live-news.ts`

**rss.ts** — Core RSS feed fetcher. Implements:

- Per-feed in-memory cache (10-minute TTL).
- Persistent cache fallback (IndexedDB/localStorage via `persistent-cache`).
- Per-feed circuit breaker (2 failures → 5-minute cooldown).
- Language-scoped caching (`feed:<name>::<lang>`).
- Keyword threat classification on ingest.
- Async AI classification for top items (rate-limited per variant).
- GeoHub inference from headline titles.

| Symbol | Description |
|---|---|
| `fetchFeed(feed)` | Fetches and parses a single `Feed`; returns `NewsItem[]`. |
| `fetchCategoryFeeds(feeds, options)` | Batched parallel fetch of multiple feeds with optional `onBatch` callback. |
| `fetchAllFromNewsApi(variant?)` | Fetches from `/api/news` aggregation endpoint (server-cached). |
| `getFeedFailures()` | Returns failure state map for the current language. |

**AI classification limits by variant:**

| Variant | Items/window | Items/feed | Window |
|---|---|---|---|
| world | 80 | 3 | 60 s |
| tech | 60 | 2 | 60 s |
| finance | 40 | 2 | 60 s |

---

### conflicts

**File:** `src/services/conflicts.ts`

Fetches ACLED conflict event data from `/api/acled` and `/api/acled-conflict`.
Requires `isFeatureAvailable('acledConflicts')`.

**Exported types:** `ConflictEvent`, `ConflictData`

**Dependencies:** `createCircuitBreaker`, `runtime-config`

---

### earthquakes

**File:** `src/services/earthquakes.ts`

Fetches earthquake data from USGS GeoJSON feed via `/api/earthquakes` (or
`API_URLS.earthquakes`). Uses a circuit breaker with persistent-cache fallback.

| Symbol | Description |
|---|---|
| `fetchEarthquakes()` | Returns `Earthquake[]` sorted by magnitude. |

---

### climate

**File:** `src/services/climate.ts`

Fetches climate anomaly data from `/api/climate-anomalies` (Open-Meteo backed).
Returns `ClimateAnomaly[]` with severity levels (`normal`, `elevated`, `extreme`).

---

### ais

**File:** `src/services/ais.ts`

Manages Automatic Identification System (AIS) vessel tracking via:

1. Railway WebSocket relay (primary, requires `VITE_WS_RELAY_URL`).
2. Vercel `/api/ais-snapshot` endpoint (fallback).
3. Local dev server on port 3004 (localhost only).

Polls the snapshot endpoint every 10 seconds. Supports up to 20,000 tracked
vessels via callback registration.

| Symbol | Description |
|---|---|
| `initAisStream()` | Starts polling. |
| `isAisConfigured()` | Returns `true` when AIS relay is available. |
| `registerAisCallback(id, fn)` | Registers a callback for position updates. |
| `unregisterAisCallback(id)` | Removes a callback. |

---

### markets

**File:** `src/services/markets.ts`

Fetches equity, commodity, and crypto market data from:

- `/api/finnhub` — stock quotes (requires `finnhubMarkets` feature flag).
- Yahoo Finance via `/api/yahoo-finance` — fallback equity quotes.
- `/api/coingecko` — cryptocurrency prices.

| Symbol | Description |
|---|---|
| `fetchMarkets()` | Returns `MarketFetchResult` with `MarketData[]`. |
| `fetchCrypto()` | Returns `CryptoData[]`. |

---

### firms-satellite

**File:** `src/services/firms-satellite.ts`

Fetches NASA FIRMS (Fire Information for Resource Management System) active
fire/thermal anomaly data via `/api/firms-fires`. Requires
`isFeatureAvailable('nasaFirms')`.

Returns `SatelliteFire[]` sorted by brightness temperature.

---

### gdelt-intel

**File:** `src/services/gdelt-intel.ts`

Fetches GDELT event data from `/api/gdelt-doc` and `/api/gdelt-geo`. Used for
news velocity analysis and geographic event density.

---

### gdacs

**File:** `src/services/gdacs.ts`

Fetches Global Disaster Alert and Coordination System (GDACS) alerts from
`/api/gdacs`. Returns natural disaster events (floods, earthquakes, cyclones,
volcanic activity).

---

### eonet

**File:** `src/services/eonet.ts`

Fetches NASA Earth Observatory Natural Event Tracker (EONET) data from
`/api/eonet`. Provides additional natural event coverage (wildfires, volcanoes,
sea ice, dust/haze).

---

### ucdp / ucdp-events

**Files:** `src/services/ucdp.ts`, `src/services/ucdp-events.ts`

`ucdp.ts` — Fetches UCDP conflict classification data (war / minor / none) per
country from `/api/ucdp`. Provides the `UcdpConflictStatus` used by CII.

`ucdp-events.ts` — Fetches georeferenced UCDP conflict events from
`/api/ucdp-events` for map overlay.

---

### hapi

**File:** `src/services/hapi.ts`

Fetches HDX HAPI (Humanitarian API) aggregated conflict summaries per country
from `/api/hapi`. Used as a CII fallback when ACLED events are unavailable.

**Exported type:** `HapiConflictSummary`

---

### worldbank

**File:** `src/services/worldbank.ts`

Fetches World Bank development indicator data from `/api/worldbank`. Used in
Finance and humanitarian analysis panels.

---

### unhcr

**File:** `src/services/unhcr.ts`

Fetches UNHCR displacement data from `/api/unhcr-population`. Returns
`CountryDisplacement[]` (refugees + asylum seekers by country of origin).
Used by CII displacement component.

---

### protests

**File:** `src/services/protests.ts`

Fetches ACLED protest/unrest events from `/api/acled`. Returns
`SocialUnrestEvent[]` with severity, fatality count, and coordinates.

---

### fred

**File:** `src/services/fred.ts`

Fetches US Federal Reserve Economic Data (FRED) indicators from `/api/fred-data`.
Requires `isFeatureAvailable('economicFred')`. Provides macro indicators:
GDP, CPI, unemployment, interest rates, M2, etc.

---

### polymarket

**File:** `src/services/polymarket.ts`

Fetches prediction market data from `/api/polymarket`. Returns `PredictionMarket[]`
with YES/NO prices and volume. Used in correlation analysis to detect
prediction-leads-news signals.

---

### cyber-threats

**File:** `src/services/cyber-threats.ts`

Aggregates threat intelligence indicators from multiple sources via
`/api/cyber-threats`:

- AbuseIPDB (requires `abuseIpdbThreatIntel` feature flag).
- AlienVault OTX (requires `alienvaultOtxThreatIntel`).
- URLhaus abuse.ch (requires `abuseChThreatIntel`).

Returns `CyberThreat[]` with IOC data and severity levels.

---

### arxiv

**File:** `src/services/arxiv.ts`

Fetches recent AI/ML research papers from `/api/arxiv`. Used by the Research
Papers panel in the tech variant.

---

### hackernews

**File:** `src/services/hackernews.ts`

Fetches top stories from Hacker News via `/api/hackernews`. Used by the
Hacker News panel in the tech variant.

---

### github-trending

**File:** `src/services/github-trending.ts`

Fetches trending GitHub repositories from `/api/github-trending`. Returns
`GitHubRepo[]` with stars, language, and description. Tech variant only.

---

### oil-analytics

**File:** `src/services/oil-analytics.ts`

Fetches EIA oil and energy analytics from `/api/eia`. Requires
`isFeatureAvailable('energyEia')`. Returns crude oil prices, production,
and inventory data.

---

### usa-spending

**File:** `src/services/usa-spending.ts`

Fetches US federal defence spending data from `/api/usa-spending`
(USASpending.gov). Returns contract and award data for military spending
analysis.

---

### investments-focus

**File:** `src/services/investments-focus.ts`

Fetches Gulf FDI and strategic investment focus data. Used by the Investments
panel in the finance variant. References `src/config/gulf-fdi.ts`
(64 Saudi/UAE FDI investments).

---

### wingbits

**File:** `src/services/wingbits.ts`

Enriches OpenSky aircraft data with additional details (operator, model,
registration) via the Wingbits API. Requires `isFeatureAvailable('wingbitsEnrichment')`.

| Symbol | Description |
|---|---|
| `getAircraftDetailsBatch(hexes)` | Batch aircraft lookup by ICAO hex code. |
| `analyzeAircraftDetails(details)` | Classifies aircraft as military/civil. |
| `checkWingbitsStatus()` | Returns API availability status. |

---

### pizzint

**File:** `src/services/pizzint.ts`

Fetches Italian intelligence/security briefings from the Pizzint API
(proxy via `/api/pizzint`).

---

### oref-alerts

**File:** `src/services/oref-alerts.ts`

Fetches IDF Home Front Command (Pikud HaOref) real-time rocket alerts from
`/api/oref`. Returns active alerts with city-level location data for Israel.

---

### weather

**File:** `src/services/weather.ts`

Fetches severe weather alerts from `/api/weather` (Open-Meteo or NWS backed).
Returns `WeatherAlert[]` sorted by severity.

---

## ML/AI

### ml-worker

**File:** `src/services/ml-worker.ts`

Singleton manager for the ONNX ML Web Worker (`src/workers/ml.worker?worker`).
Provides a typed async interface for all ML inference operations.

**Exported API**

| Symbol | Description |
|---|---|
| `mlWorker` | Singleton `MLWorkerManager`. |
| `mlWorker.isAvailable` | `true` once the worker is loaded and models are ready. |
| `mlWorker.embedTexts(texts)` | Returns `number[][]` sentence embeddings (T5). |
| `mlWorker.summarizeTexts(texts)` | Returns summarized strings. |
| `mlWorker.classifySentiment(texts)` | Returns `SentimentResult[]`. |
| `mlWorker.extractEntities(texts)` | Returns `NEREntity[][]` per input text. |
| `mlWorker.clusterBySemanticSimilarity(items, threshold)` | Returns semantic groupings for hybrid clustering. |

**Request timeout:** 30 seconds per inference request.

---

### ml-capabilities

**File:** `src/services/ml-capabilities.ts`

Detects device capabilities for ONNX Runtime Web. Checks WebGPU, WebGL,
WASM SIMD, SharedArrayBuffer threads, and estimated available memory.

| Symbol | Description |
|---|---|
| `detectMLCapabilities()` | Returns `MLCapabilities` (cached after first call). |

**Minimum requirements for ML support:** desktop device + (WebGL or WebGPU) + ≥100 MB estimated memory.

**Execution providers (priority):** WebGPU → WebGL → WASM.

---

### summarization

**File:** `src/services/summarization.ts`

Generates AI summaries using a three-stage fallback chain:

1. **Groq** (`/api/groq-summarize`) — fast LLM, Redis-cached cross-user.
2. **OpenRouter** (`/api/openrouter-summarize`) — fallback LLM.
3. **Browser T5** via `ml-worker` — fully offline fallback.

| Symbol | Description |
|---|---|
| `generateSummary(headlines, geoContext?, promptPrefix?)` | Returns `SummarizationResult` with `summary`, `provider`, and `cached` flag. |
| `translateText(text, targetLang)` | Translates text using the same fallback chain. |

---

### entity-extraction

**File:** `src/services/entity-extraction.ts`

Extracts named entities (countries, organisations, persons) from news cluster
titles using the entity index.

| Symbol | Description |
|---|---|
| `extractEntitiesFromTitle(title)` | Returns `ExtractedEntity[]` from index lookup. |
| `extractEntitiesFromCluster(cluster)` | Returns `NewsEntityContext` for a cluster. |
| `extractEntitiesFromClusters(clusters)` | Batch extraction. |
| `findNewsForMarketSymbol(symbol, clusters)` | Finds news related to a market symbol. |

---

### clustering

**File:** `src/services/clustering.ts`

Main-thread wrapper for news clustering. Calls `clusterNewsCore` from
`analysis-core.ts` for Jaccard-only clustering, or `clusterNewsHybrid` for
semantic refinement when ML is available.

| Symbol | Description |
|---|---|
| `clusterNews(items)` | Synchronous Jaccard clustering; returns `ClusteredEvent[]`. |
| `clusterNewsHybrid(items)` | Async hybrid (Jaccard + semantic via `ml-worker`). |

---

### parallel-analysis

**File:** `src/services/parallel-analysis.ts`

Runs clustering, correlation, and other analysis tasks in parallel. Coordinates
between the main thread and `analysis-worker` to minimise UI blocking.

---

## Geospatial

### country-geometry

**File:** `src/services/country-geometry.ts`

Point-in-polygon lookup: given a lat/lon, returns the country code. Uses a
pre-built GeoJSON boundary index. Fast enough for real-time classification of
flight/vessel positions.

| Symbol | Description |
|---|---|
| `getCountryAtCoordinates(lat, lon, candidates?)` | Returns `{ code, name }` or `null`. |

---

### geo-convergence

**File:** `src/services/geo-convergence.ts`

Maintains a 1°×1° cell grid of geopolitical events. Detects convergence when
≥3 different event types occur in the same cell within 24 hours.

| Symbol | Description |
|---|---|
| `ingestGeoEvent(lat, lon, type, timestamp?)` | Adds an event to the cell grid. |
| `ingestProtests(events)` | Bulk ingest `SocialUnrestEvent[]`. |
| `ingestFlights(flights)` | Bulk ingest `MilitaryFlight[]`. |
| `ingestVessels(vessels)` | Bulk ingest `MilitaryVessel[]`. |
| `ingestEarthquakes(quakes)` | Bulk ingest `Earthquake[]`. |
| `detectGeoConvergence(seenAlerts)` | Returns new `GeoConvergenceAlert[]`. |
| `getAlertsNearLocation(lat, lon, radiusKm)` | Returns `{ score, types }` for proximity check. |
| `geoConvergenceToSignal(alert)` | Converts alert to a `CorrelationSignalCore`. |
| `getCellId(lat, lon)` | Returns `"${floor(lat)},${floor(lon)}"` cell key. |

**Threshold:** 3 different event types in one 1°×1° cell within 24 hours.

---

### geo-activity

**File:** `src/services/geo-activity.ts`

Scores geopolitical hub locations by current news activity. Uses `geo-hub-index`
to infer which hubs appear in headlines, then calculates an activity score
(0–100) per hub.

| Symbol | Description |
|---|---|
| `calculateGeoActivity(clusters)` | Returns `GeoHubActivity[]` sorted by score. |

**Score formula:**
```
score = min(100, baseScore + tierBonus + typeBonus)
  baseScore  = newsCount × 10 + breakingBonus(15)
  tierBonus  = critical:20 / major:10 / notable:0
  typeBonus  = conflict:15 / strategic:10 / capital:5 / organization:5
```

---

### geo-hub-index

**File:** `src/services/geo-hub-index.ts`

Pre-built index of ~60 strategic geopolitical locations (capitals, conflict
zones, strategic points, international organisations). Provides fast keyword →
hub lookup.

| Symbol | Description |
|---|---|
| `inferGeoHubsFromTitle(title)` | Returns `GeoHubMatch[]` (hub + matched keyword). |
| `getGeoHubIndex()` | Returns the full index (lazily built). |

---

### velocity

**File:** `src/services/velocity.ts`

Computes `VelocityMetrics` for a set of clustered events: sources per hour,
velocity level (`normal`, `elevated`, `spike`), dominant sentiment, and topic
distribution.

| Symbol | Description |
|---|---|
| `calculateVelocity(events)` | Returns `VelocityMetrics`. |
| `calculateClusterVelocity(cluster)` | Returns velocity for a single cluster. |

**Thresholds:** elevated ≥3 sources/hour, spike ≥6 sources/hour.

---

### population-exposure

**File:** `src/services/population-exposure.ts`

Fetches WorldPop population exposure data from `/api/worldpop-exposure`.

| Symbol | Description |
|---|---|
| `fetchCountryPopulations()` | Returns `CountryPopulation[]`. |
| `fetchExposure(lat, lon, radiusKm)` | Returns exposed population count for a coordinate + radius. |

---

## Military

### military-flights

**File:** `src/services/military-flights.ts`

Fetches and classifies military aircraft from the OpenSky Network via the
Railway WebSocket relay (`/opensky` endpoint). Applies callsign and ICAO hex
patterns from `@/config/military` to filter for military aircraft. Enriches
with Wingbits operator data when available.

| Symbol | Description |
|---|---|
| `fetchMilitaryFlights()` | Returns `{ flights: MilitaryFlight[]; clusters: MilitaryFlightCluster[] }`. |
| `getFlightHistory(icao24)` | Returns position trail `[lon, lat][]` for an aircraft. |

**Cache TTL:** 5 minutes. **Circuit breaker:** 3 failures → 5-minute cooldown.

---

### military-surge

**File:** `src/services/military-surge.ts`

Detects unusual concentrations of military activity (flights + vessels) in
strategic regions. Emits `CorrelationSignal` of type `military_surge` when
thresholds are exceeded.

---

### military-vessels

**File:** `src/services/military-vessels.ts`

Tracks naval vessels by combining:

1. AIS position data (via `ais.ts` callback registration).
2. Known vessel registry (`KNOWN_NAVAL_VESSELS` from `@/config/military`).
3. AIS vessel type patterns (`MILITARY_VESSEL_PATTERNS`).

Maintains 30-point position history per vessel. Clusters vessels by geographic
region into `MilitaryVesselCluster[]`.

| Symbol | Description |
|---|---|
| `initVesselTracking()` | Starts AIS callback and begins tracking. |
| `fetchMilitaryVessels()` | Returns `{ vessels: MilitaryVessel[]; clusters: MilitaryVesselCluster[] }`. |

---

### military-bases

**File:** `src/services/military-bases.ts`

Viewport-driven military base fetching from the server-side `ListMilitaryBases`
RPC. Queries 125K+ bases stored in Redis GEO sorted sets, returning only the
bases visible in the current map viewport. Uses bbox quantization to snap
viewport bounds to a grid (step size varies by zoom: 5° at z<5, 1° at z≤7,
0.5° at z>7) to maximize cache hits and avoid redundant fetches. Deduplicates
concurrent requests via a pending-fetch guard.

The server performs clustering at low zoom levels, returning
`MilitaryBaseCluster[]` alongside individual `MilitaryBaseEnriched[]` entries.

| Symbol | Description |
|---|---|
| `fetchMilitaryBases(swLat, swLon, neLat, neLon, zoom, filters?)` | Returns `{ bases: MilitaryBaseEnriched[]; clusters: MilitaryBaseCluster[]; totalInView; truncated }`. |
| `entryToEnriched(entry)` | Maps a server `MilitaryBaseEntry` to the client `MilitaryBaseEnriched` type. |
| `quantizeBbox(swLat, swLon, neLat, neLon, zoom)` | Snaps bbox to zoom-dependent grid for cache-friendly keys. |

**Cache:** Client-side: in-memory last-result dedup by quantized bbox + zoom.
Server-side: edge cache tier `medium` (300 s CDN TTL). Redis-backed rate
limit: 60 req/min per IP.

---

### flights

**File:** `src/services/flights.ts`

Fetches all (non-military-filtered) commercial and civil flight data from the
OpenSky relay. Used by the general flight overlay layer.

---

## Infrastructure

### infrastructure-cascade

**File:** `src/services/infrastructure-cascade.ts`

Models critical infrastructure dependencies using a directed graph (nodes:
cables, pipelines, ports, chokepoints, countries; edges: serves, lands_at,
trade_route, controls_access, trade_dependency). Runs BFS propagation from a
disrupted node to identify affected downstream entities.

| Symbol | Description |
|---|---|
| `buildDependencyGraph()` | Builds (and caches) the full `DependencyGraph`. |
| `calculateCascade(sourceId, disruptionLevel?)` | BFS from source; returns `CascadeResult` with affected nodes and country impacts. |
| `clearGraphCache()` | Invalidates cached graph. |
| `getGraphStats()` | Returns node/edge counts by type. |
| `getCableById(id)` | Looks up an `UnderseaCable`. |
| `getPipelineById(id)` | Looks up a `Pipeline`. |
| `getPortById(id)` | Looks up a `Port`. |

**Graph composition:**

| Node type | Source config |
|---|---|
| Cable | `@/config/geo` UNDERSEA_CABLES |
| Pipeline | `@/config/pipelines` (88 pipelines) |
| Port | `@/config/ports` (83 ports) |
| Chokepoint | `@/config/geo` STRATEGIC_WATERWAYS |
| Country | Inferred from above |

**BFS depth limit:** 3 hops. **Minimum impact threshold:** 0.05 (5%).

---

### cable-activity

**File:** `src/services/cable-activity.ts`

Fetches NGA Maritime Safety Information warnings from `/api/nga-warnings` and
parses them for cable-related advisories (keywords: CABLE, CABLESHIP, SUBMARINE
CABLE, etc.). Also identifies repair ship name patterns from warning text.

| Symbol | Description |
|---|---|
| `fetchCableActivity()` | Returns `{ advisories: CableAdvisory[]; repairShips: RepairShip[] }`. |

---

### outages

**File:** `src/services/outages.ts`

Fetches Cloudflare Radar internet outage data from `/api/cloudflare-outages`.
Requires `isFeatureAvailable('internetOutages')`. Returns `InternetOutage[]`
with country, severity (`partial`, `major`, `total`), and coordinates.

---

### data-freshness

**File:** `src/services/data-freshness.ts`

Central registry tracking last-update timestamp and item count for every data
source. Prevents misleading "all clear" states when data sources are silent.

| Symbol | Description |
|---|---|
| `dataFreshness` | Singleton `DataFreshnessTracker`. |
| `dataFreshness.recordUpdate(id, itemCount)` | Marks a source as freshly updated. |
| `dataFreshness.recordError(id, message)` | Marks a source as errored. |
| `dataFreshness.getStatus(id)` | Returns `FreshnessStatus` for one source. |
| `dataFreshness.getAllStatuses()` | Returns all source states. |

**Freshness levels:** `fresh` (< 15 min) · `stale` (15 min – 2 h) · `very_stale`
(2 h – 6 h) · `no_data` · `disabled` · `error`.

---

### desktop-readiness

**File:** `src/services/desktop-readiness.ts`

Checks whether all required API keys are configured in the Tauri keychain for
desktop mode. Returns a `ReadinessReport` per feature group.

---

## Platform

### runtime

**File:** `src/services/runtime.ts`

Detects whether the app is running in desktop (Tauri) or web mode. Used by
all services that need to switch between Tauri IPC and browser fetch.

| Symbol | Description |
|---|---|
| `isDesktopRuntime()` | Returns `true` when running inside Tauri. |
| `detectDesktopRuntime(probe)` | Testable detection logic. |
| `getApiBase()` | Returns base URL for API calls (`/` in web mode, local server in desktop). |
| `getRemoteHost(variant)` | Returns the remote production host for a variant. |

---

### tauri-bridge

**File:** `src/services/tauri-bridge.ts`

Thin wrapper around the Tauri `invoke` bridge. Resolves the bridge across
multiple Tauri version APIs (`__TAURI__.core.invoke` vs
`__TAURI_INTERNALS__.invoke`).

| Symbol | Description |
|---|---|
| `hasTauriInvokeBridge()` | Returns `true` when the bridge is available. |
| `invokeTauri<T>(command, payload?)` | Calls a Tauri command; throws if bridge unavailable. |
| `tryInvokeTauri<T>(command, payload?)` | Calls a Tauri command; returns `null` on failure. |

---

### runtime-config

**File:** `src/services/runtime-config.ts`

Manages runtime API key injection and feature flag availability for both web
and desktop modes. In desktop mode, keys are read from the OS keychain via
Tauri. In web mode, keys come from Vercel environment variables.

**18 secret keys:** GROQ_API_KEY, OPENROUTER_API_KEY, FRED_API_KEY,
EIA_API_KEY, CLOUDFLARE_API_TOKEN, ACLED_ACCESS_TOKEN, URLHAUS_AUTH_KEY,
OTX_API_KEY, ABUSEIPDB_API_KEY, WINGBITS_API_KEY, WS_RELAY_URL,
VITE_OPENSKY_RELAY_URL, OPENSKY_CLIENT_ID, OPENSKY_CLIENT_SECRET,
AISSTREAM_API_KEY, FINNHUB_API_KEY, NASA_FIRMS_API_KEY, UC_DP_KEY.

| Symbol | Description |
|---|---|
| `isFeatureAvailable(featureId)` | Returns `true` when the feature's required key is configured. |
| `getRuntimeSecret(key)` | Returns a secret value or `null`. |
| `setRuntimeSecrets(map)` | Bulk-set secrets (desktop: from keychain response). |

---

### i18n

**File:** `src/services/i18n.ts`

Wraps `i18next` with lazy locale loading and RTL support for 15 languages:
`en`, `fr`, `de`, `es`, `it`, `pl`, `pt`, `nl`, `sv`, `ru`, `ar`, `zh`, `ja`,
`tr`, `he`. Arabic and Hebrew trigger RTL document direction.

| Symbol | Description |
|---|---|
| `initI18n()` | Initialises i18next with language detection; returns the i18n instance. |
| `t(key, options?)` | Translation function (re-exported from i18next). |
| `getCurrentLanguage()` | Returns the active language code. |
| `changeLanguage(lang)` | Switches language and applies RTL if needed. |
| `isRTL()` | Returns `true` for Arabic/Hebrew. |

---

### persistent-cache

**File:** `src/services/persistent-cache.ts`

Cross-platform persistent cache abstraction. Desktop: Tauri `read_cache_entry` /
`write_cache_entry` commands (OS keychain-backed). Web: `localStorage`.

| Symbol | Description |
|---|---|
| `getPersistentCache<T>(key)` | Reads a `CacheEnvelope<T>` or `null`. |
| `setPersistentCache<T>(key, data)` | Writes a `CacheEnvelope<T>`. |
| `deletePersistentCache(key)` | Removes an entry. |

**Envelope format:** `{ key, updatedAt, data }`.

---

### storage

**File:** `src/services/storage.ts`

IndexedDB wrapper with two object stores:

- `baselines` — temporal baseline records (key: `type:region`).
- `snapshots` — playback map snapshots (indexed by timestamp).

| Symbol | Description |
|---|---|
| `initDB()` | Opens/upgrades IndexedDB; returns `IDBDatabase`. |
| `saveBaseline(entry)` | Upserts a `BaselineEntry`. |
| `getBaseline(key)` | Returns a `BaselineEntry` or `null`. |
| `saveSnapshot(snapshot)` | Saves a playback snapshot. |
| `getSnapshots(from, to)` | Returns snapshots in a time range. |

---

### activity-tracker

**File:** `src/services/activity-tracker.ts`

Tracks new items per panel to drive "NEW" badges and highlight animations.
Uses `IntersectionObserver` to detect when items become visible and mark
them as seen.

| Symbol | Description |
|---|---|
| `activityTracker` | Singleton `ActivityTracker`. |
| `activityTracker.register(panelId)` | Initialises tracking state for a panel. |
| `activityTracker.trackItem(panelId, id, element?)` | Marks an item as new; starts observation if element provided. |
| `activityTracker.markSeen(panelId, id)` | Marks an item as seen. |
| `activityTracker.getNewCount(panelId)` | Returns unseen item count. |
| `activityTracker.onChange(panelId, fn)` | Registers a callback for count changes. |

**Durations:** NEW tag shown for 2 minutes, highlight glow for 30 seconds.

---

### entity-index

**File:** `src/services/entity-index.ts`

Builds and maintains a multi-index lookup over the 600+ entity registry in
`@/config/entities.ts`. Supports name, alias, and keyword matching.

| Symbol | Description |
|---|---|
| `getEntityIndex()` | Returns the lazily built `EntityIndex`. |
| `findEntitiesInText(text)` | Returns `EntityMatch[]` found in text. |
| `getEntityDisplayName(id)` | Returns display name for entity ID. |
| `findRelatedEntities(id)` | Returns related entity IDs. |

---

### cross-module-integration

**File:** `src/services/cross-module-integration.ts`

Wires together CII, hotspot escalation, and geo-convergence with their
dependency getters. Called once during `App.ts` initialisation to inject
inter-service dependencies (avoiding circular imports).

| Symbol | Description |
|---|---|
| `initCrossModuleIntegration()` | Calls `setCIIGetter`, `setGeoAlertGetter`, etc. |

---

## Content

### story-data

**File:** `src/services/story-data.ts`

Assembles `StoryData` objects for the shareable story feature. Combines
CII scores, top news events, and correlation signals for a given country code.

| Symbol | Description |
|---|---|
| `buildStoryData(countryCode)` | Returns `StoryData` for a country. |

---

### story-renderer

**File:** `src/services/story-renderer.ts`

Renders an Instagram-format story image (1080×1920 px) on an HTML `<canvas>`
element. Uses CII score, threat levels, and correlation signals to generate
shareable visual intelligence briefs.

| Symbol | Description |
|---|---|
| `renderStory(canvas, data)` | Draws the story onto a canvas; returns a data URL. |

---

### story-share

**File:** `src/services/story-share.ts`

Generates deep-link URLs and QR codes for story sharing.

| Symbol | Description |
|---|---|
| `generateStoryDeepLink(countryCode, type?, score?, level?)` | Returns `https://intelhq.io/api/story?…` URL. |
| `parseStoryParams(url)` | Parses country code and story type from a URL. |
| `generateQRCode(data, size?)` | Returns QR code data URL. |

---

### meta-tags

**File:** `src/services/meta-tags.ts`

Updates HTML `<meta>` tags for OG and Twitter Cards when sharing a story.
Generates dynamic OG image URLs pointing to the `/api/og-story` edge function.

| Symbol | Description |
|---|---|
| `updateMetaTagsForStory(meta)` | Sets `og:title`, `og:image`, `twitter:card`, canonical, etc. |
| `resetMetaTags()` | Restores default meta tags. |

---

### related-assets

**File:** `src/services/related-assets.ts`

Given a news cluster title, finds related market symbols, countries, and
entities using the entity index and keyword matching.

| Symbol | Description |
|---|---|
| `findRelatedAssets(cluster)` | Returns `RelatedAssets` (markets, countries, entities). |

---

### tech-activity

**File:** `src/services/tech-activity.ts`

Scores tech hub locations (Silicon Valley, Shenzhen, Bangalore, etc.) by
current news activity. Tech variant equivalent of `geo-activity`.

---

### tech-hub-index

**File:** `src/services/tech-hub-index.ts`

Keyword-indexed registry of ~30 technology hubs and major tech company
headquarters. Used by `tech-activity` for hub-to-news matching.

---

## Conflict Analysis

### conflict-impact

**File:** `src/services/conflict-impact.ts`

Calculates economic and humanitarian impact estimates for active conflict zones.
Combines ACLED event data, displacement figures, and market data to estimate
affected population and GDP impact.

---

### country-instability (CII)

**File:** `src/services/country-instability.ts`

Computes the **Country Instability Index (CII)** for 22 monitored countries
(0–100 scale). See [Key Algorithms → CII](#country-instability-index-cii) for
the full algorithm.

**Ingestion API (called by `App.ts`):**

| Symbol | Description |
|---|---|
| `ingestProtestsForCII(events)` | Ingests `SocialUnrestEvent[]`. |
| `ingestConflictsForCII(events)` | Ingests `ConflictEvent[]`. |
| `ingestUcdpForCII(map)` | Ingests UCDP conflict classifications. |
| `ingestHapiForCII(map)` | Ingests HAPI summaries. |
| `ingestMilitaryForCII(flights, vessels)` | Ingests military positions. |
| `ingestNewsForCII(events)` | Ingests clustered news events. |
| `ingestOutagesForCII(outages)` | Ingests internet outage data. |
| `ingestDisplacementForCII(countries)` | Ingests UNHCR displacement data. |
| `ingestClimateForCII(anomalies)` | Ingests climate stress data. |
| `calculateCII()` | Runs the full calculation; returns `CountryScore[]`. |
| `getTopUnstableCountries(limit?)` | Returns top N unstable countries. |
| `getCountryScore(code)` | Returns score for a single country. |
| `isInLearningMode()` | Returns `true` during 15-minute warm-up. |
| `getLearningProgress()` | Returns warm-up progress. |

---

### temporal-baseline

**File:** `src/services/temporal-baseline.ts`

Detects when current activity levels deviate from historical baselines by
calling the `/api/temporal-baseline` Vercel edge function (Upstash Redis
backed). The server implements Welford's online algorithm for computing
rolling mean/variance.

**Event types tracked:** `military_flights`, `vessels`, `protests`, `news`,
`ais_gaps`, `satellite_fires`.

| Symbol | Description |
|---|---|
| `reportMetrics(updates)` | Fire-and-forget metric update (POST to API). |
| `checkAnomaly(type, region, count)` | Returns `TemporalAnomaly` if z-score ≥ 1.5, else `null`. |
| `updateAndCheck(metrics)` | Reports + checks in parallel; returns `TemporalAnomaly[]`. |

**Severity thresholds:**

| z-score | Severity |
|---|---|
| ≥ 3.0 | critical |
| ≥ 2.0 | high |
| ≥ 1.5 | medium |

---

## Key Algorithms

### News Clustering

**Files:** `src/services/analysis-core.ts`, `src/services/clustering.ts`

Converts a raw array of `NewsItem[]` into deduplicated `ClusteredEvent[]` by
grouping semantically similar articles.

#### Stage 1 — Jaccard Clustering (synchronous)

```
tokenize(title):
  lowercase → split on /[\s\-_.,;:!?()[\]{}"']+/ → filter stop-words, len ≥ 3

jaccard(A, B) = |A ∩ B| / |A ∪ B|

for each new item i:
  find existing cluster c where jaccard(tokens(i), tokens(c.primary)) ≥ SIMILARITY_THRESHOLD
  if found → merge i into c
  else    → start new cluster with i as primary
```

`SIMILARITY_THRESHOLD` defaults to `0.3` (configurable in
`@/utils/analysis-constants.ts`).

Each cluster's primary article is the highest-tier source item.

#### Stage 2 — Semantic Refinement (async, optional)

Activated when `mlWorker.isAvailable` and cluster count ≥
`ML_THRESHOLDS.minClustersForML`.

```
1. Get T5 embeddings for all cluster primary titles.
2. Find semantically similar pairs: cosine_sim ≥ semanticClusterThreshold.
3. Merge similar cluster groups; keep highest-tier primary.
```

#### Merge rules

- Primary = item from the lowest source tier (tier 1 = most authoritative).
- `allItems` = union of all merged items.
- `topSources` = union of all sources, capped at 5.
- Velocity, threat, and geo data are aggregated from constituent items.

---

### Threat Classification

**File:** `src/services/threat-classifier.ts`

Two-stage pipeline for classifying a news headline into a threat level.

#### Stage 1 — Keyword matching (synchronous, < 1 ms)

```
lower = title.toLowerCase()

if any EXCLUSION term present → return { level: 'info', confidence: 0.3 }

for each keyword map (CRITICAL → HIGH → [TECH_HIGH] → MEDIUM → [TECH_MEDIUM] → LOW → [TECH_LOW]):
  if regex match → return { level, category, confidence, source: 'keyword' }

return { level: 'info', category: 'general', confidence: 0.3 }
```

Keyword sets: 20 critical, 16 high, 7 tech-high, 32 medium, 11 tech-medium,
24 low, 11 tech-low. Short single-word keywords use word-boundary anchors to
prevent false positives.

#### Stage 2 — LLM batch classification (async, rate-limited)

Items initially classified as `keyword` are queued for LLM re-classification:

```
batchQueue.push({ title, variant, resolve })
after BATCH_DELAY_MS (500 ms) or when queue ≥ BATCH_SIZE (20):
  POST /api/classify-batch { titles[], variant }
  resolve each item with AI result if confidence > keyword confidence
```

Rate-limiting: pauses for 60 s on HTTP 429, 30 s on HTTP 5xx.

---

### Signal Correlation

**File:** `src/services/analysis-core.ts` (`analyzeCorrelationsCore`)

Detects cross-source correlation patterns by comparing the current data
snapshot against the previous snapshot.

**Signal types detected:**

| Signal | Trigger condition |
|---|---|
| `prediction_leads_news` | Polymarket price shifts before news velocity spikes. |
| `news_leads_markets` | News cluster velocity spike precedes market move. |
| `silent_divergence` | Market move with no correlated news. |
| `flow_price_divergence` | ETF/flow indicator diverges from spot price. |
| `explained_market_move` | Large market move with matching news cluster found. |
| `keyword_spike` | Term frequency crosses spike threshold (see trending-keywords). |
| `geo_convergence` | Multiple event types in one 1°×1° cell (see geo-convergence). |
| `velocity_spike` | Cluster sources-per-hour exceeds `NEWS_VELOCITY_THRESHOLD`. |

Signals are deduplicated by a key string with per-type TTLs (30 min–6 hours).

---

### Hotspot Escalation Scoring

**File:** `src/services/hotspot-escalation.ts`

Computes a 1–5 escalation score for each Intel Hotspot (e.g., Tehran, Kyiv,
Taipei) by blending a static baseline with four dynamic components.

#### Component calculation

```
newsActivity    = min(100, newsMatches×15 + breakingBonus(30) + velocity×5)
ciiContribution = ciiScore ?? 30
geoConvergence  = min(100, alertScore + alertTypes×10)
militaryActivity = min(100, nearbyFlights×10 + nearbyVessels×15)

dynamicRaw = newsActivity×0.35 + ciiContribution×0.25
           + geoConvergence×0.25 + militaryActivity×0.15

dynamicScore  = 1 + (dynamicRaw / 100) × 4   # maps 0-100 → 1-5
combinedScore = staticBaseline×0.3 + dynamicScore×0.7
```

**Trend detection:** linear regression over the last 24 hours of score
history (up to 48 points). Slope > 0.1 → `escalating`, < -0.1 →
`de-escalating`, else `stable`.

**Signal emission:** rate-limited (2-hour cooldown); triggers on integer
threshold crossing, rapid 0.5-point increase, or crossing 4.5 (`critical`).

---

### Country Instability Index (CII)

**File:** `src/services/country-instability.ts`

Scores 22 countries (0–100) using six data streams.

#### Score formula

```
eventScore = unrest×0.25 + conflict×0.30 + security×0.20 + information×0.25

blendedScore = baselineRisk×0.40 + eventScore×0.60
             + hotspotBoost + newsUrgencyBoost + focalBoost
             + displacementBoost + climateBoost

score = max(ucdpFloor, min(100, blendedScore))
```

#### Component formulas

**Unrest** (protest + internet outage):
```
adjustedCount = (multiplier < 0.7) ? log2(protests+1)×multiplier×5 : protests×multiplier
baseScore     = min(50, adjustedCount × 8)
outageBoost   = totalBlackouts×30 + majorOutages×15 + partialOutages×5   (capped at 50)
```

**Conflict** (ACLED / HAPI fallback):
```
eventScore    = min(50, (battles×3 + explosions×4 + civilianTargeting×5) × multiplier)
fatalityScore = min(40, sqrt(fatalities) × 5 × multiplier)
```

**Security** (military presence):
```
score = min(100, flights×3 + vessels×5)
```

**Information** (news velocity):
```
adjustedCount = (multiplier < 0.7) ? log2(count+1)×multiplier×3 : count×multiplier
baseScore     = min(40, adjustedCount × 5)
velocityBoost = avgVelocity > threshold ? (avgVelocity - threshold) × 10 × multiplier : 0
```

**Boost factors:**

| Boost | Value |
|---|---|
| Hotspot activity | up to +10 |
| News urgency | +3 or +5 |
| Focal point urgency | +4 (elevated) or +8 (critical) |
| Displacement ≥ 1M refugees | +8 |
| Displacement ≥ 100K refugees | +4 |
| Extreme climate stress | +15 |
| UCDP war floor | score ≥ 70 |
| UCDP minor conflict floor | score ≥ 50 |

**Event multipliers** per country: `CN: 2.5` (heavily suppressed) through
`US: 0.3` (over-reported open democracy). This is the most important
calibration factor.

**Levels:** low (0–30) · normal (31–50) · elevated (51–65) · high (66–80) ·
critical (81–100).

---

### Temporal Baseline Anomaly Detection

**File:** `src/services/temporal-baseline.ts` + `api/temporal-baseline.js`

The server-side edge function implements **Welford's online algorithm** to
maintain a rolling mean and variance per `(type, region, day-of-week, month)`
tuple in Upstash Redis. Client-side, `temporal-baseline.ts` reports current
counts and queries for anomalies.

#### Server-side algorithm (Welford)

```
on each metric update for (type, region):
  n    += 1
  delta = value - mean
  mean += delta / n
  M2   += delta × (value - mean)   # Welford's M2 accumulator
  variance = M2 / (n - 1)          # Bessel-corrected sample variance
  stddev   = sqrt(variance)

anomaly check:
  z_score = (currentCount - mean) / stddev
  if z_score >= Z_THRESHOLD (1.5):
    return { anomaly: { zScore, multiplier: currentCount / mean } }
```

The key is stored as `baseline:<type>:<region>:<weekday>:<month>` to capture
day-of-week and seasonal patterns.

**Severity mapping:**

| z-score | Client severity |
|---|---|
| ≥ 3.0 | critical |
| ≥ 2.0 | high |
| ≥ 1.5 | medium |

---

### Trending Keywords Spike Detection

**File:** `src/services/trending-keywords.ts`

Maintains a term-frequency map for all ingested headline tokens. Detects
spikes when a term's recent count exceeds its 7-day baseline by a configurable
multiplier.

#### Pipeline

```
1. Tokenise headline title (strip source attribution, tokenize(), extractEntities())
2. For each term candidate:
   record.timestamps.push(now)
   record.headlines.push({ title, source, link, publishedAt, ingestedAt })
3. Every BASELINE_REFRESH_MS (1 hour):
   baseline7d = timestamps in 7d window / 7   (daily average)
4. Spike check (rolling 2h window):
   recentCount = timestamps in last 2h
   isSpike = (baseline > 0)
     ? recentCount > baseline × spikeMultiplier (default 3×)
     : recentCount >= minSpikeCount (default 5)
   if isSpike AND uniqueSources >= 2 AND not on cooldown:
     → run isSignificantTerm check (ML NER or proper-noun heuristic)
     → if significant: emit CorrelationSignal({ type: 'keyword_spike', … })
5. ML enrichment (async):
   extractMLEntitiesForTexts(batch) → add named entities to frequency map
```

**Suppression list:** `SUPPRESSED_TRENDING_TERMS` from `@/utils/analysis-constants`
plus user-configured blocked terms stored in `localStorage`.

---

### Infrastructure Cascade (BFS)

**File:** `src/services/infrastructure-cascade.ts`

Models how a disruption to one infrastructure node propagates to dependent
nodes via a directed dependency graph.

#### Graph structure

```
Nodes: cable | pipeline | port | chokepoint | country
Edges:
  cable    → country   (serves, lands_at)       weight = capacityShare
  pipeline → country   (serves)                 weight = 0.2
  port     → country   (serves)                 weight = portImportance(type, rank)
  port     → country   (trade_route)             weight = strategic relationship
  chokepoint → port    (controls_access)         weight = 0.7
  chokepoint → country (trade_dependency)        weight = dependency-specific
```

#### BFS propagation

```
queue = [{ sourceId, depth: 0, path: [sourceId] }]
while queue not empty:
  { nodeId, depth, path } = queue.shift()
  if depth >= 3: continue   # max 3 hops
  for each outgoing edge:
    impactStrength = edge.strength × disruptionLevel × (1 - edge.redundancy)
    if impactStrength < 0.05: skip
    affected[edge.to] = { impactLevel, pathLength, dependencyChain, redundancyAvailable }
    queue.push({ edge.to, depth+1, [...path, edge.to] })
```

**Impact levels:** critical (>0.8) · high (>0.5) · medium (>0.2) · low (≤0.2).

Port importance scoring:
```
importance = baseWeight(type) + rankBoost
  type weights: oil=0.9, lng=0.85, container=0.7, mixed=0.6, bulk=0.5, naval=0.4
  rankBoost   = max(0, (20 - rank) / 20) × 0.3   (rank 1-10 get a boost)
```

---

### Geo-Convergence

**File:** `src/services/geo-convergence.ts`

Detects when multiple independent data streams report activity in the same
1°×1° geographic cell simultaneously.

#### Algorithm

```
cellId = "${floor(lat)},${floor(lon)}"

on ingest(lat, lon, type):
  cell = cells.get(cellId) or new GeoCell
  cell.events.set(type, { count: count+1, lastSeen: now })

every 24h: prune cells where all event types are older than 24h

detectConvergence():
  for each cell where cell.events.size >= CONVERGENCE_THRESHOLD (3):
    typeScore = types.size × 25
    countBoost = min(25, totalEvents × 2)
    score = min(100, typeScore + countBoost)
    → GeoConvergenceAlert
```

For `hotspot-escalation`, `getAlertsNearLocation(lat, lon, radiusKm)` queries
the cell grid for convergence within a radius using haversine distance.

---

### Circuit Breaker

**File:** `src/utils/circuit-breaker.ts`

Per-service failure tracking with automatic cooldown and cache-serving fallback.

#### State machine

```
CLOSED (normal operation):
  on failure: failures++
  if failures >= maxFailures (default 2):
    cooldownUntil = now + cooldownMs (default 5 min)
    → OPEN

OPEN (cooldown):
  all execute() calls → return cached data or default
  when now >= cooldownUntil: → CLOSED (reset failures=0)
```

#### `execute(fn, defaultValue)` flow

```
if OPEN:
  return cached data if fresh (< cacheTtlMs)
  else return defaultValue
if cached data fresh:
  return cached (avoids redundant fetches)
try fn():
  on success: recordSuccess(data), update cache → return data
  on failure: recordFailure(), → return cached or defaultValue
```

**Cache TTL:** 10 minutes by default (overridable per instance).

**Global registry:** `createCircuitBreaker(options)` registers the instance;
`getCircuitBreakerStatus()` returns the status of all registered breakers.
