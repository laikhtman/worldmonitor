import type { AIDataCenter } from '@/types';
import type { StartupHub, Accelerator, TechHQ, CloudRegion } from '@/config/tech-geo';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { t } from '@/services/i18n';
import type { TechEventPopupData, TechHQClusterData, TechEventClusterData, DatacenterClusterData } from './popup-types';
import { formatNumber } from './popup-utils';

export function renderDatacenterPopup(dc: AIDataCenter): string {
  const statusColors: Record<string, string> = {
    'existing': 'normal',
    'planned': 'elevated',
    'decommissioned': 'low',
  };
  const statusLabels: Record<string, string> = {
    'existing': t('popups.datacenter.status.existing'),
    'planned': t('popups.datacenter.status.planned'),
    'decommissioned': t('popups.datacenter.status.decommissioned'),
  };

  return `
    <div class="popup-header datacenter ${dc.status}">
      <span class="popup-title">🖥️ ${dc.name}</span>
      <span class="popup-badge ${statusColors[dc.status] || 'normal'}">${statusLabels[dc.status] || t('popups.datacenter.status.unknown')}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${dc.owner} • ${dc.country}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.gpuChipCount')}</span>
          <span class="stat-value">${formatNumber(dc.chipCount)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.chipType')}</span>
          <span class="stat-value">${dc.chipType || t('popups.unknown')}</span>
        </div>
        ${dc.powerMW ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.power')}</span>
          <span class="stat-value">${dc.powerMW.toFixed(0)} MW</span>
        </div>
        ` : ''}
        ${dc.sector ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.sector')}</span>
          <span class="stat-value">${dc.sector}</span>
        </div>
        ` : ''}
      </div>
      ${dc.note ? `<p class="popup-description">${dc.note}</p>` : ''}
      <div class="popup-attribution">${t('popups.datacenter.attribution')}</div>
    </div>
  `;
}

