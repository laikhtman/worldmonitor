import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { getCachedJson, setCachedJson } from './_upstash-cache.js';
import { recordCacheTelemetry } from './_cache-telemetry.js';

export const config = { runtime: 'edge' };

const CACHE_TTL_SECONDS = 3 * 60; // 3 minutes — matches cron cadence
const CACHE_KEY_PREFIX = 'news:v1:';
const FETCH_TIMEOUT_MS = 12000;
const MAX_ITEMS_PER_FEED = 10;
const MAX_TOTAL_ITEMS = 300;

// ── Feed definitions (direct upstream URLs, no proxy) ──────────────────────
// These mirror the feeds in src/config/feeds.ts but use direct URLs so the
// server can fetch them without going through the per-user rss-proxy.

const FULL_FEEDS = [
  // Politics & World
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml' },
  { name: 'Guardian World', url: 'https://www.theguardian.com/world/rss' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'CNN World', url: 'http://rss.cnn.com/rss/cnn_world.rss' },
  { name: 'Reuters World', url: 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en-US&gl=US&ceid=US:en' },
  { name: 'Politico', url: 'https://news.google.com/rss/search?q=site:politico.com+when:1d&hl=en-US&gl=US&ceid=US:en' },
  // Defense & Intel
  { name: 'Defense One', url: 'https://www.defenseone.com/rss/all/' },
  { name: 'Breaking Defense', url: 'https://breakingdefense.com/feed/' },
  { name: 'War on the Rocks', url: 'https://warontherocks.com/feed/' },
  { name: 'Bellingcat', url: 'https://www.bellingcat.com/feed/' },
  { name: 'The War Zone', url: 'https://www.thedrive.com/the-war-zone/rss' },
  // Think Tanks
  { name: 'Foreign Policy', url: 'https://foreignpolicy.com/feed/' },
  { name: 'Foreign Affairs', url: 'https://www.foreignaffairs.com/rss.xml' },
  { name: 'Jamestown', url: 'https://jamestown.org/feed/' },
  // Finance
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
  { name: 'Federal Reserve', url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
  { name: 'SEC', url: 'https://www.sec.gov/news/pressreleases.rss' },
  // Tech
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
  // Crisis / Health
  { name: 'CrisisWatch', url: 'https://www.crisisgroup.org/rss' },
  { name: 'IAEA', url: 'https://www.iaea.org/feeds/topnews' },
  { name: 'WHO', url: 'https://www.who.int/rss-feeds/news-english.xml' },
  // Energy
  { name: 'Oil & Gas', url: 'https://news.google.com/rss/search?q=(oil+price+OR+OPEC+OR+"natural+gas"+OR+pipeline+OR+LNG)+when:2d&hl=en-US&gl=US&ceid=US:en' },
  // Krebs Security
  { name: 'Krebs Security', url: 'https://krebsonsecurity.com/feed/' },
];

const TECH_FEEDS = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'ArXiv AI', url: 'https://export.arxiv.org/rss/cs.AI' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/' },
  { name: 'Krebs Security', url: 'https://krebsonsecurity.com/feed/' },
  { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml' },
  { name: 'Y Combinator Blog', url: 'https://www.ycombinator.com/blog/rss/' },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/feed' },
  { name: 'Politico Tech', url: 'https://rss.politico.com/technology.xml' },
];

const FINANCE_FEEDS = [
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
  { name: 'MarketWatch', url: 'https://news.google.com/rss/search?q=site:marketwatch.com+markets+when:1d&hl=en-US&gl=US&ceid=US:en' },
  { name: 'Financial Times', url: 'https://www.ft.com/rss/home' },
  { name: 'Reuters Business', url: 'https://news.google.com/rss/search?q=site:reuters.com+business+markets&hl=en-US&gl=US&ceid=US:en' },
  { name: 'Federal Reserve', url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
  { name: 'SEC', url: 'https://www.sec.gov/news/pressreleases.rss' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { name: 'Krebs Security', url: 'https://krebsonsecurity.com/feed/' },
];

const VARIANT_FEEDS = {
  full: FULL_FEEDS,
  tech: TECH_FEEDS,
  finance: FINANCE_FEEDS,
};

// ── Simple RSS/Atom XML parser (no DOMParser dependency) ───────────────────

function getTagText(xml, tag) {
  // Match <tag>...</tag> with optional attributes, handling CDATA
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function getLinkHref(xml) {
  // Atom-style: <link href="..." rel="alternate" .../>  or <link href="..."/>
  const m = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*(?:rel=["']alternate["'][^>]*)?\/?>/i)
    || xml.match(/<link[^>]*rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? m[1].trim() : '';
}

function parseXmlItems(xmlText, sourceName, lang) {
  // Determine format: RSS uses <item>, Atom uses <entry>
  const itemTag = /<item[\s>]/i.test(xmlText) ? 'item' : 'entry';
  const isAtom = itemTag === 'entry';

  const itemRe = new RegExp(`<${itemTag}[\\s>][\\s\\S]*?<\\/${itemTag}>`, 'gi');
  const rawItems = xmlText.match(itemRe) || [];

  return rawItems.slice(0, MAX_ITEMS_PER_FEED).reduce((acc, raw) => {
    const title = getTagText(raw, 'title');
    let link = '';
    if (isAtom) {
      link = getLinkHref(raw) || getTagText(raw, 'link');
    } else {
      link = getTagText(raw, 'link');
      // RSS <link> can be between CDATA or a plain text node next to <link/>
      if (!link) {
        const m = raw.match(/<link\s*\/?>([^<]+)/i);
        link = m ? m[1].trim() : '';
      }
    }
    const pubDateRaw = isAtom
      ? (getTagText(raw, 'published') || getTagText(raw, 'updated'))
      : getTagText(raw, 'pubDate');

    if (!title || !link) return acc;

    const parsed = pubDateRaw ? new Date(pubDateRaw) : new Date();
    const pubDate = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();

    acc.push({ source: sourceName, title, link, pubDate, lang: lang || 'en' });
    return acc;
  }, []);
}

// ── Fetch helper ───────────────────────────────────────────────────────────

async function fetchFeedWithTimeout(url) {
  let isGoogleNews = false;
  try {
    isGoogleNews = new URL(url).hostname === 'news.google.com';
  } catch {
    // Malformed URL — use default timeout
  }
  const timeout = isGoogleNews ? 20000 : FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IntelHQ/1.0; +https://intelhq.io)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Exported helpers (used in tests) ──────────────────────────────────────
export { parseXmlItems as __testParseXmlItems };

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const requestUrl = new URL(req.url);
  const rawVariant = requestUrl.searchParams.get('variant') || 'full';
  const variant = Object.prototype.hasOwnProperty.call(VARIANT_FEEDS, rawVariant)
    ? rawVariant
    : 'full';
  const cacheKey = `${CACHE_KEY_PREFIX}${variant}`;

  // ── Try Redis cache first ──────────────────────────────────────────────
  let cached = null;
  try {
    cached = await getCachedJson(cacheKey);
  } catch {
    // Cache read failure is non-fatal
  }

  if (cached) {
    void recordCacheTelemetry('news', 'hit');
    return new Response(JSON.stringify(cached), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=60`,
        'X-Cache': 'HIT',
        ...corsHeaders,
      },
    });
  }

  void recordCacheTelemetry('news', 'miss');

  // ── Fetch all feeds in parallel ────────────────────────────────────────
  const feeds = VARIANT_FEEDS[variant];
  const allItems = [];

  await Promise.allSettled(
    feeds.map(async (feed) => {
      try {
        const response = await fetchFeedWithTimeout(feed.url);
        if (!response.ok) return;
        const xmlText = await response.text();
        const items = parseXmlItems(xmlText, feed.name, feed.lang || 'en');
        allItems.push(...items);
      } catch {
        // Individual feed failures are non-fatal
      }
    }),
  );

  // Sort newest-first and cap total
  allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  const trimmed = allItems.slice(0, MAX_TOTAL_ITEMS);

  const result = {
    items: trimmed,
    variant,
    cachedAt: new Date().toISOString(),
  };

  // ── Store in Redis ─────────────────────────────────────────────────────
  try {
    await setCachedJson(cacheKey, result, CACHE_TTL_SECONDS);
  } catch {
    // Cache write failure is non-fatal
  }

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=60`,
      'X-Cache': 'MISS',
      ...corsHeaders,
    },
  });
}
