import type { StrategicWaterway, AisDisruptionEvent, Port, Pipeline, InternetOutage } from '@/types';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { t } from '@/services/i18n';
import { getTimeAgo } from './popup-utils';

export function renderWaterwayPopup(waterway: StrategicWaterway): string {
  return `
    <div class="popup-header waterway">
      <span class="popup-title">${waterway.name}</span>
      <span class="popup-badge elevated">${t('popups.strategic')}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      ${waterway.description ? `<p class="popup-description">${waterway.description}</p>` : ''}
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${waterway.lat.toFixed(2)}°, ${waterway.lon.toFixed(2)}°</span>
        </div>
      </div>
    </div>
  `;
}

export function renderAisPopup(event: AisDisruptionEvent): string {
  const severityClass = escapeHtml(event.severity);
  const severityLabel = escapeHtml(event.severity.toUpperCase());
  const typeLabel = event.type === 'gap_spike' ? t('popups.aisGapSpike') : t('popups.chokepointCongestion');
  const changeLabel = event.type === 'gap_spike' ? t('popups.darkening') : t('popups.density');
  const countLabel = event.type === 'gap_spike' ? t('popups.darkShips') : t('popups.vesselCount');
  const countValue = event.type === 'gap_spike'
    ? event.darkShips?.toString() || '—'
    : event.vesselCount?.toString() || '—';

  return `
    <div class="popup-header ais">
      <span class="popup-title">${escapeHtml(event.name.toUpperCase())}</span>
      <span class="popup-badge ${severityClass}">${severityLabel}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${typeLabel}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${changeLabel}</span>
          <span class="stat-value">${event.changePct}% ↑</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${countLabel}</span>
          <span class="stat-value">${countValue}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.window')}</span>
          <span class="stat-value">${event.windowHours}H</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.region')}</span>
          <span class="stat-value">${escapeHtml(event.region || `${event.lat.toFixed(2)}°, ${event.lon.toFixed(2)}°`)}</span>
        </div>
      </div>
      <p class="popup-description">${escapeHtml(event.description)}</p>
    </div>
  `;
}

export function renderPortPopup(port: Port): string {
  const typeLabels: Record<string, string> = {
    container: t('popups.port.types.container'),
    oil: t('popups.port.types.oil'),
    lng: t('popups.port.types.lng'),
    naval: t('popups.port.types.naval'),
    mixed: t('popups.port.types.mixed'),
    bulk: t('popups.port.types.bulk'),
  };
  const typeColors: Record<string, string> = {
    container: 'elevated',
    oil: 'high',
    lng: 'high',
    naval: 'elevated',
    mixed: 'normal',
    bulk: 'low',
  };
  const typeIcons: Record<string, string> = {
    container: '🏭',
    oil: '🛢️',
    lng: '🔥',
    naval: '⚓',
    mixed: '🚢',
    bulk: '📦',
  };

  const rankSection = port.rank
    ? `<div class="popup-stat"><span class="stat-label">${t('popups.port.worldRank')}</span><span class="stat-value">#${port.rank}</span></div>`
    : '';

  return `
    <div class="popup-header port ${escapeHtml(port.type)}">
      <span class="popup-icon">${typeIcons[port.type] || '🚢'}</span>
      <span class="popup-title">${escapeHtml(port.name.toUpperCase())}</span>
      <span class="popup-badge ${typeColors[port.type] || 'normal'}">${typeLabels[port.type] || port.type.toUpperCase()}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(port.country)}</div>
      <div class="popup-stats">
        ${rankSection}
        <div class="popup-stat">
          <span class="stat-label">${t('popups.type')}</span>
          <span class="stat-value">${typeLabels[port.type] || port.type.toUpperCase()}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${port.lat.toFixed(2)}°, ${port.lon.toFixed(2)}°</span>
        </div>
      </div>
      <p class="popup-description">${escapeHtml(port.note)}</p>
    </div>
  `;
}

