const STORAGE_KEY = 'wm-community-dismissed';
const SHOW_DELAY_MS = 15_000;
let scheduled = false;

export function maybeShowCommunityWidget(): void {
  if (scheduled) return;
  if (localStorage.getItem(STORAGE_KEY)) return;

  scheduled = true;
  setTimeout(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const el = build();
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('cw-show'));
    });
  }, SHOW_DELAY_MS);
}

function dismiss(el: HTMLElement): void {
  localStorage.setItem(STORAGE_KEY, '1');
  el.classList.remove('cw-show');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
}

function close(el: HTMLElement): void {
  el.classList.remove('cw-show');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
}

function build(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'cw-pill-wrap';

  wrap.innerHTML = `
    <div class="cw-pill">
      <div class="cw-dot"></div>
      <span class="cw-text">Join the Discussion</span>
      <a class="cw-cta" href="https://github.com/koala73/worldmonitor/discussions" target="_blank" rel="noopener">Open</a>
      <button class="cw-close" aria-label="Close">&times;</button>
    </div>
    <button class="cw-dismiss">Don't show again</button>
  `;

  wrap.querySelector('.cw-close')!.addEventListener('click', () => close(wrap));
  wrap.querySelector('.cw-dismiss')!.addEventListener('click', () => dismiss(wrap));

  return wrap;
}
