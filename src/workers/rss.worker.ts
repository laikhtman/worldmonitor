/**
 * PERF-038: Web Worker for RSS/XML parsing.
 * Offloads CPU-intensive XML parsing of 70+ RSS feeds from the main thread.
 */

interface ParseMessage {
  type: 'parse';
  id: string;
  xml: string;
  feedName: string;
}

interface ParseResult {
  type: 'parse-result';
  id: string;
  items: Array<{
    title: string;
    link: string;
    pubDate: string;
    description: string;
    source: string;
  }>;
  error?: string;
}

self.onmessage = (event: MessageEvent<ParseMessage>) => {
  const { type, id, xml, feedName } = event.data;

  if (type !== 'parse') return;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      const result: ParseResult = { type: 'parse-result', id, items: [], error: 'XML parse error' };
      self.postMessage(result);
      return;
    }

    const items: ParseResult['items'] = [];

    // RSS 2.0
    const rssItems = doc.querySelectorAll('item');
    if (rssItems.length > 0) {
      rssItems.forEach(item => {
        items.push({
          title: item.querySelector('title')?.textContent?.trim() || '',
          link: item.querySelector('link')?.textContent?.trim() || '',
          pubDate: item.querySelector('pubDate')?.textContent?.trim() || '',
          description: item.querySelector('description')?.textContent?.trim() || '',
          source: feedName,
        });
      });
    } else {
      // Atom
      const entries = doc.querySelectorAll('entry');
      entries.forEach(entry => {
        const link = entry.querySelector('link')?.getAttribute('href') || '';
        items.push({
          title: entry.querySelector('title')?.textContent?.trim() || '',
          link,
          pubDate: entry.querySelector('updated')?.textContent?.trim() ||
                   entry.querySelector('published')?.textContent?.trim() || '',
          description: entry.querySelector('summary')?.textContent?.trim() ||
                       entry.querySelector('content')?.textContent?.trim() || '',
          source: feedName,
        });
      });
    }

    const result: ParseResult = { type: 'parse-result', id, items };
    self.postMessage(result);
  } catch (err) {
    const result: ParseResult = {
      type: 'parse-result',
      id,
      items: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    self.postMessage(result);
  }
};

self.postMessage({ type: 'ready' });
