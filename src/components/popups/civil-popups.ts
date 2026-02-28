import type { AirportDelayAlert, EconomicCenter } from '@/types';
import { escapeHtml } from '@/utils/sanitize';
import { t } from '@/services/i18n';
import { getMarketStatus } from './popup-utils';

export function renderFlightPopup(delay: AirportDelayAlert): string {
  const severityClass = escapeHtml(delay.severity);
  const severityLabel = escapeHtml(delay.severity.toUpperCase());
  const delayTypeLabels: Record<string, string> = {
    'ground_stop': t('popups.flight.groundStop'),
    'ground_delay': t('popups.flight.groundDelay'),
    'departure_delay': t('popups.flight.departureDelay'),
    'arrival_delay': t('popups.flight.arrivalDelay'),
    'general': t('popups.flight.delaysReported'),
  };
  const delayTypeLabel = delayTypeLabels[delay.delayType] || t('popups.flight.delays');
  const icon = delay.delayType === 'ground_stop' ? '🛑' : delay.severity === 'severe' ? '✈️' : '🛫';
  const sourceLabels: Record<string, string> = {
    'faa': t('popups.flight.sources.faa'),
    'eurocontrol': t('popups.flight.sources.eurocontrol'),
    'computed': t('popups.flight.sources.computed'),
  };
  const sourceLabel = sourceLabels[delay.source] || escapeHtml(delay.source);
  const regionLabels: Record<string, string> = {
    'americas': t('popups.flight.regions.americas'),
    'europe': t('popups.flight.regions.europe'),
    'apac': t('popups.flight.regions.apac'),
    'mena': t('popups.flight.regions.mena'),
    'africa': t('popups.flight.regions.africa'),
  };
  const regionLabel = regionLabels[delay.region] || escapeHtml(delay.region);

  const avgDelaySection = delay.avgDelayMinutes > 0
    ? `<div class="popup-stat"><span class="stat-label">${t('popups.flight.avgDelay')}</span><span class="stat-value alert">+${delay.avgDelayMinutes} ${t('popups.timeUnits.m')}</span></div>`
    : '';
  const reasonSection = delay.reason
    ? `<div class="popup-stat"><span class="stat-label">${t('popups.reason')}</span><span class="stat-value">${escapeHtml(delay.reason)}</span></div>`
    : '';
  const cancelledSection = delay.cancelledFlights
    ? `<div class="popup-stat"><span class="stat-label">${t('popups.flight.cancelled')}</span><span class="stat-value alert">${delay.cancelledFlights} ${t('popups.events')}</span></div>`
    : '';

  return `
    <div class="popup-header flight ${severityClass}">
      <span class="popup-icon">${icon}</span>
      <span class="popup-title">${escapeHtml(delay.iata)} - ${delayTypeLabel}</span>
      <span class="popup-badge ${severityClass}">${severityLabel}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(delay.name)}</div>
      <div class="popup-location">${escapeHtml(delay.city)}, ${escapeHtml(delay.country)}</div>
      <div class="popup-stats">
        ${avgDelaySection}
        ${reasonSection}
        ${cancelledSection}
        <div class="popup-stat">
          <span class="stat-label">${t('popups.region')}</span>
          <span class="stat-value">${regionLabel}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.source')}</span>
          <span class="stat-value">${sourceLabel}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.updated')}</span>
          <span class="stat-value">${delay.updatedAt.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderEconomicPopup(center: EconomicCenter): string {
  const typeLabels: Record<string, string> = {
    'exchange': t('popups.economic.types.exchange'),
    'central-bank': t('popups.economic.types.centralBank'),
    'financial-hub': t('popups.economic.types.financialHub'),
  };
  const typeIcons: Record<string, string> = {
    'exchange': '📈',
    'central-bank': '🏛',
    'financial-hub': '💰',
  };

  const marketStatusResult = center.marketHours ? getMarketStatus(center.marketHours) : null;
  const marketStatusLabel = marketStatusResult
    ? marketStatusResult === 'open'
      ? t('popups.open')
      : marketStatusResult === 'closed'
      ? t('popups.economic.closed')
      : t('popups.unknown')
    : '';

  return `
    <div class="popup-header economic ${center.type}">
      <span class="popup-title">${typeIcons[center.type] || ''} ${center.name.toUpperCase()}</span>
      <span class="popup-badge ${marketStatusResult === 'open' ? 'elevated' : 'low'}">${marketStatusLabel || typeLabels[center.type]}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      ${center.description ? `<p class="popup-description">${center.description}</p>` : ''}
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.type')}</span>
          <span class="stat-value">${typeLabels[center.type] || center.type.toUpperCase()}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.country')}</span>
          <span class="stat-value">${center.country}</span>
        </div>
        ${center.marketHours ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.tradingHours')}</span>
          <span class="stat-value">${center.marketHours.open} - ${center.marketHours.close}</span>
        </div>
        ` : ''}
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${center.lat.toFixed(2)}°, ${center.lon.toFixed(2)}°</span>
        </div>
      </div>
    </div>
  `;
}
