import type { APTGroup, CyberThreat, NuclearFacility, GammaIrradiator } from '@/types';
import { escapeHtml } from '@/utils/sanitize';
import { t } from '@/services/i18n';

export function renderAPTPopup(apt: APTGroup): string {
  return `
    <div class="popup-header apt">
      <span class="popup-title">${apt.name}</span>
      <span class="popup-badge high">${t('popups.threat')}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${t('popups.aka')}: ${apt.aka}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.sponsor')}</span>
          <span class="stat-value">${apt.sponsor}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.origin')}</span>
          <span class="stat-value">${apt.lat.toFixed(1)}°, ${apt.lon.toFixed(1)}°</span>
        </div>
      </div>
      <p class="popup-description">${t('popups.apt.description')}</p>
    </div>
  `;
}

export function renderCyberThreatPopup(threat: CyberThreat): string {
  const severityClass = escapeHtml(threat.severity);
  const sourceLabels: Record<string, string> = {
    feodo: 'Feodo Tracker',
    urlhaus: 'URLhaus',
    c2intel: 'C2 Intel Feeds',
    otx: 'AlienVault OTX',
    abuseipdb: 'AbuseIPDB',
  };
  const sourceLabel = sourceLabels[threat.source] || threat.source;
  const typeLabel = threat.type.replace(/_/g, ' ').toUpperCase();
  const tags = (threat.tags || []).slice(0, 6);

  return `
    <div class="popup-header apt ${severityClass}">
      <span class="popup-title">${t('popups.cyberThreat.title')}</span>
      <span class="popup-badge ${severityClass}">${escapeHtml(threat.severity.toUpperCase())}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(typeLabel)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${escapeHtml(threat.indicatorType.toUpperCase())}</span>
          <span class="stat-value">${escapeHtml(threat.indicator)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.country')}</span>
          <span class="stat-value">${escapeHtml(threat.country || t('popups.unknown'))}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.source')}</span>
          <span class="stat-value">${escapeHtml(sourceLabel)}</span>
        </div>
        ${threat.malwareFamily ? `<div class="popup-stat">
          <span class="stat-label">${t('popups.malware')}</span>
          <span class="stat-value">${escapeHtml(threat.malwareFamily)}</span>
        </div>` : ''}
        <div class="popup-stat">
          <span class="stat-label">${t('popups.lastSeen')}</span>
          <span class="stat-value">${escapeHtml(threat.lastSeen ? new Date(threat.lastSeen).toLocaleString() : t('popups.unknown'))}</span>
        </div>
      </div>
      ${tags.length > 0 ? `
      <div class="popup-tags">
        ${tags.map((tag) => `<span class="popup-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>` : ''}
    </div>
  `;
}

export function renderNuclearPopup(facility: NuclearFacility): string {
  const typeLabels: Record<string, string> = {
    'plant': t('popups.nuclear.types.plant'),
    'enrichment': t('popups.nuclear.types.enrichment'),
    'weapons': t('popups.nuclear.types.weapons'),
    'research': t('popups.nuclear.types.research'),
  };
  const statusColors: Record<string, string> = {
    'active': 'elevated',
    'contested': 'high',
    'decommissioned': 'low',
  };

  return `
    <div class="popup-header nuclear">
      <span class="popup-title">${facility.name.toUpperCase()}</span>
      <span class="popup-badge ${statusColors[facility.status] || 'low'}">${facility.status.toUpperCase()}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.type')}</span>
          <span class="stat-value">${typeLabels[facility.type] || facility.type.toUpperCase()}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.status')}</span>
          <span class="stat-value">${facility.status.toUpperCase()}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${facility.lat.toFixed(2)}°, ${facility.lon.toFixed(2)}°</span>
        </div>
      </div>
      <p class="popup-description">${t('popups.nuclear.description')}</p>
    </div>
  `;
}

export function renderIrradiatorPopup(irradiator: GammaIrradiator): string {
  return `
    <div class="popup-header irradiator">
      <span class="popup-title">☢ ${irradiator.city.toUpperCase()}</span>
      <span class="popup-badge elevated">${t('popups.gamma')}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${t('popups.irradiator.subtitle')}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.country')}</span>
          <span class="stat-value">${irradiator.country}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.city')}</span>
          <span class="stat-value">${irradiator.city}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${irradiator.lat.toFixed(2)}°, ${irradiator.lon.toFixed(2)}°</span>
        </div>
      </div>
      <p class="popup-description">${t('popups.irradiator.description')}</p>
    </div>
  `;
}
