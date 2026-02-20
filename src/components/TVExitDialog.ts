/**
 * TV Exit Confirmation Dialog
 *
 * Displayed when the user presses BACK at the root navigation level.
 * Provides "Stay" and "Exit" buttons, navigable with D-pad.
 * On webOS, "Exit" calls `window.close()` which terminates the app.
 * In browser, it simply dismisses the dialog.
 */

import { IS_WEBOS } from '@/utils/tv-detection';

const EXIT_DIALOG_HTML = `
<div class="tv-exit-dialog-overlay" aria-modal="true" role="dialog" aria-label="Exit confirmation">
  <div class="tv-exit-dialog">
    <h2 class="tv-exit-title">Exit IntelHQ?</h2>
    <p class="tv-exit-message">Are you sure you want to close the application?</p>
    <div class="tv-exit-actions">
      <button class="tv-exit-btn tv-exit-stay" data-tv-focusable autofocus>Stay</button>
      <button class="tv-exit-btn tv-exit-close" data-tv-focusable>Exit</button>
    </div>
  </div>
</div>
`;

export class TVExitDialog {
  private overlay: HTMLElement | null = null;
  private onDismiss: (() => void) | null = null;
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  /** Show the exit dialog. Returns a promise that resolves when dismissed. */
  show(): Promise<void> {
    // Prevent duplicate
    if (this.overlay) return Promise.resolve();

    return new Promise<void>((resolve) => {
      this.onDismiss = resolve;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = EXIT_DIALOG_HTML.trim();
      this.overlay = wrapper.firstElementChild as HTMLElement;
      document.body.appendChild(this.overlay);

      // Focus "Stay" button by default
      const stayBtn = this.overlay.querySelector<HTMLButtonElement>('.tv-exit-stay');
      const exitBtn = this.overlay.querySelector<HTMLButtonElement>('.tv-exit-close');

      stayBtn?.addEventListener('click', () => this.dismiss());
      exitBtn?.addEventListener('click', () => this.exit());

      // Trap keyboard for D-pad: Left/Right between buttons, Enter to activate, Back to dismiss
      this.boundKeyHandler = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          // Toggle focus between the two buttons
          const active = document.activeElement;
          if (active === stayBtn) {
            exitBtn?.focus();
          } else {
            stayBtn?.focus();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (document.activeElement === exitBtn) {
            this.exit();
          } else {
            this.dismiss();
          }
        } else if (e.key === 'Backspace' || e.keyCode === 461) {
          e.preventDefault();
          e.stopPropagation();
          this.dismiss();
        }
      };
      document.addEventListener('keydown', this.boundKeyHandler, true);

      // Auto-focus stay button
      requestAnimationFrame(() => stayBtn?.focus());
    });
  }

  /** Whether the dialog is currently visible. */
  isOpen(): boolean {
    return this.overlay !== null;
  }

  /** Dismiss the dialog (stay in app). */
  private dismiss(): void {
    this.cleanup();
    this.onDismiss?.();
    this.onDismiss = null;
  }

  /** Exit the application. */
  private exit(): void {
    this.cleanup();
    this.onDismiss?.();
    this.onDismiss = null;

    if (IS_WEBOS) {
      // webOS: close the app
      const webOSSystem = (window as unknown as Record<string, unknown>).webOSSystem as
        | { close?: () => void }
        | undefined;
      if (webOSSystem?.close) {
        webOSSystem.close();
      } else {
        window.close();
      }
    } else {
      console.log('[TV] Exit requested (no-op in browser)');
    }
  }

  /** Remove DOM and event listeners. */
  private cleanup(): void {
    if (this.boundKeyHandler) {
      document.removeEventListener('keydown', this.boundKeyHandler, true);
      this.boundKeyHandler = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  /** Full cleanup (called on app destroy). */
  destroy(): void {
    this.cleanup();
    this.onDismiss = null;
  }
}
