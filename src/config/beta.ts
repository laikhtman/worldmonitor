export const BETA_MODE = typeof window !== 'undefined'
  && localStorage.getItem('intelhq-beta-mode') === 'true';
