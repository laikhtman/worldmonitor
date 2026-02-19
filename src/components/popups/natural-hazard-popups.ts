import type { Earthquake, NaturalEvent } from '@/types';
import type { WeatherAlert } from '@/services/weather';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { t } from '@/services/i18n';
import { getNaturalEventIcon } from '@/services/eonet';
import { getTimeAgo, getTimeUntil } from './popup-utils';

export function renderEarthquakePopup(earthquake: Earthquake): string {
  const severity = earthquake.magnitude >= 6 ? 'high' : earthquake.magnitude >= 5 ? 'medium' : 'low';
  const severityLabel = earthquake.magnitude >= 6 ? t('popups.earthquake.levels.major') : earthquake.magnitude >= 5 ? t('popups.earthquake.levels.moderate') : t('popups.earthquake.levels.minor');

  const timeAgo = getTimeAgo(earthquake.time);

  return `
    <div class="popup-header earthquake">
      <span class="popup-title magnitude">M${earthquake.magnitude.toFixed(1)}</span>
      <span class="popup-badge ${severity}">${severityLabel}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <p class="popup-location">${escapeHtml(earthquake.place)}</p>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.depth')}</span>
          <span class="stat-value">${earthquake.depth.toFixed(1)} km</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${earthquake.lat.toFixed(2)}°, ${earthquake.lon.toFixed(2)}°</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.time')}</span>
          <span class="stat-value">${timeAgo}</span>
        </div>
      </div>
      <a href="${sanitizeUrl(earthquake.url)}" target="_blank" class="popup-link">${t('popups.viewUSGS')} →</a>
    </div>
  `;
}

export function renderWeatherPopup(alert: WeatherAlert): string {
  const severityClass = escapeHtml(alert.severity.toLowerCase());
  const expiresIn = getTimeUntil(alert.expires);

  return `
    <div class="popup-header weather ${severityClass}">
      <span class="popup-title">${escapeHtml(alert.event.toUpperCase())}</span>
      <span class="popup-badge ${severityClass}">${escapeHtml(alert.severity.toUpperCase())}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <p class="popup-headline">${escapeHtml(alert.headline)}</p>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.area')}</span>
          <span class="stat-value">${escapeHtml(alert.areaDesc)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.expires')}</span>
          <span class="stat-value">${expiresIn}</span>
        </div>
      </div>
      <p class="popup-description">${escapeHtml(alert.description.slice(0, 300))}${alert.description.length > 300 ? '...' : ''}</p>
    </div>
  `;
}

export function renderNaturalEventPopup(event: NaturalEvent): string {
  const categoryColors: Record<string, string> = {
    severeStorms: 'high',
    wildfires: 'high',
    volcanoes: 'high',
    earthquakes: 'elevated',
    floods: 'elevated',
    landslides: 'elevated',
    drought: 'medium',
    dustHaze: 'low',
    snow: 'low',
    tempExtremes: 'elevated',
    seaLakeIce: 'low',
    waterColor: 'low',
    manmade: 'elevated',
  };
  const icon = getNaturalEventIcon(event.category);
  const severityClass = categoryColors[event.category] || 'low';
  const timeAgo = getTimeAgo(event.date);

  return `
    <div class="popup-header nat-event ${event.category}">
      <span class="popup-icon">${icon}</span>
      <span class="popup-title">${escapeHtml(event.categoryTitle.toUpperCase())}</span>
      <span class="popup-badge ${severityClass}">${event.closed ? t('popups.naturalEvent.closed') : t('popups.naturalEvent.active')}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(event.title)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.naturalEvent.reported')}</span>
          <span class="stat-value">${timeAgo}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${event.lat.toFixed(2)}°, ${event.lon.toFixed(2)}°</span>
        </div>
        ${event.magnitude ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.magnitude')}</span>
          <span class="stat-value">${event.magnitude}${event.magnitudeUnit ? ` ${escapeHtml(event.magnitudeUnit)}` : ''}</span>
        </div>
        ` : ''}
        ${event.sourceName ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.source')}</span>
          <span class="stat-value">${escapeHtml(event.sourceName)}</span>
        </div>
        ` : ''}
      </div>
      ${event.description ? `<p class="popup-description">${escapeHtml(event.description)}</p>` : ''}
      ${event.sourceUrl ? `<a href="${sanitizeUrl(event.sourceUrl)}" target="_blank" class="popup-link">${t('popups.naturalEvent.viewOnSource', { source: escapeHtml(event.sourceName || t('popups.source')) })} →</a>` : ''}
      <div class="popup-attribution">${t('popups.naturalEvent.attribution')}</div>
    </div>
  `;
}