export function renderPipelinePopup(pipeline: Pipeline): string {
  const typeLabels: Record<string, string> = {
    'oil': t('popups.pipeline.types.oil'),
    'gas': t('popups.pipeline.types.gas'),
    'products': t('popups.pipeline.types.products'),
  };
  const typeColors: Record<string, string> = {
    'oil': 'high',
    'gas': 'elevated',
    'products': 'low',
  };
  const statusLabels: Record<string, string> = {
    'operating': t('popups.pipeline.status.operating'),
    'construction': t('popups.pipeline.status.construction'),
  };
  const typeIcon = pipeline.type === 'oil' ? '🛢' : pipeline.type === 'gas' ? '🔥' : '⛽';

  return `
    <div class="popup-header pipeline ${pipeline.type}">
      <span class="popup-title">${typeIcon} ${pipeline.name.toUpperCase()}</span>
      <span class="popup-badge ${typeColors[pipeline.type] || 'low'}">${pipeline.type.toUpperCase()}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${typeLabels[pipeline.type] || t('popups.pipeline.title')}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.status')}</span>
          <span class="stat-value">${statusLabels[pipeline.status] || pipeline.status.toUpperCase()}</span>
        </div>
        ${pipeline.capacity ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.capacity')}</span>
          <span class="stat-value">${pipeline.capacity}</span>
        </div>
        ` : ''}
        ${pipeline.length ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.length')}</span>
          <span class="stat-value">${pipeline.length}</span>
        </div>
        ` : ''}
        ${pipeline.operator ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.operator')}</span>
          <span class="stat-value">${pipeline.operator}</span>
        </div>
        ` : ''}
      </div>
      ${pipeline.countries && pipeline.countries.length > 0 ? `
        <div class="popup-section">
          <span class="section-label">${t('popups.countries')}</span>
          <div class="popup-tags">
            ${pipeline.countries.map(c => `<span class="popup-tag">${c}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <p class="popup-description">${t('popups.pipeline.description', { type: pipeline.type, status: pipeline.status === 'operating' ? t('popups.pipelineStatusDesc.operating') : t('popups.pipelineStatusDesc.construction') })}</p>
    </div>
  `;
}

export function renderOutagePopup(outage: InternetOutage): string {
  const severityColors: Record<string, string> = {
    'total': 'high',
    'major': 'elevated',
    'partial': 'low',
  };
  const severityLabels: Record<string, string> = {
    'total': t('popups.outage.levels.total'),
    'major': t('popups.outage.levels.major'),
    'partial': t('popups.outage.levels.partial'),
  };
  const timeAgo = getTimeAgo(outage.pubDate);
  const severityClass = escapeHtml(outage.severity);

  return `
    <div class="popup-header outage ${severityClass}">
      <span class="popup-title">📡 ${escapeHtml(outage.country.toUpperCase())}</span>
      <span class="popup-badge ${severityColors[outage.severity] || 'low'}">${severityLabels[outage.severity] || t('popups.outage.levels.disruption')}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(outage.title)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.severity')}</span>
          <span class="stat-value">${escapeHtml(outage.severity.toUpperCase())}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.outage.reported')}</span>
          <span class="stat-value">${timeAgo}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${outage.lat.toFixed(2)}°, ${outage.lon.toFixed(2)}°</span>
        </div>
      </div>
      ${outage.categories && outage.categories.length > 0 ? `
        <div class="popup-section">
          <span class="section-label">${t('popups.outage.categories')}</span>
          <div class="popup-tags">
            ${outage.categories.slice(0, 5).map(c => `<span class="popup-tag">${escapeHtml(c)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <p class="popup-description">${escapeHtml(outage.description.slice(0, 250))}${outage.description.length > 250 ? '...' : ''}</p>
      <a href="${sanitizeUrl(outage.link)}" target="_blank" class="popup-link">${t('popups.outage.readReport')} →</a>
    </div>
  `;
}
