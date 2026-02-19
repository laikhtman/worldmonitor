import { strict as assert } from 'node:assert';
import test from 'node:test';
import handler, { __testParseXmlItems } from './news.js';

const ORIGINAL_FETCH = globalThis.fetch;

function makeRequest(path = '/api/news', origin = null) {
  const headers = new Headers();
  if (origin) headers.set('origin', origin);
  return new Request(`https://intelhq.io${path}`, { headers });
}

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Breaking: Test headline one</title>
      <link>https://example.com/story-1</link>
      <pubDate>Thu, 19 Feb 2026 10:00:00 +0000</pubDate>
    </item>
    <item>
      <title><![CDATA[Headline two with CDATA]]></title>
      <link>https://example.com/story-2</link>
      <pubDate>Thu, 19 Feb 2026 09:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const SAMPLE_ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom headline one</title>
    <link href="https://example.com/atom-1" rel="alternate"/>
    <published>2026-02-19T08:00:00Z</published>
  </entry>
  <entry>
    <title>Atom headline two</title>
    <link href="https://example.com/atom-2"/>
    <updated>2026-02-19T07:00:00Z</updated>
  </entry>
</feed>`;

test.afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

// ── Unit tests for the XML parser ─────────────────────────────────────────

test('parseXmlItems parses RSS 2.0 correctly', () => {
  const items = __testParseXmlItems(SAMPLE_RSS, 'Test Feed', 'en');
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Breaking: Test headline one');
  assert.equal(items[0].link, 'https://example.com/story-1');
  assert.equal(items[0].source, 'Test Feed');
  assert.equal(items[0].lang, 'en');
  assert.ok(items[0].pubDate.endsWith('Z'));
});

test('parseXmlItems strips CDATA wrappers', () => {
  const items = __testParseXmlItems(SAMPLE_RSS, 'Feed', 'en');
  assert.equal(items[1].title, 'Headline two with CDATA');
});

test('parseXmlItems parses Atom feed correctly', () => {
  const items = __testParseXmlItems(SAMPLE_ATOM, 'Atom Feed', 'en');
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Atom headline one');
  assert.equal(items[0].link, 'https://example.com/atom-1');
  assert.equal(items[1].link, 'https://example.com/atom-2');
});

test('parseXmlItems returns empty array for invalid XML', () => {
  const items = __testParseXmlItems('this is not xml', 'Bad Feed', 'en');
  assert.equal(items.length, 0);
});

test('parseXmlItems skips items with no title or link', () => {
  const xml = `<rss><channel>
    <item><title>No link item</title></item>
    <item><link>https://x.com/no-title</link></item>
    <item><title>Valid</title><link>https://x.com/ok</link><pubDate>Thu, 19 Feb 2026 10:00:00 +0000</pubDate></item>
  </channel></rss>`;
  const items = __testParseXmlItems(xml, 'Src', 'en');
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Valid');
});

// ── Integration tests for the handler ────────────────────────────────────

test('OPTIONS request returns 204 with CORS headers', async () => {
  const req = new Request('https://intelhq.io/api/news', { method: 'OPTIONS' });
  const res = await handler(req);
  assert.equal(res.status, 204);
  assert.ok(res.headers.get('Access-Control-Allow-Origin'));
});

test('GET /api/news returns 200 with items and Cache-Control header', async () => {
  globalThis.fetch = async () =>
    new Response(SAMPLE_RSS, { status: 200, headers: { 'content-type': 'application/rss+xml' } });

  const req = makeRequest('/api/news?variant=full');
  const res = await handler(req);
  assert.equal(res.status, 200);

  const cacheControl = res.headers.get('Cache-Control');
  assert.ok(cacheControl, 'Cache-Control header should be set');
  assert.ok(cacheControl.includes('stale-while-revalidate'), 'Should include stale-while-revalidate');
  assert.ok(cacheControl.includes('max-age='), 'Should include max-age');

  const body = await res.json();
  assert.equal(body.variant, 'full');
  assert.ok(Array.isArray(body.items));
  assert.ok(body.cachedAt);
});

test('GET /api/news defaults to full variant when variant param is absent', async () => {
  globalThis.fetch = async () => new Response(SAMPLE_RSS, { status: 200 });
  const req = makeRequest('/api/news');
  const res = await handler(req);
  const body = await res.json();
  assert.equal(body.variant, 'full');
});

test('GET /api/news falls back to full variant for unknown variant param', async () => {
  globalThis.fetch = async () => new Response(SAMPLE_RSS, { status: 200 });
  const req = makeRequest('/api/news?variant=unknown');
  const res = await handler(req);
  const body = await res.json();
  assert.equal(body.variant, 'full');
});

test('GET /api/news?variant=tech returns 200', async () => {
  globalThis.fetch = async () => new Response(SAMPLE_RSS, { status: 200 });
  const req = makeRequest('/api/news?variant=tech');
  const res = await handler(req);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.variant, 'tech');
});

test('GET /api/news?variant=finance returns 200', async () => {
  globalThis.fetch = async () => new Response(SAMPLE_RSS, { status: 200 });
  const req = makeRequest('/api/news?variant=finance');
  const res = await handler(req);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.variant, 'finance');
});

test('items are sorted newest-first', async () => {
  const xml = `<rss><channel>
    <item><title>Old</title><link>https://x.com/old</link><pubDate>Mon, 10 Feb 2026 00:00:00 +0000</pubDate></item>
    <item><title>New</title><link>https://x.com/new</link><pubDate>Thu, 19 Feb 2026 10:00:00 +0000</pubDate></item>
  </channel></rss>`;
  globalThis.fetch = async () => new Response(xml, { status: 200 });
  const req = makeRequest('/api/news?variant=full');
  const res = await handler(req);
  const body = await res.json();
  if (body.items.length >= 2) {
    assert.ok(
      new Date(body.items[0].pubDate) >= new Date(body.items[1].pubDate),
      'Items should be sorted newest first',
    );
  }
});

test('handler gracefully handles feed fetch failures', async () => {
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount += 1;
    if (callCount % 2 === 0) throw new Error('network failure');
    return new Response(SAMPLE_RSS, { status: 200 });
  };
  const req = makeRequest('/api/news?variant=full');
  const res = await handler(req);
  // Should not throw — partial results are acceptable
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.items));
});

test('non-GET method returns 405', async () => {
  const req = new Request('https://intelhq.io/api/news', { method: 'POST' });
  const res = await handler(req);
  assert.equal(res.status, 405);
});

test('disallowed origin returns 403', async () => {
  const req = makeRequest('/api/news', 'https://evil.example.com');
  const res = await handler(req);
  assert.equal(res.status, 403);
});
