/**
 * PERF-045: Lazy load locale-specific fonts.
 * Only loads Arabic/Hebrew fonts when those languages are active.
 */

const loadedFonts = new Set<string>();

const LOCALE_FONTS: Record<string, string> = {
  ar: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600&display=swap',
  he: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;600&display=swap',
  fa: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600&display=swap',
};

/**
 * Load font for a specific locale if needed.
 */
export function loadLocaleFont(locale: string): void {
  const fontUrl = LOCALE_FONTS[locale];
  if (!fontUrl || loadedFonts.has(locale)) return;

  loadedFonts.add(locale);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontUrl;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  console.log(`[PERF-045] Loaded font for locale: ${locale}`);
}