export function renderDatacenterClusterPopup(data: DatacenterClusterData): string {
  const totalCount = data.count ?? data.items.length;
  const totalChips = data.totalChips ?? data.items.reduce((sum, dc) => sum + dc.chipCount, 0);
  const totalPower = data.totalPowerMW ?? data.items.reduce((sum, dc) => sum + (dc.powerMW || 0), 0);
  const existingCount = data.existingCount ?? data.items.filter(dc => dc.status === 'existing').length;
  const plannedCount = data.plannedCount ?? data.items.filter(dc => dc.status === 'planned').length;

  const dcListHtml = data.items.slice(0, 8).map(dc => `
    <div class="cluster-item">
      <span class="cluster-item-icon">${dc.status === 'planned' ? '🔨' : '🖥️'}</span>
      <div class="cluster-item-info">
        <span class="cluster-item-name">${escapeHtml(dc.name.slice(0, 40))}${dc.name.length > 40 ? '...' : ''}</span>
        <span class="cluster-item-detail">${escapeHtml(dc.owner)} • ${formatNumber(dc.chipCount)} ${t('popups.datacenter.chips')}</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="popup-header datacenter cluster">
      <span class="popup-title">🖥️ ${t('popups.datacenter.cluster.title', { count: String(totalCount) })}</span>
      <span class="popup-badge elevated">${escapeHtml(data.region)}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(data.country)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.cluster.totalChips')}</span>
          <span class="stat-value">${formatNumber(totalChips)}</span>
        </div>
        ${totalPower > 0 ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.cluster.totalPower')}</span>
          <span class="stat-value">${totalPower.toFixed(0)} MW</span>
        </div>
        ` : ''}
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.cluster.operational')}</span>
          <span class="stat-value">${existingCount}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.cluster.planned')}</span>
          <span class="stat-value">${plannedCount}</span>
        </div>
      </div>
      <div class="cluster-list">
        ${dcListHtml}
      </div>
      ${totalCount > 8 ? `<p class="popup-more">${t('popups.datacenter.cluster.moreDataCenters', { count: String(Math.max(0, totalCount - 8)) })}</p>` : ''}
      ${data.sampled ? `<p class="popup-more">${t('popups.datacenter.cluster.sampledSites', { count: String(data.items.length) })}</p>` : ''}
      <div class="popup-attribution">${t('popups.datacenter.attribution')}</div>
    </div>
  `;
}

export function renderStartupHubPopup(hub: StartupHub): string {
  const tierLabels: Record<string, string> = {
    'mega': t('popups.startupHub.tiers.mega'),
    'major': t('popups.startupHub.tiers.major'),
    'emerging': t('popups.startupHub.tiers.emerging'),
  };
  const tierIcons: Record<string, string> = { 'mega': '🦄', 'major': '🚀', 'emerging': '💡' };
  return `
    <div class="popup-header startup-hub ${hub.tier}">
      <span class="popup-title">${tierIcons[hub.tier] || '🚀'} ${escapeHtml(hub.name)}</span>
      <span class="popup-badge ${hub.tier}">${tierLabels[hub.tier] || t('popups.startupHub.tiers.hub')}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(hub.city)}, ${escapeHtml(hub.country)}</div>
      ${hub.unicorns ? `
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.startupHub.unicorns')}</span>
          <span class="stat-value">${hub.unicorns}+</span>
        </div>
      </div>
      ` : ''}
      ${hub.description ? `<p class="popup-description">${escapeHtml(hub.description)}</p>` : ''}
    </div>
  `;
}

export function renderCloudRegionPopup(region: CloudRegion): string {
  const providerNames: Record<string, string> = { 'aws': 'Amazon Web Services', 'gcp': 'Google Cloud Platform', 'azure': 'Microsoft Azure', 'cloudflare': 'Cloudflare' };
  const providerIcons: Record<string, string> = { 'aws': '🟠', 'gcp': '🔵', 'azure': '🟣', 'cloudflare': '🟡' };
  return `
    <div class="popup-header cloud-region ${region.provider}">
      <span class="popup-title">${providerIcons[region.provider] || '☁️'} ${escapeHtml(region.name)}</span>
      <span class="popup-badge ${region.provider}">${region.provider.toUpperCase()}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(region.city)}, ${escapeHtml(region.country)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.cloudRegion.provider')}</span>
          <span class="stat-value">${providerNames[region.provider] || region.provider}</span>
        </div>
        ${region.zones ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.cloudRegion.availabilityZones')}</span>
          <span class="stat-value">${region.zones}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

export function renderTechHQPopup(hq: TechHQ): string {
  const typeLabels: Record<string, string> = {
    'faang': t('popups.techHQ.types.faang'),
    'unicorn': t('popups.techHQ.types.unicorn'),
    'public': t('popups.techHQ.types.public'),
  };
  const typeIcons: Record<string, string> = { 'faang': '🏛️', 'unicorn': '🦄', 'public': '🏢' };
  return `
    <div class="popup-header tech-hq ${hq.type}">
      <span class="popup-title">${typeIcons[hq.type] || '🏢'} ${escapeHtml(hq.company)}</span>
      <span class="popup-badge ${hq.type}">${typeLabels[hq.type] || t('popups.techHQ.types.tech')}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(hq.city)}, ${escapeHtml(hq.country)}</div>
      <div class="popup-stats">
        ${hq.marketCap ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.techHQ.marketCap')}</span>
          <span class="stat-value">${escapeHtml(hq.marketCap)}</span>
        </div>
        ` : ''}
        ${hq.employees ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.techHQ.employees')}</span>
          <span class="stat-value">${hq.employees.toLocaleString()}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

export function renderAcceleratorPopup(acc: Accelerator): string {
  const typeLabels: Record<string, string> = {
    'accelerator': t('popups.accelerator.types.accelerator'),
    'incubator': t('popups.accelerator.types.incubator'),
    'studio': t('popups.accelerator.types.studio'),
  };
  const typeIcons: Record<string, string> = { 'accelerator': '🎯', 'incubator': '🔬', 'studio': '🎨' };
  return `
    <div class="popup-header accelerator ${acc.type}">
      <span class="popup-title">${typeIcons[acc.type] || '🎯'} ${escapeHtml(acc.name)}</span>
      <span class="popup-badge ${acc.type}">${typeLabels[acc.type] || t('popups.accelerator.types.accelerator')}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(acc.city)}, ${escapeHtml(acc.country)}</div>
      <div class="popup-stats">
        ${acc.founded ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.accelerator.founded')}</span>
          <span class="stat-value">${acc.founded}</span>
        </div>
        ` : ''}
      </div>
      ${acc.notable && acc.notable.length > 0 ? `
      <div class="popup-notable">
        <span class="notable-label">${t('popups.accelerator.notableAlumni')}</span>
        <span class="notable-list">${acc.notable.map(n => escapeHtml(n)).join(', ')}</span>
      </div>
      ` : ''}
    </div>
  `;
}

export function renderTechEventPopup(event: TechEventPopupData): string {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const dateStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const endDateStr = endDate > startDate && endDate.toDateString() !== startDate.toDateString()
    ? ` - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : '';

  const urgencyClass = event.daysUntil <= 7 ? 'urgent' : event.daysUntil <= 30 ? 'soon' : '';
  const daysLabel = event.daysUntil === 0
    ? t('popups.techEvent.days.today')
    : event.daysUntil === 1
    ? t('popups.techEvent.days.tomorrow')
    : t('popups.techEvent.days.inDays', { count: String(event.daysUntil) });

  return `
    <div class="popup-header tech-event ${urgencyClass}">
      <span class="popup-title">📅 ${escapeHtml(event.title)}</span>
      <span class="popup-badge ${urgencyClass}">${daysLabel}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">📍 ${escapeHtml(event.location)}, ${escapeHtml(event.country)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.techEvent.date')}</span>
          <span class="stat-value">${dateStr}${endDateStr}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.location')}</span>
          <span class="stat-value">${escapeHtml(event.location)}</span>
        </div>
      </div>
      ${event.url ? `
      <a href="${sanitizeUrl(event.url)}" target="_blank" rel="noopener noreferrer" class="popup-link">
        ${t('popups.techEvent.moreInformation')} →
      </a>
      ` : ''}
    </div>
  `;
}

export function renderTechHQClusterPopup(data: TechHQClusterData): string {
  const totalCount = data.count ?? data.items.length;
  const unicornCount = data.unicornCount ?? data.items.filter(h => h.type === 'unicorn').length;
  const faangCount = data.faangCount ?? data.items.filter(h => h.type === 'faang').length;
  const publicCount = data.publicCount ?? data.items.filter(h => h.type === 'public').length;

  const sortedItems = [...data.items].sort((a, b) => {
    const typeOrder = { faang: 0, unicorn: 1, public: 2 };
    return (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3);
  });

  const listItems = sortedItems.map(hq => {
    const icon = hq.type === 'faang' ? '🏛️' : hq.type === 'unicorn' ? '🦄' : '🏢';
    const marketCap = hq.marketCap ? ` (${hq.marketCap})` : '';
    return `<li class="cluster-item ${hq.type}">${icon} ${escapeHtml(hq.company)}${marketCap}</li>`;
  }).join('');

  return `
    <div class="popup-header tech-hq cluster">
      <span class="popup-title">🏙️ ${escapeHtml(data.city)}</span>
      <span class="popup-badge">${t('popups.techHQCluster.companiesCount', { count: String(totalCount) })}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body cluster-popup">
      <div class="popup-subtitle">📍 ${escapeHtml(data.city)}, ${escapeHtml(data.country)}</div>
      <div class="cluster-summary">
        ${faangCount ? `<span class="summary-item faang">🏛️ ${t('popups.techHQCluster.bigTechCount', { count: String(faangCount) })}</span>` : ''}
        ${unicornCount ? `<span class="summary-item unicorn">🦄 ${t('popups.techHQCluster.unicornsCount', { count: String(unicornCount) })}</span>` : ''}
        ${publicCount ? `<span class="summary-item public">🏢 ${t('popups.techHQCluster.publicCount', { count: String(publicCount) })}</span>` : ''}
      </div>
      <ul class="cluster-list">${listItems}</ul>
      ${data.sampled ? `<p class="popup-more">${t('popups.techHQCluster.sampled', { count: String(data.items.length) })}</p>` : ''}
    </div>
  `;
}

export function renderTechEventClusterPopup(data: TechEventClusterData): string {
  const totalCount = data.count ?? data.items.length;
  const upcomingSoon = data.soonCount ?? data.items.filter(e => e.daysUntil <= 14).length;
  const sortedItems = [...data.items].sort((a, b) => a.daysUntil - b.daysUntil);

  const listItems = sortedItems.map(event => {
    const startDate = new Date(event.startDate);
    const dateStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const urgencyClass = event.daysUntil <= 7 ? 'urgent' : event.daysUntil <= 30 ? 'soon' : '';
    return `<li class="cluster-item ${urgencyClass}">📅 ${dateStr}: ${escapeHtml(event.title)}</li>`;
  }).join('');

  return `
    <div class="popup-header tech-event cluster">
      <span class="popup-title">📅 ${escapeHtml(data.location)}</span>
      <span class="popup-badge">${t('popups.techEventCluster.eventsCount', { count: String(totalCount) })}</span>
      <button class="popup-close">×</button>
    </div>
    <div class="popup-body cluster-popup">
      <div class="popup-subtitle">📍 ${escapeHtml(data.location)}, ${escapeHtml(data.country)}</div>
      ${upcomingSoon ? `<div class="cluster-summary"><span class="summary-item soon">⚡ ${t('popups.techEventCluster.upcomingWithin2Weeks', { count: String(upcomingSoon) })}</span></div>` : ''}
      <ul class="cluster-list">${listItems}</ul>
      ${data.sampled ? `<p class="popup-more">${t('popups.techEventCluster.sampled', { count: String(data.items.length) })}</p>` : ''}
    </div>
  `;
}
