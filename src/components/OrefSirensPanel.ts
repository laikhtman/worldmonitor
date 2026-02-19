import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { startOrefPolling, onOrefAlertsUpdate } from '@/services/oref-alerts';
import type { OrefAlert, OrefAlertsResponse } from '@/services/oref-alerts';

export class OrefSirensPanel extends Panel {
    private alerts: OrefAlert[] = [];
    private lastChecked: Date | null = null;
    private configured = false;

    constructor() {
        super({
            id: 'oref-sirens',
            title: '🚨 ' + t('panels.orefSirens'),
            showCount: true,
            trackActivity: true,
            infoTooltip: t('components.orefSirens.infoTooltip'),
        });
        this.showLoading(t('components.orefSirens.checking'));

        onOrefAlertsUpdate((data) => this.handleUpdate(data));
        startOrefPolling();
    }

    private handleUpdate(data: OrefAlertsResponse): void {
        const prevCount = this.alerts.length;
        this.alerts = data.alerts || [];
        this.configured = data.configured;
        this.lastChecked = new Date();
        this.setCount(this.alerts.length);

        if (this.alerts.length > prevCount && this.alerts.length > 0) {
            this.setNewBadge(this.alerts.length - prevCount);
        }

        this.render();
    }

    public update(data: OrefAlertsResponse): void {
        this.handleUpdate(data);
    }

    private render(): void {
        if (!this.configured) {
            this.setContent(`<div class="panel-empty">${t('components.orefSirens.notConfigured')}</div>`);
            return;
        }

        const ago = this.lastChecked ? timeSince(this.lastChecked) : '—';

        if (this.alerts.length === 0) {
            this.setContent(`
        <div class="oref-panel-content">
          <div class="oref-status oref-ok">
            <span class="oref-status-icon">✅</span>
            <span class="oref-status-text">${t('components.orefSirens.noAlerts')}</span>
          </div>
          <div class="oref-footer">
            <span class="oref-source">Pikud HaOref</span>
            <span class="oref-updated">${ago}</span>
          </div>
        </div>
        ${this.getStyles()}
      `);
            return;
        }

        // Active sirens!
        const rows = this.alerts.map(a => {
            const area = escapeHtml(a.data || '');
            const time = escapeHtml(a.time || '');
            return `<tr class="oref-alert-row">
        <td class="oref-area">${area}</td>
        <td class="oref-time">${time}</td>
      </tr>`;
        }).join('');

        this.setContent(`
      <div class="oref-panel-content oref-active">
        <div class="oref-status oref-danger">
          <span class="oref-pulse"></span>
          <span class="oref-status-text">${t('components.orefSirens.activeSirens', { count: String(this.alerts.length) })}</span>
        </div>
        <table class="oref-table">
          <thead>
            <tr>
              <th>${t('components.orefSirens.area')}</th>
              <th>${t('components.orefSirens.time')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="oref-footer">
          <span class="oref-source">Pikud HaOref</span>
          <span class="oref-updated">${ago}</span>
        </div>
      </div>
      ${this.getStyles()}
    `);
    }

    private getStyles(): string {
        return `<style>
      .oref-panel-content { font-size: 12px; }
      .oref-status { display: flex; align-items: center; gap: 8px; padding: 12px 8px; }
      .oref-status-icon { font-size: 18px; }
      .oref-status-text { font-size: 13px; font-weight: 600; }
      .oref-ok .oref-status-text { color: var(--text-secondary); }
      .oref-danger { background: rgba(255, 30, 30, 0.1); border-radius: 6px; border: 1px solid rgba(255, 30, 30, 0.3); }
      .oref-danger .oref-status-text { color: #ff3030; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
      .oref-pulse { width: 10px; height: 10px; border-radius: 50%; background: #ff3030; animation: oref-blink 1s ease-in-out infinite; }
      @keyframes oref-blink { 0%, 100% { opacity: 1; box-shadow: 0 0 4px #ff3030; } 50% { opacity: 0.3; box-shadow: 0 0 12px #ff3030; } }
      .oref-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .oref-table th { text-align: left; color: var(--text-muted); font-weight: 600; font-size: 10px; text-transform: uppercase; padding: 4px 8px; border-bottom: 1px solid var(--border); }
      .oref-table td { padding: 5px 8px; border-bottom: 1px solid var(--border-subtle); }
      .oref-area { color: var(--threat-critical); font-weight: 500; }
      .oref-time { color: var(--text-muted); text-align: right; font-variant-numeric: tabular-nums; }
      .oref-alert-row:hover { background: var(--surface-hover); }
      .oref-footer { display: flex; justify-content: space-between; padding: 8px 8px 0; color: var(--text-faint); font-size: 10px; }
    </style>`;
    }
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function timeSince(date: Date): string {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 10) return t('components.orefSirens.justNow');
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h`;
}
