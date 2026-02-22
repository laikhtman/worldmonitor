import './styles/main.css';
import './styles/settings-window.css';
import { RuntimeConfigPanel } from '@/components/RuntimeConfigPanel';
import { WorldMonitorTab } from '@/components/WorldMonitorTab';
import { EnvKeyStatusPanel } from '@/components/EnvKeyStatusPanel';
import { RUNTIME_FEATURES, loadDesktopSecrets } from '@/services/runtime-config';
import { tryInvokeTauri } from '@/services/tauri-bridge';
import { escapeHtml } from '@/utils/sanitize';
import { initI18n, t } from '@/services/i18n';
import { applyStoredTheme } from '@/utils/theme-manager';

let diagnosticsInitialized = false;

function setActionStatus(message: string, tone: 'ok' | 'error' = 'ok'): void {
  const statusEl = document.getElementById('settingsActionStatus');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.classList.remove('ok', 'error');
  statusEl.classList.add(tone);
}

async function invokeDesktopAction(command: string, successLabel: string): Promise<void> {
  const result = await tryInvokeTauri<string>(command);
  if (result) {
    setActionStatus(`${successLabel}: ${result}`, 'ok');
    return;
  }

  setActionStatus(t('modals.settingsWindow.invokeFail', { command }), 'error');
}

function initTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.settings-tab');
  const panels = document.querySelectorAll<HTMLElement>('.settings-tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      if (!target) return;

      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const panelId = tab.getAttribute('aria-controls');
      if (panelId) {
        document.getElementById(panelId)?.classList.add('active');
      }

      if (target === 'debug' && !diagnosticsInitialized) {
        diagnosticsInitialized = true;
        initDiagnostics();
      }
    });
  });
}

function closeSettingsWindow(): void {
  void tryInvokeTauri<void>('close_settings_window').then(() => { }, () => window.close());
}

const LLM_FEATURES: Array<import('@/services/runtime-config').RuntimeFeatureId> = ['aiOllama', 'aiGroq', 'aiOpenRouter'];

function mountPanel(panel: RuntimeConfigPanel, container: HTMLElement): void {
  container.innerHTML = '';
  const el = panel.getElement();
  el.classList.remove('resized', 'span-2', 'span-3', 'span-4');
  el.classList.add('settings-runtime-panel');
  container.appendChild(el);
}

async function initSettingsWindow(): Promise<void> {
  await initI18n();
  applyStoredTheme();

  requestAnimationFrame(() => {
    document.documentElement.classList.remove('no-transition');
  });
  await loadDesktopSecrets();

  const llmMount = document.getElementById('llmApp');
  const apiMount = document.getElementById('apiKeysApp');
  const wmMount = document.getElementById('worldmonitorApp');
  if (!llmMount || !apiMount) return;

  const llmPanel = new RuntimeConfigPanel({ mode: 'full', buffered: true, featureFilter: LLM_FEATURES });
  const apiPanel = new RuntimeConfigPanel({
    mode: 'full',
    buffered: true,
    featureFilter: RUNTIME_FEATURES.filter(f => !LLM_FEATURES.includes(f.id)).map(f => f.id),
  });

  mountPanel(llmPanel, llmMount);
  mountPanel(apiPanel, apiMount);

  // Mount env key status dashboard above the API Keys desktop panel
  const envKeyMount = document.getElementById('envKeyStatusMount');
  let envKeyStatusPanel: EnvKeyStatusPanel | null = null;
  if (envKeyMount) {
    envKeyStatusPanel = new EnvKeyStatusPanel();
    envKeyMount.appendChild(envKeyStatusPanel.getElement());
  }

  const wmTab = new WorldMonitorTab();
  if (wmMount) {
    wmMount.innerHTML = '';
    wmMount.appendChild(wmTab.getElement());
  }

  const panels = [llmPanel, apiPanel];

  window.addEventListener('beforeunload', () => {
    panels.forEach(p => p.destroy());
    wmTab.destroy();
    envKeyStatusPanel?.destroy();
  });

  document.getElementById('okBtn')?.addEventListener('click', () => {
    void (async () => {
      try {
        const hasWmChanges = wmTab.hasPendingChanges();
        const dirtyPanels = panels.filter(p => p.hasPendingChanges());

        if (dirtyPanels.length === 0 && !hasWmChanges) {
          closeSettingsWindow();
          return;
        }

        if (hasWmChanges) await wmTab.save();

        if (dirtyPanels.length > 0) {
          setActionStatus(t('modals.settingsWindow.validating'), 'ok');
          const missingRequired = dirtyPanels.flatMap(p => p.getMissingRequiredSecrets());
          if (missingRequired.length > 0) {
            setActionStatus(`Missing required: ${missingRequired.join(', ')}`, 'error');
            return;
          }
          const allErrors = (await Promise.all(dirtyPanels.map(p => p.verifyPendingSecrets()))).flat();
          await Promise.all(dirtyPanels.map(p => p.commitVerifiedSecrets()));
          if (allErrors.length > 0) {
            setActionStatus(t('modals.settingsWindow.verifyFailed', { errors: allErrors.join(', ') }), 'error');
            return;
          }
        }

        setActionStatus(t('modals.settingsWindow.saved'), 'ok');
        closeSettingsWindow();
      } catch (err) {
        console.error('[settings] save error:', err);
        setActionStatus(t('modals.settingsWindow.failed', { error: String(err) }), 'error');
      }
    })();
  });

  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    closeSettingsWindow();
  });

  document.getElementById('openLogsBtn')?.addEventListener('click', () => {
    void invokeDesktopAction('open_logs_folder', t('modals.settingsWindow.openLogs'));
  });

  document.getElementById('openSidecarLogBtn')?.addEventListener('click', () => {
    void invokeDesktopAction('open_sidecar_log_file', t('modals.settingsWindow.openApiLog'));
  });

  initTabs();
}

