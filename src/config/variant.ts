export const SITE_VARIANT: string = (() => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('intelhq-variant');
    if (stored === 'tech' || stored === 'full' || stored === 'finance' || stored === 'tv') return stored;
  }
  const envVariant = import.meta.env.VITE_VARIANT;
  if (envVariant) return envVariant;

  // Auto-detect webOS TV runtime when no variant is explicitly set
  if (typeof window !== 'undefined' && (
    /Web0S|webOS/i.test(navigator.userAgent) ||
    'PalmSystem' in window ||
    'webOS' in window ||
    'webOSSystem' in window
  )) {
    return 'tv';
  }

  return 'full';
})();
