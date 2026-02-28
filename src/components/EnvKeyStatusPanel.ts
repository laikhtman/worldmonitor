import { isDesktopRuntime, getRemoteApiBaseUrl } from '@/services/runtime';
import { escapeHtml } from '@/utils/sanitize';

/**
 * EnvKeyStatusPanel — displays server-side API key status on the settings page.
 *
 * Shows for each key:
 *  • Whether it's configured in ENV (green dot / red dot)
 *  • Which module it powers
 *  • A "Test" button that pings the upstream API
 *  • Last tested time + latency
 */

interface EnvKeyInfo {
  key: string;
  label: string;
  group: string;
  module: string;
  set: boolean;
}

interface TestResult {
  ok: boolean;
  detail: string;
  ms?: number;
  testedAt?: string;
}

// Keys that don't have an upstream test (password, non-API settings)
const UNTESTABLE_KEYS = new Set(['SETTINGS_PASSWORD']);

// Keys where test is shared with a companion key — hide duplicate test button
const COMPANION_KEYS = new Set(['UPSTASH_REDIS_REST_TOKEN', 'OPENSKY_CLIENT_SECRET']);

export class EnvKeyStatusPanel {
  private el: HTMLElement;
  private keys: EnvKeyInfo[] = [];
  private testResults = new Map<string, TestResult>();
  private loading = new Set<string>();
  private apiBase: string;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'env-key-status-panel';
    this.apiBase = isDesktopRuntime() ? getRemoteApiBaseUrl() : '';
    void this.load();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  private async load(): Promise<void> {
    this.el.innerHTML = `<div class="env-key-loading">
      <svg width="18" height="18" viewBox="0 0 24 24" style="animation:spin 1s linear infinite">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31 31"/>
      </svg> Loading API key status…
    </div>`;

    try {
      const res = await fetch(`${this.apiBase}/api/env-status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { keys: EnvKeyInfo[] };
      this.keys = data.keys;

      // Load any cached test results from sessionStorage
      try {
        const cached = sessionStorage.getItem('wm-env-test-results');
        if (cached) {
          const parsed = JSON.parse(cached) as Record<string, TestResult>;
          for (const [k, v] of Object.entries(parsed)) {
            this.testResults.set(k, v);
          }
        }
      } catch { /* ignore */ }

      this.render();
    } catch (err) {
      this.el.innerHTML = `<div class="env-key-error">Failed to load API key status: ${escapeHtml(String(err))}</div>`;
    }
  }

  private render(): void {
    // Group keys by group
    const groups = new Map<string, EnvKeyInfo[]>();
    for (const k of this.keys) {
      const list = groups.get(k.group) || [];
      list.push(k);
      groups.set(k.group, list);
    }

    let html = '<div class="env-key-groups">';

    for (const [group, items] of groups) {
      html += `<div class="env-key-group">
        <h3 class="env-key-group-title">${escapeHtml(group)}</h3>
        <div class="env-key-cards">`;

      for (const item of items) {
        const result = this.testResults.get(item.key);
        const isLoading = this.loading.has(item.key);
        const canTest = item.set && !UNTESTABLE_KEYS.has(item.key) && !COMPANION_KEYS.has(item.key);

        // Status indicator
        let statusDot: string;
        let statusLabel: string;
        if (!item.set) {
          statusDot = 'env-dot-missing';
          statusLabel = 'Not configured';
        } else if (result) {
          statusDot = result.ok ? 'env-dot-active' : 'env-dot-failed';
          statusLabel = result.ok ? 'Active' : 'Failed';
        } else {
          statusDot = 'env-dot-set';
          statusLabel = 'Configured';
        }

        // Last tested info
        let testedInfo = '';
        if (result?.testedAt) {
          const ago = this.timeAgo(result.testedAt);
          testedInfo = `<span class="env-key-tested">Tested ${ago}${result.ms != null ? ` · ${result.ms}ms` : ''}</span>`;
        }

        // Test result detail
        let detailHtml = '';
        if (result) {
          const cls = result.ok ? 'env-detail-ok' : 'env-detail-fail';
          detailHtml = `<span class="env-key-detail ${cls}">${escapeHtml(result.detail)}</span>`;
        }

        html += `
          <div class="env-key-card ${item.set ? '' : 'env-key-card-missing'}">
            <div class="env-key-card-header">
              <span class="env-dot ${statusDot}" title="${statusLabel}"></span>
              <span class="env-key-label">${escapeHtml(item.label)}</span>
              <span class="env-key-status-text">${statusLabel}</span>
            </div>
            <div class="env-key-card-body">
              <span class="env-key-module">${escapeHtml(item.module)}</span>
              ${detailHtml}
              ${testedInfo}
            </div>
            <div class="env-key-card-actions">
              ${canTest ? `<button class="env-key-test-btn" data-key="${item.key}" ${isLoading ? 'disabled' : ''}>
                ${isLoading ? '<span class="env-key-spinner"></span> Testing…' : '⚡ Test'}
              </button>` : ''}
            </div>
          </div>`;
      }

      html += '</div></div>';
    }

    html += '</div>';
    html += '<div class="env-key-actions-bar"><button class="env-key-test-all-btn">⚡ Test All Configured Keys</button></div>';

    this.el.innerHTML = html;

    // Bind test buttons
    this.el.querySelectorAll<HTMLButtonElement>('.env-key-test-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key) void this.testKey(key);
      });
    });

    // Bind test-all button
    this.el.querySelector('.env-key-test-all-btn')?.addEventListener('click', () => {
      void this.testAllKeys();
    });
  }

  private async testKey(key: string): Promise<void> {
    this.loading.add(key);
    this.render();

    try {
      const res = await fetch(`${this.apiBase}/api/env-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json() as TestResult;
      this.testResults.set(key, data);

      // Also mark companion keys with same result
      if (key === 'UPSTASH_REDIS_REST_URL') {
        this.testResults.set('UPSTASH_REDIS_REST_TOKEN', data);
      } else if (key === 'OPENSKY_CLIENT_ID') {
        this.testResults.set('OPENSKY_CLIENT_SECRET', data);
      }

      this.persistResults();
    } catch (err) {
      this.testResults.set(key, {
        ok: false,
        detail: `Network error: ${String(err)}`,
        testedAt: new Date().toISOString(),
      });
    }

    this.loading.delete(key);
    this.render();
  }

  private async testAllKeys(): Promise<void> {
    const testable = this.keys.filter(
      (k) => k.set && !UNTESTABLE_KEYS.has(k.key) && !COMPANION_KEYS.has(k.key),
    );

    for (const k of testable) {
      await this.testKey(k.key);
    }
  }

  private persistResults(): void {
    try {
      const obj: Record<string, TestResult> = {};
      for (const [k, v] of this.testResults) {
        obj[k] = v;
      }
      sessionStorage.setItem('wm-env-test-results', JSON.stringify(obj));
    } catch { /* quota exceeded or unavailable */ }
  }

  private timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  }

  destroy(): void {
    this.el.remove();
  }
}