const SIDECAR_BASE = 'http://127.0.0.1:46123';

function initDiagnostics(): void {
  const verboseToggle = document.getElementById('verboseApiLog') as HTMLInputElement | null;
  const fetchDebugToggle = document.getElementById('fetchDebugLog') as HTMLInputElement | null;
  const autoRefreshToggle = document.getElementById('autoRefreshLog') as HTMLInputElement | null;
  const refreshBtn = document.getElementById('refreshLogBtn');
  const clearBtn = document.getElementById('clearLogBtn');
  const trafficLogEl = document.getElementById('trafficLog');
  const trafficCount = document.getElementById('trafficCount');

  if (fetchDebugToggle) {
    fetchDebugToggle.checked = localStorage.getItem('wm-debug-log') === '1';
    fetchDebugToggle.addEventListener('change', () => {
      localStorage.setItem('wm-debug-log', fetchDebugToggle.checked ? '1' : '0');
    });
  }

  async function syncVerboseState(): Promise<void> {
    if (!verboseToggle) return;
    try {
      const res = await fetch(`${SIDECAR_BASE}/api/local-debug-toggle`);
      const data = await res.json();
      verboseToggle.checked = data.verboseMode;
    } catch { /* sidecar not running */ }
  }

  verboseToggle?.addEventListener('change', async () => {
    try {
      const res = await fetch(`${SIDECAR_BASE}/api/local-debug-toggle`, { method: 'POST' });
      const data = await res.json();
      if (verboseToggle) verboseToggle.checked = data.verboseMode;
      setActionStatus(data.verboseMode ? t('modals.settingsWindow.verboseOn') : t('modals.settingsWindow.verboseOff'), 'ok');
    } catch {
      setActionStatus(t('modals.settingsWindow.sidecarError'), 'error');
    }
  });

  void syncVerboseState();

  async function refreshTrafficLog(): Promise<void> {
    if (!trafficLogEl) return;
    try {
      const res = await fetch(`${SIDECAR_BASE}/api/local-traffic-log`);
      const data = await res.json();
      const entries: Array<{ timestamp: string; method: string; path: string; status: number; durationMs: number }> = data.entries || [];
      if (trafficCount) trafficCount.textContent = `(${entries.length})`;

      if (entries.length === 0) {
        trafficLogEl.innerHTML = `<p class="diag-empty">${t('modals.settingsWindow.noTraffic')}</p>`;
        return;
      }

      const rows = entries.slice().reverse().map((e) => {
        const ts = e.timestamp.split('T')[1]?.replace('Z', '') || e.timestamp;
        const cls = e.status < 300 ? 'ok' : e.status < 500 ? 'warn' : 'err';
        return `<tr class="diag-${cls}"><td>${escapeHtml(ts)}</td><td>${e.method}</td><td title="${escapeHtml(e.path)}">${escapeHtml(e.path)}</td><td>${e.status}</td><td>${e.durationMs}ms</td></tr>`;
      }).join('');

      trafficLogEl.innerHTML = `<table class="diag-table"><thead><tr><th>${t('modals.settingsWindow.table.time')}</th><th>${t('modals.settingsWindow.table.method')}</th><th>${t('modals.settingsWindow.table.path')}</th><th>${t('modals.settingsWindow.table.status')}</th><th>${t('modals.settingsWindow.table.duration')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch {
      trafficLogEl.innerHTML = `<p class="diag-empty">${t('modals.settingsWindow.sidecarUnreachable')}</p>`;
    }
  }

  refreshBtn?.addEventListener('click', () => void refreshTrafficLog());

  clearBtn?.addEventListener('click', async () => {
    try {
      await fetch(`${SIDECAR_BASE}/api/local-traffic-log`, { method: 'DELETE' });
    } catch { /* ignore */ }
    if (trafficLogEl) trafficLogEl.innerHTML = `<p class="diag-empty">${t('modals.settingsWindow.logCleared')}</p>`;
    if (trafficCount) trafficCount.textContent = '(0)';
  });

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  function startAutoRefresh(): void {
    stopAutoRefresh();
    refreshInterval = setInterval(() => void refreshTrafficLog(), 3000);
  }

  function stopAutoRefresh(): void {
    if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
  }

  autoRefreshToggle?.addEventListener('change', () => {
    if (autoRefreshToggle.checked) startAutoRefresh(); else stopAutoRefresh();
  });

  void refreshTrafficLog();
  startAutoRefresh();
}

// ── Password gate ──────────────────────────────────────────────────
// If SETTINGS_PASSWORD is set server-side, block access until verified.
// Desktop (Tauri) always bypasses — it's a local-only window.

async function checkPasswordGate(): Promise<boolean> {
  // Desktop runtime — always allowed
  const { isDesktopRuntime, getRemoteApiBaseUrl } = await import('@/services/runtime');
  if (isDesktopRuntime()) return true;

  // Already authenticated this session
  if (sessionStorage.getItem('wm-settings-auth') === '1') return true;

  const apiBase = isDesktopRuntime() ? getRemoteApiBaseUrl() : '';

  try {
    const res = await fetch(`${apiBase}/api/settings-auth`);
    const data = await res.json() as { protected: boolean };
    if (!data.protected) return true; // No password configured
  } catch {
    // If we can't reach the API, allow access (dev / offline)
    return true;
  }

  // Show password gate
  const gate = document.getElementById('settingsPasswordGate');
  const shell = document.getElementById('settingsShell');
  if (!gate || !shell) return true;

  shell.style.display = 'none';
  gate.style.display = 'flex';

  return new Promise((resolve) => {
    const form = document.getElementById('settingsPasswordForm') as HTMLFormElement | null;
    const input = document.getElementById('settingsPasswordInput') as HTMLInputElement | null;
    const error = document.getElementById('settingsPasswordError');
    if (!form || !input) { resolve(true); return; }

    input.focus();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = input.value.trim();
      if (!password) return;

      // Disable form while verifying
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Verifying…'; }
      input.disabled = true;

      void (async () => {
        try {
          const res = await fetch(`${apiBase}/api/settings-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
          });
          const data = await res.json() as { ok: boolean; error?: string; locked?: boolean };

          if (data.ok) {
            sessionStorage.setItem('wm-settings-auth', '1');
            gate.style.display = 'none';
            shell.style.display = '';
            resolve(true);
            return;
          }

          if (error) {
            error.textContent = data.locked
              ? '🔒 Too many attempts. Try again in 15 minutes.'
              : data.error || 'Wrong password';
          }
          input.disabled = false;
          input.value = '';
          input.focus();
        } catch {
          if (error) error.textContent = 'Connection error — try again';
          input.disabled = false;
        }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Unlock'; }
      })();
    });
  });
}


// Signal main window that settings is open (suppresses alert popups)
localStorage.setItem('wm-settings-open', '1');
window.addEventListener('beforeunload', () => localStorage.removeItem('wm-settings-open'));

void (async () => {
  const allowed = await checkPasswordGate();
  if (allowed) void initSettingsWindow();
})();
